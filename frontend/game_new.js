console.log("🎮 Game script loading...");

class PixelFishingGame {
  constructor() {
    console.log("🎮 PixelFishingGame constructor started");
    this.playerId = this.getOrCreatePlayerId();
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.fishTypes = {};
    this.player = null;
    this.isFishing = false;
    this.fishingState = "idle"; // idle, casting, waiting, hooked, reeling
    this.fishingTimer = 0;
    this.fishingProgress = 0;
    this.fishHooked = false;
    this.fishingLinePos = { x: 0, y: 0 };
    this.bobberPos = { x: 0, y: 0 };
    this.fishStruggle = 0;
    this.fishingTimeout = null; // Untuk cancel fishing
    this.lastClickTime = 0; // Track last click during reeling
    this.reelingClickHandler = null; // Store click handler reference

    // Inventory system
    this.equippedItem = null; // Item yang sedang dipegang/equipped
    this.equippedRod = null; // Rod yang sedang di-equip untuk fishing
    this.playerInventory = {
      rods: [
        { id: "basic_rod", name: "Basic Rod", equipped: true, power: 1.0 },
      ],
      items: [], // Fish, cooked food, etc from server
    };

    // Hotbar (1 slot for equipped rod + 4 slots for items)
    this.hotbarSlots = [null, null, null, null, null]; // [rod, item1, item2, item3, item4]
    this.equippedHotbarSlot = -1; // Which slot is currently equipped (-1 = none)

    // Track items in hotbar slots (deducted from bag)
    // Format: { fish_id: quantity_in_slots }
    this.itemsInHotbar = {};

    // Favorite fish (cannot be sold)
    // Format: { fish_id: true }
    this.favoriteFish = {};

    // Favorite mode toggle
    this.favoriteMode = false;

    // Game world settings
    this.tileSize = 32;
    this.worldWidth = 50; // Diperbesar untuk Pulau Baraju
    this.worldHeight = 45; // Diperbesar untuk Pulau Baraju
    this.camera = { x: 0, y: 0 };
    this.playerPos = { x: 5, y: 12 }; // Start di Pulau 1 (adjusted)
    this.fishingSpots = [
      { x: 19, y: 10 },
      { x: 19, y: 12 },
      { x: 19, y: 14 }, // Near docks
      { x: 15, y: 8 },
      { x: 15, y: 16 }, // Mid water
      { x: 10, y: 7 },
      { x: 10, y: 17 }, // Bridge area water
      // Danau di pulau 2
      { x: 32, y: 11 },
      { x: 34, y: 11 },
      { x: 33, y: 10 },
      { x: 33, y: 12 },
      { x: 32, y: 13 },
      { x: 34, y: 13 },
      // Pulau Baraju - Fire zone lava spots
      { x: 25, y: 32 },
      { x: 27, y: 33 },
      { x: 26, y: 35 },
      // Pulau Baraju - Ice zone frozen water spots
      { x: 38, y: 32 },
      { x: 40, y: 33 },
      { x: 39, y: 35 },
    ];

    // Tile types
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
      BARRIER: 17, // Penghalang untuk pulau kedua
      MARBLE: 18, // Tile mewah untuk pulau 2
      GOLDEN_PATH: 19, // Path emas untuk pulau 2
      SHOP_WALL: 20, // Dinding toko
      SHOP_ROOF: 21, // Atap toko
      CASTLE_WALL: 22, // Dinding istana
      CASTLE_ROOF: 23, // Atap istana
      WATER_BARRIER: 24, // Invisible barrier di air
      LAVA: 25, // Lava tile untuk zona api
      VOLCANIC_ROCK: 26, // Batuan vulkanik hitam
      ICE: 27, // Ice tile untuk zona es
      SNOW: 28, // Snow tile
      FROZEN_WATER: 29, // Air beku untuk fishing spot
      ASH: 30, // Abu vulkanik
      ICE_CRYSTAL: 31, // Kristal es
    };

    // NPCs
    this.npcs = [
      { x: 3, y: 9, type: "fishmonger", name: "Riko" }, // Di depan toko
      { x: 7, y: 9, type: "rodshop", name: "Matthew" }, // Di depan toko
      { x: 5, y: 15, type: "cook", name: "Stephanie" }, // Di depan toko
      { x: 14, y: 10, type: "guide", name: "Ariel" }, // Di istana
    ];

    // Cooking menu - Jenis masakan yang bisa dibeli dari NPC Cook (Stephanie)
    this.cookingMenu = {
      ikan_bakar: {
        name: "Ikan Bakar",
        price: 30, // Harga masak
        hungerRestore: 15,
        icon: "🐟🔥",
        description: "Ikan yang dibakar sempurna",
      },
      gulai_ikan: {
        name: "Gulai Ikan",
        price: 50, // Harga masak
        hungerRestore: 7,
        icon: "🍛",
        description: "Ikan dengan kuah gulai nikmat",
      },
      sushi: {
        name: "Sushi",
        price: 80, // Harga masak
        hungerRestore: 20,
        icon: "🍣",
        description: "Sushi ikan segar premium",
      },
    };

    this.currentRod = "basic"; // Player's current fishing rod
    this.ownedRods = ["basic"]; // Rods that player owns
    this.rodTypes = {
      basic: {
        name: "Basic Rod",
        price: 0,
        catchBonus: 1.0,
        icon: "🎣",
        description: "Rod pemula yang sederhana",
      },
      wooden: {
        name: "Wooden Rod",
        price: 150,
        catchBonus: 1.2,
        icon: "🪵",
        description: "Rod kayu yang lebih kuat",
      },
      iron: {
        name: "Iron Rod",
        price: 500,
        catchBonus: 1.5,
        icon: "⚙️",
        description: "Rod besi dengan catch rate bagus",
      },
      golden: {
        name: "Golden Rod",
        price: 2000,
        catchBonus: 2.0,
        icon: "✨",
        description: "Rod emas dengan catch rate excellent",
      },
      mythic: {
        name: "Mythic Rod",
        price: 10000,
        catchBonus: 3.0,
        icon: "🌟",
        description: "Rod legendaris untuk ikan rare",
      },
      secret: {
        name: "Secret Rod",
        price: 50000,
        catchBonus: 5.0,
        icon: "🔮",
        description: "Rod rahasia untuk ikan Secret di Pulau Baraju",
      },
    };

    this.initWorld();
    this.resizeCanvas();
    this.init();

    // Setup background music
    this.setupMusic();

