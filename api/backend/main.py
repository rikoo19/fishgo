from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import random
import time
from typing import Dict, List, Optional

app = FastAPI(title="Fishing Game 2D API")

# Enable CORS for GitHub Pages and Vercel so the static site can call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://rikoo19.github.io",
        "https://rikoo19.github.io/fishgo",
        "https://rikoo19.github.io/fishgo/",
        "https://fishgo-seven.vercel.app",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve background music files so frontend can access /backend/music/...
# Only mount if directory exists (for Vercel compatibility)
import os
try:
    music_dir = os.path.join(os.path.dirname(__file__), "music")
    if os.path.exists(music_dir):
        app.mount("/backend/music", StaticFiles(directory=music_dir), name="music")
except Exception:
    pass  # Skip music mounting if it fails

# Game data models
class Player(BaseModel):
    id: str
    coins: int = 100
    health: int = 100
    hunger: int = 100
    inventory: Dict[str, int] = {}
    cooked_food: Dict[str, int] = {}
    owned_rods: List[str] = ["basic"]  # Rods that player owns
    auto_cook_enabled: bool = False
    last_hunger_update: float = Field(default_factory=time.time)

class Fish(BaseModel):
    name: str
    rarity: str
    sell_price: int
    hunger_restore: int
    cooking_time: int

class FishingResult(BaseModel):
    success: bool
    fish: Optional[Fish] = None
    message: str

class FishRequest(BaseModel):
    zone: Optional[str] = None
    current_rod: Optional[str] = None

# Game data
# Expanded fish catalog that matches the frontend/simple server definitions
# Each entry contains a `name`, `category` and `chance_denominator` used by weighted selection.
FISH_TYPES = {
    # Common (3 types)
    "common_minnow": {"name": "Minnow", "category": "Common", "chance_denominator": 10, "sell_price": 5, "value": 5, "hunger_restore": 5, "cooking_time": 2},
    "common_sunfish": {"name": "Sunfish", "category": "Common", "chance_denominator": 50, "sell_price": 10, "value": 10, "hunger_restore": 15, "cooking_time": 3},
    "common_carp": {"name": "Common Carp", "category": "Common", "chance_denominator": 75, "sell_price": 15, "value": 15, "hunger_restore": 25, "cooking_time": 4},

    # Rare (3 types)
    "rare_blue_tang": {"name": "Blue Tang", "category": "Rare", "chance_denominator": 150, "sell_price": 60, "value": 60, "hunger_restore": 30, "cooking_time": 6},
    "rare_king_mackerel": {"name": "King Mackerel", "category": "Rare", "chance_denominator": 400, "sell_price": 200, "value": 200, "hunger_restore": 50, "cooking_time": 8},
    "rare_silver_trevally": {"name": "Silver Trevally", "category": "Rare", "chance_denominator": 650, "sell_price": 350, "value": 350, "hunger_restore": 60, "cooking_time": 10},

    # Epic (3 types)
    "epic_red_snapper": {"name": "Red Snapper", "category": "Epic", "chance_denominator": 1000, "sell_price": 800, "value": 800, "hunger_restore": 80, "cooking_time": 12},
    "epic_tiger_shark": {"name": "Tiger Shark", "category": "Epic", "chance_denominator": 3500, "sell_price": 3000, "value": 3000, "hunger_restore": 120, "cooking_time": 20},
    "epic_emerald_bass": {"name": "Emerald Bass", "category": "Epic", "chance_denominator": 5000, "sell_price": 5000, "value": 5000, "hunger_restore": 150, "cooking_time": 30},

    # Mythic (4 types)
    "mythic_kraken_calf": {"name": "Kraken Calf", "category": "Mythic", "chance_denominator": 20000, "sell_price": 12000, "value": 12000, "hunger_restore": 300, "cooking_time": 60},
    "mythic_golden_whale": {"name": "Golden Whale", "category": "Mythic", "chance_denominator": 50000, "sell_price": 30000, "value": 30000, "hunger_restore": 600, "cooking_time": 120},
    "mythic_celestial_koi": {"name": "Celestial Koi", "category": "Mythic", "chance_denominator": 60000, "sell_price": 45000, "value": 45000, "hunger_restore": 800, "cooking_time": 150, "allowed_zones": ["island2_lake"]},
    "mythic_abyssal_arowana": {"name": "Abyssal Arowana", "category": "Mythic", "chance_denominator": 90000, "sell_price": 60000, "value": 60000, "hunger_restore": 1000, "cooking_time": 180, "allowed_zones": ["island2_lake"]},

    # Secret (2 types - Pulau Baraju exclusive)
    "secret_inferno_dragon": {"name": "Inferno Dragon", "category": "Secret", "chance_denominator": 100000, "sell_price": 80000, "value": 80000, "hunger_restore": 1500, "cooking_time": 240, "allowed_zones": ["baraju_fire"]},
    "secret_frost_phoenix": {"name": "Frost Phoenix", "category": "Secret", "chance_denominator": 100000, "sell_price": 80000, "value": 80000, "hunger_restore": 1500, "cooking_time": 240, "allowed_zones": ["baraju_ice"]},
}

