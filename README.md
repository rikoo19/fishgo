# 🎣 Fishing Game 2D

Game memancing 2D berbasis web dengan backend Python (FastAPI) dan frontend JavaScript.

## Fitur Game

### 🎮 Gameplay
- **Interactive Fishing**: Mini-game memancing dengan multiple phases (casting, waiting, hooking, reeling)
- **Timing-Based Mechanics**: Klik pada waktu yang tepat untuk menangkap ikan
- **Fish Struggle System**: Ikan melawan dengan kekuatan berbeda-beda
- **Visual Feedback**: Progress bar, fishing line animation, dan bobber effects
- **Sistem Rarity**: Ikan memiliki tingkat kelangkaan (common, uncommon, rare, legendary)
- **Inventory**: Simpan ikan hasil tangkapan
- **NPC Interaction**: Tekan E untuk berinteraksi dengan NPC
- **Island Exploration**: Jelajahi Pulau 1 dan Pulau 2 yang terhubung jembatan

### 🎣 Fishing Mechanics
- **Phase 1 - Casting**: Klik untuk melempar pancing ke air
- **Phase 2 - Waiting**: Tunggu ikan menggigit (2-8 detik random)
- **Phase 3 - Fish Bite**: Ikan menggigit! Klik cepat untuk mengait
- **Phase 4 - Reeling**: Klik berulang untuk menarik ikan melawan perlawanannya
- **Visual Elements**: Animated fishing line, bobber dengan ripple effects, struggle animations
- **Success/Failure**: Ikan bisa kabur jika terlambat atau tidak cukup kuat menarik

### 🎮 Controls & UI
- **Movement**: WASD atau Arrow Keys untuk bergerak
- **Fishing**: Spacebar atau klik Fish button untuk memancing
- **Interact**: E untuk berinteraksi dengan NPC
- **Inventory**: I atau klik Inventory button untuk membuka inventory
- **Panels**: Klik button di action bar untuk membuka/tutup panels
- **Escape**: ESC untuk menutup semua panels

### 🎨 Visual Features
- **Advanced Pixel Art**: Game menggunakan perspektif top-down dengan multiple terrain types
- **Organic Shapes**: Semua objek menggunakan ellipse, circle, dan organic curves
- **Rich Tile System**: 17 jenis tile berbeda (grass, sand, cliff, water depths, dll)
- **Varied Landscapes**: Multiple biomes dengan transisi terrain yang natural
- **Water Depth System**: Deep water, shallow water, dan animated water effects
- **Detailed Textures**: Setiap tile memiliki tekstur dan pola yang unik
- **Environmental Diversity**: Cliffs, beaches, forests, rocks, bushes
- **Responsive UI**: Interface yang tidak menghalangi gameplay

### 🌍 Terrain Types
- **🌱 Grass Variants**: Normal grass dan light grass dengan pola detail
- **🏖️ Sand Beaches**: Sandy shores di sekitar pulau dengan tekstur granular
- **🌊 Water Depths**: Deep water (biru tua), shallow water (biru muda), animated
- **⛰️ Cliffs**: Rocky cliff formations dengan highlight dan shadow
- **🪨 Rocks**: Decorative rocks di darat dan air
- **🌳 Vegetation**: Trees (hijau), dark trees (gelap), bushes (semak)
- **🛤️ Paths**: Stone paths, wooden docks, golden bridge
- **🟫 Dirt Areas**: Brown dirt terrain dengan tekstur natural

### 🏝️ Island System
- **Pulau 1**: Area utama dengan NPC dan fasilitas
- **Jembatan Emas**: Penghubung antara kedua pulau
- **Pulau 2**: Area memancing dengan multiple fishing spots
- **NPC Characters**: 3 NPC dengan fungsi berbeda di Pulau 1

### 👥 NPC System
- **🐟 Fish Seller**: Membeli ikan dari pemain (biru)
- **🎣 Rod Shop**: Menjual fishing rod upgrade (kuning)  
- **🍳 Chef**: Memasak ikan untuk pemain (hijau)
- **Interaction**: Tekan E saat dekat NPC untuk berinteraksi

### 💰 Ekonomi
- **Jual Ikan**: Jual ikan mentah untuk mendapatkan koin
- **Harga Bervariasi**: Setiap jenis ikan memiliki harga jual berbeda

