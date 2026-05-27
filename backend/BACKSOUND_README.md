# Backsound Manager Documentation

## Overview

The `backsound.py` module provides background music management for the Fishing Game. It handles loading, playing, and controlling music playback using Python's pydub library.

## Features

- ✅ Load and play MP3 files with infinite looping
- ✅ Volume control (0.0 to 1.0)
- ✅ Play/Stop controls
- ✅ Error handling and logging
- ✅ REST API endpoints for frontend integration
- ✅ Threaded playback (non-blocking)

## Installation Requirements

### 1. Install Python packages:

```bash
pip install -r requirements.txt
```

### 2. Install FFmpeg (Optional but Recommended)

FFmpeg adalah tool untuk decode audio. Pydub membutuhkannya untuk file MP3.

**Windows:**

- Download dari https://ffmpeg.org/download.html
- Atau gunakan chocolatey: `choco install ffmpeg`
- Atau gunakan Windows Package Manager: `winget install ffmpeg`

**Alternative (jika tidak ingin install FFmpeg):**

```bash
pip install simpleaudio
```

## Usage

### Basic Python Usage

```python
from backsound import init_backsound, backsound_manager

# Initialize and start music
init_backsound("backsound chill - 1.mp3")

# Control music
backsound_manager.set_volume(0.5)  # Set to 50% volume
backsound_manager.stop()            # Stop music
backsound_manager.get_status()      # Get music status
```

### API Endpoints

#### Get Music Status

```http
GET /api/music/status
```

Response:

```json
{
  "initialized": true,
  "current_music": "/path/to/music.mp3",
  "is_playing": true,
  "volume": 0.3,
  "music_name": "backsound chill - 1.mp3"
}
```

#### Play Music

```http
POST /api/music/play
```

#### Stop Music

```http
POST /api/music/stop
```

#### Pause Music (Note: Limited support)

```http
POST /api/music/pause
```

#### Resume Music (Note: Limited support)

```http
POST /api/music/unpause
```

#### Set Volume

```http
POST /api/music/volume/0.5
```

(Volume value: 0.0 = mute, 1.0 = maximum)

## Configuration

The default music file is located at:

```
backend/music/backsound chill - 1.mp3
```

To change the music, modify the `init_backsound()` call in `backend/main.py`:

```python
# In main.py startup_event()
init_backsound("your_music_file.mp3")
```

## Music File Requirements

- **Format**: MP3, OGG, WAV (supported by pydub)
- **Location**: Place files in the `backend/music/` folder
- **Duration**: Any duration - will loop infinitely
- **Bitrate**: Standard bitrates (128kbps - 320kbps)

## Current Setup

- **Default Music**: `backsound chill - 1.mp3` (4:26 duration)
- **Default Volume**: 30% (0.3)
- **Loop Mode**: Infinite (-1)
- **Auto-start**: Yes (starts on server startup)

## Troubleshooting

### "Couldn't find ffmpeg or avconv" Warning

- This is a warning, not an error. The system will try to play audio anyway.
- **Solution**: Install FFmpeg:
  - Windows: Download from https://ffmpeg.org/download.html or use `winget install ffmpeg`
  - Alternative: Install simpleaudio: `pip install simpleaudio`

### Music file not found

- Verify the file path is correct
- Ensure the file is in the `backend/music/` folder
- Use absolute paths if relative paths don't work

### No sound output

- Check volume level with `/api/music/status`
- Verify system volume is not muted
- Ensure audio file is in correct format (MP3, OGG, WAV)

### Pydub not installed

- Run: `pip install -r requirements.txt`
- Or directly: `pip install pydub`

## Frontend Integration

The music is automatically controlled from the backend. The frontend doesn't need to handle audio playback - it's all managed by Python.

If you want to add frontend music controls (optional):

```javascript
// Get music status
fetch("/api/music/status")
  .then((r) => r.json())
  .then(console.log);

// Change volume
fetch("/api/music/volume/0.5", { method: "POST" });

// Stop/Play
fetch("/api/music/stop", { method: "POST" });
fetch("/api/music/play", { method: "POST" });
```

## Running the Server

### Option 1: Direct Python

```bash
python backend/main.py
```

### Option 2: Using batch file

```bash
run_fastapi.bat
```

### Option 3: Using uvicorn directly

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

Music will automatically start playing when the server starts!
