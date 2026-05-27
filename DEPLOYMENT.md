# 🚀 Deployment Guide - Fishing Game 2D

## Local Development

### Quick Start
1. Double-click `run_game.bat` untuk menjalankan game secara otomatis
2. Atau jalankan manual:
   ```bash
   pip install -r requirements.txt
   python backend/main.py
   ```
3. Buka browser: `http://localhost:8000`

## Production Deployment

### Option 1: Heroku
1. Install Heroku CLI
2. Create `Procfile`:
   ```
   web: uvicorn backend.main:app --host=0.0.0.0 --port=${PORT:-5000}
   ```
3. Deploy:
   ```bash
   heroku create your-fishing-game
   git push heroku main
   ```

### Option 2: Railway
1. Connect GitHub repository
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `python backend/main.py`

### Option 3: Vercel (Serverless)
1. Install Vercel CLI: `npm i -g vercel`
2. Create `vercel.json`:
   ```json
   {
     "builds": [
       {
         "src": "backend/main.py",
         "use": "@vercel/python"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "backend/main.py"
       }
     ]
   }
   ```
3. Deploy: `vercel --prod`

### Option 4: Docker
1. Create `Dockerfile`:
   ```dockerfile
   FROM python:3.9-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   EXPOSE 8000
   CMD ["python", "backend/main.py"]
   ```
2. Build: `docker build -t fishing-game .`
3. Run: `docker run -p 8000:8000 fishing-game`

## Environment Variables

Untuk production, set environment variables:
- `HOST`: Default `0.0.0.0`
- `PORT`: Default `8000`
- `DEBUG`: Set to `False` untuk production

## Database Migration

Saat ini game menggunakan in-memory storage. Untuk production:

1. **SQLite** (Simple):
   ```python
   import sqlite3
   # Add to main.py
   ```

2. **PostgreSQL** (Recommended):
   ```python
   # Add to requirements.txt
   psycopg2-binary==2.9.7
   sqlalchemy==2.0.23
   ```

3. **Redis** (For session storage):
   ```python
   # Add to requirements.txt
   redis==5.0.1
   ```

## Performance Optimization

### Backend
- Use database connection pooling
- Implement caching for fish types
- Add rate limiting for API endpoints
- Use async database operations

### Frontend
- Implement service worker for offline play
- Add image sprites for better performance
- Minimize JavaScript bundle size
- Use CDN for static assets

## Security Considerations

1. **API Rate Limiting**:
   ```python
   from slowapi import Limiter
   limiter = Limiter(key_func=get_remote_address)
   ```

2. **Input Validation**:
   - Validate all user inputs
   - Sanitize player data
   - Implement CORS properly

3. **Authentication** (Optional):
   - Add JWT tokens
   - Implement user registration
   - Add password hashing

## Monitoring

### Health Check Endpoint
```python
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}
```

### Logging
```python
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
```

## Backup Strategy

1. **Player Data**: Regular database backups
2. **Game State**: Export/import functionality
3. **Configuration**: Version control all config files

## Scaling Considerations

1. **Horizontal Scaling**: Use load balancer
2. **Database**: Separate read/write replicas
3. **Caching**: Redis for session management
4. **CDN**: Static asset delivery

## Testing

### Unit Tests
```bash
pip install pytest
pytest tests/
```

### Load Testing
```bash
pip install locust
locust -f tests/load_test.py
```

## Troubleshooting

### Common Issues
1. **Port already in use**: Change port in main.py
2. **Module not found**: Check Python path
3. **CORS errors**: Configure CORS middleware
4. **Database connection**: Check connection string

### Debug Mode
Set `DEBUG=True` in environment for detailed error messages.
