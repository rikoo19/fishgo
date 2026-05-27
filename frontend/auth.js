// Auth removed - UI and endpoints were deleted per project scope

function getToken() {
  return localStorage.getItem("access_token");
}

function setToken(token) {
  if (token) localStorage.setItem("access_token", token);
  else localStorage.removeItem("access_token");
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchMe() {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch("/auth/me", { headers: authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function setAuthUI(user) {
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const userDisplay = document.getElementById("userDisplay");

  if (user) {
    if (loginBtn) loginBtn.style.display = "none";
    if (signupBtn) signupBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
    if (userDisplay) {
      userDisplay.style.display = "inline-block";
      userDisplay.textContent = user.username || user.email || "User";
    }
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (signupBtn) signupBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
    if (userDisplay) {
      userDisplay.style.display = "none";
      userDisplay.textContent = "";
    }
  }
}

// Modal helpers
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = "flex";
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = "none";
}

async function submitSignup(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.elements["email"].value;
  const username = form.elements["username"].value;
  const password = form.elements["password"].value;

  try {
    const res = await fetch("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });
    if (res.ok) {
      const data = await res.json();
      showMessage("Account created. You can now log in.");
      closeModal("signupModal");
    } else {
      const err = await res.json();
      showMessage(err.detail || "Failed signup", true);
    }
  } catch (err) {
    showMessage("Network error while signing up", true);
  }
}

async function submitLogin(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.elements["email"].value;
  const password = form.elements["password"].value;

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      setToken(data.access_token);
      const me = await fetchMe();
      setAuthUI(me);
      showMessage("Logged in successfully");
      closeModal("loginModal");
    } else {
      const err = await res.json();
      showMessage(err.detail || "Login failed", true);
    }
  } catch (err) {
    showMessage("Network error while logging in", true);
  }
}

async function doLogout() {
  const t = getToken();
  try {
    if (t) {
      await fetch("/auth/logout", { method: "POST", headers: authHeaders() });
    }
  } catch (e) {
    // ignore network errors
  }
  setToken(null);
  setAuthUI(null);
  showMessage("Logged out");
}

function initAuthUI() {
  // Attach button handlers
  document
    .getElementById("loginBtn")
    ?.addEventListener("click", () => openModal("loginModal"));
  document
    .getElementById("signupBtn")
    ?.addEventListener("click", () => openModal("signupModal"));
  document.getElementById("logoutBtn")?.addEventListener("click", doLogout);

  // Modal close buttons
  document.querySelectorAll(".modal .modal-close")?.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const parent = e.target.closest(".modal");
      if (parent) parent.style.display = "none";
    });
  });

  // Form submits
  document
    .getElementById("signupForm")
    ?.addEventListener("submit", submitSignup);
  document.getElementById("loginForm")?.addEventListener("submit", submitLogin);

  // Initialize UI based on token
  fetchMe().then((me) => setAuthUI(me));
}

// Initialize after DOM loaded
window.addEventListener("DOMContentLoaded", initAuthUI);
