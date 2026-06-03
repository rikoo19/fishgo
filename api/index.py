import sys
import os
from starlette.responses import RedirectResponse, Response
from fastapi.staticfiles import StaticFiles

"""Make backend import robust on Vercel.
We try both ../backend (monorepo layout) and ./backend (bundled with api).
"""
backend_local = os.path.join(os.path.dirname(__file__), 'backend')
backend_parent = os.path.join(os.path.dirname(__file__), '..', 'backend')
# Insert parent first, then local so that local (api/backend) takes precedence
for _p in (backend_parent, backend_local):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from backend.main import app

# If Vercel erroneously routes non-API requests to this function, normalize them
# so the frontend is served and favicon doesn't hit the API.
@app.middleware("http")
async def _vercel_root_redirect_mw(request, call_next):
    path = request.url.path
    if path == "/" or path == "/index.html":
        return RedirectResponse(url="/frontend/index.html", status_code=307)
    if path == "/favicon.ico":
        return Response(status_code=204)
    return await call_next(request)

# Serve the frontend from inside the API bundle when requested via '/frontend/*'
try:
    _frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
    if os.path.isdir(_frontend_dir):
        app.mount("/frontend", StaticFiles(directory=_frontend_dir), name="frontend")
except Exception:
    # Do not block the API if mounting static fails in the serverless environment
    pass

# Serve large frontend asset (game JS) from a path NOT shadowed by the /frontend static mount
# so we can deliver the full script from the repo root or GitHub fallback.
@app.get("/frontbundle/game_new.js")
async def _serve_game_js():
    base = os.path.dirname(__file__)
    candidates = [
        os.path.abspath(os.path.join(base, "..", "frontend", "game_new.js")),
        os.path.abspath(os.path.join(base, "frontend", "game_new.js")),
    ]
    for p in candidates:
        try:
            if os.path.isfile(p):
                with open(p, "r", encoding="utf-8") as f:
                    content = f.read()
                return Response(content, media_type="application/javascript")
        except Exception:
            continue
    # Fallback: fetch from GitHub raw to ensure the game loads even if file isn't bundled
    try:
        import urllib.request
        raw_url = os.environ.get(
            "GAME_JS_RAW_URL",
            "https://raw.githubusercontent.com/rikoo19/fishgo/main/frontend/game_new.js",
        )
        with urllib.request.urlopen(raw_url, timeout=5) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
        return Response(body, media_type="application/javascript")
    except Exception:
        return Response("/* game_new.js not found */", media_type="application/javascript", status_code=404)

# Vercel serverless function handler
from mangum import Mangum

handler = Mangum(app)
