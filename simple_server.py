import http.server
import socketserver
import json
import random
import time
from urllib.parse import urlparse, parse_qs
import os

# Game data
# Expanded fish catalog with explicit rarity categories and denominator chances.
# Rarity denominators mean a raw weight of 1/denominator when building the weighted pool.
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

    # Mythic (2 types)
    "mythic_kraken_calf": {"name": "Kraken Calf", "category": "Mythic", "chance_denominator": 20000, "sell_price": 12000, "value": 12000, "hunger_restore": 300, "cooking_time": 60},
    "mythic_golden_whale": {"name": "Golden Whale", "category": "Mythic", "chance_denominator": 50000, "sell_price": 30000, "value": 30000, "hunger_restore": 600, "cooking_time": 120},
}


# In-memory player storage
players = {}

def get_or_create_player(player_id):
    if player_id not in players:
        players[player_id] = {
            "id": player_id,
            "coins": 100,
            "health": 100,
            "hunger": 100,
            "inventory": {},
            "cooked_food": {},
            "auto_cook_enabled": False,
            "last_hunger_update": time.time()
        }
    return players[player_id]

def update_hunger(player):
    current_time = time.time()
    time_diff = current_time - player["last_hunger_update"]
    
    hunger_decrease = int(time_diff / 30)
    if hunger_decrease > 0:
        player["hunger"] = max(0, player["hunger"] - hunger_decrease)
        player["last_hunger_update"] = current_time
        
        if player["hunger"] == 0:
            health_decrease = int(time_diff / 60)
            player["health"] = max(0, player["health"] - health_decrease)