# In-memory player storage (in production, use a database)
players: Dict[str, Player] = {}

def get_or_create_player(player_id: str) -> Player:
    if player_id not in players:
        players[player_id] = Player(id=player_id)
    return players[player_id]

def update_hunger(player: Player):
    """Update player hunger over time"""
    current_time = time.time()
    time_diff = current_time - player.last_hunger_update
    
    # Decrease hunger by 1 every 60 seconds (1 minute)
    hunger_decrease = int(time_diff / 60)
    if hunger_decrease > 0:
        player.hunger = max(0, player.hunger - hunger_decrease)
        player.last_hunger_update = current_time
        
        # If hunger is 0, decrease health
        if player.hunger == 0:
            health_decrease = int(time_diff / 60)  # Lose 1 health per minute when starving
            player.health = max(0, player.health - health_decrease)

@app.get("/")
async def serve_game():
    return {"message": "FishGo API Server is running", "docs": "/docs"}

@app.get("/api/player/{player_id}")
async def get_player(player_id: str):
    player = get_or_create_player(player_id)
    update_hunger(player)
    return player

@app.post("/api/player/{player_id}/fish")
async def go_fishing(player_id: str, request: Optional[FishRequest] = None):
    player = get_or_create_player(player_id)
    update_hunger(player)

    if player.health <= 0:
        raise HTTPException(status_code=400, detail="Player is dead! Cannot fish.")
    
    # Get fishing zone and current rod from request
    zone = request.zone if request else None
    current_rod = request.current_rod if request else "basic_rod"
    
    # Normalize rod ID (remove _rod suffix for comparison)
    rod_type = current_rod.replace("_rod", "") if current_rod else "basic"
    
    # Check Secret rod requirement for Secret fish zones
    if zone in ["baraju_fire", "baraju_ice"] and rod_type != "secret":
        return {"success": False, "message": "⛔ Butuh Secret Rod untuk memancing ikan Secret di Pulau Baraju!"}

    # Build weighted pool based on chance_denominator
    pool = []
    total_weight = 0.0
    for key, data in FISH_TYPES.items():
        # Check if fish is allowed in this zone
        allowed_zones = data.get("allowed_zones")
        if allowed_zones:
            # If fish has zone restrictions, check if current zone is allowed
            if not zone or zone not in allowed_zones:
                continue
        
        denom = data.get("chance_denominator", 1000)
        # weight proportional to 1/denominator
        weight = 1.0 / float(denom)
        pool.append((key, weight))
        total_weight += weight

    # Small chance to catch nothing
    no_fish_weight = 0.20
    total_weight += no_fish_weight

    pick = random.random() * total_weight
    cumulative = 0.0
    chosen_key = None

    for key, weight in pool:
        cumulative += weight
        if pick <= cumulative:
            chosen_key = key
            break

    if not chosen_key and pick <= cumulative + no_fish_weight:
        return {"success": False, "message": "Tidak ada ikan yang terpancing!"}

    if not chosen_key:
        return {"success": False, "message": "Tidak ada ikan yang terpancing!"}

    fish = FISH_TYPES[chosen_key]

    # Add to inventory
    player.inventory[chosen_key] = player.inventory.get(chosen_key, 0) + 1

    # Auto-cook if enabled
    if player.auto_cook_enabled:
        player.cooked_food[chosen_key] = player.cooked_food.get(chosen_key, 0) + 1
        player.inventory[chosen_key] -= 1
        if player.inventory[chosen_key] == 0:
            del player.inventory[chosen_key]

    message = f"Berhasil menangkap {fish['name']} ({fish['category']})!"

    # Normalize fish data for frontend
    fish_data = dict(fish)
    fish_data["rarity"] = fish.get("category", "").lower()

    return {"success": True, "fish": fish_data, "fish_id": chosen_key, "rarity_category": fish.get("category"), "rarity_denominator": fish.get("chance_denominator"), "message": message}

