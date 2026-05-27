class FishingGame {
  constructor() {
    this.playerId = this.getOrCreatePlayerId();
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.fishTypes = {};
    this.player = null;
    this.isFishing = false;
    this.fishingAnimation = null;

    this.init();
  }

  getOrCreatePlayerId() {
    let playerId = localStorage.getItem("fishingGamePlayerId");
    if (!playerId) {
      playerId =
        "player_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      localStorage.setItem("fishingGamePlayerId", playerId);
    }
    return playerId;
  }

  createLocalPlayer() {
    return {
      id: this.playerId,
      coins: 100,
      health: 100,
      hunger: 100,
      inventory: {},
      cooked_food: {},
      auto_cook_enabled: false,
      last_hunger_update: Date.now() / 1000,
    };
  }

  async init() {
    await this.loadFishTypes();
    await this.loadPlayer();
    this.setupEventListeners();
    this.startGameLoop();
    this.drawScene();
  }

  async loadFishTypes() {
    const DEFAULT_FISH_TYPES = {
      small_fish: {
        name: "Ikan Kecil",
        rarity: "common",
        sell_price: 5,
        value: 5,
        hunger_restore: 10,
        cooking_time: 3,
      },
      medium_fish: {
        name: "Ikan Sedang",
        rarity: "uncommon",
        sell_price: 15,
        value: 15,
        hunger_restore: 25,
        cooking_time: 5,
      },
      large_fish: {
        name: "Ikan Besar",
        rarity: "rare",
        sell_price: 50,
        value: 50,
        hunger_restore: 50,
        cooking_time: 8,
      },
      golden_fish: {
        name: "Ikan Emas",
        rarity: "legendary",
        sell_price: 200,
        value: 200,
        hunger_restore: 100,
        cooking_time: 15,
      },
    };

    try {
      const response = await fetch("/api/fish-types");
      if (response.ok) {
        this.fishTypes = await response.json();
      } else {
        console.warn("Fish types API returned", response.status);
        this.fishTypes = DEFAULT_FISH_TYPES;
        this.showMessage("Using local fish types (backend unavailable)", false);
      }
    } catch (error) {
      console.warn("Failed to load fish types:", error);
      this.fishTypes = DEFAULT_FISH_TYPES;
      this.showMessage("Using local fish types (backend unavailable)", false);
    }
  }

  async loadPlayer() {
    try {
      const response = await fetch(`/api/player/${this.playerId}`);
      if (!response.ok) {
        console.warn("Player API returned", response.status);
        const stored = localStorage.getItem(`player_${this.playerId}`);
        if (stored) {
          this.player = JSON.parse(stored);
        } else {
          this.player = this.createLocalPlayer();
          localStorage.setItem(
            `player_${this.playerId}`,
            JSON.stringify(this.player)
          );
        }
        this.updateUI();
        return;
      }
      this.player = await response.json();
      // Cache to localStorage for offline fallback
      localStorage.setItem(
        `player_${this.playerId}`,
        JSON.stringify(this.player)
      );
      this.updateUI();
    } catch (error) {
      console.warn("Failed to load player:", error);
      const stored = localStorage.getItem(`player_${this.playerId}`);
      if (stored) {
        this.player = JSON.parse(stored);
      } else {
        this.player = this.createLocalPlayer();
        localStorage.setItem(
          `player_${this.playerId}`,
          JSON.stringify(this.player)
        );
      }
      this.updateUI();
      this.showMessage("Using local player data (backend unavailable)", false);
    }
  }

  setupEventListeners() {
    document
      .getElementById("fishBtn")
      .addEventListener("click", () => this.goFishing());
    document
      .getElementById("autoCookBtn")
      .addEventListener("click", () => this.toggleAutoCook());
  }

  startGameLoop() {
    // Update player data every 5 seconds
    setInterval(() => {
      this.loadPlayer();
    }, 5000);
  }

  drawScene() {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background (land area)
    ctx.fillStyle = "#8FBC8F";
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.3);

    // Draw dock/pier area
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(0, canvas.height * 0.25, canvas.width, canvas.height * 0.15);

    // Draw dock planks
    ctx.strokeStyle = "#654321";
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, canvas.height * 0.25);
      ctx.lineTo(i, canvas.height * 0.4);
      ctx.stroke();
    }

    // Draw water area
    const waterGradient = ctx.createLinearGradient(
      0,
      canvas.height * 0.4,
      0,
      canvas.height
    );
    waterGradient.addColorStop(0, "#4682B4");
    waterGradient.addColorStop(0.5, "#1E90FF");
    waterGradient.addColorStop(1, "#191970");
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, canvas.height * 0.4, canvas.width, canvas.height * 0.6);

    // Draw island edges (pixel art style)
    this.drawIslandEdges();

    // Draw water ripples
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    const time = Date.now() * 0.001;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const y = canvas.height * 0.45 + i * 30;
      for (let x = 0; x <= canvas.width; x += 15) {
        const waveY = y + Math.sin(x * 0.02 + time * 2 + i * 0.5) * 8;
        if (x === 0) {
          ctx.moveTo(x, waveY);
        } else {
          ctx.lineTo(x, waveY);
        }
      }
      ctx.stroke();
    }

    // Draw player character (simple pixel-style)
    this.drawPlayer();

    // Draw fishing line if fishing
    if (this.isFishing) {
      ctx.strokeStyle = "#2F4F4F";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 + 10, canvas.height * 0.35);
      const hookX = canvas.width / 2 + 10 + Math.sin(time * 3) * 15;
      const hookY = canvas.height * 0.7 + Math.sin(time * 2) * 10;
      ctx.lineTo(hookX, hookY);
      ctx.stroke();

      // Draw fishing hook
      ctx.fillStyle = "#C0C0C0";
      ctx.beginPath();
      ctx.arc(hookX, hookY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Draw bobber
      ctx.fillStyle = "#FF6347";
      ctx.beginPath();
      ctx.arc(hookX, hookY - 20, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw fish swimming in water
    this.drawFish();

    // Draw some decorative elements
    this.drawEnvironment();

    // Draw clouds
    this.drawClouds();

    // Draw water sparkles
    this.drawWaterSparkles();

    requestAnimationFrame(() => this.drawScene());
  }

  drawPlayer() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const playerX = canvas.width / 2;
    const playerY = canvas.height * 0.32;

    // Player body (simple pixel style)
    ctx.fillStyle = "#4169E1";
    ctx.fillRect(playerX - 8, playerY - 5, 16, 20);

    // Player head
    ctx.fillStyle = "#FDBCB4";
    ctx.fillRect(playerX - 6, playerY - 15, 12, 10);

    // Player hair
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(playerX - 6, playerY - 18, 12, 5);

    // Fishing rod
    if (this.isFishing) {
      ctx.strokeStyle = "#8B4513";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playerX + 8, playerY - 10);
      ctx.lineTo(playerX + 15, playerY - 25);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#8B4513";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playerX + 8, playerY - 5);
      ctx.lineTo(playerX + 12, playerY - 20);
      ctx.stroke();
    }
  }

  drawIslandEdges() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const blockSize = 8; // Ukuran blok pixel
    const edgeY = canvas.height * 0.4; // Posisi tepi air

    // Warna untuk pinggiran pulau (coklat pasir seperti di gambar)
    const sandColors = ["#C2B280", "#D2B48C", "#B8956A", "#A88754"];

    // Gambar pinggiran kiri pulau
    for (let i = 0; i < 8; i++) {
      const x = i * blockSize;
      const y = edgeY + Math.sin(i * 0.5) * blockSize;
      const colorIndex = Math.floor(Math.random() * sandColors.length);
      ctx.fillStyle = sandColors[colorIndex];
      ctx.fillRect(x, y - blockSize, blockSize, blockSize);

      // Tambahkan variasi depth
      if (i % 2 === 0) {
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }

    // Gambar pinggiran kanan pulau
    for (let i = 0; i < 8; i++) {
      const x = canvas.width - (i + 1) * blockSize;
      const y = edgeY + Math.sin(i * 0.5) * blockSize;
      const colorIndex = Math.floor(Math.random() * sandColors.length);
      ctx.fillStyle = sandColors[colorIndex];
      ctx.fillRect(x, y - blockSize, blockSize, blockSize);

      // Tambahkan variasi depth
      if (i % 2 === 0) {
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }

    // Gambar pinggiran bawah horizontal (sepanjang pantai)
    for (let i = 8; i < canvas.width / blockSize - 8; i++) {
      const x = i * blockSize;
      const y = edgeY + Math.sin(i * 0.3) * blockSize * 0.5;
      const colorIndex = i % sandColors.length;
      ctx.fillStyle = sandColors[colorIndex];
      ctx.fillRect(x, y - blockSize, blockSize, blockSize);

      // Beberapa blok memiliki layer kedua
      if (Math.random() > 0.6) {
        const darkerSand = "#9B7F5A";
        ctx.fillStyle = darkerSand;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }

    // Tambahkan highlight terang pada beberapa blok
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    for (let i = 0; i < canvas.width / blockSize; i++) {
      if (Math.random() > 0.8) {
        const x = i * blockSize;
        const y = edgeY + Math.sin(i * 0.3) * blockSize * 0.5;
        ctx.fillRect(x, y - blockSize + 2, blockSize - 2, 2);
      }
    }

    // Tambahkan bayangan gelap pada beberapa blok untuk depth
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    for (let i = 0; i < canvas.width / blockSize; i++) {
      if (Math.random() > 0.7) {
        const x = i * blockSize;
        const y = edgeY + Math.sin(i * 0.3) * blockSize * 0.5;
        ctx.fillRect(x, y - 2, blockSize, 2);
      }
    }
  }

  drawEnvironment() {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Draw trees in background
    ctx.fillStyle = "#8B4513";
    for (let i = 0; i < 4; i++) {
      const x = 50 + i * 180;
      const y = canvas.height * 0.1;
      // Tree trunk
      ctx.fillRect(x, y, 8, 25);
      // Tree leaves
      ctx.fillStyle = "#228B22";
      ctx.fillRect(x - 8, y - 8, 24, 20);
      ctx.fillRect(x - 4, y - 12, 16, 16);
      ctx.fillStyle = "#8B4513";
    }

    // Draw some grass patches
    ctx.fillStyle = "#32CD32";
    for (let i = 0; i < 15; i++) {
      const x = i * 50 + 10;
      const y = canvas.height * 0.18 + Math.sin(i) * 8;
      ctx.fillRect(x, y, 4, 8);
      ctx.fillRect(x + 2, y - 2, 4, 8);
      ctx.fillRect(x + 4, y + 1, 4, 8);
    }

    // Draw flowers
    ctx.fillStyle = "#FF69B4";
    for (let i = 0; i < 6; i++) {
      const x = 30 + i * 120;
      const y = canvas.height * 0.2;
      ctx.fillRect(x, y, 3, 3);
      ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillRect(x + 1, y - 1, 3, 3);
      ctx.fillRect(x - 1, y + 1, 3, 3);
      ctx.fillRect(x + 1, y + 1, 3, 3);
    }

    // Draw some rocks in water (pixel style)
    ctx.fillStyle = "#696969";
    const time = Date.now() * 0.0005;
    for (let i = 0; i < 4; i++) {
      const x = 80 + i * 150 + Math.sin(time + i) * 15;
      const y = canvas.height * 0.75 + Math.cos(time + i) * 10;

      // Rock made of rectangles for pixel art look
      ctx.fillRect(x - 8, y - 4, 16, 8);
      ctx.fillRect(x - 6, y - 6, 12, 4);
      ctx.fillRect(x - 4, y - 8, 8, 4);

      // Rock highlight
      ctx.fillStyle = "#A9A9A9";
      ctx.fillRect(x - 6, y - 6, 4, 2);
      ctx.fillRect(x - 2, y - 4, 2, 2);
      ctx.fillStyle = "#696969";
    }

    // Draw dock posts
    ctx.fillStyle = "#654321";
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 120;
      ctx.fillRect(x, canvas.height * 0.25, 6, canvas.height * 0.3);
    }
  }

  drawFish() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const time = Date.now() * 0.001;

    // Draw some background fish with pixel art style
    const fishColors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"];

    for (let i = 0; i < 5; i++) {
      const x =
        canvas.width * 0.1 + Math.sin(time + i * 1.5) * (canvas.width * 0.7);
      const y =
        canvas.height * 0.5 + Math.cos(time + i * 1.2) * (canvas.height * 0.25);

      // Only draw fish in water area
      if (y > canvas.height * 0.45) {
        // Fish body (pixel style rectangles)
        ctx.fillStyle = fishColors[i % fishColors.length];
        ctx.fillRect(x - 12, y - 6, 20, 12);
        ctx.fillRect(x - 8, y - 8, 12, 16);

        // Fish tail (pixel style)
        ctx.fillRect(x - 18, y - 4, 8, 8);
        ctx.fillRect(x - 22, y - 2, 6, 4);

        // Fish eye
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x + 2, y - 3, 4, 4);
        ctx.fillStyle = "#000000";
        ctx.fillRect(x + 3, y - 2, 2, 2);

        // Fish fins
        ctx.fillStyle = fishColors[i % fishColors.length];
        ctx.fillRect(x - 2, y + 6, 6, 4);
        ctx.fillRect(x - 2, y - 10, 6, 4);
      }
    }

    // Draw special fish shadows/silhouettes deeper in water
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    for (let i = 0; i < 3; i++) {
      const x =
        canvas.width * 0.2 +
        Math.sin(time * 0.5 + i * 3) * (canvas.width * 0.6);
      const y = canvas.height * 0.85 + Math.cos(time * 0.3 + i * 2) * 20;

      // Large fish silhouettes
      ctx.fillRect(x - 20, y - 8, 35, 16);
      ctx.fillRect(x - 30, y - 4, 12, 8);
    }
  }

  drawClouds() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const time = Date.now() * 0.0002;

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

    // Draw pixel-style clouds
    for (let i = 0; i < 3; i++) {
      const x = i * 250 + 50 + Math.sin(time + i) * 30;
      const y = 20 + Math.sin(time * 0.5 + i) * 10;

      // Cloud made of rectangles
      ctx.fillRect(x, y, 40, 12);
      ctx.fillRect(x + 8, y - 4, 24, 8);
      ctx.fillRect(x + 12, y - 8, 16, 8);
      ctx.fillRect(x - 4, y + 4, 20, 8);
      ctx.fillRect(x + 20, y + 4, 20, 8);
    }
  }

  drawWaterSparkles() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const time = Date.now() * 0.003;

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";

    // Draw sparkles on water surface
    for (let i = 0; i < 8; i++) {
      const x = i * 100 + 50 + Math.sin(time + i * 2) * 40;
      const y = canvas.height * 0.42 + Math.sin(time * 2 + i) * 8;
      const size = 2 + Math.sin(time * 3 + i) * 1;

      // Sparkle effect
      if (Math.sin(time * 4 + i) > 0.5) {
        ctx.fillRect(x - size, y, size * 2, 1);
        ctx.fillRect(x, y - size, 1, size * 2);
      }
    }
  }

  async goFishing() {
    if (this.isFishing) return;

    this.isFishing = true;
    const fishBtn = document.getElementById("fishBtn");
    fishBtn.disabled = true;
    fishBtn.textContent = "🎣 Memancing...";
    fishBtn.classList.add("fishing-animation");

    try {
      const response = await fetch(`/api/player/${this.playerId}/fish`, {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        if (result.success) {
          this.showMessage(result.message);
          this.createFishCatchAnimation(result.fish);
        } else {
          this.showMessage(result.message);
        }
        await this.loadPlayer();
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("Error while fishing", true);
    }

    setTimeout(() => {
      this.isFishing = false;
      fishBtn.disabled = false;
      fishBtn.textContent = "🎣 Memancing";
      fishBtn.classList.remove("fishing-animation");
    }, 2000);
  }

  createFishCatchAnimation(fish) {
    const canvas = this.canvas;
    const fishElement = document.createElement("div");
    fishElement.style.position = "absolute";
    fishElement.style.left = `${canvas.offsetLeft + canvas.width / 2}px`;
    fishElement.style.top = `${canvas.offsetTop + canvas.height - 50}px`;
    fishElement.style.fontSize = "2em";
    fishElement.style.zIndex = "1000";
    fishElement.style.pointerEvents = "none";

    // Different fish emoji based on rarity or category
    const fishEmojis = {
      common: "🐟",
      uncommon: "🐠",
      rare: "🎣",
      legendary: "🌟",
      epic: "✨",
      mythic: "🌊",
      // Capitalized category keys (compat)
      Common: "🐟",
      Rare: "🎣",
      Epic: "✨",
      Mythic: "🌊",
    };

    const rarityKey =
      fish.rarity || fish.category || fish.rarity_category || "common";
    fishElement.textContent = fishEmojis[rarityKey] || "🐟";

    document.body.appendChild(fishElement);

    // Play catch sound (simple beep using Web Audio API)
    this.playSound(rarityKey);

    // Animate fish jumping out
    fishElement.animate(
      [
        { transform: "translateY(0px) scale(1)", opacity: 1 },
        { transform: "translateY(-100px) scale(1.5)", opacity: 0.8 },
        { transform: "translateY(-50px) scale(1)", opacity: 0 },
      ],
      {
        duration: 1500,
        easing: "ease-out",
      }
    ).onfinish = () => {
      document.body.removeChild(fishElement);
    };
  }

  playSound(rarity) {
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different rarities (normalize to lowercase)
      const key = typeof rarity === "string" ? rarity.toLowerCase() : "common";
      const frequencies = {
        common: 440,
        uncommon: 523,
        rare: 659,
        legendary: 880,
        epic: 720,
        mythic: 1000,
      };

      oscillator.frequency.setValueAtTime(
        frequencies[key] || 440,
        audioContext.currentTime
      );
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Ignore audio errors (some browsers might not support Web Audio API)
    }
  }

  async toggleAutoCook() {
    try {
      const response = await fetch(
        `/api/player/${this.playerId}/toggle-auto-cook`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        this.showMessage(result.message);
        await this.loadPlayer();
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("Error toggling auto-cook", true);
    }
  }

  async sellFish(fishType, quantity = 1) {
    try {
      const response = await fetch(
        `/api/player/${this.playerId}/sell/${fishType}?quantity=${quantity}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        this.showMessage(result.message);
        await this.loadPlayer();
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("Error selling fish", true);
    }
  }

  async cookFish(fishType, quantity = 1) {
    try {
      const response = await fetch(
        `/api/player/${this.playerId}/cook/${fishType}?quantity=${quantity}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        this.showMessage(result.message);
        await this.loadPlayer();
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("Error cooking fish", true);
    }
  }

  async eatFish(fishType, quantity = 1) {
    try {
      const response = await fetch(
        `/api/player/${this.playerId}/eat/${fishType}?quantity=${quantity}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        this.showMessage(result.message);
        await this.loadPlayer();
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("Error eating fish", true);
    }
  }

  updateUI() {
    if (!this.player) return;

    // Update stats
    document.getElementById("coins").textContent = this.player.coins;

    const healthBar = document.getElementById("health-bar");
    const healthText = document.getElementById("health-text");
    healthBar.style.width = `${this.player.health}%`;
    healthText.textContent = `${this.player.health}/100`;

    const hungerBar = document.getElementById("hunger-bar");
    const hungerText = document.getElementById("hunger-text");
    hungerBar.style.width = `${this.player.hunger}%`;
    hungerText.textContent = `${this.player.hunger}/100`;

    // Update auto-cook button
    const autoCookBtn = document.getElementById("autoCookBtn");
    autoCookBtn.textContent = `🔄 Auto Cook: ${
      this.player.auto_cook_enabled ? "ON" : "OFF"
    }`;

    // Update inventory
    this.updateInventory();
    this.updateCookedFood();
    this.updateShop();
  }

  updateInventory() {
    const inventoryDiv = document.getElementById("inventory");
    inventoryDiv.innerHTML = "";

    if (Object.keys(this.player.inventory).length === 0) {
      inventoryDiv.innerHTML =
        '<p style="text-align: center; color: #636e72;">Inventory kosong</p>';
      return;
    }

    for (const [fishType, quantity] of Object.entries(this.player.inventory)) {
      const fish = this.fishTypes[fishType];
      if (!fish) continue;

      const itemCard = document.createElement("div");
      itemCard.className = `item-card rarity-${fish.rarity}`;
      itemCard.innerHTML = `
                <div class="item-name">${fish.name}</div>
                <div class="item-quantity">Jumlah: ${quantity}</div>
                <div class="item-actions">
                    <button class="item-btn sell-btn" onclick="game.sellFish('${fishType}')">
                        Jual (${fish.sell_price} 💰)
                    </button>
                    <button class="item-btn cook-btn" onclick="game.cookFish('${fishType}')">
                        Masak
                    </button>
                </div>
            `;
      inventoryDiv.appendChild(itemCard);
    }
  }

  updateCookedFood() {
    const cookedFoodDiv = document.getElementById("cookedFood");
    cookedFoodDiv.innerHTML = "";

    if (Object.keys(this.player.cooked_food).length === 0) {
      cookedFoodDiv.innerHTML =
        '<p style="text-align: center; color: #636e72;">Tidak ada makanan</p>';
      return;
    }

    for (const [fishType, quantity] of Object.entries(
      this.player.cooked_food
    )) {
      const fish = this.fishTypes[fishType];
      if (!fish) continue;

      const itemCard = document.createElement("div");
      itemCard.className = `item-card rarity-${fish.rarity}`;
      itemCard.innerHTML = `
                <div class="item-name">${fish.name} (Matang)</div>
                <div class="item-quantity">Jumlah: ${quantity}</div>
                <div class="item-actions">
                    <button class="item-btn eat-btn" onclick="game.eatFish('${fishType}')">
                        Makan (+${fish.hunger_restore} 🍽️)
                    </button>
                </div>
            `;
      cookedFoodDiv.appendChild(itemCard);
    }
  }

  updateShop() {
    const shopDiv = document.getElementById("shop");
    shopDiv.innerHTML = "";

    for (const [fishType, fish] of Object.entries(this.fishTypes)) {
      const itemCard = document.createElement("div");
      itemCard.className = `item-card rarity-${fish.rarity}`;
      itemCard.innerHTML = `
                <div class="item-name">${fish.name}</div>
                <div class="item-quantity">
                    Harga Jual: ${fish.sell_price} 💰<br>
                    Hunger: +${fish.hunger_restore} 🍽️<br>
                    Rarity: ${fish.rarity}
                </div>
            `;
      shopDiv.appendChild(itemCard);
    }
  }

  showMessage(message, isError = false) {
    const messageArea = document.getElementById("messageArea");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${isError ? "error" : ""}`;
    messageDiv.textContent = message;

    messageArea.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }
}

// Initialize game when page loads
let game;
document.addEventListener("DOMContentLoaded", () => {
  game = new FishingGame();
});
