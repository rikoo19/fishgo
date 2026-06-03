// Lightweight proxy loader: if some pages still request /frontend/game_new.js,
// load the real bundle from /frontbundle/game_new.js so the full game runs.
(function loadRealBundle() {
  try {
    var s = document.createElement('script');
    s.src = '/frontbundle/game_new.js';
    s.async = false;
    var current = document.currentScript;
    if (current && current.parentNode) {
      current.parentNode.insertBefore(s, current);
    } else {
      document.head.appendChild(s);
    }
    console.log('🔁 Redirecting to /frontbundle/game_new.js');
  } catch (e) {
    console.warn('Failed to load real bundle:', e);
  }
})();