@app.post("/api/player/{player_id}/sell/{fish_type}")
async def sell_fish(player_id: str, fish_type: str, quantity: int = 1):
    player = get_or_create_player(player_id)
    
    if fish_type not in FISH_TYPES:
        raise HTTPException(status_code=400, detail="Jenis ikan tidak valid!")
    
    if fish_type not in player.inventory or player.inventory[fish_type] < quantity:
        raise HTTPException(status_code=400, detail="Ikan tidak cukup di inventory!")
    
    fish = FISH_TYPES[fish_type]
    total_price = fish["sell_price"] * quantity

    player.coins += total_price
    player.inventory[fish_type] -= quantity

    if player.inventory[fish_type] == 0:
        del player.inventory[fish_type]

    return {"message": f"Berhasil menjual {quantity} {fish['name']} seharga {total_price} koin!", "coins": player.coins}

@app.post("/api/player/{player_id}/cook/{fish_type}")
async def cook_fish(player_id: str, fish_type: str, quantity: int = 1):
    player = get_or_create_player(player_id)
    
    if fish_type not in FISH_TYPES:
        raise HTTPException(status_code=400, detail="Jenis ikan tidak valid!")
    
    if fish_type not in player.inventory or player.inventory[fish_type] < quantity:
        raise HTTPException(status_code=400, detail="Ikan tidak cukup di inventory!")
    
    fish = FISH_TYPES[fish_type]

    # Remove from inventory and add to cooked food
    player.inventory[fish_type] -= quantity
    if player.inventory[fish_type] == 0:
        del player.inventory[fish_type]

    if fish_type in player.cooked_food:
        player.cooked_food[fish_type] += quantity
    else:
        player.cooked_food[fish_type] = quantity

    return {"message": f"Berhasil memasak {quantity} {fish['name']}!", "cooked_food": player.cooked_food}

@app.post("/api/player/{player_id}/eat/{fish_type}")
async def eat_fish(player_id: str, fish_type: str, quantity: int = 1):
    player = get_or_create_player(player_id)
    
    if fish_type not in FISH_TYPES:
        raise HTTPException(status_code=400, detail="Jenis ikan tidak valid!")
    
    if fish_type not in player.cooked_food or player.cooked_food[fish_type] < quantity:
        raise HTTPException(status_code=400, detail="Makanan tidak cukup!")
    
    fish = FISH_TYPES[fish_type]
    hunger_restore = fish["hunger_restore"] * quantity

    player.hunger = min(100, player.hunger + hunger_restore)
    player.cooked_food[fish_type] -= quantity

    if player.cooked_food[fish_type] == 0:
        del player.cooked_food[fish_type]

    return {"message": f"Berhasil memakan {quantity} {fish['name']}! Hunger +{hunger_restore}", "hunger": player.hunger}