### 🍳 Sistem Memasak
- **Manual Cooking**: Masak ikan secara manual
- **Auto-Cook**: Aktifkan auto-cook untuk memasak ikan otomatis saat memancing
- **Makanan Matang**: Ikan yang sudah dimasak bisa dimakan

### ❤️ Sistem Survival
- **Health Bar**: Kesehatan pemain (100/100)
- **Hunger Bar**: Tingkat kelaparan (100/100)
- **Hunger Decay**: Kelaparan berkurang 1 poin setiap 30 detik
- **Health Penalty**: Jika lapar (hunger = 0), kesehatan berkurang 1 poin per menit
- **Eating**: Makan ikan matang untuk mengisi hunger bar

### 🐟 Jenis Ikan
1. **Ikan Kecil** (Common)
   - Harga: 5 koin
   - Hunger: +10
   - Waktu masak: 3 detik

2. **Ikan Sedang** (Uncommon)
   - Harga: 15 koin
   - Hunger: +25
   - Waktu masak: 5 detik

3. **Ikan Besar** (Rare)
   - Harga: 50 koin
   - Hunger: +50
   - Waktu masak: 8 detik

4. **Ikan Emas** (Legendary)
   - Harga: 200 koin
   - Hunger: +100
   - Waktu masak: 15 detik

## Cara Menjalankan

### Opsi 1: Simple Server (Recommended - No Dependencies)
```bash
# Double-click run_game.bat atau:
python simple_server.py
```

### Opsi 2: FastAPI Server (Advanced)
```bash
# Double-click run_fastapi.bat atau:
pip install -r requirements.txt
python backend/main.py
```

### 3. Buka Game
Buka browser dan akses: `http://localhost:8000`

## Quick Start
1. **Double-click `run_game.bat`** - Menjalankan simple server (tidak perlu install dependencies)
2. **Double-click `run_fastapi.bat`** - Menjalankan FastAPI server (perlu install dependencies)

## Struktur Project
```
fishgo/
├── backend/
│   └── main.py          # FastAPI backend server (advanced)
├── frontend/
│   ├── index.html       # HTML utama
│   ├── style.css        # Styling CSS
│   └── game.js          # JavaScript game logic
├── simple_server.py     # Simple HTTP server (no dependencies)
├── run_game.bat         # Quick start - Simple server
├── run_fastapi.bat      # Quick start - FastAPI server
├── requirements.txt     # Python dependencies (untuk FastAPI)
└── README.md           # Dokumentasi ini
```

## API Endpoints

### Player Management
- `GET /api/player/{player_id}` - Get player data
- `POST /api/player/{player_id}/fish` - Go fishing
- `POST /api/player/{player_id}/sell/{fish_type}` - Sell fish
- `POST /api/player/{player_id}/cook/{fish_type}` - Cook fish
- `POST /api/player/{player_id}/eat/{fish_type}` - Eat cooked fish
- `POST /api/player/{player_id}/toggle-auto-cook` - Toggle auto-cook

### Game Data
- `GET /api/fish-types` - Get all fish types and their stats

## Teknologi yang Digunakan

### Backend
- **FastAPI**: Modern Python web framework
- **Uvicorn**: ASGI server
- **Pydantic**: Data validation

### Frontend
- **HTML5 Canvas**: Untuk rendering game visual
- **CSS3**: Styling dengan gradients dan animations
- **Vanilla JavaScript**: Game logic dan API calls

## Tips Bermain

1. **Strategi Awal**: Fokus memancing dan jual ikan untuk mengumpulkan koin
2. **Auto-Cook**: Aktifkan auto-cook untuk efisiensi
3. **Monitor Hunger**: Selalu perhatikan hunger bar, makan sebelum terlalu lapar
4. **Ikan Langka**: Ikan emas sangat langka tapi memberikan keuntungan besar
5. **Survival**: Jangan biarkan hunger mencapai 0 atau health akan berkurang

## Pengembangan Selanjutnya

Fitur yang bisa ditambahkan:
- [ ] Sistem upgrade fishing rod
- [ ] Multiple fishing locations
- [ ] Multiplayer support
- [ ] Achievement system
- [ ] Save/load game progress
- [ ] Sound effects dan background music
- [ ] Mobile responsive controls