    // Auto-resize canvas saat window di-resize
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  setupMusic() {
    /**Setup and play background music*/
    const bgMusic = document.getElementById("bgMusic");
    if (bgMusic) {
      bgMusic.volume = 0.15; // Set volume to 15%
      bgMusic.muted = false; // Unmute audio

      // Try to autoplay immediately
      const playPromise = bgMusic.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("🎵 Musik background berhasil diputar!");
          })
          .catch((err) => {
            console.log(
              "⚠️ Autoplay terblokir, tunggu user interaction...",
              err,
            );
            // Setup trigger untuk play musik saat user klik/interact
            const playOnInteraction = () => {
              bgMusic.muted = false;
              bgMusic
                .play()
                .then(() => {
                  console.log("🎵 Musik diputar setelah user interaction!");
                })
                .catch((e) => console.error("Gagal play musik:", e));
              // Remove listeners setelah musik mulai
              document.removeEventListener("click", playOnInteraction);
              document.removeEventListener("keydown", playOnInteraction);
            };

            document.addEventListener("click", playOnInteraction);
            document.addEventListener("keydown", playOnInteraction);
          });
      }
    } else {
      console.warn("❌ Audio element 'bgMusic' tidak ditemukan di HTML!");
    }
  }

  resizeCanvas() {
    // Dapatkan ukuran viewport
    const viewport = document.querySelector(".game-viewport");
    const rect = viewport.getBoundingClientRect();

    // Set canvas size ke viewport size untuk fullscreen
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    // Zoom lebih dekat - tile size lebih besar
    this.tileSize = 48; // Lebih besar = zoom in lebih dekat (default: 32)
  }

  initWorld() {
    this.world = [];

    // Initialize all as deep water
    for (let y = 0; y < this.worldHeight; y++) {
      this.world[y] = [];
      for (let x = 0; x < this.worldWidth; x++) {
        this.world[y][x] = this.TILES.DEEP_WATER;
      }
    }

    // Create shallow water around islands
    for (let y = 5; y < 20; y++) {
      for (let x = 0; x < 45; x++) {
        if (x < 10 || x > 20) {
          this.world[y][x] = this.TILES.SHALLOW_WATER;
        }
      }
    }

    // Create Pulau 1 (left island) - BASIC ISLAND
    for (let y = 6; y < 19; y++) {
      for (let x = 1; x < 9; x++) {
        // Create terrain variation
        if (y < 8 || y > 16) {
          this.world[y][x] = this.TILES.LIGHT_GRASS;
        } else {
          this.world[y][x] = this.TILES.GRASS;
        }
      }
    }

    // Add sandy shores around Pulau 1
    for (let y = 6; y < 19; y++) {
      this.world[y][0] = this.TILES.SAND;
      this.world[y][9] = this.TILES.SAND;
    }
    for (let x = 1; x < 9; x++) {
      this.world[5][x] = this.TILES.SAND;
      this.world[19][x] = this.TILES.SAND;
    }

    // Create Pulau 2 (right island) - LUXURY ISLAND (BIGGER & FANCIER)
    // Main luxury island area with marble/golden tiles
    for (let y = 4; y < 21; y++) {
      for (let x = 24; x < 42; x++) {
        // Skip danau area (tengah pulau)
        if (x >= 31 && x <= 35 && y >= 9 && y <= 15) {
          continue; // Will be filled with lake
        }

        // Border tiles - Marble/Stone pattern (mewah & walkable)
        if (y < 6 || y > 18 || x < 26 || x > 39) {
          // Checkerboard pattern untuk border mewah
          if ((x + y) % 2 === 0) {
            this.world[y][x] = this.TILES.MARBLE;
          } else {
            this.world[y][x] = this.TILES.STONE;
          }
        }
        // Marble flooring (luxury tiles)
        else if ((x + y) % 3 === 0) {
          this.world[y][x] = this.TILES.MARBLE;
        }
        // Light grass patches
        else {
          this.world[y][x] = this.TILES.LIGHT_GRASS;
        }
      }
    }

    // Create DANAU (Lake) di tengah Pulau 2
    // Outer shallow water
    for (let y = 9; y < 16; y++) {
      for (let x = 31; x < 36; x++) {
        this.world[y][x] = this.TILES.SHALLOW_WATER;
      }
    }
    // Inner deep water
    for (let y = 10; y < 15; y++) {
      for (let x = 32; x < 35; x++) {
        this.world[y][x] = this.TILES.WATER;
      }
    }

    // Add sandy shores around Pulau 2 (luxury beach)
    for (let y = 4; y < 21; y++) {
      if (this.world[y][23]) this.world[y][23] = this.TILES.SAND;
      if (this.world[y][42]) this.world[y][42] = this.TILES.SAND;
    }
    for (let x = 24; x < 42; x++) {
      if (this.world[3] && this.world[3][x]) this.world[3][x] = this.TILES.SAND;
      if (this.world[21] && this.world[21][x])
        this.world[21][x] = this.TILES.SAND;
    }

    // Create Bridge (jembatan) - horizontal connection (extended)
    for (let x = 10; x < 24; x++) {
      for (let y = 11; y < 13; y++) {
        this.world[y][x] = this.TILES.BRIDGE;
      }
    }

    // Add barrier di tengah jembatan (blok akses ke pulau 2 tanpa Golden Rod)
    for (let y = 11; y < 13; y++) {
      this.world[y][16] = this.TILES.BARRIER; // Moved to new center
    }

    // Add stone paths on Pulau 1
    for (let x = 2; x < 8; x++) {
      this.world[12][x] = this.TILES.STONE;
    }

    // Add GOLDEN PATHS on Pulau 2 (mewah!)
    // Path mengelilingi danau
    for (let x = 30; x < 37; x++) {
      if (
        this.world[8] &&
        this.world[8][x] &&
        this.world[8][x] !== this.TILES.SHALLOW_WATER
      ) {
        this.world[8][x] = this.TILES.GOLDEN_PATH;
      }
      if (
        this.world[16] &&
        this.world[16][x] &&
        this.world[16][x] !== this.TILES.SHALLOW_WATER
      ) {
        this.world[16][x] = this.TILES.GOLDEN_PATH;
      }
    }
    for (let y = 9; y < 16; y++) {
      if (this.world[y][30] && this.world[y][30] !== this.TILES.SHALLOW_WATER) {
        this.world[y][30] = this.TILES.GOLDEN_PATH;
      }
      if (this.world[y][36] && this.world[y][36] !== this.TILES.SHALLOW_WATER) {
        this.world[y][36] = this.TILES.GOLDEN_PATH;
      }
    }

    // Main golden path from bridge to center
    for (let x = 24; x < 33; x++) {
      if (this.world[12][x] && this.world[12][x] !== this.TILES.CLIFF) {
        this.world[12][x] = this.TILES.GOLDEN_PATH;
      }
    }

    // === BUILDINGS & STRUCTURES ===

    // TOKO RIKO (Fishmonger) - Position (3, 9)
    // Roof
    this.world[7][2] = this.TILES.SHOP_ROOF;
    this.world[7][3] = this.TILES.SHOP_ROOF;
    this.world[7][4] = this.TILES.SHOP_ROOF;
    // Walls
    this.world[8][2] = this.TILES.SHOP_WALL;
    this.world[8][4] = this.TILES.SHOP_WALL;
    // Floor (stone)
    this.world[9][2] = this.TILES.STONE;
    this.world[9][3] = this.TILES.STONE; // NPC berdiri disini
    this.world[9][4] = this.TILES.STONE;

    // TOKO MATTHEW (Rod Shop) - Position (7, 9)
    // Roof
    this.world[7][6] = this.TILES.SHOP_ROOF;
    this.world[7][7] = this.TILES.SHOP_ROOF;
    this.world[7][8] = this.TILES.SHOP_ROOF;
    // Walls
    this.world[8][6] = this.TILES.SHOP_WALL;
    this.world[8][8] = this.TILES.SHOP_WALL;
    // Floor (stone)
    this.world[9][6] = this.TILES.STONE;
    this.world[9][7] = this.TILES.STONE; // NPC berdiri disini
    this.world[9][8] = this.TILES.STONE;

    // TOKO STEPHANIE (Cook) - Position (5, 15)
    // Roof
    this.world[13][4] = this.TILES.SHOP_ROOF;
    this.world[13][5] = this.TILES.SHOP_ROOF;
    this.world[13][6] = this.TILES.SHOP_ROOF;
    // Walls
    this.world[14][4] = this.TILES.SHOP_WALL;
    this.world[14][6] = this.TILES.SHOP_WALL;
    // Floor (stone)
    this.world[15][4] = this.TILES.STONE;
    this.world[15][5] = this.TILES.STONE; // NPC berdiri disini
    this.world[15][6] = this.TILES.STONE;

    // ISTANA ARIEL (Water Palace) - Position (14, 10) di atas air
    // Castle structure (3x3)
    // Roof layer
    this.world[8][13] = this.TILES.CASTLE_ROOF;
    this.world[8][14] = this.TILES.CASTLE_ROOF;
    this.world[8][15] = this.TILES.CASTLE_ROOF;
    // Wall layer
    this.world[9][13] = this.TILES.CASTLE_WALL;
    this.world[9][14] = this.TILES.CASTLE_WALL;
    this.world[9][15] = this.TILES.CASTLE_WALL;
    // Floor (marble untuk istana)
    this.world[10][13] = this.TILES.MARBLE;
    this.world[10][14] = this.TILES.MARBLE; // NPC berdiri disini
    this.world[10][15] = this.TILES.MARBLE;

    // === WATER BARRIERS (Invisible, sejajar dengan barrier darat) ===
    // Barrier di air pada x=16, dari y=8 sampai y=10 (sejajar dengan barrier darat y=11-13)
    for (let y = 8; y <= 10; y++) {
      if (
        this.world[y][16] === this.TILES.DEEP_WATER ||
        this.world[y][16] === this.TILES.SHALLOW_WATER
      ) {
        this.world[y][16] = this.TILES.WATER_BARRIER;
      }
    }

    // Rich decorations on Pulau 1 (Basic Island)
    this.world[7][3] = this.TILES.TREE;
    this.world[7][7] = this.TILES.DARK_TREE;
    this.world[9][2] = this.TILES.BUSH;
    this.world[9][8] = this.TILES.BUSH;
    this.world[14][2] = this.TILES.TREE;
    this.world[14][8] = this.TILES.DARK_TREE;
    this.world[16][4] = this.TILES.ROCK;
    this.world[16][6] = this.TILES.ROCK;
    this.world[8][5] = this.TILES.FLOWER;
    this.world[10][3] = this.TILES.FLOWER;
    this.world[13][7] = this.TILES.FLOWER;
    this.world[15][5] = this.TILES.FLOWER;

    // LUXURY Decorations on Pulau 2 (Many more decorations!)
    // Trees in corners
    this.world[6][27] = this.TILES.DARK_TREE;
    this.world[6][38] = this.TILES.DARK_TREE;
    this.world[18][27] = this.TILES.DARK_TREE;
    this.world[18][38] = this.TILES.DARK_TREE;

    // Flowers around lake
    this.world[9][29] = this.TILES.FLOWER;
    this.world[11][29] = this.TILES.FLOWER;
    this.world[13][29] = this.TILES.FLOWER;
    this.world[15][29] = this.TILES.FLOWER;
    this.world[9][37] = this.TILES.FLOWER;
    this.world[11][37] = this.TILES.FLOWER;
    this.world[13][37] = this.TILES.FLOWER;
    this.world[15][37] = this.TILES.FLOWER;
    this.world[7][32] = this.TILES.FLOWER;
    this.world[7][34] = this.TILES.FLOWER;
    this.world[17][32] = this.TILES.FLOWER;
    this.world[17][34] = this.TILES.FLOWER;

    // Decorative rocks
    this.world[10][27] = this.TILES.ROCK;
    this.world[14][27] = this.TILES.ROCK;
    this.world[10][38] = this.TILES.ROCK;
    this.world[14][38] = this.TILES.ROCK;

    // Bushes for greenery
    this.world[7][28] = this.TILES.BUSH;
    this.world[7][37] = this.TILES.BUSH;
    this.world[17][28] = this.TILES.BUSH;
    this.world[17][37] = this.TILES.BUSH;

    // Extra luxury decor on Pulau 2
    this.world[6][31] = this.TILES.FLOWER;
    this.world[6][35] = this.TILES.FLOWER;
    this.world[7][29] = this.TILES.BUSH;
    this.world[7][36] = this.TILES.BUSH;
    this.world[10][30] = this.TILES.ROCK;
    this.world[10][36] = this.TILES.ROCK;
    this.world[14][30] = this.TILES.ROCK;
    this.world[14][36] = this.TILES.ROCK;
    this.world[17][31] = this.TILES.FLOWER;
    this.world[17][35] = this.TILES.FLOWER;

    // Add some rocks in water between islands
    this.world[8][16] = this.TILES.ROCK;
    this.world[12][15] = this.TILES.ROCK;
    this.world[16][16] = this.TILES.ROCK;
    this.world[11][18] = this.TILES.ROCK;

    // ===================================================
    // PULAU BARAJU (Pulau 3) - Fire & Ice Island (BIGGER)
    // ===================================================

    // Create shallow water around Pulau Baraju
    for (let y = 26; y < 42; y++) {
      for (let x = 20; x < 46; x++) {
        this.world[y][x] = this.TILES.SHALLOW_WATER;
      }
    }

    // === FIRE ZONE (Left side) ===
    // Volcanic terrain with lava and ash
    for (let y = 28; y < 40; y++) {
      for (let x = 22; x < 33; x++) {
        // Ash base terrain
        if ((x + y) % 3 === 0) {
          this.world[y][x] = this.TILES.ASH;
        } else {
          this.world[y][x] = this.TILES.VOLCANIC_ROCK;
        }
      }
    }

    // Lava pools in fire zone (fishing spots) - enlarged
    for (let y = 30; y < 39; y++) {
      for (let x = 23; x < 31; x++) {
        if (y >= 31 && y <= 37 && x >= 24 && x <= 30) {
          this.world[y][x] = this.TILES.LAVA;
        }
      }
    }

    // === ICE ZONE (Right side) ===
    // Frozen terrain with ice and snow
    for (let y = 28; y < 40; y++) {
      for (let x = 33; x < 44; x++) {
        // Snow and ice pattern
        if ((x + y) % 3 === 0) {
          this.world[y][x] = this.TILES.SNOW;
        } else {
          this.world[y][x] = this.TILES.ICE;
        }
      }
    }

    // Frozen water pools in ice zone (fishing spots) - enlarged
    for (let y = 30; y < 39; y++) {
      for (let x = 36; x < 44; x++) {
        if (y >= 31 && y <= 37 && x >= 37 && x <= 42) {
          this.world[y][x] = this.TILES.FROZEN_WATER;
        }
      }
    }

    // Sandy shores around Pulau Baraju
    for (let y = 26; y < 42; y++) {
      if (this.world[y][21]) this.world[y][21] = this.TILES.SAND;
      if (this.world[y][44]) this.world[y][44] = this.TILES.SAND;
    }
    for (let x = 22; x < 44; x++) {
      if (this.world[27] && this.world[27][x])
        this.world[27][x] = this.TILES.SAND;
      if (this.world[40] && this.world[40][x])
        this.world[40][x] = this.TILES.SAND;
    }

    // Decorations for Fire Zone
    this.world[29][24] = this.TILES.VOLCANIC_ROCK;
    this.world[29][27] = this.TILES.VOLCANIC_ROCK;
    this.world[36][24] = this.TILES.VOLCANIC_ROCK;
    this.world[36][27] = this.TILES.VOLCANIC_ROCK;

    // Decorations for Ice Zone
    this.world[29][38] = this.TILES.ICE_CRYSTAL;
    this.world[29][40] = this.TILES.ICE_CRYSTAL;
    this.world[36][38] = this.TILES.ICE_CRYSTAL;
    this.world[36][40] = this.TILES.ICE_CRYSTAL;

    // Transition zone between fire and ice (neutral stone path)
    for (let y = 30; y < 38; y++) {
      this.world[y][33] = this.TILES.STONE;
    }

    // Additional ambience for Pulau Baraju
    // Fire zone edge rocks
    this.world[28][23] = this.TILES.VOLCANIC_ROCK;
    this.world[28][31] = this.TILES.VOLCANIC_ROCK;
    this.world[35][23] = this.TILES.ROCK;
    this.world[35][31] = this.TILES.ROCK;
    // Extra ash patches
    this.world[33][24] = this.TILES.ASH;
    this.world[33][29] = this.TILES.ASH;
    // Ember accents near lava
    this.world[32][26] = this.TILES.VOLCANIC_ROCK;
    this.world[34][26] = this.TILES.VOLCANIC_ROCK;

    // Ice zone extra crystals and rocks
    this.world[28][37] = this.TILES.ICE_CRYSTAL;
    this.world[28][41] = this.TILES.ICE_CRYSTAL;
    this.world[34][37] = this.TILES.ROCK;
    this.world[34][41] = this.TILES.ROCK;
    this.world[37][39] = this.TILES.ICE_CRYSTAL;
    this.world[38][36] = this.TILES.SNOW;
    this.world[38][42] = this.TILES.SNOW;

    // ===================================================
    // CONNECTOR (FINAL PASS): Pulau 2 -> Pulau Baraju (Pulau 3)
    // Ditempatkan setelah semua terrain Pulau Baraju dibuat agar tidak dioverwrite
    // ===================================================
    // South exit from Pulau 2 (golden path downwards)
    for (let y = 17; y < 22; y++) {
      this.world[y][32] = this.TILES.GOLDEN_PATH;
    }

    // Bridge over open water gap
    for (let y = 22; y < 26; y++) {
      this.world[y][32] = this.TILES.BRIDGE;
    }

    // Landing on Pulau Baraju (transition to stone path column)
    this.world[26][32] = this.TILES.GOLDEN_PATH;
    for (let y = 27; y <= 30; y++) {
      this.world[y][32] = this.TILES.STONE;
    }
    // Ensure link into central transition column (already stone at x=33)
    this.world[30][33] = this.TILES.STONE;
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

    // Auto-equip basic rod for new players
    const basicRod = this.playerInventory.rods.find(
      (r) => r.id === "basic_rod",
    );
    if (basicRod && basicRod.equipped) {
      this.equippedRod = basicRod;
      // Don't auto-equip to hand - player must press 1 to hold rod
    }

    this.setupEventListeners();
    this.updateHotbarData(); // Initial hotbar data setup
    this.startGameLoop();
    this.gameLoop();
    this.updateFishButtonVisibility();
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
            JSON.stringify(this.player),
          );
        }
        this.updateUI();
        // Re-render inventory if modal is open
        const inventoryModal = document.getElementById("inventoryModal");
        if (inventoryModal && inventoryModal.style.display === "flex") {
          this.renderInventory();
        }
        return;
      }
      this.player = await response.json();

      // Sync owned_rods from backend
      if (this.player.owned_rods) {
        this.ownedRods = this.player.owned_rods;
      }

      // cache to localStorage for offline fallback
      localStorage.setItem(
        `player_${this.playerId}`,
        JSON.stringify(this.player),
      );
      this.updateUI();

      // Re-render inventory if modal is open
      const inventoryModal = document.getElementById("inventoryModal");
      if (inventoryModal && inventoryModal.style.display === "flex") {
        this.renderInventory();
      }
    } catch (error) {
      console.warn("Failed to load player:", error);
      const stored = localStorage.getItem(`player_${this.playerId}`);
      if (stored) {
        this.player = JSON.parse(stored);
      } else {
        this.player = this.createLocalPlayer();
        localStorage.setItem(
          `player_${this.playerId}`,
          JSON.stringify(this.player),
        );
      }
      this.updateUI();
      // Re-render inventory if modal is open
      const inventoryModal = document.getElementById("inventoryModal");
      if (inventoryModal && inventoryModal.style.display === "flex") {
        this.renderInventory();
      }
      this.showMessage("Using local player data (backend unavailable)", false);
    }
  }

  setupEventListeners() {
    // Game controls
    const fishBtn = document.getElementById("fishBtn");
    const bagBtn = document.getElementById("bagBtn");
    const rodBtn = document.getElementById("rodBtn");

    if (fishBtn) {
      fishBtn.addEventListener("click", () => {
        // Button only for fishing actions, not for cancel
        // To cancel: unequip rod (press 1)
        this.goFishing();
      });
    }

    if (bagBtn) {
      bagBtn.addEventListener("click", () => {
        this.openInventory();
      });
    }

    // Inventory modal
    const closeInventory = document.getElementById("closeInventory");
    if (closeInventory) {
      closeInventory.addEventListener("click", () => this.closeInventory());
    }

    // Favorite toggle button
    const favoriteToggleBtn = document.getElementById("favoriteToggleBtn");
    if (favoriteToggleBtn) {
      favoriteToggleBtn.addEventListener("click", () =>
        this.toggleFavoriteMode(),
      );
    }

    // NPC modal
    const closeNpc = document.getElementById("closeNpc");
    if (closeNpc) {
      closeNpc.addEventListener("click", () => this.closeNpcModal());
    }

    // Close modals on background click
    const inventoryModal = document.getElementById("inventoryModal");
    if (inventoryModal) {
      inventoryModal.addEventListener("click", (e) => {
        if (e.target.id === "inventoryModal") this.closeInventory();
      });
    }

    const npcModal = document.getElementById("npcModal");
    if (npcModal) {
      npcModal.addEventListener("click", (e) => {
        if (e.target.id === "npcModal") this.closeNpcModal();
      });
    }

    // Canvas click for hotbar
    this.canvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener("contextmenu", (e) =>
      this.handleCanvasRightClick(e),
    );

    // Keyboard controls
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));
  }

  handleCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if click is on hotbar
    const slotSize = 48;
    const slotGap = 6;
    const slotCount = 5;
    const totalWidth = slotSize * slotCount + slotGap * (slotCount - 1);
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = this.canvas.height - slotSize - 45; // Match renderHotbarInGame

    // Check each slot
    for (let i = 0; i < slotCount; i++) {
      const slotX = startX + i * (slotSize + slotGap);
      const slotY = startY;

      // Check X button click (only for slots 1-4 with items)
      if (i > 0 && i <= 4 && this.hotbarSlots[i]) {
        const xBtnSize = 12;
        const xBtnX = slotX + slotSize - xBtnSize - 2;
        const xBtnY = slotY + 2;

        if (
          clickX >= xBtnX &&
          clickX <= xBtnX + xBtnSize &&
          clickY >= xBtnY &&
          clickY <= xBtnY + xBtnSize
        ) {
          // X button clicked - remove item from slot
          this.removeFromHotbar(i);
          return;
        }
      }

      // Check slot click
      if (
        clickX >= slotX &&
        clickX <= slotX + slotSize &&
        clickY >= slotY &&
        clickY <= slotY + slotSize
      ) {
        this.selectHotbarSlot(i);
        return;
      }
    }
  }

  handleCanvasRightClick(e) {
    e.preventDefault(); // Prevent context menu

    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if right-click is on hotbar
    const slotSize = 48;
    const slotGap = 6;
    const slotCount = 5;
    const totalWidth = slotSize * slotCount + slotGap * (slotCount - 1);
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = this.canvas.height - slotSize - 45;

    // Check each slot (only slots 1-4 can be removed)
    for (let i = 1; i < slotCount; i++) {
      const slotX = startX + i * (slotSize + slotGap);
      const slotY = startY;

      if (
        clickX >= slotX &&
        clickX <= slotX + slotSize &&
        clickY >= slotY &&
        clickY <= slotY + slotSize
      ) {
        this.removeFromHotbar(i);
        return;
      }
    }
  }

  handleKeyPress(e) {
    // Hotbar shortcuts (1-5)
    if (["1", "2", "3", "4", "5"].includes(e.key)) {
      const slotIndex = parseInt(e.key) - 1;

      // If fishing, only allow pressing 1 (to unequip rod and cancel)
      if (this.isFishing && slotIndex !== 0) {
        return; // Block other slots while fishing
      }

      this.selectHotbarSlot(slotIndex);
      return;
    }

    // Open inventory with B key
    if (e.key === "b" || e.key === "B") {
      this.openInventory();
      return;
    }

    // Block movement saat sedang memancing
    if (this.isFishing) {
      // Hanya izinkan interact dan fishing actions saat fishing
      if (e.key === " ") {
        this.goFishing();
      }
      // Cancel by unequipping rod (press 1 to toggle slot 0)
      // No separate cancel keys
      return;
    }

    const newPos = { ...this.playerPos };

    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        newPos.y--;
        break;
      case "ArrowDown":
      case "s":
      case "S":
        newPos.y++;
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        newPos.x--;
        break;
      case "ArrowRight":
      case "d":
      case "D":
        newPos.x++;
        break;
      case " ":
        this.goFishing();
        return;
      case "e":
      case "E":
        this.interactWithNPC();
        return;
    }

    if (this.isValidPosition(newPos)) {
      this.playerPos = newPos;
      this.updateFishButtonVisibility(); // Update button saat bergerak
    }
  }

  // ===== INVENTORY SYSTEM =====

  openInventory() {
    const modal = document.getElementById("inventoryModal");
    const title = document.getElementById("inventoryTitle");

    if (modal) {
      if (title) title.textContent = "🎒 INVENTORY";
      modal.style.display = "flex";
      this.renderInventory();
    }
  }

  closeInventory() {
    const modal = document.getElementById("inventoryModal");
    if (modal) {
      modal.style.display = "none";
    }

    // Exit favorite mode when closing inventory
    if (this.favoriteMode) {
      this.favoriteMode = false;
      const indicator = document.getElementById("favoriteModeIndicator");
      const toggleBtn = document.getElementById("favoriteToggleBtn");
      if (indicator) indicator.style.display = "none";
      if (toggleBtn) {
        toggleBtn.style.background = "rgba(241, 196, 15, 0.2)";
        toggleBtn.style.boxShadow = "none";
      }
    }
  }

  // ===== HOTBAR SYSTEM =====

  selectHotbarSlot(index) {
    if (index < 0 || index > 4) return;

    const item = this.hotbarSlots[index];
    if (!item) {
      // Empty slot - open inventory
      if (index > 0) {
        this.openInventory();
      }
      return;
    }

    // Toggle equip/unequip
    if (this.equippedHotbarSlot === index) {
      // Unequip current slot
      this.unequipHotbarSlot();
    } else {
      // Equip this slot (auto-unequip previous)
      this.equipHotbarSlot(index);
    }
  }

  equipHotbarSlot(index) {
    // Unequip previous slot first
    if (this.equippedHotbarSlot >= 0) {
      this.equippedHotbarSlot = -1;
      this.equippedItem = null; // Clear previous equipped item
    }

    // Equip new slot
    this.equippedHotbarSlot = index;

    // Set equippedItem for NPC interaction
    const item = this.hotbarSlots[index];
    if (item) {
      this.equippedItem = {
        type: item.type,
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        icon: item.icon,
      };
      console.log("Equipped item for NPC:", this.equippedItem);
    }

    // Update visual only, no notification
    // Rod or item will be shown in player's hand via renderPlayer
  }

  unequipHotbarSlot() {
    // If unequipping rod while fishing, cancel fishing
    if (this.equippedHotbarSlot === 0 && this.isFishing) {
      this.cancelFishing();
    }

    this.equippedHotbarSlot = -1;
    this.equippedItem = null; // Clear equipped item for NPC
    // Visual update only
  }

  updateHotbarData() {
    // Slot 0: Equipped Rod (only equipped rod shows here)
    if (this.equippedRod) {
      this.hotbarSlots[0] = {
        type: "rod",
        id: this.equippedRod.id,
        name: this.equippedRod.name,
        icon: "🎣",
      };
    } else {
      this.hotbarSlots[0] = null;
    }

    // Hotbar slots 1-4 are SEPARATE from bag
    // Items in hotbar are NOT counted in bag inventory
  }

  autoFillHotbar(fishData) {
    // Auto-fill: Move 1 fish from bag to slot
    // Rule: 1 slot = 1 fish only (no stacking)

    // Find first empty slot (slots 1-4)
    const emptySlotIndex = this.hotbarSlots.findIndex(
      (slot, idx) => idx > 0 && idx <= 4 && slot === null,
    );

    if (emptySlotIndex > 0) {
      // Fill empty slot with 1 fish
      const fishType = this.fishTypes[fishData.fish_id];

      if (fishType) {
        this.hotbarSlots[emptySlotIndex] = {
          type: "fish",
          id: fishData.fish_id,
          name: fishType.name,
          icon: "🐟",
          quantity: 1, // Always 1 per slot
        };

        // Track this fish in hotbar
        const key = `fish_${fishData.fish_id}`;
        this.itemsInHotbar[key] = (this.itemsInHotbar[key] || 0) + 1;

        console.log(
          `Auto-fill: Slot ${emptySlotIndex + 1}, itemsInHotbar:`,
          this.itemsInHotbar,
        );

        this.showMessage(
          `${fishType.name} added to slot ${emptySlotIndex + 1}`,
        );
      }
    } else {
      // All slots full, stays in bag
      console.log(`Auto-fill: All slots full, fish stays in bag`);
      this.showMessage(`Hotbar full! Open bag (B) to see your fish`);
    }
  }

  getAvailableQuantityInBag(itemId, itemType) {
    // Get total quantity in bag (server inventory) minus items in hotbar slots
    if (!this.player) return 0;

    let totalQuantity = 0;

    if (itemType === "fish" && this.player.inventory) {
      totalQuantity = this.player.inventory[itemId] || 0;
    } else if (itemType === "cooked" && this.player.cooked_food) {
      totalQuantity = this.player.cooked_food[itemId] || 0;
    }

    // Subtract items that are already in hotbar slots
    const key = `${itemType}_${itemId}`;
    const inSlots = this.itemsInHotbar[key] || 0;

    return Math.max(0, totalQuantity - inSlots);
  }

  toggleFavoriteMode() {
    // Toggle favorite mode on/off
    this.favoriteMode = !this.favoriteMode;

    const indicator = document.getElementById("favoriteModeIndicator");
    const toggleBtn = document.getElementById("favoriteToggleBtn");

    if (this.favoriteMode) {
      // Enter favorite mode
      if (indicator) indicator.style.display = "block";
      if (toggleBtn) {
        toggleBtn.style.background = "rgba(241, 196, 15, 0.5)";
        toggleBtn.style.boxShadow = "0 0 10px rgba(241, 196, 15, 0.5)";
      }
      this.showMessage("⭐ Favorite mode ON - Click fish to toggle");
    } else {
      // Exit favorite mode
      if (indicator) indicator.style.display = "none";
      if (toggleBtn) {
        toggleBtn.style.background = "rgba(241, 196, 15, 0.2)";
        toggleBtn.style.boxShadow = "none";
      }
      this.showMessage("Favorite mode OFF");
    }

    // Re-render inventory to update UI
    this.renderInventory();
  }

  toggleFavorite(fishId) {
    // Toggle favorite status (only works in favorite mode)
    if (!this.favoriteMode) {
      this.showMessage(
        "⚠️ Click ⭐ button first to enable favorite mode",
        true,
      );
      return;
    }

    this.favoriteFish[fishId] = !this.favoriteFish[fishId];

    if (this.favoriteFish[fishId]) {
      this.showMessage(
        `⭐ ${this.fishTypes[fishId]?.name || "Fish"} favorited`,
      );
    } else {
      this.showMessage(`Removed from favorites`);
    }

    // Re-render inventory to update star
    this.renderInventory();
  }

  equipToHotbar(item) {
    // Auto-equip item to first empty slot
    // Check available quantity in bag (not in slots)
    const totalInBag = this.getAvailableQuantityInBag(item.id, item.type);

    console.log(`equipToHotbar: ${item.name}, available in bag: ${totalInBag}`);

    if (totalInBag <= 0) {
      this.showMessage(`No ${item.name} available in bag!`, true);
      return;
    }

    // Find first empty slot (1-4)
    let emptySlot = -1;
    for (let i = 1; i <= 4; i++) {
      if (this.hotbarSlots[i] === null) {
        emptySlot = i;
        break;
      }
    }

    if (emptySlot === -1) {
      this.showMessage(`All slots full! Remove an item first.`, true);
      return;
    }

    // Move 1 item from bag to empty slot
    this.hotbarSlots[emptySlot] = {
      type: item.type,
      id: item.id,
      name: item.name,
      icon: item.icon || "🐟",
      quantity: 1, // Always 1 per slot
    };

    // Track that this item is now in hotbar
    const key = `${item.type}_${item.id}`;
    this.itemsInHotbar[key] = (this.itemsInHotbar[key] || 0) + 1;

    console.log(
      `Equipped to slot ${emptySlot + 1}, itemsInHotbar:`,
      this.itemsInHotbar,
    );

    this.showMessage(`${item.name} equipped to slot ${emptySlot + 1}`);

    // Re-render inventory to update quantities
    this.renderInventory();
  }

  removeFromHotbar(slotIndex) {
    if (slotIndex < 1 || slotIndex > 4) return;

    const item = this.hotbarSlots[slotIndex];
    if (item) {
      // If equipped, unequip first
      if (this.equippedHotbarSlot === slotIndex) {
        this.unequipHotbarSlot();
      }

      // Return item to bag - decrease itemsInHotbar tracking
      const key = `${item.type}_${item.id}`;
      this.itemsInHotbar[key] = Math.max(
        0,
        (this.itemsInHotbar[key] || 0) - item.quantity,
      );

      console.log(
        `Returned ${item.quantity}x ${item.name} to bag, itemsInHotbar:`,
        this.itemsInHotbar,
      );

      this.showMessage(`${item.name} (${item.quantity}x) returned to bag`);
      this.hotbarSlots[slotIndex] = null;

      // Re-render inventory to update quantities
      this.renderInventory();
    }
  }

  renderInventory() {
    const inventoryGrid = document.getElementById("inventoryGrid");

    // Render inventory items
    inventoryGrid.innerHTML = "";

    if (!this.player) return;

    // === SECTION: FISHING RODS ===
    const rodsSection = document.createElement("div");
    rodsSection.style.gridColumn = "1 / -1";
    rodsSection.style.marginBottom = "15px";
    rodsSection.innerHTML =
      '<h4 style="color: #4a90e2; margin-bottom: 10px; border-bottom: 2px solid #4a90e2; padding-bottom: 5px;">🎣 FISHING RODS</h4>';
    inventoryGrid.appendChild(rodsSection);

    // Render owned rods
    this.ownedRods.forEach((rodId) => {
      const rod = this.rodTypes[rodId];
      if (!rod) return;

      const rodCard = document.createElement("div");
      rodCard.className = "item-card";

      const isEquipped = this.currentRod === rodId;
      if (isEquipped) {
        rodCard.classList.add("equipped");
      }

      rodCard.innerHTML = `
                <div class="item-icon">${rod.icon}</div>
                <div class="item-name">${rod.name}</div>
                <div class="item-quantity">Bonus: ${rod.catchBonus}x</div>
                <div class="item-rarity rarity-common">Tool</div>
                ${
                  isEquipped
                    ? `<button class="unequip-btn" style="background: #27ae60;">✓ EQUIPPED</button>`
                    : `<button class="equip-btn" onclick="game.switchRod('${rodId}')">EQUIP</button>`
                }
            `;

      inventoryGrid.appendChild(rodCard);
    });

    // === SECTION: ITEMS ===
    const itemsSection = document.createElement("div");
    itemsSection.style.gridColumn = "1 / -1";
    itemsSection.style.marginTop = "15px";
    itemsSection.style.marginBottom = "10px";
    itemsSection.innerHTML =
      '<h4 style="color: #4a90e2; margin-bottom: 10px; border-bottom: 2px solid #4a90e2; padding-bottom: 5px;">📦 ITEMS</h4>';
    inventoryGrid.appendChild(itemsSection);

    // Combine all items (fish, cooked food, etc)
    const allItems = [];

    // Add raw fish (only show what's NOT in hotbar slots)
    if (this.player.inventory) {
      Object.entries(this.player.inventory).forEach(([fishId, quantity]) => {
        if (quantity > 0 && this.fishTypes[fishId]) {
          // Calculate available quantity (total - in slots)
          const availableQty = this.getAvailableQuantityInBag(fishId, "fish");

          if (availableQty > 0) {
            allItems.push({
              id: fishId,
              name: this.fishTypes[fishId].name,
              quantity: availableQty, // Show only available
              type: "fish",
              rarity: this.fishTypes[fishId].rarity,
              icon: "🐟",
            });
          }
        }
      });
    }

    // Add cooked food (only show what's NOT in hotbar slots)
    if (this.player.cooked_food) {
      Object.entries(this.player.cooked_food).forEach(([fishId, quantity]) => {
        if (quantity > 0 && this.fishTypes[fishId]) {
          // Calculate available quantity (total - in slots)
          const availableQty = this.getAvailableQuantityInBag(fishId, "cooked");

          if (availableQty > 0) {
            allItems.push({
              id: fishId,
              name: `Cooked ${this.fishTypes[fishId].name}`,
              quantity: availableQty, // Show only available
              type: "cooked",
              rarity: this.fishTypes[fishId].rarity,
              icon: "🍖",
            });
          }
        }
      });
    }

    // Render each item
    allItems.forEach((item) => {
      const itemCard = document.createElement("div");
      itemCard.className = "item-card";

      // Add visual indicators
      if (
        this.equippedItem &&
        this.equippedItem.id === item.id &&
        this.equippedItem.type === item.type
      ) {
        itemCard.classList.add("equipped");
      }

      // Highlight favorited fish
      if (item.type === "fish" && this.favoriteFish[item.id]) {
        itemCard.style.borderColor = "#f39c12";
        itemCard.style.boxShadow = "0 0 8px rgba(241, 196, 15, 0.3)";
      }

      const isEquipped =
        this.equippedItem &&
        this.equippedItem.id === item.id &&
        this.equippedItem.type === item.type;

      let actionButtons = "";
      if (item.type === "cooked") {
        // Cooked food bisa dimakan langsung atau equip to hotbar
        const fishData = this.fishTypes[item.id];
        const hungerRestore = fishData ? fishData.hunger_restore : 20;
        actionButtons = `
                    <button class="equip-btn" onclick="game.eatCookedFood('${item.id}')" style="background: rgba(46, 204, 113, 0.3); border-color: #27ae60; margin-bottom: 5px;">
                        🍽️ EAT (+${hungerRestore} Hunger)
                    </button>
                    <button class="equip-btn" onclick="game.equipToHotbar({type:'${item.type}',id:'${item.id}',name:'${item.name}',icon:'${item.icon}'})">
                        📦 EQUIP TO SLOT
                    </button>
                `;
      } else {
        // Raw fish - show buttons based on favorite mode
        const isFavorite = this.favoriteFish[item.id] || false;

        if (this.favoriteMode) {
          // In favorite mode: only show favorite status
          actionButtons = `
                        <button class="equip-btn" onclick="game.toggleFavorite('${
                          item.id
                        }')" style="background: ${
                          isFavorite
                            ? "rgba(241, 196, 15, 0.3)"
                            : "rgba(149, 165, 166, 0.2)"
                        }; border-color: ${isFavorite ? "#f39c12" : "#95a5a6"};">
                            ${
                              isFavorite
                                ? "⭐ FAVORITED"
                                : "☆ CLICK TO FAVORITE"
                            }
                        </button>
                    `;
        } else {
          // Normal mode: show equip button and favorite indicator
          actionButtons = `
                        ${
                          isFavorite
                            ? '<p style="color: #f39c12; font-size: 11px; margin-bottom: 5px;">⭐ Favorited (protected)</p>'
                            : ""
                        }
                        <button class="equip-btn" onclick="game.equipToHotbar({type:'${
                          item.type
                        }',id:'${item.id}',name:'${item.name}',icon:'${
                          item.icon
                        }'})">
                            📦 EQUIP TO SLOT
                        </button>
                    `;
        }
      }

      itemCard.innerHTML = `
                <div class="item-icon">${item.icon}</div>
                <div class="item-name">${item.name}</div>
                <div class="item-quantity">Quantity: ${item.quantity}</div>
                <div class="item-rarity rarity-${item.rarity}">${item.rarity}</div>
                ${actionButtons}
            `;

      inventoryGrid.appendChild(itemCard);
    });

    // Show message only if no items available (but keep sections visible)
    if (allItems.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.style.gridColumn = "1 / -1";
      emptyMessage.style.textAlign = "center";
      emptyMessage.style.padding = "20px";
      emptyMessage.style.color = "#7f8c8d";
      emptyMessage.style.fontStyle = "italic";
      emptyMessage.textContent =
        "No items in bag. Items may be in hotbar slots.";
      inventoryGrid.appendChild(emptyMessage);
    }
  }

  getItemIcon(item) {
    if (item.type === "fish") return "🐟";
    if (item.type === "cooked") return "🍖";
    return "📦";
  }

  equipItem(itemId, itemType) {
    if (!this.player) return;

    const item = this.getItem(itemId, itemType);
    if (!item) return;

    this.equippedItem = {
      id: itemId,
      type: itemType,
      name: item.name,
      quantity: item.quantity,
    };

    this.renderInventory();
    this.showMessage(`✓ ${item.name} equipped for NPC`);
  }

  unequipItem() {
    if (this.equippedItem) {
      this.showMessage(`Unequipped: ${this.equippedItem.name}`);
      this.equippedItem = null;
      this.renderInventory();
    }
  }

  // === ROD EQUIPMENT ===

  switchRod(rodId) {
    if (!this.ownedRods.includes(rodId)) {
      this.showMessage("❌ Rod tidak dimiliki!", true);
      return;
    }

    this.currentRod = rodId;
    const rod = this.rodTypes[rodId];
    this.showMessage(
      `🎣 ${rod.icon} ${rod.name} equipped! (Bonus: ${rod.catchBonus}x)`,
    );
    this.renderInventory();
  }

  equipRod(rodId) {
    const rod = this.playerInventory.rods.find((r) => r.id === rodId);
    if (!rod) return;

    // Unequip previous rod
    this.playerInventory.rods.forEach((r) => (r.equipped = false));

    // Equip new rod (replaces current rod in slot 0)
    rod.equipped = true;
    this.equippedRod = rod;

    // Update hotbar slot 0
    this.updateHotbarData();

    this.renderInventory();
    this.updateFishButtonVisibility();
    this.showMessage(`🎣 ${rod.name} equipped! (Power: ${rod.power}x)`);
  }

  unequipRod() {
    if (this.equippedRod) {
      const rodName = this.equippedRod.name;
      this.equippedRod.equipped = false;
      this.equippedRod = null;

      // Update hotbar slot 0
      this.updateHotbarData();

      this.renderInventory();
      this.updateFishButtonVisibility();
      this.showMessage(`${rodName} unequipped. Equip a rod to fish!`);
    }
  }

  updateFishButtonVisibility() {
    const fishBtn = document.getElementById("fishBtn");

    // Show fish button only if: rod equipped AND near water AND not fishing
    if (this.equippedRod && this.isNearWater() && !this.isFishing) {
      fishBtn.style.display = "block";
      fishBtn.textContent = "🎣 Fish";
    } else if (this.isFishing) {
      fishBtn.style.display = "block";
      // Button text akan diupdate oleh fishing state
    } else {
      fishBtn.style.display = "none";
    }
  }

  getItem(itemId, itemType) {
    if (!this.player) return null;

    if (
      itemType === "fish" &&
      this.player.inventory &&
      this.player.inventory[itemId]
    ) {
      return {
        id: itemId,
        name: this.fishTypes[itemId]?.name || "Unknown",
        quantity: this.player.inventory[itemId],
        type: "fish",
      };
    }

    if (
      itemType === "cooked" &&
      this.player.cooked_food &&
      this.player.cooked_food[itemId]
    ) {
      return {
        id: itemId,
        name: `Cooked ${this.fishTypes[itemId]?.name || "Unknown"}`,
        quantity: this.player.cooked_food[itemId],
        type: "cooked",
      };
    }

    return null;
  }

  // ===== NPC INTERACTION =====

  closeNpcModal() {
    const modal = document.getElementById("npcModal");
    modal.style.display = "none";
  }

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

    // Gate: butuh Golden Rod untuk melewati barrier (darat dan air)
    if (tile === this.TILES.BARRIER || tile === this.TILES.WATER_BARRIER) {
      if (this.ownedRods.includes("golden")) {
        return true; // Sudah punya Golden Rod, boleh lewat
      }
      this.showMessage(
        "⛔ Butuh Golden Rod untuk lewat ke pulau sebelah!",
        true,
      );
      return false;
    }

    // Tidak bisa berjalan di atas air tanpa akses khusus
    if (
      tile === this.TILES.WATER ||
      tile === this.TILES.DEEP_WATER ||
      tile === this.TILES.SHALLOW_WATER
    ) {
      return false;
    }

    const walkableTiles = [
      this.TILES.GRASS,
      this.TILES.STONE,
      this.TILES.DOCK,
      this.TILES.BRIDGE,
      this.TILES.SAND,
      this.TILES.LIGHT_GRASS,
      this.TILES.DIRT,
      this.TILES.MARBLE,
      this.TILES.GOLDEN_PATH,
      this.TILES.CLIFF,
      this.TILES.SHOP_WALL, // Bisa masuk toko
      this.TILES.CASTLE_WALL, // Bisa masuk istana
      this.TILES.VOLCANIC_ROCK, // Pulau Baraju - fire zone
      this.TILES.ASH, // Pulau Baraju - ash ground
      this.TILES.ICE, // Pulau Baraju - ice zone
      this.TILES.SNOW, // Pulau Baraju - snow ground
    ];
    return walkableTiles.includes(tile);
  }

  gameLoop() {
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Kamera mengikuti player dengan smooth centering
    const offsetX =
      this.canvas.width / 2 -
      this.playerPos.x * this.tileSize -
      this.tileSize / 2;
    const offsetY =
      this.canvas.height / 2 -
      this.playerPos.y * this.tileSize -
      this.tileSize / 2;

    // Simpan context state
    this.ctx.save();

    // Translate untuk camera follow
    this.ctx.translate(offsetX, offsetY);

    // Render world
    this.renderWorld();

    // Render player
    this.renderPlayer();

    // Render fishing spots
    this.renderFishingSpots();

    // Render NPCs
    this.renderNPCs();

    // Render fishing line and bobber
    if (this.isFishing) {
      this.renderFishingLine();
    }

    // Restore context state
    this.ctx.restore();

    // Render UI elements (fixed to screen, not camera)
    this.renderHotbarInGame();
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
        // Create more organic grass pattern
        this.renderOrganicGrass(pixelX, pixelY, x, y);
        break;

      case this.TILES.WATER:
        this.renderOrganicWater(pixelX, pixelY, x, y, "normal");
        break;

      case this.TILES.STONE:
        this.ctx.fillStyle = "#7f8c8d";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        // Add stone texture
        this.ctx.fillStyle = "#95a5a6";
        this.ctx.fillRect(pixelX + 4, pixelY + 4, 8, 8);
        this.ctx.fillRect(pixelX + 16, pixelY + 16, 8, 8);
        break;

      case this.TILES.DOCK:
        this.ctx.fillStyle = "#8b4513";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        // Add wood planks
        this.ctx.strokeStyle = "#654321";
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          this.ctx.beginPath();
          this.ctx.moveTo(pixelX + i * 8, pixelY);
          this.ctx.lineTo(pixelX + i * 8, pixelY + this.tileSize);
          this.ctx.stroke();
        }
        break;
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        // Bridge planks
        this.ctx.strokeStyle = "#b8860b";
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          this.ctx.beginPath();
          this.ctx.moveTo(pixelX, pixelY + i * 8);
          this.ctx.lineTo(pixelX + this.tileSize, pixelY + i * 8);
          this.ctx.stroke();
        }
        // Bridge supports
        this.ctx.fillStyle = "#8b4513";
        this.ctx.fillRect(pixelX + 4, pixelY, 4, this.tileSize);
        this.ctx.fillRect(pixelX + 24, pixelY, 4, this.tileSize);
        break;

      case this.TILES.DEEP_WATER:
        this.renderOrganicWater(pixelX, pixelY, x, y, "deep");
        break;

      case this.TILES.SHALLOW_WATER:
        this.renderOrganicWater(pixelX, pixelY, x, y, "shallow");
        break;

      case this.TILES.SAND:
        // Render stepped/layered sand shore seperti gambar referensi
        this.renderSteppedSand(pixelX, pixelY, x, y);
        break;

      case this.TILES.CLIFF:
        this.ctx.fillStyle = "#6b7280";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        // Cliff texture
        this.ctx.fillStyle = "#4b5563";
        this.ctx.fillRect(pixelX + 4, pixelY, 24, 8);
        this.ctx.fillRect(pixelX, pixelY + 8, 32, 8);
        this.ctx.fillRect(pixelX + 8, pixelY + 16, 24, 8);
        this.ctx.fillRect(pixelX + 4, pixelY + 24, 28, 8);
        // Highlights
        this.ctx.fillStyle = "#9ca3af";
        this.ctx.fillRect(pixelX + 2, pixelY + 2, 4, 4);
        this.ctx.fillRect(pixelX + 20, pixelY + 10, 4, 4);
        break;

      case this.TILES.ROCK:
        this.renderOrganicRock(pixelX, pixelY, x, y);
        break;

      case this.TILES.BUSH:
        // Grass base
        this.ctx.fillStyle = "#228B22";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        const bushGrassColors = ["#32CD32", "#7CFC00", "#ADFF2F", "#9AFF9A"];
        for (let gx = 0; gx < 4; gx++) {
          for (let gy = 0; gy < 4; gy++) {
            const grassX = pixelX + gx * 8;
            const grassY = pixelY + gy * 8;
            const colorIndex = (x + y + gx + gy) % bushGrassColors.length;
            this.ctx.fillStyle = bushGrassColors[colorIndex];
            this.ctx.fillRect(grassX, grassY, 8, 8);
          }
        }
        // Bush
        this.ctx.fillStyle = "#166534";
        this.ctx.fillRect(pixelX + 6, pixelY + 6, 20, 20);
        this.ctx.fillRect(pixelX + 4, pixelY + 8, 24, 16);
        this.ctx.fillStyle = "#15803d";
        this.ctx.fillRect(pixelX + 8, pixelY + 8, 16, 12);
        break;

      case this.TILES.DARK_TREE:
        // Grass base
        this.ctx.fillStyle = "#228B22";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        const darkTreeGrassColors = [
          "#32CD32",
          "#7CFC00",
          "#ADFF2F",
          "#9AFF9A",
        ];
        for (let gx = 0; gx < 4; gx++) {
          for (let gy = 0; gy < 4; gy++) {
            const grassX = pixelX + gx * 8;
            const grassY = pixelY + gy * 8;
            const colorIndex = (x + y + gx + gy) % darkTreeGrassColors.length;
            this.ctx.fillStyle = darkTreeGrassColors[colorIndex];
            this.ctx.fillRect(grassX, grassY, 8, 8);
          }
        }
        // Dark tree trunk
        this.ctx.fillStyle = "#451a03";
        this.ctx.fillRect(pixelX + 12, pixelY + 16, 8, 16);
        // Dark tree leaves
        this.ctx.fillStyle = "#14532d";
        this.ctx.fillRect(pixelX + 4, pixelY + 4, 24, 20);
        break;

      case this.TILES.LIGHT_GRASS:
        // Light grass base
        this.ctx.fillStyle = "#84cc16";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        const lightGrassColors = ["#a3e635", "#bef264", "#d9f99d", "#ecfccb"];
        for (let gx = 0; gx < 4; gx++) {
          for (let gy = 0; gy < 4; gy++) {
            const grassX = pixelX + gx * 8;
            const grassY = pixelY + gy * 8;
            const colorIndex = (x + y + gx + gy) % lightGrassColors.length;
            this.ctx.fillStyle = lightGrassColors[colorIndex];
            this.ctx.fillRect(grassX, grassY, 8, 8);

            if ((gx + gy + x + y) % 3 === 0) {
              this.ctx.fillStyle = "#84cc16";
              this.ctx.fillRect(grassX + 2, grassY + 2, 4, 4);
            }
          }
        }
        break;

      case this.TILES.DIRT:
        this.ctx.fillStyle = "#92400e";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        // Dirt texture
        this.ctx.fillStyle = "#a16207";
        for (let dx = 0; dx < 4; dx++) {
          for (let dy = 0; dy < 4; dy++) {
            if ((dx + dy + x + y) % 2 === 0) {
              this.ctx.fillRect(pixelX + dx * 8 + 1, pixelY + dy * 8 + 1, 6, 6);
            }
          }
        }
        // Add some darker spots
        this.ctx.fillStyle = "#78350f";
        if ((x + y) % 3 === 0) {
          this.ctx.fillRect(pixelX + 12, pixelY + 12, 8, 8);
        }
        break;

      case this.TILES.SHORE:
        // Shore tile - pinggiran pantai dengan efek transisi
        // Base dengan warna pasir coklat
        const shoreColors = ["#C2B280", "#D2B48C", "#B8956A", "#A88754"];
        const shoreBaseIndex = (x + y) % shoreColors.length;
        this.ctx.fillStyle = shoreColors[shoreBaseIndex];
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Pixel-style shore pattern
        for (let sx = 0; sx < 4; sx++) {
          for (let sy = 0; sy < 4; sy++) {
            const blockX = pixelX + sx * 8;
            const blockY = pixelY + sy * 8;
            const colorIdx = (sx + sy + x + y) % shoreColors.length;
            this.ctx.fillStyle = shoreColors[colorIdx];
            this.ctx.fillRect(blockX, blockY, 8, 8);

            // Tambahkan efek air di beberapa bagian
            if ((sx + sy) % 3 === 0) {
              this.ctx.fillStyle = "rgba(70, 130, 180, 0.3)";
              this.ctx.fillRect(blockX, blockY + 4, 8, 4);
            }
          }
        }

        // Highlight dan shadow untuk depth
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        this.ctx.fillRect(pixelX + 2, pixelY + 2, 6, 2);

        this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        this.ctx.fillRect(pixelX + 4, pixelY + 26, 24, 4);

      case this.TILES.BARRIER:
        // Barrier tile - penghalang yang hanya bisa dilewati dengan golden rod
        // Background: Dark red/orange
        this.ctx.fillStyle = "#991b1b";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Warning stripes pattern
        this.ctx.fillStyle = "#fbbf24";
        for (let i = 0; i < 4; i++) {
          this.ctx.fillRect(pixelX + i * 8, pixelY, 4, this.tileSize);
          this.ctx.fillRect(pixelX, pixelY + i * 8, this.tileSize, 4);
        }

        // Lock icon in center (only if player doesn't have golden rod)
        if (!this.ownedRods.includes("golden")) {
          // Lock body
          this.ctx.fillStyle = "#dc2626";
          this.ctx.fillRect(pixelX + 10, pixelY + 14, 12, 10);

          // Lock shackle
          this.ctx.strokeStyle = "#dc2626";
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.arc(pixelX + 16, pixelY + 12, 5, Math.PI, 0, true);
          this.ctx.stroke();

          // Keyhole
          this.ctx.fillStyle = "#fef3c7";
          this.ctx.fillRect(pixelX + 15, pixelY + 17, 2, 4);
        } else {
          // Show unlocked/open state
          this.ctx.fillStyle = "#22c55e";
          this.ctx.font = "bold 20px Arial";
          this.ctx.textAlign = "center";
          this.ctx.fillText("✓", pixelX + 16, pixelY + 22);
        }
        break;

      case this.TILES.MARBLE:
        // Marble tile - luxury white marble with veins
        this.ctx.fillStyle = "#f8fafc";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Marble veins pattern
        this.ctx.fillStyle = "#cbd5e1";
        for (let i = 0; i < 3; i++) {
          const veinX = (x * 7 + y * 11 + i * 13) % 32;
          const veinY = (y * 5 + x * 9 + i * 17) % 32;
          this.ctx.fillRect(pixelX + veinX, pixelY + veinY, 8, 2);
          this.ctx.fillRect(pixelX + veinY, pixelY + veinX, 2, 8);
        }

        // Shine effect
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        this.ctx.fillRect(pixelX + 2, pixelY + 2, 8, 8);
        break;

      case this.TILES.GOLDEN_PATH:
        // Golden path - luxury golden tiles
        this.ctx.fillStyle = "#fbbf24";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Golden pattern
        const goldenPattern = ["#f59e0b", "#fcd34d", "#fef3c7"];
        for (let gx = 0; gx < 4; gx++) {
          for (let gy = 0; gy < 4; gy++) {
            const colorIndex = (gx + gy + x + y) % goldenPattern.length;
            this.ctx.fillStyle = goldenPattern[colorIndex];
            this.ctx.fillRect(pixelX + gx * 8, pixelY + gy * 8, 8, 8);
          }
        }

        // Border outline
        this.ctx.strokeStyle = "#d97706";
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Sparkle effect
        if ((x + y) % 3 === 0) {
          this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          this.ctx.fillRect(pixelX + 12, pixelY + 12, 4, 4);
        }
        break;

      case this.TILES.SHOP_WALL:
        // Shop wall - brown wooden planks
        this.ctx.fillStyle = "#8b4513";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        // Wood texture
        this.ctx.fillStyle = "#a0522d";
        for (let i = 0; i < 4; i++) {
          this.ctx.fillRect(pixelX, pixelY + i * 12, this.tileSize, 8);
        }
        // Window
        this.ctx.fillStyle = "#87ceeb";
        this.ctx.fillRect(pixelX + 12, pixelY + 12, 8, 8);
        break;

      case this.TILES.SHOP_ROOF:
        // Shop roof - red tiles
        this.ctx.fillStyle = "#8b0000";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        // Roof tiles pattern
        this.ctx.fillStyle = "#a52a2a";
        for (let rx = 0; rx < 4; rx++) {
          for (let ry = 0; ry < 4; ry++) {
            if ((rx + ry) % 2 === 0) {
              this.ctx.fillRect(pixelX + rx * 8, pixelY + ry * 8, 8, 8);
            }
          }
        }
        break;

      case this.TILES.CASTLE_WALL:
        // Castle wall - stone bricks
        this.ctx.fillStyle = "#708090";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        // Brick pattern
        this.ctx.strokeStyle = "#2f4f4f";
        this.ctx.lineWidth = 2;
        for (let bx = 0; bx < 2; bx++) {
          for (let by = 0; by < 2; by++) {
            this.ctx.strokeRect(pixelX + bx * 16, pixelY + by * 16, 16, 16);
          }
        }
        // Window
        this.ctx.fillStyle = "#ffd700";
        this.ctx.fillRect(pixelX + 12, pixelY + 16, 8, 12);
        break;

      case this.TILES.CASTLE_ROOF:
        // Castle roof - golden/blue royal roof
        this.ctx.fillStyle = "#4169e1";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
        // Gold trim
        this.ctx.fillStyle = "#ffd700";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, 6);
        this.ctx.fillRect(pixelX, pixelY + this.tileSize - 6, this.tileSize, 6);
        // Castle flag
        this.ctx.fillStyle = "#ff0000";
        this.ctx.fillRect(pixelX + 20, pixelY + 4, 8, 6);
        break;

      case this.TILES.WATER_BARRIER:
        // Invisible barrier - render as normal water
        this.renderOrganicWater(pixelX, pixelY, x, y);
        break;

      case this.TILES.LAVA:
        // Lava tile - animated orange/red lava
        const lavaGradient = this.ctx.createRadialGradient(
          pixelX + 16,
          pixelY + 16,
          0,
          pixelX + 16,
          pixelY + 16,
          20,
        );
        lavaGradient.addColorStop(0, "#ff6600");
        lavaGradient.addColorStop(0.5, "#ff3300");
        lavaGradient.addColorStop(1, "#cc0000");
        this.ctx.fillStyle = lavaGradient;
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Lava bubbles
        this.ctx.fillStyle = "#ffcc00";
        const bubbleCount = ((x * 7 + y * 11) % 3) + 1;
        for (let i = 0; i < bubbleCount; i++) {
          const bx = ((x * 13 + y * 17 + i * 19) % 24) + 4;
          const by = ((y * 11 + x * 7 + i * 23) % 24) + 4;
          this.ctx.fillRect(pixelX + bx, pixelY + by, 4, 4);
        }

        // Glow effect
        this.ctx.fillStyle = "rgba(255, 150, 0, 0.3)";
        this.ctx.fillRect(pixelX + 8, pixelY + 8, 16, 16);
        break;

      case this.TILES.VOLCANIC_ROCK:
        // Volcanic rock - dark gray/black rock
        this.ctx.fillStyle = "#2d3748";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Rock texture
        const rockPattern = ["#1a202c", "#374151", "#4b5563"];
        for (let rx = 0; rx < 4; rx++) {
          for (let ry = 0; ry < 4; ry++) {
            const colorIndex = (rx + ry + x + y) % rockPattern.length;
            this.ctx.fillStyle = rockPattern[colorIndex];
            this.ctx.fillRect(pixelX + rx * 8, pixelY + ry * 8, 8, 8);
          }
        }

        // Cracks
        this.ctx.strokeStyle = "#ff4500";
        this.ctx.lineWidth = 1;
        if ((x + y) % 3 === 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(pixelX + 8, pixelY);
          this.ctx.lineTo(pixelX + 16, pixelY + 16);
          this.ctx.stroke();
        }
        break;

      case this.TILES.ICE:
        // Ice tile - light blue crystalline ice
        const iceGradient = this.ctx.createLinearGradient(
          pixelX,
          pixelY,
          pixelX + this.tileSize,
          pixelY + this.tileSize,
        );
        iceGradient.addColorStop(0, "#dbeafe");
        iceGradient.addColorStop(0.5, "#bfdbfe");
        iceGradient.addColorStop(1, "#93c5fd");
        this.ctx.fillStyle = iceGradient;
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Ice crystals pattern
        this.ctx.fillStyle = "#e0f2fe";
        for (let ix = 0; ix < 2; ix++) {
          for (let iy = 0; iy < 2; iy++) {
            this.ctx.fillRect(pixelX + ix * 16 + 4, pixelY + iy * 16 + 4, 8, 8);
          }
        }

        // Shine effect
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        this.ctx.fillRect(pixelX + 2, pixelY + 2, 8, 8);
        break;

      case this.TILES.SNOW:
        // Snow tile - white fluffy snow
        this.ctx.fillStyle = "#f8fafc";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Snow texture
        const snowPattern = ["#ffffff", "#f1f5f9", "#e2e8f0"];
        for (let sx = 0; sx < 4; sx++) {
          for (let sy = 0; sy < 4; sy++) {
            const colorIndex = (sx + sy + x + y) % snowPattern.length;
            this.ctx.fillStyle = snowPattern[colorIndex];
            this.ctx.fillRect(pixelX + sx * 8, pixelY + sy * 8, 8, 8);
          }
        }

        // Snow sparkles
        this.ctx.fillStyle = "#ffffff";
        if ((x + y) % 2 === 0) {
          this.ctx.fillRect(pixelX + 12, pixelY + 12, 2, 2);
          this.ctx.fillRect(pixelX + 20, pixelY + 8, 2, 2);
        }
        break;

      case this.TILES.FROZEN_WATER:
        // Frozen water - icy blue water with cracks
        this.ctx.fillStyle = "#7dd3fc";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Ice surface
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        this.ctx.fillRect(pixelX + 4, pixelY + 4, 24, 24);

        // Ice cracks
        this.ctx.strokeStyle = "#0ea5e9";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(pixelX, pixelY + 12);
        this.ctx.lineTo(pixelX + 32, pixelY + 20);
        this.ctx.moveTo(pixelX + 16, pixelY);
        this.ctx.lineTo(pixelX + 16, pixelY + 32);
        this.ctx.stroke();
        break;

      case this.TILES.ASH:
        // Ash tile - dark gray ash ground
        this.ctx.fillStyle = "#6b7280";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Ash texture
        const ashPattern = ["#9ca3af", "#6b7280", "#4b5563"];
        for (let ax = 0; ax < 4; ax++) {
          for (let ay = 0; ay < 4; ay++) {
            const colorIndex = (ax + ay + x + y) % ashPattern.length;
            this.ctx.fillStyle = ashPattern[colorIndex];
            this.ctx.fillRect(pixelX + ax * 8, pixelY + ay * 8, 8, 8);
          }
        }

        // Small ember particles
        if ((x + y) % 4 === 0) {
          this.ctx.fillStyle = "#ff6600";
          this.ctx.fillRect(pixelX + 14, pixelY + 14, 3, 3);
        }
        break;

      case this.TILES.ICE_CRYSTAL:
        // Ice crystal decoration - large crystal
        // Ice base
        this.ctx.fillStyle = "#bfdbfe";
        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

        // Crystal structure
        this.ctx.fillStyle = "#60a5fa";
        this.ctx.beginPath();
        this.ctx.moveTo(pixelX + 16, pixelY + 4);
        this.ctx.lineTo(pixelX + 24, pixelY + 16);
        this.ctx.lineTo(pixelX + 16, pixelY + 28);
        this.ctx.lineTo(pixelX + 8, pixelY + 16);
        this.ctx.closePath();
        this.ctx.fill();

        // Crystal highlights
        this.ctx.fillStyle = "#dbeafe";
        this.ctx.fillRect(pixelX + 14, pixelY + 8, 4, 8);

        // Glow
        this.ctx.fillStyle = "rgba(191, 219, 254, 0.5)";
        this.ctx.fillRect(pixelX + 12, pixelY + 12, 8, 8);
        break;
    }
  }

  renderOrganicGrass(pixelX, pixelY, x, y) {
    // Base grass with gradient
    const gradient = this.ctx.createRadialGradient(
      pixelX + 16,
      pixelY + 16,
      0,
      pixelX + 16,
      pixelY + 16,
      16,
    );
    gradient.addColorStop(0, "#4ade80");
    gradient.addColorStop(0.7, "#22c55e");
    gradient.addColorStop(1, "#16a34a");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

    // Add organic grass blades
    this.ctx.fillStyle = "#15803d";
    for (let i = 0; i < 12; i++) {
      const seedX = (x * 7 + y * 11 + i * 13) % 100;
      const seedY = (x * 13 + y * 7 + i * 17) % 100;
      const bladeX = pixelX + (seedX / 100) * 28 + 2;
      const bladeY = pixelY + (seedY / 100) * 28 + 2;

      // Draw organic grass blade
      this.ctx.beginPath();
      this.ctx.ellipse(
        bladeX,
        bladeY,
        1.5,
        3,
        Math.PI * (seedX / 200),
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
    }

    // Add lighter grass highlights
    this.ctx.fillStyle = "#86efac";
    for (let i = 0; i < 6; i++) {
      const seedX = (x * 5 + y * 9 + i * 19) % 100;
      const seedY = (x * 11 + y * 5 + i * 23) % 100;
      const highlightX = pixelX + (seedX / 100) * 30 + 1;
      const highlightY = pixelY + (seedY / 100) * 30 + 1;

      this.ctx.beginPath();
      this.ctx.arc(highlightX, highlightY, 1, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  renderOrganicWater(pixelX, pixelY, x, y, depth = "normal") {
    // Warna air cyan/turquoise seperti pada gambar referensi
    let baseColor, lightColor, darkColor, edgeColor;

    switch (depth) {
      case "deep":
        baseColor = "#0891b2"; // Cyan gelap
        lightColor = "#06b6d4"; // Cyan terang
        darkColor = "#0e7490"; // Cyan sangat gelap
        edgeColor = "#164e63"; // Untuk pinggiran
        break;
      case "shallow":
        baseColor = "#22d3ee"; // Cyan sangat terang
        lightColor = "#67e8f9"; // Cyan paling terang
        darkColor = "#06b6d4"; // Cyan medium
        edgeColor = "#0891b2"; // Untuk pinggiran
        break;
      default:
        baseColor = "#06b6d4"; // Cyan medium
        lightColor = "#22d3ee"; // Cyan terang
        darkColor = "#0891b2"; // Cyan gelap
        edgeColor = "#0e7490"; // Untuk pinggiran
    }

    // Background base color - isi penuh
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

    // Radial gradient untuk efek smooth di tengah
    const centerX = pixelX + this.tileSize / 2;
    const centerY = pixelY + this.tileSize / 2;
    const radius = this.tileSize * 0.7;

    const radialGradient = this.ctx.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      radius,
    );
    radialGradient.addColorStop(0, lightColor);
    radialGradient.addColorStop(0.6, baseColor);
    radialGradient.addColorStop(1, darkColor);

    this.ctx.fillStyle = radialGradient;
    this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);

    // Cek apakah ada tile non-air di sekitar untuk shading pinggiran
    const hasLandLeft =
      x > 0 &&
      this.world[y] &&
      this.world[y][x - 1] !== this.TILES.WATER &&
      this.world[y][x - 1] !== this.TILES.SHALLOW_WATER &&
      this.world[y][x - 1] !== this.TILES.DEEP_WATER;
    const hasLandRight =
      x < this.worldWidth - 1 &&
      this.world[y] &&
      this.world[y][x + 1] !== this.TILES.WATER &&
      this.world[y][x + 1] !== this.TILES.SHALLOW_WATER &&
      this.world[y][x + 1] !== this.TILES.DEEP_WATER;
    const hasLandTop =
      y > 0 &&
      this.world[y - 1] &&
      this.world[y - 1][x] !== this.TILES.WATER &&
      this.world[y - 1][x] !== this.TILES.SHALLOW_WATER &&
      this.world[y - 1][x] !== this.TILES.DEEP_WATER;
    const hasLandBottom =
      y < this.worldHeight - 1 &&
      this.world[y + 1] &&
      this.world[y + 1][x] !== this.TILES.WATER &&
      this.world[y + 1][x] !== this.TILES.SHALLOW_WATER &&
      this.world[y + 1][x] !== this.TILES.DEEP_WATER;

    // Shading gelap di pinggiran yang berbatasan dengan daratan (seperti gambar referensi)
    const edgeWidth = this.tileSize * 0.3;

    if (hasLandLeft) {
      const edgeGradient = this.ctx.createLinearGradient(
        pixelX,
        pixelY,
        pixelX + edgeWidth,
        pixelY,
      );
      edgeGradient.addColorStop(0, edgeColor);
      edgeGradient.addColorStop(1, "rgba(6, 182, 212, 0)");
      this.ctx.fillStyle = edgeGradient;
      this.ctx.fillRect(pixelX, pixelY, edgeWidth, this.tileSize);
    }

    if (hasLandRight) {
      const edgeGradient = this.ctx.createLinearGradient(
        pixelX + this.tileSize,
        pixelY,
        pixelX + this.tileSize - edgeWidth,
        pixelY,
      );
      edgeGradient.addColorStop(0, edgeColor);
      edgeGradient.addColorStop(1, "rgba(6, 182, 212, 0)");
      this.ctx.fillStyle = edgeGradient;
      this.ctx.fillRect(
        pixelX + this.tileSize - edgeWidth,
        pixelY,
        edgeWidth,
        this.tileSize,
      );
    }

    if (hasLandTop) {
      const edgeGradient = this.ctx.createLinearGradient(
        pixelX,
        pixelY,
        pixelX,
        pixelY + edgeWidth,
      );
      edgeGradient.addColorStop(0, edgeColor);
      edgeGradient.addColorStop(1, "rgba(6, 182, 212, 0)");
      this.ctx.fillStyle = edgeGradient;
      this.ctx.fillRect(pixelX, pixelY, this.tileSize, edgeWidth);
    }

    if (hasLandBottom) {
      const edgeGradient = this.ctx.createLinearGradient(
        pixelX,
        pixelY + this.tileSize,
        pixelX,
        pixelY + this.tileSize - edgeWidth,
      );
      edgeGradient.addColorStop(0, edgeColor);
      edgeGradient.addColorStop(1, "rgba(6, 182, 212, 0)");
      this.ctx.fillStyle = edgeGradient;
      this.ctx.fillRect(
        pixelX,
        pixelY + this.tileSize - edgeWidth,
        this.tileSize,
        edgeWidth,
      );
    }

    // Subtle water shimmer/sparkles
    const time = Date.now() * 0.002;
    const shimmerAlpha = 0.15 + Math.sin(time + x * 0.5 + y * 0.5) * 0.1;

    this.ctx.fillStyle = `rgba(255, 255, 255, ${shimmerAlpha})`;
    this.ctx.globalAlpha = 0.3;

    // Beberapa sparkle kecil
    for (let i = 0; i < 2; i++) {
      const sparkleX =
        pixelX +
        this.tileSize * 0.3 +
        Math.sin(time * 0.5 + x + i) * (this.tileSize * 0.2);
      const sparkleY =
        pixelY +
        this.tileSize * 0.3 +
        Math.cos(time * 0.5 + y + i) * (this.tileSize * 0.2);
      const size = 1 + Math.sin(time * 3 + x + y + i) * 0.5;

      this.ctx.beginPath();
      this.ctx.arc(
        sparkleX + i * (this.tileSize * 0.4),
        sparkleY + i * (this.tileSize * 0.4),
        size,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1.0;
  }

  renderOrganicTree(pixelX, pixelY, x, y, isDark = false) {
    // Grass base first
    this.renderOrganicGrass(pixelX, pixelY, x, y);

    const trunkColor = isDark ? "#451a03" : "#92400e";
    const leafColor = isDark ? "#14532d" : "#16a34a";
    const leafHighlight = isDark ? "#166534" : "#22c55e";

    // Tree trunk with organic shape
    this.ctx.fillStyle = trunkColor;
    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 16, pixelY + 24, 4, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Tree leaves with organic shape
    this.ctx.fillStyle = leafColor;
    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 16, pixelY + 12, 12, 10, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Add leaf texture
    this.ctx.fillStyle = leafHighlight;
    for (let i = 0; i < 8; i++) {
      const leafX = pixelX + 8 + (i % 4) * 4 + Math.sin(i) * 2;
      const leafY = pixelY + 6 + Math.floor(i / 4) * 4 + Math.cos(i) * 2;
      this.ctx.beginPath();
      this.ctx.arc(leafX, leafY, 1.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  renderOrganicRock(pixelX, pixelY, x, y) {
    // Rock with organic shape
    this.ctx.fillStyle = "#374151";

    // Main rock body
    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 16, pixelY + 18, 10, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Rock top
    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 16, pixelY + 12, 8, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Rock highlights
    this.ctx.fillStyle = "#6b7280";
    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 12, pixelY + 10, 3, 2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 20, pixelY + 16, 2, 1.5, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  renderSteppedSand(pixelX, pixelY, x, y) {
    // Warna pasir coklat seperti gambar referensi
    const sandColors = ["#C2B280", "#D2B48C", "#B8956A", "#A88754"];
    const darkerSand = "#9B7F5A";

    // Cek apakah ada air di sekitar tile ini
    const hasWaterLeft =
      x > 0 &&
      this.world[y] &&
      (this.world[y][x - 1] === this.TILES.WATER ||
        this.world[y][x - 1] === this.TILES.SHALLOW_WATER ||
        this.world[y][x - 1] === this.TILES.DEEP_WATER);
    const hasWaterRight =
      x < this.worldWidth - 1 &&
      this.world[y] &&
      (this.world[y][x + 1] === this.TILES.WATER ||
        this.world[y][x + 1] === this.TILES.SHALLOW_WATER ||
        this.world[y][x + 1] === this.TILES.DEEP_WATER);
    const hasWaterTop =
      y > 0 &&
      this.world[y - 1] &&
      (this.world[y - 1][x] === this.TILES.WATER ||
        this.world[y - 1][x] === this.TILES.SHALLOW_WATER ||
        this.world[y - 1][x] === this.TILES.DEEP_WATER);
    const hasWaterBottom =
      y < this.worldHeight - 1 &&
      this.world[y + 1] &&
      (this.world[y + 1][x] === this.TILES.WATER ||
        this.world[y + 1][x] === this.TILES.SHALLOW_WATER ||
        this.world[y + 1][x] === this.TILES.DEEP_WATER);

    const blockSize = 8;

    // Gambar base tile pasir dengan blok-blok 8x8 + efek volume/3D
    for (let sx = 0; sx < 4; sx++) {
      for (let sy = 0; sy < 4; sy++) {
        const blockX = pixelX + sx * blockSize;
        const blockY = pixelY + sy * blockSize;
        const colorIdx = (sx + sy + x + y) % sandColors.length;

        // Base color - blok utama
        this.ctx.fillStyle = sandColors[colorIdx];
        this.ctx.fillRect(blockX, blockY, blockSize, blockSize);

        // Tambahkan efek VOLUME/3D seperti gambar referensi

        // 1. Highlight terang di bagian atas-kiri (seperti cahaya dari atas)
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        this.ctx.fillRect(blockX, blockY, blockSize, 2); // Top edge
        this.ctx.fillRect(blockX, blockY, 2, blockSize); // Left edge

        // 2. Bayangan gelap di bagian bawah-kanan (untuk depth)
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        this.ctx.fillRect(blockX, blockY + blockSize - 2, blockSize, 2); // Bottom edge
        this.ctx.fillRect(blockX + blockSize - 2, blockY, 2, blockSize); // Right edge

        // 3. Shadow ekstra di corner kanan bawah
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        this.ctx.fillRect(blockX + blockSize - 2, blockY + blockSize - 2, 2, 2);
      }
    }

    // Buat efek bergerigi/jagged seperti gambar 1
    // Setiap baris blok memiliki tonjolan berbeda ke arah air

    // Pola tonjolan untuk setiap baris (0 = tidak menonjol, 1 = menonjol 1 blok, 2 = menonjol 2 blok)
    const jaggedPattern = [
      (x + y) % 3, // Baris 0: variasi 0-2
      (x + y + 1) % 3, // Baris 1: variasi 0-2
      (x + y + 2) % 3, // Baris 2: variasi 0-2
      (x + y) % 2, // Baris 3: variasi 0-1
    ];

    // Jika ada air di KIRI - buat tonjolan bergerigi
    if (hasWaterLeft) {
      for (let sy = 0; sy < 4; sy++) {
        const extension = jaggedPattern[sy];
        if (extension > 0) {
          // Gambar blok yang menonjol ke arah air
          for (let ext = 0; ext < extension; ext++) {
            const blockX = pixelX - (ext + 1) * blockSize;
            const blockY = pixelY + sy * blockSize;
            const colorIdx = (sy + ext + x + y) % sandColors.length;

            // Gunakan warna lebih gelap untuk blok yang lebih jauh
            if (ext === extension - 1) {
              this.ctx.fillStyle = darkerSand;
            } else {
              this.ctx.fillStyle = sandColors[colorIdx];
            }
            this.ctx.fillRect(blockX, blockY, blockSize, blockSize);

            // Tambahkan efek volume/3D pada tonjolan
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            this.ctx.fillRect(blockX, blockY, blockSize, 2);
            this.ctx.fillRect(blockX, blockY, 2, blockSize);

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            this.ctx.fillRect(blockX, blockY + blockSize - 2, blockSize, 2);
            this.ctx.fillRect(blockX + blockSize - 2, blockY, 2, blockSize);

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            this.ctx.fillRect(
              blockX + blockSize - 2,
              blockY + blockSize - 2,
              2,
              2,
            );
          }
        }
      }
    }

    // Jika ada air di KANAN - buat tonjolan bergerigi
    if (hasWaterRight) {
      for (let sy = 0; sy < 4; sy++) {
        const extension = jaggedPattern[sy];
        if (extension > 0) {
          for (let ext = 0; ext < extension; ext++) {
            const blockX = pixelX + this.tileSize + ext * blockSize;
            const blockY = pixelY + sy * blockSize;
            const colorIdx = (sy + ext + x + y) % sandColors.length;

            if (ext === extension - 1) {
              this.ctx.fillStyle = darkerSand;
            } else {
              this.ctx.fillStyle = sandColors[colorIdx];
            }
            this.ctx.fillRect(blockX, blockY, blockSize, blockSize);

            // Efek volume/3D
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            this.ctx.fillRect(blockX, blockY, blockSize, 2);
            this.ctx.fillRect(blockX, blockY, 2, blockSize);

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            this.ctx.fillRect(blockX, blockY + blockSize - 2, blockSize, 2);
            this.ctx.fillRect(blockX + blockSize - 2, blockY, 2, blockSize);

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            this.ctx.fillRect(
              blockX + blockSize - 2,
              blockY + blockSize - 2,
              2,
              2,
            );
          }
        }
      }
    }

    // Jika ada air di ATAS - buat tonjolan bergerigi
    if (hasWaterTop) {
      for (let sx = 0; sx < 4; sx++) {
        const extension = jaggedPattern[sx];
        if (extension > 0) {
          for (let ext = 0; ext < extension; ext++) {
            const blockX = pixelX + sx * blockSize;
            const blockY = pixelY - (ext + 1) * blockSize;
            const colorIdx = (sx + ext + x + y) % sandColors.length;

            if (ext === extension - 1) {
              this.ctx.fillStyle = darkerSand;
            } else {
              this.ctx.fillStyle = sandColors[colorIdx];
            }
            this.ctx.fillRect(blockX, blockY, blockSize, blockSize);

            // Efek volume/3D
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            this.ctx.fillRect(blockX, blockY, blockSize, 2);
            this.ctx.fillRect(blockX, blockY, 2, blockSize);

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            this.ctx.fillRect(blockX, blockY + blockSize - 2, blockSize, 2);
            this.ctx.fillRect(blockX + blockSize - 2, blockY, 2, blockSize);

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            this.ctx.fillRect(
              blockX + blockSize - 2,
              blockY + blockSize - 2,
              2,
              2,
            );
          }
        }
      }
    }

    // Jika ada air di BAWAH - buat tonjolan bergerigi
    if (hasWaterBottom) {
      for (let sx = 0; sx < 4; sx++) {
        const extension = jaggedPattern[sx];
        if (extension > 0) {
          for (let ext = 0; ext < extension; ext++) {
            const blockX = pixelX + sx * blockSize;
            const blockY = pixelY + this.tileSize + ext * blockSize;
            const colorIdx = (sx + ext + x + y) % sandColors.length;

            if (ext === extension - 1) {
              this.ctx.fillStyle = darkerSand;
            } else {
              this.ctx.fillStyle = sandColors[colorIdx];
            }
            this.ctx.fillRect(blockX, blockY, blockSize, blockSize);

            // Efek volume/3D
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
            this.ctx.fillRect(blockX, blockY, blockSize, 2);
            this.ctx.fillRect(blockX, blockY, 2, blockSize);

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
            this.ctx.fillRect(blockX, blockY + blockSize - 2, blockSize, 2);
            this.ctx.fillRect(blockX + blockSize - 2, blockY, 2, blockSize);

            this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            this.ctx.fillRect(
              blockX + blockSize - 2,
              blockY + blockSize - 2,
              2,
              2,
            );
          }
        }
      }
    }

    // Tambahkan highlight untuk efek 3D
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    if ((x + y) % 3 === 0) {
      this.ctx.fillRect(pixelX + 2, pixelY + 2, 3, 2);
    }
  }

  renderPlayer() {
    const pixelX = this.playerPos.x * this.tileSize;
    const pixelY = this.playerPos.y * this.tileSize;

    // Player shadow (organic)
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 16, pixelY + 30, 12, 3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Player body (organic)
    this.ctx.fillStyle = "#3498db";
    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 16, pixelY + 20, 8, 6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Player head (organic)
    this.ctx.fillStyle = "#f4d1ae";
    this.ctx.beginPath();
    this.ctx.arc(pixelX + 16, pixelY + 12, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Player hair (organic)
    this.ctx.fillStyle = "#8b4513";
    this.ctx.beginPath();
    this.ctx.ellipse(pixelX + 16, pixelY + 8, 7, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Player eyes
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.beginPath();
    this.ctx.arc(pixelX + 14, pixelY + 11, 1, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(pixelX + 18, pixelY + 11, 1, 0, Math.PI * 2);
    this.ctx.fill();

    // Render equipped item from hotbar
    if (
      this.equippedHotbarSlot >= 0 &&
      this.hotbarSlots[this.equippedHotbarSlot]
    ) {
      const equippedItem = this.hotbarSlots[this.equippedHotbarSlot];

      if (equippedItem.type === "rod") {
        // Show fishing rod
        this.ctx.strokeStyle = "#8b4513";
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = "round";
        this.ctx.beginPath();
        this.ctx.moveTo(pixelX + 20, pixelY + 14);
        this.ctx.lineTo(pixelX + 28, pixelY + 6);
        this.ctx.stroke();
      } else if (equippedItem.icon) {
        // Show item icon next to player
        this.ctx.font = "bold 16px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        // Shadow
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.ctx.fillText(equippedItem.icon, pixelX + 25, pixelY + 16);

        // Icon
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(equippedItem.icon, pixelX + 24, pixelY + 15);
      }
    }

    // Fishing rod animation (saat sedang memancing)
    if (this.isFishing) {
      this.ctx.strokeStyle = "#8b4513";
      this.ctx.lineWidth = 3;
      this.ctx.lineCap = "round";
      this.ctx.beginPath();
      this.ctx.moveTo(pixelX + 20, pixelY + 14);
      this.ctx.lineTo(pixelX + 28, pixelY + 6);
      this.ctx.stroke();
    }
  }

  renderFishingSpots() {
    this.fishingSpots.forEach((spot) => {
      const pixelX = spot.x * this.tileSize;
      const pixelY = spot.y * this.tileSize;

      // Fishing spot indicator
      const time = Date.now() * 0.003;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(time) * 0.3})`;
      this.ctx.fillRect(pixelX + 12, pixelY + 12, 8, 8);
    });
  }

  renderNPCs() {
    this.npcs.forEach((npc) => {
      const pixelX = npc.x * this.tileSize;
      const pixelY = npc.y * this.tileSize;

      // NPC shadow (organic)
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      this.ctx.beginPath();
      this.ctx.ellipse(pixelX + 16, pixelY + 30, 12, 3, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // NPC body colors based on type
      let bodyColor = "#e74c3c";
      if (npc.type === "fishmonger") bodyColor = "#3498db";
      if (npc.type === "rodshop") bodyColor = "#f39c12";
      if (npc.type === "cook") bodyColor = "#2ecc71";
      if (npc.type === "guide") bodyColor = "#9b59b6";

      // NPC body (organic)
      this.ctx.fillStyle = bodyColor;
      this.ctx.beginPath();
      this.ctx.ellipse(pixelX + 16, pixelY + 20, 8, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // NPC head (organic)
      this.ctx.fillStyle = "#f4d1ae";
      this.ctx.beginPath();
      this.ctx.arc(pixelX + 16, pixelY + 12, 6, 0, Math.PI * 2);
      this.ctx.fill();

      // NPC hair (organic)
      this.ctx.fillStyle = "#34495e";
      this.ctx.beginPath();
      this.ctx.ellipse(pixelX + 16, pixelY + 8, 7, 4, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // NPC indicator (floating icon)
      const time = Date.now() * 0.003;
      const floatY = pixelY - 8 + Math.sin(time + npc.x) * 2;

      this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      this.ctx.fillRect(pixelX + 12, floatY - 2, 8, 8);

      // NPC type icon
      this.ctx.fillStyle = "#2c3e50";
      this.ctx.font = "12px Arial";
      this.ctx.textAlign = "center";
      let icon = "?";
      if (npc.type === "fishmonger") icon = "🐟";
      if (npc.type === "rodshop") icon = "🎣";
      if (npc.type === "cook") icon = "🍳";
      if (npc.type === "guide") icon = "👋";

      this.ctx.fillText(icon, pixelX + 16, floatY + 4);

      // NPC name label
      this.ctx.fillStyle = "#000000";
      this.ctx.font = "10px Arial";
      this.ctx.textAlign = "center";
      this.ctx.fillText(npc.name, pixelX + 16, floatY - 10);

      // Show interaction prompt if player is near
      if (this.isNearNPC(npc)) {
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        this.ctx.fillRect(pixelX - 10, floatY - 20, 52, 16);
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "10px Arial";
        this.ctx.fillText("Press E", pixelX + 16, floatY - 10);
      }
    });
  }

  renderFishingLine() {
    if (this.fishingState === "idle") return;

    const playerPixelX = this.playerPos.x * this.tileSize + 16;
    const playerPixelY = this.playerPos.y * this.tileSize + 16;

    // Draw fishing line
    this.ctx.strokeStyle = "#8B4513";
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(playerPixelX + 12, playerPixelY - 2);

    if (this.fishingState === "casting") {
      // Animated casting line
      const progress = (Date.now() % 1000) / 1000;
      const castX =
        playerPixelX + 12 + (this.bobberPos.x - playerPixelX - 12) * progress;
      const castY =
        playerPixelY - 2 + (this.bobberPos.y - playerPixelY + 2) * progress;
      this.ctx.lineTo(castX, castY);
    } else {
      // Line to bobber
      let bobberX = this.bobberPos.x;
      let bobberY = this.bobberPos.y;

      // Add struggle animation when fish is hooked
      if (this.fishingState === "hooked" || this.fishingState === "reeling") {
        const struggle = Math.sin(Date.now() * 0.02) * this.fishStruggle * 10;
        bobberX += struggle;
        bobberY += Math.cos(Date.now() * 0.015) * this.fishStruggle * 5;
      }

      this.ctx.lineTo(bobberX, bobberY);
    }
    this.ctx.stroke();

    // Draw bobber
    if (this.fishingState !== "casting") {
      let bobberX = this.bobberPos.x;
      let bobberY = this.bobberPos.y;

      // Bobber animation
      if (this.fishingState === "waiting") {
        bobberY += Math.sin(Date.now() * 0.005) * 2;
      } else if (
        this.fishingState === "hooked" ||
        this.fishingState === "reeling"
      ) {
        const struggle = Math.sin(Date.now() * 0.02) * this.fishStruggle * 10;
        bobberX += struggle;
        bobberY += Math.cos(Date.now() * 0.015) * this.fishStruggle * 5;
      }

      // Bobber body
      this.ctx.fillStyle = this.fishHooked ? "#FF4444" : "#FF6B6B";
      this.ctx.beginPath();
      this.ctx.arc(bobberX, bobberY, 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Bobber highlight
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.beginPath();
      this.ctx.arc(bobberX - 1, bobberY - 1, 1.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Water ripples around bobber
      if (this.fishingState === "waiting" || this.fishingState === "hooked") {
        const rippleTime = Date.now() * 0.003;
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        this.ctx.lineWidth = 1;

        for (let i = 0; i < 3; i++) {
          const rippleRadius = 8 + i * 6 + Math.sin(rippleTime + i) * 3;
          this.ctx.globalAlpha = 0.3 - i * 0.1;
          this.ctx.beginPath();
          this.ctx.arc(bobberX, bobberY, rippleRadius, 0, Math.PI * 2);
          this.ctx.stroke();
        }
        this.ctx.globalAlpha = 1.0;
      }
    }
  }

  renderHotbarInGame() {
    const slotSize = 48;
    const slotGap = 6;
    const slotCount = 5;
    const totalWidth = slotSize * slotCount + slotGap * (slotCount - 1);
    const startX = (this.canvas.width - totalWidth) / 2;
    const startY = this.canvas.height - slotSize - 45; // Raised higher (was 15, now 45)

    // Render background bar
    this.ctx.fillStyle = "rgba(40, 40, 40, 0.9)";
    this.ctx.fillRect(startX - 6, startY - 6, totalWidth + 12, slotSize + 12);
    this.ctx.strokeStyle = "rgba(80, 80, 80, 0.9)";
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(startX - 6, startY - 6, totalWidth + 12, slotSize + 12);

    // Render each slot
    for (let i = 0; i < slotCount; i++) {
      const slotX = startX + i * (slotSize + slotGap);
      const slotY = startY;

      // Slot background
      const gradient = this.ctx.createLinearGradient(
        slotX,
        slotY,
        slotX + slotSize,
        slotY + slotSize,
      );
      gradient.addColorStop(0, "rgba(50, 50, 50, 0.9)");
      gradient.addColorStop(1, "rgba(30, 30, 30, 0.9)");
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(slotX, slotY, slotSize, slotSize);

      // Slot border (green if equipped)
      this.ctx.strokeStyle =
        i === this.equippedHotbarSlot
          ? "rgba(76, 175, 80, 0.9)"
          : "rgba(80, 80, 80, 0.8)";
      this.ctx.lineWidth = i === this.equippedHotbarSlot ? 3 : 2;
      this.ctx.strokeRect(slotX, slotY, slotSize, slotSize);

      // Inset shadow
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      this.ctx.fillRect(slotX, slotY, slotSize, 2);
      this.ctx.fillRect(slotX, slotY, 2, slotSize);

      const item = this.hotbarSlots[i];

      if (item) {
        // Render item icon
        this.ctx.font = "bold 24px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";

        // Shadow for icon
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.ctx.fillText(
          item.icon || "📦",
          slotX + slotSize / 2 + 1,
          slotY + slotSize / 2 - 4 + 1,
        );

        // Icon
        this.ctx.fillStyle = "#ffffff";
        this.ctx.fillText(
          item.icon || "📦",
          slotX + slotSize / 2,
          slotY + slotSize / 2 - 4,
        );

        // Render item name
        this.ctx.font = "7px Arial";
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        this.ctx.fillText(
          item.name || "",
          slotX + slotSize / 2,
          slotY + slotSize - 8 + 1,
        );
        // Render badge (quantity)
        if (item.quantity && item.quantity > 1) {
          const badgeRadius = 9;
          const badgeX = slotX + slotSize - 6;
          const badgeY = slotY + 6;

          // Badge background
          const badgeGradient = this.ctx.createLinearGradient(
            badgeX - badgeRadius,
            badgeY - badgeRadius,
            badgeX + badgeRadius,
            badgeY + badgeRadius,
          );
          badgeGradient.addColorStop(0, "#e74c3c");
          badgeGradient.addColorStop(1, "#c0392b");
          this.ctx.fillStyle = badgeGradient;
          this.ctx.beginPath();
          this.ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
          this.ctx.fill();

          // Badge border
          this.ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
          this.ctx.lineWidth = 2;
          this.ctx.stroke();

          // Badge text
          this.ctx.font = "bold 10px Arial";
          this.ctx.fillStyle = "#ffffff";
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(item.quantity, badgeX, badgeY);
        }

        // X button di ujung kanan atas untuk remove item (hanya slots 1-4)
        if (i > 0 && i <= 4) {
          const xBtnSize = 12;
          const xBtnX = slotX + slotSize - xBtnSize - 2;
          const xBtnY = slotY + 2;

          // X button background
          this.ctx.fillStyle = "rgba(231, 76, 60, 0.8)";
          this.ctx.fillRect(xBtnX, xBtnY, xBtnSize, xBtnSize);

          // X button border
          this.ctx.strokeStyle = "rgba(192, 57, 43, 0.9)";
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(xBtnX, xBtnY, xBtnSize, xBtnSize);

          // X icon
          this.ctx.font = "bold 10px Arial";
          this.ctx.fillStyle = "#ffffff";
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText("×", xBtnX + xBtnSize / 2, xBtnY + xBtnSize / 2);
        }
      } else if (i > 0) {
        // Empty slot (only for slots 1-4, show + icon)
        this.ctx.font = "20px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillStyle = "rgba(128, 128, 128, 0.4)";
        this.ctx.fillText("+", slotX + slotSize / 2, slotY + slotSize / 2 - 2);
      }

      // Render key number
      this.ctx.font = "bold 9px Arial";
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      this.ctx.fillRect(slotX + 2, slotY + slotSize - 14, 12, 12);
      this.ctx.strokeStyle = "rgba(100, 100, 100, 0.6)";
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(slotX + 2, slotY + slotSize - 14, 12, 12);
      this.ctx.fillStyle = "#bbbbbb";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText((i + 1).toString(), slotX + 8, slotY + slotSize - 8);
    }
  }

  isNearNPC(npc) {
    const distance =
      Math.abs(this.playerPos.x - npc.x) + Math.abs(this.playerPos.y - npc.y);
    return distance <= 1;
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
        return (
          tile === this.TILES.WATER ||
          tile === this.TILES.DEEP_WATER ||
          tile === this.TILES.SHALLOW_WATER ||
          tile === this.TILES.LAVA ||
          tile === this.TILES.FROZEN_WATER
        );
      }
      return false;
    });
  }

  interactWithNPC() {
    const nearbyNPC = this.npcs.find((npc) => this.isNearNPC(npc));
    if (!nearbyNPC) return;

    const modal = document.getElementById("npcModal");
    const title = document.getElementById("npcTitle");
    const content = document.getElementById("npcContent");

    switch (nearbyNPC.type) {
      case "fishmonger":
        title.textContent = `🏪 ${nearbyNPC.name}`;
        content.innerHTML = this.renderFishmongerMenu();
        break;
      case "rodshop":
        title.textContent = `🎣 ${nearbyNPC.name}`;
        content.innerHTML = this.renderRodShopMenu();
        break;
      case "cook":
        title.textContent = `👨‍🍳 ${nearbyNPC.name}`;
        content.innerHTML = this.renderChefMenu();
        break;
      case "guide":
        title.textContent = `👋 ${nearbyNPC.name}`;
        content.innerHTML = `<p>Welcome to Fish Land</p>`;
        break;
    }

    modal.style.display = "flex";
  }

  renderFishmongerMenu() {
    // Count total fish in bag (not in hotbar slots)
    let totalFishInBag = 0;
    let bagFishList = [];

    if (this.player && this.player.inventory) {
      Object.entries(this.player.inventory).forEach(([fishId, quantity]) => {
        if (quantity > 0 && this.fishTypes[fishId]) {
          const availableQty = this.getAvailableQuantityInBag(fishId, "fish");
          const isFavorite = this.favoriteFish[fishId] || false;

          if (availableQty > 0) {
            if (!isFavorite) {
              totalFishInBag += availableQty;
            }
            const fishType = this.fishTypes[fishId];
            bagFishList.push({
              id: fishId,
              name: fishType.name,
              qty: availableQty,
              value: fishType.value,
              isFavorite: isFavorite,
            });
          }
        }
      });
    }

    // Calculate total value of all fish in bag (excluding favorites)
    const totalValue = bagFishList.reduce((sum, fish) => {
      if (!fish.isFavorite) {
        return sum + fish.qty * fish.value;
      }
      return sum;
    }, 0);

    let menuHTML = '<div class="npc-info">';

    // Option 1: Sell equipped fish (from hotbar)
    if (this.equippedItem && this.equippedItem.type === "fish") {
      const fishType = this.fishTypes[this.equippedItem.id];
      const sellPrice = fishType ? fishType.value : 0;
      const isFavorite = this.favoriteFish[this.equippedItem.id] || false;

      menuHTML += `
                <div style="margin-bottom: 20px; padding: 10px; background: rgba(52, 152, 219, 0.1); border: 1px solid rgba(52, 152, 219, 0.3); border-radius: 5px;">
                    <p style="font-size: 12px; color: #3498db; margin-bottom: 8px;">📦 EQUIPPED FISH (from hotbar):</p>
                    <p><strong>${isFavorite ? "⭐ " : ""}${
                      this.equippedItem.name
                    }</strong> (${this.equippedItem.quantity}x)</p>
                    <p>💰 Value: ${sellPrice} coins each</p>
                    ${
                      isFavorite
                        ? '<p style="color: #f39c12; font-size: 11px; margin-top: 5px;">⚠️ This fish is favorited (cannot be sold)</p>'
                        : '<button class="npc-action-btn" onclick="game.sellEquippedFish()" style="margin-top: 10px;">💰 SELL THIS FISH (1x)</button>'
                    }
                </div>
            `;
    } else {
      menuHTML += `
                <div style="margin-bottom: 20px; padding: 10px; background: rgba(149, 165, 166, 0.1); border: 1px solid rgba(149, 165, 166, 0.3); border-radius: 5px;">
                    <p style="color: #95a5a6;">📦 No fish equipped from hotbar</p>
                    <p style="font-size: 11px; color: #7f8c8d;">Press 2-5 to equip fish from hotbar slot</p>
                </div>
            `;
    }

    // Option 2: Sell ALL fish (bag + equipped + slots, excluding favorites)
    // Count total sellable fish
    let totalSellableFish = totalFishInBag; // From bag
    let totalSellableValue = totalValue;

    // Add equipped fish (if not favorite)
    if (
      this.equippedItem &&
      this.equippedItem.type === "fish" &&
      !this.favoriteFish[this.equippedItem.id]
    ) {
      totalSellableFish += this.equippedItem.quantity;
      const fishType = this.fishTypes[this.equippedItem.id];
      totalSellableValue +=
        (fishType ? fishType.value : 0) * this.equippedItem.quantity;
    }

    // Add fish in slots (if not favorite AND not currently equipped)
    for (let i = 1; i <= 4; i++) {
      // Skip equipped slot to avoid double counting
      if (i === this.equippedHotbarSlot) continue;

      const slot = this.hotbarSlots[i];
      if (slot && slot.type === "fish" && !this.favoriteFish[slot.id]) {
        totalSellableFish += slot.quantity;
        const fishType = this.fishTypes[slot.id];
        totalSellableValue += (fishType ? fishType.value : 0) * slot.quantity;
      }
    }

    if (totalSellableFish > 0) {
      menuHTML += `
                <div style="padding: 10px; background: rgba(46, 204, 113, 0.1); border: 1px solid rgba(46, 204, 113, 0.3); border-radius: 5px;">
                    <p style="font-size: 12px; color: #27ae60; margin-bottom: 8px;">💰 SELL ALL FISH:</p>
                    <p style="font-size: 11px; color: #7f8c8d; margin-bottom: 8px;">Includes: Bag + Equipped + Slots (excluding ⭐ favorites)</p>
            `;

      if (totalFishInBag > 0) {
        menuHTML += '<p style="margin-top: 5px;"><strong>In Bag:</strong></p>';
        bagFishList.forEach((fish) => {
          const isFav = this.favoriteFish[fish.id] || false;
          menuHTML += `<p style="font-size: 11px;">• ${isFav ? "⭐ " : ""}${
            fish.name
          }: ${fish.qty}x</p>`;
        });
      }

      menuHTML += `
                    <p style="margin-top: 10px; font-weight: bold;">💰 Total: ${totalSellableFish}x fish = ${totalSellableValue} coins</p>
                    <button class="npc-action-btn" onclick="game.sellAllFish()" style="margin-top: 10px; background: rgba(46, 204, 113, 0.3); border-color: #27ae60;">
                        💰 SELL ALL (${totalSellableFish}x)
                    </button>
                </div>
            `;
    } else {
      menuHTML += `
                <div style="padding: 10px; background: rgba(149, 165, 166, 0.1); border: 1px solid rgba(149, 165, 166, 0.3); border-radius: 5px;">
                    <p style="color: #95a5a6;">💰 No sellable fish</p>
                    <p style="font-size: 11px; color: #7f8c8d;">All fish are favorited or inventory is empty</p>
                </div>
            `;
    }

    menuHTML += "</div>";

    return menuHTML;
  }

  renderChefMenu() {
    let menuHTML = '<div class="npc-info">';

    menuHTML += `
      <div style="margin-bottom: 15px;">
        <p style="font-size: 14px; color: #e67e22; margin-bottom: 10px;">👨‍🍳 <strong>Stephanie's Cooking Service</strong></p>
        <p style="font-size: 12px; color: #95a5a6;">Berikan ikan Anda dan pilih jenis masakan!</p>
      </div>
    `;

    // Show equipped fish from hotbar
    if (this.equippedItem && this.equippedItem.type === "fish") {
      const fishName = this.equippedItem.name;
      const fishQty = this.equippedItem.quantity;

      menuHTML += `
        <div style="padding: 10px; background: rgba(52, 152, 219, 0.1); border: 1px solid rgba(52, 152, 219, 0.3); border-radius: 5px; margin-bottom: 15px;">
          <p style="font-size: 12px; color: #3498db; margin-bottom: 8px;">📦 EQUIPPED FISH:</p>
          <p><strong>${fishName}</strong> (${fishQty}x)</p>
        </div>
      `;

      menuHTML += `<p style="margin-bottom: 10px; font-weight: bold; color: #e67e22;">🍴 Pilih Jenis Masakan:</p>`;

      // Display cooking menu options
      Object.entries(this.cookingMenu).forEach(([dishId, dish]) => {
        const canAfford = this.player.coins >= dish.price;
        const buttonStyle = canAfford
          ? "background: rgba(46, 204, 113, 0.2); border-color: #27ae60; color: #27ae60;"
          : "background: rgba(149, 165, 166, 0.2); border-color: #95a5a6; color: #95a5a6; cursor: not-allowed;";

        menuHTML += `
          <div style="padding: 10px; margin-bottom: 10px; background: rgba(230, 126, 34, 0.05); border: 1px solid rgba(230, 126, 34, 0.2); border-radius: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
              <span style="font-weight: bold;">${dish.icon} ${dish.name}</span>
              <span style="color: #f39c12; font-weight: bold;">💰 ${
                dish.price
              } coins</span>
            </div>
            <p style="font-size: 11px; color: #7f8c8d; margin: 5px 0;">${
              dish.description
            }</p>
            <p style="font-size: 11px; color: #27ae60; margin: 5px 0;">🍽️ Hunger +${
              dish.hungerRestore
            }</p>
            <button 
              class="npc-action-btn" 
              onclick="game.cookDish('${dishId}')" 
              ${canAfford ? "" : "disabled"}
              style="${buttonStyle} margin-top: 5px; padding: 5px 10px; font-size: 12px;">
              ${canAfford ? `🍳 Masak ${dish.name}` : "💰 Tidak Cukup Koin"}
            </button>
          </div>
        `;
      });
    } else {
      menuHTML += `
        <div style="padding: 10px; background: rgba(149, 165, 166, 0.1); border: 1px solid rgba(149, 165, 166, 0.3); border-radius: 5px;">
          <p style="color: #95a5a6;">📦 Tidak ada ikan di tangan</p>
          <p style="font-size: 11px; color: #7f8c8d;">Tekan 2-5 untuk equip ikan dari hotbar slot</p>
        </div>
      `;
    }

    menuHTML += `
      <div style="margin-top: 15px; padding: 10px; background: rgba(52, 152, 219, 0.05); border-left: 3px solid #3498db;">
        <p style="font-size: 11px; color: #7f8c8d; margin: 0;">💡 <strong>Tips:</strong> Makanan yang dimasak akan restore hunger lebih banyak!</p>
      </div>
    `;

    menuHTML += "</div>";
    return menuHTML;
  }

  renderRodShopMenu() {
    let menuHTML = '<div class="npc-info">';

    menuHTML += `
      <div style="margin-bottom: 15px;">
        <p style="font-size: 14px; color: #3498db; margin-bottom: 10px;">🎣 <strong>Matthew's Rod Shop</strong></p>
        <p style="font-size: 12px; color: #95a5a6;">Upgrade fishing rodmu untuk hasil lebih baik!</p>
      </div>
    `;

    menuHTML += `<p style="margin-bottom: 10px; font-weight: bold; color: #3498db;">🛒 AVAILABLE RODS:</p>`;

    // Show all rods except basic (already owned)
    Object.entries(this.rodTypes).forEach(([rodId, rod]) => {
      if (rodId === "basic") return; // Skip basic rod

      const isOwned = this.ownedRods.includes(rodId);
      const canAfford = this.player.coins >= rod.price;

      let buttonStyle, buttonText;
      if (isOwned) {
        buttonStyle =
          "background: rgba(149, 165, 166, 0.2); border-color: #95a5a6; color: #95a5a6; cursor: not-allowed;";
        buttonText = "✅ Sudah Dimiliki";
      } else if (canAfford) {
        buttonStyle =
          "background: rgba(46, 204, 113, 0.2); border-color: #27ae60; color: #27ae60;";
        buttonText = `💰 Beli (${rod.price} coins)`;
      } else {
        buttonStyle =
          "background: rgba(149, 165, 166, 0.2); border-color: #95a5a6; color: #95a5a6; cursor: not-allowed;";
        buttonText = `💰 ${rod.price} coins (Tidak Cukup)`;
      }

      menuHTML += `
        <div style="padding: 10px; margin-bottom: 10px; background: rgba(52, 152, 219, 0.05); border: 1px solid rgba(52, 152, 219, 0.2); border-radius: 5px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
            <span style="font-weight: bold;">${rod.icon} ${rod.name}</span>
            <span style="color: #f39c12; font-weight: bold;">💰 ${
              rod.price
            } coins</span>
          </div>
          <p style="font-size: 11px; color: #7f8c8d; margin: 5px 0;">${
            rod.description
          }</p>
          <p style="font-size: 11px; color: #27ae60; margin: 5px 0;">📊 Catch Bonus: ${
            rod.catchBonus
          }x</p>
          <button 
            class="npc-action-btn" 
            onclick="game.buyRod('${rodId}')"
            ${isOwned || !canAfford ? "disabled" : ""}
            style="${buttonStyle} margin-top: 5px; padding: 5px 10px; font-size: 12px;">
            ${buttonText}
          </button>
        </div>
      `;
    });

    menuHTML += `
      <div style="margin-top: 15px; padding: 10px; background: rgba(52, 152, 219, 0.05); border-left: 3px solid #3498db;">
        <p style="font-size: 11px; color: #7f8c8d; margin: 0;">💡 <strong>Tips:</strong> Rod yang lebih baik meningkatkan peluang dapat ikan!</p>
      </div>
    `;

    menuHTML += "</div>";
    return menuHTML;
  }

  async sellEquippedFish() {
    if (!this.equippedItem || this.equippedItem.type !== "fish") {
      this.showMessage("No fish equipped to sell!", true);
      return;
    }

    // Check if fish is favorited
    if (this.favoriteFish[this.equippedItem.id]) {
      this.showMessage("⭐ Cannot sell favorited fish!", true);
      return;
    }

    try {
      const response = await fetch(`/api/player/${this.playerId}/sell-fish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fish_id: this.equippedItem.id }),
      });

      const result = await response.json();

      if (response.ok) {
        this.showMessage(result.message);

        // Decrease tracking for sold fish
        const key = `fish_${this.equippedItem.id}`;
        this.itemsInHotbar[key] = Math.max(
          0,
          (this.itemsInHotbar[key] || 0) - 1,
        );

        // Remove from hotbar slot
        const slotIndex = this.equippedHotbarSlot;
        if (slotIndex > 0 && slotIndex <= 4) {
          this.hotbarSlots[slotIndex] = null;
        }

        this.equippedItem = null; // Unequip after selling
        this.equippedHotbarSlot = -1;

        await this.loadPlayer();
        this.closeNpcModal();
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("Error selling fish", true);
    }
  }

  async sellAllFish() {
    // Sell ALL fish: bag + equipped + slots (excluding favorites)

    const fishToSell = [];

    // 1. Collect fish from bag (excluding favorites and those in slots)
    if (this.player && this.player.inventory) {
      Object.entries(this.player.inventory).forEach(([fishId, quantity]) => {
        if (
          quantity > 0 &&
          this.fishTypes[fishId] &&
          !this.favoriteFish[fishId]
        ) {
          const availableQty = this.getAvailableQuantityInBag(fishId, "fish");
          if (availableQty > 0) {
            fishToSell.push({
              fish_id: fishId,
              quantity: availableQty,
              source: "bag",
            });
          }
        }
      });
    }

    // 2. Collect equipped fish (if not favorite)
    if (
      this.equippedItem &&
      this.equippedItem.type === "fish" &&
      !this.favoriteFish[this.equippedItem.id]
    ) {
      fishToSell.push({
        fish_id: this.equippedItem.id,
        quantity: this.equippedItem.quantity,
        source: "equipped",
        slotIndex: this.equippedHotbarSlot,
      });
    }

    // 3. Collect fish from slots (if not favorite and not equipped)
    for (let i = 1; i <= 4; i++) {
      const slot = this.hotbarSlots[i];
      if (
        slot &&
        slot.type === "fish" &&
        !this.favoriteFish[slot.id] &&
        i !== this.equippedHotbarSlot
      ) {
        fishToSell.push({
          fish_id: slot.id,
          quantity: slot.quantity,
          source: "slot",
          slotIndex: i,
        });
      }
    }

    if (fishToSell.length === 0) {
      this.showMessage("No sellable fish! (All favorited or empty)", true);
      return;
    }

    try {
      // Sell each fish
      let totalCoins = 0;
      let totalFish = 0;

      for (const fish of fishToSell) {
        for (let i = 0; i < fish.quantity; i++) {
          const response = await fetch(
            `/api/player/${this.playerId}/sell-fish`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fish_id: fish.fish_id }),
            },
          );

          const result = await response.json();

          if (response.ok) {
            const fishType = this.fishTypes[fish.fish_id];
            totalCoins += fishType.value;
            totalFish++;
          }
        }

        // Clear from slot if sold from slot
        if (fish.source === "slot" || fish.source === "equipped") {
          this.hotbarSlots[fish.slotIndex] = null;

          // Update tracking
          const key = `fish_${fish.fish_id}`;
          this.itemsInHotbar[key] = Math.max(
            0,
            (this.itemsInHotbar[key] || 0) - fish.quantity,
          );
        }
      }

      // Clear equipped if was sold
      if (
        this.equippedItem &&
        this.equippedItem.type === "fish" &&
        !this.favoriteFish[this.equippedItem.id]
      ) {
        this.equippedItem = null;
        this.equippedHotbarSlot = -1;
      }

      this.showMessage(`💰 Sold ${totalFish} fish for ${totalCoins} coins!`);
      await this.loadPlayer();
      this.closeNpcModal();
    } catch (error) {
      this.showMessage("Error selling fish", true);
    }
  }

  async buyRod(rodId) {
    const rod = this.rodTypes[rodId];
    if (!rod) {
      this.showMessage("❌ Rod tidak valid!", true);
      return;
    }

    // Check if already owned
    if (this.ownedRods.includes(rodId)) {
      this.showMessage("❌ Rod sudah dimiliki!", true);
      return;
    }

    // Check if player has enough coins
    if (this.player.coins < rod.price) {
      this.showMessage(`❌ Koin tidak cukup! Butuh ${rod.price} coins`, true);
      return;
    }

    try {
      const response = await fetch(`/api/player/${this.playerId}/buy-rod`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rod_id: rodId,
          price: rod.price,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        this.showMessage(`✅ ${rod.icon} ${rod.name} berhasil dibeli!`);
        this.ownedRods.push(rodId);
        await this.loadPlayer();
        this.closeNpcModal();
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("❌ Error saat membeli rod!", true);
      console.error("Buy rod error:", error);
    }
  }

  async cookEquippedFish() {
    if (!this.equippedItem || this.equippedItem.type !== "fish") {
      this.showMessage("No fish equipped to cook!", true);
      return;
    }

    try {
      const response = await fetch(`/api/player/${this.playerId}/cook-fish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fish_id: this.equippedItem.id }),
      });

      const result = await response.json();

      if (response.ok) {
        this.showMessage(result.message);

        // Decrease tracking for cooked fish
        const key = `fish_${this.equippedItem.id}`;
        this.itemsInHotbar[key] = Math.max(
          0,
          (this.itemsInHotbar[key] || 0) - 1,
        );

        // Remove from hotbar slot
        const slotIndex = this.equippedHotbarSlot;
        if (slotIndex > 0 && slotIndex <= 4) {
          this.hotbarSlots[slotIndex] = null;
        }

        this.equippedItem = null; // Unequip after cooking
        this.equippedHotbarSlot = -1;

        await this.loadPlayer();
        this.closeNpcModal();
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("Error cooking fish", true);
    }
  }

  async cookDish(dishId) {
    if (!this.equippedItem || this.equippedItem.type !== "fish") {
      this.showMessage("❌ Tidak ada ikan yang di-equip!", true);
      return;
    }

    const dish = this.cookingMenu[dishId];
    if (!dish) {
      this.showMessage("❌ Menu tidak valid!", true);
      return;
    }

    // Check if player has enough coins
    if (this.player.coins < dish.price) {
      this.showMessage(`❌ Koin tidak cukup! Butuh ${dish.price} coins`, true);
      return;
    }

    try {
      const response = await fetch(`/api/player/${this.playerId}/cook-dish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fish_id: this.equippedItem.id,
          dish_id: dishId,
          price: dish.price,
          hunger_restore: dish.hungerRestore,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        this.showMessage(
          `✅ ${dish.icon} ${dish.name} berhasil dimasak! +${dish.hungerRestore} hunger`,
        );

        // Decrease tracking for fish
        const key = `fish_${this.equippedItem.id}`;
        this.itemsInHotbar[key] = Math.max(
          0,
          (this.itemsInHotbar[key] || 0) - 1,
        );

        // Remove from hotbar slot
        const slotIndex = this.equippedHotbarSlot;
        if (slotIndex > 0 && slotIndex <= 4) {
          this.hotbarSlots[slotIndex] = null;
        }

        this.equippedItem = null;
        this.equippedHotbarSlot = -1;

        await this.loadPlayer();
        this.closeNpcModal();
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("❌ Error saat memasak!", true);
      console.error("Cook dish error:", error);
    }
  }

  async goFishing() {
    // Check if rod is equipped in hotbar slot 0
    if (!this.equippedRod) {
      this.showMessage("Equip a fishing rod first! Open your bag (🎒)", true);
      return;
    }

    // Check if rod is equipped in hand (equippedHotbarSlot === 0)
    if (this.equippedHotbarSlot !== 0) {
      this.showMessage("Hold your rod first! Press 1 to equip rod", true);
      return;
    }

    if (!this.isNearWater()) {
      this.showMessage("Move closer to water to fish!");
      return;
    }

    if (this.fishingState === "idle") {
      this.startFishing();
    } else if (this.fishingState === "hooked") {
      this.reelInFish();
    }
    // Note: reeling clicks are handled by document click listener
  }

  startFishing() {
    this.isFishing = true;
    this.fishingState = "casting";
    this.fishingTimer = 0;
    this.fishingProgress = 0;

    const fishBtn = document.getElementById("fishBtn");
    const indicator = document.getElementById("fishingIndicator");

    fishBtn.style.display = "block"; // Ensure visible
    fishBtn.textContent = "🎣 Fishing...";
    fishBtn.classList.add("pixel-btn", "fishing-animation");
    fishBtn.classList.remove("primary");
    indicator.style.display = "block";

    // Calculate bobber position
    const playerPixelX = this.playerPos.x * this.tileSize;
    const playerPixelY = this.playerPos.y * this.tileSize;

    // Find nearest water tile
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
    ];

    for (const dir of directions) {
      const checkX = this.playerPos.x + dir.x;
      const checkY = this.playerPos.y + dir.y;

      if (
        checkX >= 0 &&
        checkX < this.worldWidth &&
        checkY >= 0 &&
        checkY < this.worldHeight
      ) {
        const tile = this.world[checkY][checkX];
        if (
          tile === this.TILES.WATER ||
          tile === this.TILES.DEEP_WATER ||
          tile === this.TILES.SHALLOW_WATER ||
          tile === this.TILES.LAVA ||
          tile === this.TILES.FROZEN_WATER
        ) {
          this.bobberPos.x = checkX * this.tileSize + 16;
          this.bobberPos.y = checkY * this.tileSize + 16;
          break;
        }
      }
    }

    this.fishingLinePos.x = playerPixelX + 16;
    this.fishingLinePos.y = playerPixelY + 16;

    // Transition to waiting state
    this.fishingTimeout = setTimeout(() => {
      if (this.fishingState === "casting") {
        this.fishingState = "waiting";
        const btn = document.getElementById("fishBtn");
        btn.textContent = "🎣 Waiting...";
        this.waitForFish();
      }
    }, 1000);
  }

  cancelFishing() {
    // Clear any pending timeouts
    if (this.fishingTimeout) {
      clearTimeout(this.fishingTimeout);
      this.fishingTimeout = null;
    }

    // Reset fishing state
    this.isFishing = false;
    this.fishingState = "idle";
    this.fishHooked = false;
    this.fishingProgress = 0;

    // Reset UI
    const fishBtn = document.getElementById("fishBtn");
    const indicator = document.getElementById("fishingIndicator");

    fishBtn.textContent = "🎣 Fish";
    fishBtn.classList.add("primary");
    fishBtn.classList.remove("fishing-animation");
    indicator.style.display = "none";

    this.updateFishButtonVisibility(); // Update button visibility
    // No message - silent cancel via unequip
  }

  waitForFish() {
    // Random time between 2-8 seconds for fish to bite
    const waitTime = 2000 + Math.random() * 6000;

    this.fishingTimeout = setTimeout(() => {
      if (this.fishingState === "waiting") {
        this.fishBite();
      }
    }, waitTime);
  }

  fishBite() {
    this.fishingState = "hooked";
    this.fishHooked = true;
    this.fishStruggle = 0.5 + Math.random() * 0.5; // Fish strength

    const fishBtn = document.getElementById("fishBtn");
    fishBtn.textContent = "🎣 FISH ON! Click to reel!";
    fishBtn.classList.add("fishing-animation");

    this.showMessage("Fish on the line! Click to reel it in!");

    // Auto-fail if not reeled in time
    this.fishingTimeout = setTimeout(() => {
      if (this.fishingState === "hooked") {
        this.fishEscaped();
      }
    }, 3000);
  }

  reelInFish() {
    if (this.fishingState !== "hooked") return;

    this.fishingState = "reeling";
    this.fishingProgress = 0;
    this.lastClickTime = Date.now();

    const fishBtn = document.getElementById("fishBtn");
    fishBtn.textContent = "🎣 Keep clicking to reel!";

    this.showMessage("Keep clicking to reel in the fish!");

    // Add click handler to entire document for easier clicking
    this.reelingClickHandler = (e) => {
      if (this.fishingState === "reeling") {
        this.lastClickTime = Date.now();
        this.pullFish();
      }
    };
    document.addEventListener("click", this.reelingClickHandler);

    // Check for inactivity - if no clicks for 2 seconds, fish escapes
    const checkInactivity = () => {
      if (this.fishingState === "reeling") {
        const timeSinceLastClick = Date.now() - this.lastClickTime;
        if (timeSinceLastClick > 2000) {
          // No clicks for 2 seconds
          this.fishEscaped();
          return;
        }
        // Continue checking
        setTimeout(checkInactivity, 500);
      }
    };
    setTimeout(checkInactivity, 500);
  }

  pullFish() {
    if (this.fishingState !== "reeling") return;

    // Increase progress based on fish struggle
    const pullStrength = 0.15 + Math.random() * 0.1;
    this.fishingProgress += pullStrength;

    // Fish fights back
    this.fishingProgress -= this.fishStruggle * 0.05;
    this.fishingProgress = Math.max(0, this.fishingProgress);

    // Update visual feedback
    const indicator = document.getElementById("fishingIndicator");
    const progressBar = indicator.querySelector(".fishing-progress");
    const instructions = document.getElementById("fishingInstructions");

    if (progressBar) {
      progressBar.style.width = `${this.fishingProgress * 100}%`;
    }

    if (instructions) {
      const progressPercent = Math.round(this.fishingProgress * 100);
      instructions.textContent = `Progress: ${progressPercent}% - Fish Strength: ${Math.round(
        this.fishStruggle * 100,
      )}%`;
    }

    // Check if fish is caught
    if (this.fishingProgress >= 1.0) {
      this.catchFish();
    }

    // Reduce fish struggle over time
    this.fishStruggle *= 0.98;
  }

  async catchFish() {
    // Clear timeout
    if (this.fishingTimeout) {
      clearTimeout(this.fishingTimeout);
      this.fishingTimeout = null;
    }

    // Remove click handler
    if (this.reelingClickHandler) {
      document.removeEventListener("click", this.reelingClickHandler);
      this.reelingClickHandler = null;
    }

    this.fishingState = "idle";
    this.isFishing = false;
    this.fishHooked = false;

    const fishBtn = document.getElementById("fishBtn");
    const indicator = document.getElementById("fishingIndicator");

    fishBtn.textContent = "🎣 Fish";
    fishBtn.disabled = false;
    fishBtn.classList.add("primary");
    fishBtn.classList.remove("fishing-animation");
    indicator.style.display = "none";

    this.updateFishButtonVisibility(); // Update button visibility

    // Determine fishing zone based on player position
    let fishingZone = null;

    // Check if player is near island 2 lake (roughly x: 31-35, y: 9-15)
    const nearLake = this.fishingSpots.some((spot) => {
      const distance =
        Math.abs(this.playerPos.x - spot.x) +
        Math.abs(this.playerPos.y - spot.y);
      return (
        distance <= 2 &&
        spot.x >= 31 &&
        spot.x <= 35 &&
        spot.y >= 9 &&
        spot.y <= 15
      );
    });

    if (nearLake) {
      fishingZone = "island2_lake";
    }

    // Check if player is near Pulau Baraju fire zone (lava pools: x: 24-30, y: 31-37)
    const nearFire = this.fishingSpots.some((spot) => {
      const distance =
        Math.abs(this.playerPos.x - spot.x) +
        Math.abs(this.playerPos.y - spot.y);
      return (
        distance <= 2 &&
        spot.x >= 24 &&
        spot.x <= 30 &&
        spot.y >= 31 &&
        spot.y <= 37
      );
    });

    if (nearFire) {
      fishingZone = "baraju_fire";
    }

    // Check if player is near Pulau Baraju ice zone (frozen water: x: 37-42, y: 31-37)
    const nearIce = this.fishingSpots.some((spot) => {
      const distance =
        Math.abs(this.playerPos.x - spot.x) +
        Math.abs(this.playerPos.y - spot.y);
      return (
        distance <= 2 &&
        spot.x >= 37 &&
        spot.x <= 42 &&
        spot.y >= 31 &&
        spot.y <= 37
      );
    });

    if (nearIce) {
      fishingZone = "baraju_ice";
    }

    try {
      const response = await fetch(`/api/player/${this.playerId}/fish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone: fishingZone,
          current_rod: this.equippedRod?.id || "basic_rod",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.success) {
          const fishName = result.fish?.name || result.message || "Fish";
          const rarity = result.rarity_category || result.fish?.category || "";
          this.showMessage(
            `Berhasil menangkap ${fishName}${rarity ? " (" + rarity + ")" : ""}`,
          );

          try {
            if (typeof this.createFishCatchAnimation === "function") {
              this.createFishCatchAnimation(result.fish);
            }
          } catch (e) {
            console.warn("createFishCatchAnimation failed:", e);
          }

          // Auto-fill hotbar with caught fish
          await this.loadPlayer();
          this.autoFillHotbar(result.fish);
        } else {
          this.showMessage(result.message);
          await this.loadPlayer();
        }
      } else {
        this.showMessage(result.detail, true);
      }
    } catch (error) {
      this.showMessage("Error while fishing", true);
    }
  }

  fishEscaped() {
    // Clear timeout
    if (this.fishingTimeout) {
      clearTimeout(this.fishingTimeout);
      this.fishingTimeout = null;
    }

    // Remove click handler
    if (this.reelingClickHandler) {
      document.removeEventListener("click", this.reelingClickHandler);
      this.reelingClickHandler = null;
    }

    this.fishingState = "idle";
    this.isFishing = false;
    this.fishHooked = false;

    const fishBtn = document.getElementById("fishBtn");
    const indicator = document.getElementById("fishingIndicator");

    fishBtn.textContent = "🎣 Fish";
    fishBtn.disabled = false;
    fishBtn.classList.add("primary");
    fishBtn.classList.remove("fishing-animation");
    indicator.style.display = "none";

    this.updateFishButtonVisibility(); // Update button visibility
    this.showMessage("The fish got away! Try again.");
  }

  async toggleAutoCook() {
    try {
      const response = await fetch(
        `/api/player/${this.playerId}/toggle-auto-cook`,
        {
          method: "POST",
        },
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

  startGameLoop() {
    setInterval(() => {
      this.loadPlayer();
    }, 5000);
  }

  updateUI() {
    if (!this.player) return;

    // Update stats
    document.getElementById("coins").textContent = this.player.coins;

    const healthBar = document.getElementById("health-bar");
    const healthText = document.getElementById("health-text");
    healthBar.style.width = `${this.player.health}%`;
    healthText.textContent = this.player.health;

    const hungerBar = document.getElementById("hunger-bar");
    const hungerText = document.getElementById("hunger-text");
    hungerBar.style.width = `${this.player.hunger}%`;
    hungerText.textContent = this.player.hunger;

    // Update hotbar (now rendered in canvas via renderHotbarInGame in render loop)
    this.updateHotbarData();
  }

  // Eat cooked food - bisa dipanggil dari inventory untuk makan langsung
  async eatCookedFood(fishType) {
    try {
      const response = await fetch(
        `/api/player/${this.playerId}/eat/${fishType}`,
        {
          method: "POST",
        },
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

// Panel toggle function
function togglePanel(panelId) {
  const panel = document.getElementById(panelId);
  panel.classList.toggle("collapsed");

  const toggle = panel.querySelector(".panel-toggle");
  toggle.textContent = panel.classList.contains("collapsed") ? "+" : "−";
}

// Initialize game when page loads
console.log("🎮 Setting up DOMContentLoaded listener...");

let game;
document.addEventListener("DOMContentLoaded", () => {
  console.log("🎮 DOM Content Loaded! Creating game...");
  try {
    game = new PixelFishingGame();
    console.log("✅ Game created successfully:", game);
  } catch (error) {
    console.error("❌ Error creating game:", error);
  }
});

console.log("📜 Script loaded completely");
