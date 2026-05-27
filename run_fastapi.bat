@echo off
echo Starting Fishing Game 2D Server (FastAPI Version)...
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting FastAPI server...
echo Game will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
python backend/main.py
pause
