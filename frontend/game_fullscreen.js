class FullscreenFishingGame {
  constructor() {
    this.playerId = this.getOrCreatePlayerId();
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Setup fullscreen canvas
    this.setupCanvas();

    // Game state
    this.fishTypes = {};
    this.player = null;
    this.isFishing = false;
    this.fishingState = "idle";
    this.fishingTimer = 0;
    this.fishingProgress = 0;
    this.fishHooked = false;
    this.fishingLinePos = { x: 0, y: 0 };
    this.bobberPos = { x: 0, y: 0 };
    this.fishStruggle = 0;

    // UI state
    this.showInventory = false;
    this.showCooking = false;
    this.showShop = false;
    this.messages = [];
    this.selectedUIElement = null;

    // Game world settings
    this.tileSize = 32;
    this.worldWidth = 30;
    this.worldHeight = 20;
    this.camera = { x: 0, y: 0 };
    this.playerPos = { x: 5, y: 10 };

    // Mouse and keyboard
    this.mousePos = { x: 0, y: 0 };
    this.keys = {};

    this.initWorld();
    this.init();
  }

  setupCanvas() {
    // Make canvas fullscreen
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    // Handle resize
    window.addEventListener("resize", () => {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    });

    // Mouse events
    this.canvas.addEventListener("mousemove", (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    });

    this.canvas.addEventListener("click", (e) => {
      this.handleClick(e.clientX, e.clientY);
    });

    // Keyboard events
    document.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.handleKeyPress(e);
    });

    document.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
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
    this.startGameLoop();
    this.gameLoop();
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
        return;
      }
      this.player = await response.json();
      // cache to localStorage for offline fallback
      localStorage.setItem(
        `player_${this.playerId}`,
        JSON.stringify(this.player)
      );
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
      this.showMessage("Using local player data (backend unavailable)", false);
    }
  }

  startGameLoop() {
    setInterval(() => {
      this.loadPlayer();
    }, 5000);
  }

  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    // Update messages
    this.messages = this.messages.filter((msg) => Date.now() - msg.time < 3000);

    // Update camera to follow player
    const targetX =
      this.canvas.width / 2 -
      this.playerPos.x * this.tileSize -
      this.tileSize / 2;
    const targetY =
      this.canvas.height / 2 -
      this.playerPos.y * this.tileSize -
      this.tileSize / 2;

    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.1;
  }

  render() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context for world rendering
    this.ctx.save();
    this.ctx.translate(this.camera.x, this.camera.y);

    // Render world
    this.renderWorld();
    this.renderPlayer();
    this.renderNPCs();
    this.renderFishingSpots();

    if (this.isFishing) {
      this.renderFishingLine();
    }

    this.ctx.restore();

    // Render UI (always on top)
    this.renderUI();
  }

  renderUI() {
    // Top bar with player stats
    this.renderTopBar();

    // Bottom action bar
    this.renderActionBar();

    // Side panels
    if (this.showInventory) this.renderInventoryPanel();
    if (this.showCooking) this.renderCookingPanel();
    if (this.showShop) this.renderShopPanel();

    // Messages
    this.renderMessages();

    // Fishing UI
    if (this.isFishing) this.renderFishingUI();
  }

  renderTopBar() {
    if (!this.player) return;

    const barHeight = 60;
    const padding = 20;

    // Background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, barHeight);

    // Border
    this.ctx.strokeStyle = "#4a90e2";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, 0, this.canvas.width, barHeight);

    // Player stats
    this.ctx.fillStyle = "#ecf0f1";
    this.ctx.font = "16px Courier New";

    // Coins
    this.ctx.fillText(`💰 ${this.player.coins}`, padding, 30);

    // Health bar
    const healthX = padding + 120;
    this.renderBar(
      healthX,
      15,
      100,
      20,
      this.player.health,
      100,
      "#e74c3c",
      "❤️"
    );

    // Hunger bar
    const hungerX = healthX + 150;
    this.renderBar(
      hungerX,
      15,
      100,
      20,
      this.player.hunger,
      100,
      "#f39c12",
      "🍽️"
    );

    // Game title
    this.ctx.fillStyle = "#4a90e2";
    this.ctx.font = "bold 20px Courier New";
    this.ctx.textAlign = "center";
    this.ctx.fillText("🎣 Fishing Adventure", this.canvas.width / 2, 35);
    this.ctx.textAlign = "left";
  }

  renderBar(x, y, width, height, current, max, color, icon) {
    // Background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.ctx.fillRect(x, y, width, height);

    // Fill
    const fillWidth = (current / max) * width;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, fillWidth, height);

    // Border
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);

    // Icon and text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "12px Courier New";
    this.ctx.fillText(icon, x - 20, y + 15);
    this.ctx.fillText(`${current}/${max}`, x + 5, y + 15);
  }

  renderActionBar() {
    const barHeight = 80;
    const y = this.canvas.height - barHeight;

    // Background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, y, this.canvas.width, barHeight);

    // Border
    this.ctx.strokeStyle = "#4a90e2";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(0, y, this.canvas.width, barHeight);

    // Action buttons
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonY = y + 20;
    const spacing = 20;

    let buttonX = 20;

    // Fish button
    const fishText = this.getFishButtonText();
    this.renderButton(
      buttonX,
      buttonY,
      buttonWidth,
      buttonHeight,
      fishText,
      "#2ecc71",
      "fish"
    );
    buttonX += buttonWidth + spacing;

    // Auto cook button
    const autoCookText = `🔄 Auto: ${
      this.player?.auto_cook_enabled ? "ON" : "OFF"
    }`;
    this.renderButton(
      buttonX,
      buttonY,
      buttonWidth,
      buttonHeight,
      autoCookText,
      "#f39c12",
      "autocook"
    );
    buttonX += buttonWidth + spacing;

    // Inventory button
    this.renderButton(
      buttonX,
      buttonY,
      buttonWidth,
      buttonHeight,
      "🎒 Inventory",
      "#3498db",
      "inventory"
    );
    buttonX += buttonWidth + spacing;

    // Cooking button
    this.renderButton(
      buttonX,
      buttonY,
      buttonWidth,
      buttonHeight,
      "🍳 Cooking",
      "#e67e22",
      "cooking"
    );
    buttonX += buttonWidth + spacing;

    // Shop button
    this.renderButton(
      buttonX,
      buttonY,
      buttonWidth,
      buttonHeight,
      "🏪 Shop",
      "#9b59b6",
      "shop"
    );

    // Instructions
    this.ctx.fillStyle = "#bdc3c7";
    this.ctx.font = "12px Courier New";
    this.ctx.textAlign = "right";
    this.ctx.fillText(
      "WASD: Move | E: Interact | Space: Fish | Click: UI",
      this.canvas.width - 20,
      y + 60
    );
    this.ctx.textAlign = "left";
  }

  getFishButtonText() {
    switch (this.fishingState) {
      case "casting":
        return "🎣 Casting...";
      case "waiting":
        return "🎣 Waiting...";
      case "hooked":
        return "🎣 FISH ON!";
      case "reeling":
        return "🎣 Reel In!";
      default:
        return "🎣 Fish";
    }
  }

  renderButton(x, y, width, height, text, color, id) {
    // Button background
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);

    // Button border
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);

    // Button text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "12px Courier New";
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, x + width / 2, y + height / 2 + 4);
    this.ctx.textAlign = "left";

    // Store button bounds for click detection
    if (!this.buttons) this.buttons = {};
    this.buttons[id] = { x, y, width, height };
  }

  renderMessages() {
    const startY = 80;
    this.messages.forEach((msg, index) => {
      const y = startY + index * 40;
      const alpha = Math.max(0, 1 - (Date.now() - msg.time) / 3000);

      this.ctx.globalAlpha = alpha;

      // Message background
      this.ctx.fillStyle = msg.isError
        ? "rgba(231, 76, 60, 0.9)"
        : "rgba(46, 204, 113, 0.9)";
      this.ctx.fillRect(this.canvas.width - 320, y, 300, 30);

      // Message text
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "12px Courier New";
      this.ctx.fillText(msg.text, this.canvas.width - 310, y + 20);

      this.ctx.globalAlpha = 1;
    });
  }

  // Continue with more rendering methods...
  // (I'll continue in the next part due to length limits)

  handleClick(x, y) {
    // Check button clicks
    if (this.buttons) {
      for (const [id, button] of Object.entries(this.buttons)) {
        if (
          x >= button.x &&
          x <= button.x + button.width &&
          y >= button.y &&
          y <= button.y + button.height
        ) {
          this.handleButtonClick(id);
          return;
        }
      }
    }

    // Check panel clicks
    if (this.showInventory || this.showCooking || this.showShop) {
      // Handle panel interactions
      return;
    }
  }

  handleButtonClick(buttonId) {
    switch (buttonId) {
      case "fish":
        this.goFishing();
        break;
      case "autocook":
        this.toggleAutoCook();
        break;
      case "inventory":
        this.showInventory = !this.showInventory;
        this.showCooking = false;
        this.showShop = false;
        break;
      case "cooking":
        this.showCooking = !this.showCooking;
        this.showInventory = false;
        this.showShop = false;
        break;
      case "shop":
        this.showShop = !this.showShop;
        this.showInventory = false;
        this.showCooking = false;
        break;
    }
  }

  handleKeyPress(e) {
    const newPos = { ...this.playerPos };

    switch (e.key.toLowerCase()) {
      case "w":
      case "arrowup":
        newPos.y--;
        break;
      case "s":
      case "arrowdown":
        newPos.y++;
        break;
      case "a":
      case "arrowleft":
        newPos.x--;
        break;
      case "d":
      case "arrowright":
        newPos.x++;
        break;
      case " ":
        e.preventDefault();
        this.goFishing();
        return;
      case "e":
        this.interactWithNPC();
        return;
      case "i":
        this.showInventory = !this.showInventory;
        return;
      case "escape":
        this.showInventory = false;
        this.showCooking = false;
        this.showShop = false;
        return;
    }

    if (this.isValidPosition(newPos)) {
      this.playerPos = newPos;
    }
  }

  showMessage(text, isError = false) {
    this.messages.push({
      text: text,
      time: Date.now(),
      isError: isError,
    });

    // Keep only last 5 messages
    if (this.messages.length > 5) {
      this.messages.shift();
    }
  }

  // World and tile system (copy from original)
  initWorld() {
    this.TILES = {
      GRASS: 0,
      WATER: 1,
      STONE: 2,
      DOCK: 3,
      TREE: 4,
      FLOWER: 5,
      BRIDGE: 6,
      SAND: 7,
      DEEP_WATER: 8,
      SHALLOW_WATER: 9,
      CLIFF: 10,
      ROCK: 11,
      BUSH: 12,
      DARK_TREE: 13,
      LIGHT_GRASS: 14,
      DIRT: 15,
      SHORE: 16,
    };

    this.npcs = [
      { x: 3, y: 8, type: "fishmonger", name: "Ariel" },
      { x: 7, y: 8, type: "rodshop", name: "Cangcang" },
      { x: 5, y: 6, type: "cook", name: "Riko" },
      { x: 10, y: 9, type: "guide", name: "Stephanie" },
    ];

    this.fishingSpots = [
      { x: 19, y: 8 },
      { x: 19, y: 10 },
      { x: 19, y: 12 },
      { x: 15, y: 6 },
      { x: 15, y: 12 },
      { x: 10, y: 5 },
      { x: 10, y: 14 },
    ];

    // Create world (simplified version)
    this.world = [];
    for (let y = 0; y < this.worldHeight; y++) {
      this.world[y] = [];
      for (let x = 0; x < this.worldWidth; x++) {
        this.world[y][x] = this.TILES.DEEP_WATER;
      }
    }

    // Create islands
    for (let y = 4; y < 16; y++) {
      for (let x = 1; x < 9; x++) {
        this.world[y][x] = this.TILES.GRASS;
      }
    }

    for (let y = 4; y < 16; y++) {
      for (let x = 21; x < 29; x++) {
        this.world[y][x] = this.TILES.GRASS;
      }
    }

    // Bridge
    for (let x = 10; x < 21; x++) {
      for (let y = 9; y < 11; y++) {
        this.world[y][x] = this.TILES.BRIDGE;
      }
    }
  }

  renderWorld() {
    for (let y = 0; y < this.worldHeight; y++) {
      for (let x = 0; x < this.worldWidth; x++) {
        const tile = this.world[y][x];
        this.renderTile(x, y, tile);
      }
    }
  }

  renderTile(x, y, tileType) {
    const pixelX = x * this.tileSize;
    const pixelY = y * this.tileSize;

    switch (tileType) {
      case this.TILES.GRASS:
        this.ctx.fillStyle = "#4ade80";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        break;
      case this.TILES.WATER:
      case this.TILES.DEEP_WATER:
        this.ctx.fillStyle = "#1e40af";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        break;
      case this.TILES.BRIDGE:
        this.ctx.fillStyle = "#d4af37";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        break;
      default:
        this.ctx.fillStyle = "#4ade80";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
    }
  }

  renderPlayer() {
    const pixelX = this.playerPos.x * this.tileSize;
    const pixelY = this.playerPos.y * this.tileSize;

    // Player body
    this.ctx.fillStyle = "#3498db";
    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 16, pixelY + 20, 8, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Player head
    this.ctx.fillStyle = "#f4d1ae";
    this.ctx.beginPath();
    this.ctx.arc(pixelX + 16, pixelY + 12, 6, 0, Math.PI * 2);
    this.ctx.fill();
  }

  renderNPCs() {
    this.npcs.forEach((npc) => {
      const pixelX = npc.x * this.tileSize;
      const pixelY = npc.y * this.tileSize;

      let bodyColor = "#e74c3c";
      if (npc.type === "fishmonger") bodyColor = "#3498db";
      if (npc.type === "rodshop") bodyColor = "#f39c12";
      if (npc.type === "cook") bodyColor = "#2ecc71";
      if (npc.type === "guide") bodyColor = "#9b59b6";

      // NPC body
      this.ctx.fillStyle = bodyColor;
      this.ctx.beginPath();
      this.ctx.ellipse(pixelX + 16, pixelY + 20, 8, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // NPC head
      this.ctx.fillStyle = "#f4d1ae";
      this.ctx.beginPath();
      this.ctx.arc(pixelX + 16, pixelY + 12, 6, 0, Math.PI * 2);
      this.ctx.fill();

      // NPC name label
      this.ctx.fillStyle = "#000000";
      this.ctx.font = "10px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(npc.name, pixelX + 16, pixelY - 6);

      // Show 'Press E' when player is near
      const distance =
        Math.abs(this.playerPos.x - npc.x) + Math.abs(this.playerPos.y - npc.y);
      if (distance <= 1) {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        this.ctx.fillRect(pixelX - 10, pixelY - 18, 52, 16);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "12px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("Press E", pixelX + 16, pixelY - 6);
      }
    });
  }

  renderFishingSpots() {
    this.fishingSpots.forEach((spot) => {
      const pixelX = spot.x * this.tileSize;
      const pixelY = spot.y * this.tileSize;

      const time = Date.now() * 0.003;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time) * 0.3})`;
      this.ctx.fillRect(pixelX + 12, pixelY + 12, 8, 8);
    });
  }

  renderFishingLine() {
    // Simplified fishing line rendering
    if (this.fishingState === "idle") return;

    const playerPixelX = this.playerPos.x * this.tileSize + 16;
    const playerPixelY = this.playerPos.y * this.tileSize + 16;

    this.ctx.strokeStyle = "#8B4513";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(playerPixelX, playerPixelY);
    this.ctx.lineTo(this.bobberPos.x, this.bobberPos.y);
    this.ctx.stroke();

    // Bobber
    this.ctx.fillStyle = this.fishHooked ? "#FF4444" : "#FF6B6B";
    this.ctx.beginPath();
    this.ctx.arc(this.bobberPos.x, this.bobberPos.y, 4, 0, Math.PI * 2);
    this.ctx.fill();
  }

  renderFishingUI() {
    if (this.fishingState === "idle") return;

    const panelWidth = 300;
    const panelHeight = 100;
    const x = (this.canvas.width - panelWidth) / 2;
    const y = 100;

    // Panel background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(x, y, panelWidth, panelHeight);

    // Panel border
    this.ctx.strokeStyle = "#4a90e2";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, panelWidth, panelHeight);

    // Fishing state text
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "16px Courier New";
    this.ctx.textAlign = "center";
    this.ctx.fillText(this.getFishButtonText(), x + panelWidth / 2, y + 30);

    // Progress bar (if reeling)
    if (this.fishingState === "reeling") {
      const barWidth = 200;
      const barHeight = 20;
      const barX = x + (panelWidth - barWidth) / 2;
      const barY = y + 50;

      // Progress bar background
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      this.ctx.fillRect(barX, barY, barWidth, barHeight);

      // Progress bar fill
      this.ctx.fillStyle = "#2ecc71";
      this.ctx.fillRect(barX, barY, barWidth * this.fishingProgress, barHeight);

      // Progress bar border
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    this.ctx.textAlign = "left";
  }

  renderInventoryPanel() {
    this.renderPanel("Inventory", this.player?.inventory || {}, "inventory");
  }

  renderCookingPanel() {
    this.renderPanel("Cooked Food", this.player?.cooked_food || {}, "cooking");
  }

  renderShopPanel() {
    this.renderPanel("Fish Shop", this.fishTypes, "shop");
  }

  renderPanel(title, items, type) {
    const panelWidth = 400;
    const panelHeight = 500;
    const x = this.canvas.width - panelWidth - 20;
    const y = 80;

    // Panel background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    this.ctx.fillRect(x, y, panelWidth, panelHeight);

    // Panel border
    this.ctx.strokeStyle = "#4a90e2";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, panelWidth, panelHeight);

    // Panel title
    this.ctx.fillStyle = "#4a90e2";
    this.ctx.font = "bold 16px Courier New";
    this.ctx.textAlign = "center";
    this.ctx.fillText(title, x + panelWidth / 2, y + 25);

    // Items
    let itemY = y + 50;
    const itemHeight = 40;

    for (const [key, value] of Object.entries(items)) {
      if (itemY > y + panelHeight - 50) break;

      const fish = type === "shop" ? value : this.fishTypes[key];
      if (!fish) continue;

      // Item background
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      this.ctx.fillRect(x + 10, itemY, panelWidth - 20, itemHeight);

      // Item text
      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "12px Courier New";
      this.ctx.textAlign = "left";

      if (type === "shop") {
        this.ctx.fillText(
          `${fish.name} - ${fish.sell_price}💰`,
          x + 20,
          itemY + 20
        );
      } else {
        this.ctx.fillText(`${fish.name} x${value}`, x + 20, itemY + 20);
      }

      itemY += itemHeight + 5;
    }

    this.ctx.textAlign = "left";
  }

  // Game logic methods
  isValidPosition(pos) {
    if (
      pos.x < 0 ||
      pos.x >= this.worldWidth ||
      pos.y < 0 ||
      pos.y >= this.worldHeight
    ) {
      return false;
    }

    const tile = this.world[pos.y][pos.x];
    const walkableTiles = [
      this.TILES.GRASS,
      this.TILES.STONE,
      this.TILES.DOCK,
      this.TILES.BRIDGE,
    ];
    return walkableTiles.includes(tile);
  }

  isNearWater() {
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    return directions.some((dir) => {
      const checkX = this.playerPos.x + dir.x;
      const checkY = this.playerPos.y + dir.y;

      if (
        checkX >= 0 &&
        checkX < this.worldWidth &&
        checkY >= 0 &&
        checkY < this.worldHeight
      ) {
        const tile = this.world[checkY][checkX];
        return tile === this.TILES.WATER || tile === this.TILES.DEEP_WATER;
      }
      return false;
    });
  }

  async goFishing() {
    if (!this.isNearWater()) {
      this.showMessage("Move closer to water to fish!");
      return;
    }

    if (this.fishingState === "idle") {
      this.startFishing();
    } else if (this.fishingState === "hooked") {
      this.reelInFish();
    } else if (this.fishingState === "reeling") {
      this.pullFish();
    }
  }

  startFishing() {
    this.isFishing = true;
    this.fishingState = "casting";
    this.fishingProgress = 0;

    // Set bobber position
    this.bobberPos.x = this.playerPos.x * this.tileSize + 16;
    this.bobberPos.y = (this.playerPos.y - 1) * this.tileSize + 16;

    setTimeout(() => {
      this.fishingState = "waiting";
      this.waitForFish();
    }, 1000);
  }

  waitForFish() {
    const waitTime = 2000 + Math.random() * 6000;
    setTimeout(() => {
      if (this.fishingState === "waiting") {
        this.fishBite();
      }
    }, waitTime);
  }

  fishBite() {
    this.fishingState = "hooked";
    this.fishHooked = true;
    this.fishStruggle = 0.5 + Math.random() * 0.5;

    this.showMessage("Fish on the line! Click to reel it in!");

    setTimeout(() => {
      if (this.fishingState === "hooked") {
        this.fishEscaped();
      }
    }, 3000);
  }

  reelInFish() {
    if (this.fishingState !== "hooked") return;

    this.fishingState = "reeling";
    this.fishingProgress = 0;
    this.showMessage("Keep clicking to reel in the fish!");
  }

  pullFish() {
    if (this.fishingState !== "reeling") return;

    const pullStrength = 0.15 + Math.random() * 0.1;
    this.fishingProgress += pullStrength;
    this.fishingProgress -= this.fishStruggle * 0.05;
    this.fishingProgress = Math.max(0, this.fishingProgress);

    if (this.fishingProgress >= 1.0) {
      this.catchFish();
    }

    this.fishStruggle *= 0.98;
  }

  async catchFish() {
    this.fishingState = "idle";
    this.isFishing = false;
    this.fishHooked = false;

    try {
      const response = await fetch(`/api/player/${this.playerId}/fish`, {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const fishName = result.fish?.name || result.message || "Fish";
        const rarity = result.rarity_category || result.fish?.category || "";
        this.showMessage(
          `Berhasil menangkap ${fishName}${rarity ? " (" + rarity + ")" : ""}`
        );
        await this.loadPlayer();
      } else {
        this.showMessage(result.message || "No fish caught");
      }
    } catch (error) {
      this.showMessage("Error while fishing", true);
    }
  }

  fishEscaped() {
    this.fishingState = "idle";
    this.isFishing = false;
    this.fishHooked = false;
    this.showMessage("The fish got away! Try again.");
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
      }
    } catch (error) {
      this.showMessage("Error toggling auto-cook", true);
    }
  }

  interactWithNPC() {
    const nearbyNPC = this.npcs.find((npc) => {
      const distance =
        Math.abs(this.playerPos.x - npc.x) + Math.abs(this.playerPos.y - npc.y);
      return distance <= 1;
    });

    if (nearbyNPC) {
      switch (nearbyNPC.type) {
        case "fishmonger":
          this.showMessage(`${nearbyNPC.name}: Use inventory to sell fish!`);
          this.showShop = true;
          break;
        case "rodshop":
          this.showMessage(`${nearbyNPC.name}: Better rods coming soon!`);
          break;
        case "cook":
          this.showMessage(
            `${nearbyNPC.name}: Use cooking panel to cook fish!`
          );
          this.showCooking = true;
          break;
        case "guide":
          // Guide should display the exact message requested
          this.showMessage("Welcome to Fish Land");
          break;
      }
    }
  }
}

// Initialize game when page loads
let game;
document.addEventListener("DOMContentLoaded", () => {
  game = new FullscreenFishingGame();
});