@app.post("/api/player/{player_id}/toggle-auto-cook")
async def toggle_auto_cook(player_id: str):
    player = get_or_create_player(player_id)
    player.auto_cook_enabled = not player.auto_cook_enabled
    
    status = "diaktifkan" if player.auto_cook_enabled else "dinonaktifkan"
    return {"message": f"Auto-cook {status}!", "auto_cook_enabled": player.auto_cook_enabled}

class CookDishRequest(BaseModel):
    fish_id: str
    dish_id: str
    price: int
    hunger_restore: int

@app.post("/api/player/{player_id}/cook-dish")
async def cook_dish(player_id: str, request: CookDishRequest):
    player = get_or_create_player(player_id)
    
    # Check if player has enough coins
    if player.coins < request.price:
        raise HTTPException(status_code=400, detail=f"Koin tidak cukup! Butuh {request.price} coins")
    
    # Check if fish exists in inventory
    if request.fish_id not in player.inventory or player.inventory[request.fish_id] < 1:
        raise HTTPException(status_code=400, detail="Ikan tidak ada di inventory!")
    
    # Deduct coins
    player.coins -= request.price
    
    # Remove fish from inventory
    player.inventory[request.fish_id] -= 1
    if player.inventory[request.fish_id] == 0:
        del player.inventory[request.fish_id]
    
    # Restore hunger
    player.hunger = min(100, player.hunger + request.hunger_restore)
    
    return {
        "message": f"Berhasil memasak! Hunger +{request.hunger_restore}",
        "coins": player.coins,
        "hunger": player.hunger,
        "inventory": player.inventory
    }

class SellFishRequest(BaseModel):
    fish_id: str

@app.post("/api/player/{player_id}/sell-fish")
async def sell_fish_by_id(player_id: str, request: SellFishRequest):
    player = get_or_create_player(player_id)
    
    # Check if fish type exists
    if request.fish_id not in FISH_TYPES:
        raise HTTPException(status_code=400, detail="Jenis ikan tidak valid!")
    
    # Check if fish exists in inventory
    if request.fish_id not in player.inventory or player.inventory[request.fish_id] < 1:
        raise HTTPException(status_code=400, detail="Ikan tidak ada di inventory!")
    
    fish = FISH_TYPES[request.fish_id]
    sell_price = fish.get("sell_price", fish.get("value", 0))
    
    # Add coins to player
    player.coins += sell_price
    
    # Remove fish from inventory
    player.inventory[request.fish_id] -= 1
    if player.inventory[request.fish_id] == 0:
        del player.inventory[request.fish_id]
    
    return {
        "message": f"Berhasil menjual {fish['name']} seharga {sell_price} koin!",
        "coins": player.coins,
        "inventory": player.inventory
    }

class BuyRodRequest(BaseModel):
    rod_id: str
    price: int

@app.post("/api/player/{player_id}/buy-rod")
async def buy_rod(player_id: str, request: BuyRodRequest):
    player = get_or_create_player(player_id)
    
    # Check if rod is already owned
    if request.rod_id in player.owned_rods:
        raise HTTPException(status_code=400, detail="Rod sudah dimiliki!")
    
    # Check if player has enough coins
    if player.coins < request.price:
        raise HTTPException(status_code=400, detail=f"Koin tidak cukup! Butuh {request.price} coins")
    
    # Deduct coins and add rod to owned_rods
    player.coins -= request.price
    player.owned_rods.append(request.rod_id)
    
    return {
        "message": f"Berhasil membeli rod!",
        "coins": player.coins,
        "owned_rods": player.owned_rods
    }

@app.get("/api/fish-types")
async def get_fish_types():
    return FISH_TYPES

# Handle favicon.ico request (prevent 404 error in browser)
@app.get("/favicon.ico")
async def favicon():
    return Response(status_code=204)

# Handle Chrome DevTools request (prevent 404 error)
@app.get("/.well-known/appspecific/com.chrome.devtools.json")
async def devtools():
    return Response(status_code=204)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