def go_fishing(player):
    update_hunger(player)

    if player["health"] <= 0:
        return {"success": False, "message": "Player is dead! Cannot fish."}

    # Build weighted pool based on chance_denominator (weight = 1/denominator)
    pool = []
    total_weight = 0.0
    for key, data in FISH_TYPES.items():
        denom = data.get("chance_denominator", 1000)
        weight = 1.0 / float(denom)
        pool.append((key, weight))
        total_weight += weight

    # Add a chance to catch nothing to keep things interesting
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
        # Fallback: no fish
        return {"success": False, "message": "Tidak ada ikan yang terpancing!"}

    fish = FISH_TYPES[chosen_key]

    # Add to player inventory
    if chosen_key in player["inventory"]:
        player["inventory"][chosen_key] += 1
    else:
        player["inventory"][chosen_key] = 1

    # Auto-cook handling
    if player["auto_cook_enabled"]:
        if chosen_key in player["cooked_food"]:
            player["cooked_food"][chosen_key] += 1
        else:
            player["cooked_food"][chosen_key] = 1
        player["inventory"][chosen_key] -= 1
        if player["inventory"][chosen_key] == 0:
            del player["inventory"][chosen_key]

    message = f"Berhasil menangkap {fish['name']} ({fish['category']})!"

    # Return a shallow copy so we can attach a normalized `rarity` key for frontend
    fish_data = dict(fish)
    fish_data["rarity"] = fish.get("category", "").lower()

    return {"success": True, "fish": fish_data, "fish_id": chosen_key, "rarity_category": fish.get("category"), "rarity_denominator": fish.get("chance_denominator"), "message": message}

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="frontend", **kwargs)
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/api/'):
            self.handle_api_get(parsed_path)
        else:
            super().do_GET()
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path.startswith('/api/'):
            self.handle_api_post(parsed_path)
        else:
            self.send_error(404)
    
    def handle_api_get(self, parsed_path):
        if parsed_path.path == '/api/fish-types':
            self.send_json_response(FISH_TYPES)
        elif parsed_path.path.startswith('/api/player/'):
            player_id = parsed_path.path.split('/')[-1]
            player = get_or_create_player(player_id)
            update_hunger(player)
            self.send_json_response(player)
        else:
            self.send_error(404)
    
    def handle_api_post(self, parsed_path):
        path_parts = parsed_path.path.split('/')
        
        if len(path_parts) >= 4 and path_parts[2] == 'player':
            player_id = path_parts[3]
            player = get_or_create_player(player_id)
            
            if len(path_parts) >= 5:
                action = path_parts[4]
                
                if action == 'fish':
                    result = go_fishing(player)
                    self.send_json_response(result)
                elif action == 'sell-fish':
                    # New endpoint: POST /api/player/{id}/sell-fish with JSON body
                    content_length = int(self.headers.get('Content-Length', 0))
                    body = self.rfile.read(content_length).decode('utf-8')
                    data = json.loads(body) if body else {}
                    
                    fish_id = data.get('fish_id')
                    if not fish_id or fish_id not in FISH_TYPES:
                        self.send_json_response({"detail": "Jenis ikan tidak valid!"}, 400)
                        return
                    
                    if fish_id not in player["inventory"] or player["inventory"][fish_id] < 1:
                        self.send_json_response({"detail": "Ikan tidak cukup di inventory!"}, 400)
                        return
                    
                    fish = FISH_TYPES[fish_id]
                    price = fish["sell_price"]
                    
                    player["coins"] += price
                    player["inventory"][fish_id] -= 1
                    
                    if player["inventory"][fish_id] == 0:
                        del player["inventory"][fish_id]
                    
                    self.send_json_response({
                        "success": True,
                        "message": f"Sold {fish['name']} for {price} coins!",
                        "coins": player["coins"]
                    })
                elif action == 'cook-fish':
                    # New endpoint: POST /api/player/{id}/cook-fish with JSON body
                    content_length = int(self.headers.get('Content-Length', 0))
                    body = self.rfile.read(content_length).decode('utf-8')
                    data = json.loads(body) if body else {}
                    
                    fish_id = data.get('fish_id')
                    if not fish_id or fish_id not in FISH_TYPES:
                        self.send_json_response({"detail": "Jenis ikan tidak valid!"}, 400)
                        return
                    
                    if fish_id not in player["inventory"] or player["inventory"][fish_id] < 1:
                        self.send_json_response({"detail": "Ikan tidak cukup di inventory!"}, 400)
                        return
                    
                    fish = FISH_TYPES[fish_id]
                    
                    player["inventory"][fish_id] -= 1
                    if player["inventory"][fish_id] == 0:
                        del player["inventory"][fish_id]
                    
                    if fish_id in player["cooked_food"]:
                        player["cooked_food"][fish_id] += 1
                    else:
                        player["cooked_food"][fish_id] = 1
                    
                    self.send_json_response({
                        "success": True,
                        "message": f"Cooked {fish['name']}!",
                        "cooked_food": player["cooked_food"]
                    })
                elif action == 'sell' and len(path_parts) >= 6:
                    fish_type = path_parts[5]
                    query_params = parse_qs(parsed_path.query)
                    quantity = int(query_params.get('quantity', [1])[0])
                    
                    if fish_type not in FISH_TYPES:
                        self.send_json_response({"detail": "Jenis ikan tidak valid!"}, 400)
                        return
                    
                    if fish_type not in player["inventory"] or player["inventory"][fish_type] < quantity:
                        self.send_json_response({"detail": "Ikan tidak cukup di inventory!"}, 400)
                        return
                    
                    fish = FISH_TYPES[fish_type]
                    total_price = fish["sell_price"] * quantity
                    
                    player["coins"] += total_price
                    player["inventory"][fish_type] -= quantity
                    
                    if player["inventory"][fish_type] == 0:
                        del player["inventory"][fish_type]
                    
                    self.send_json_response({
                        "message": f"Berhasil menjual {quantity} {fish['name']} seharga {total_price} koin!",
                        "coins": player["coins"]
                    })
                elif action == 'cook' and len(path_parts) >= 6:
                    fish_type = path_parts[5]
                    query_params = parse_qs(parsed_path.query)
                    quantity = int(query_params.get('quantity', [1])[0])
                    
                    if fish_type not in FISH_TYPES:
                        self.send_json_response({"detail": "Jenis ikan tidak valid!"}, 400)
                        return
                    
                    if fish_type not in player["inventory"] or player["inventory"][fish_type] < quantity:
                        self.send_json_response({"detail": "Ikan tidak cukup di inventory!"}, 400)
                        return
                    
                    fish = FISH_TYPES[fish_type]
                    
                    player["inventory"][fish_type] -= quantity
                    if player["inventory"][fish_type] == 0:
                        del player["inventory"][fish_type]
                    
                    if fish_type in player["cooked_food"]:
                        player["cooked_food"][fish_type] += quantity
                    else:
                        player["cooked_food"][fish_type] = quantity
                    
                    self.send_json_response({
                        "message": f"Berhasil memasak {quantity} {fish['name']}!",
                        "cooked_food": player["cooked_food"]
                    })
                elif action == 'eat' and len(path_parts) >= 6:
                    fish_type = path_parts[5]
                    query_params = parse_qs(parsed_path.query)
                    quantity = int(query_params.get('quantity', [1])[0])
                    
                    if fish_type not in FISH_TYPES:
                        self.send_json_response({"detail": "Jenis ikan tidak valid!"}, 400)
                        return
                    
                    if fish_type not in player["cooked_food"] or player["cooked_food"][fish_type] < quantity:
                        self.send_json_response({"detail": "Makanan tidak cukup!"}, 400)
                        return
                    
                    fish = FISH_TYPES[fish_type]
                    hunger_restore = fish["hunger_restore"] * quantity
                    
                    player["hunger"] = min(100, player["hunger"] + hunger_restore)
                    player["cooked_food"][fish_type] -= quantity
                    
                    if player["cooked_food"][fish_type] == 0:
                        del player["cooked_food"][fish_type]
                    
                    self.send_json_response({
                        "message": f"Berhasil memakan {quantity} {fish['name']}! Hunger +{hunger_restore}",
                        "hunger": player["hunger"]
                    })
                elif action == 'toggle-auto-cook':
                    player["auto_cook_enabled"] = not player["auto_cook_enabled"]
                    status = "diaktifkan" if player["auto_cook_enabled"] else "dinonaktifkan"
                    self.send_json_response({
                        "message": f"Auto-cook {status}!",
                        "auto_cook_enabled": player["auto_cook_enabled"]
                    })
                else:
                    self.send_error(404)
            else:
                self.send_error(404)
        else:
            self.send_error(404)
    
    def send_json_response(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == "__main__":
    PORT = 8000
    
    # Change to the correct directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), GameHandler) as httpd:
        print(f"🎣 Fishing Game 2D Server running at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
            httpd.shutdown()
