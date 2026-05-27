"""
Music/Backsound Manager for Fishing Game
Handles background music playback with looping functionality
Uses pydub for audio playback
"""

import os
from pathlib import Path
from typing import Optional
import threading
import time
import sys

# Configure FFmpeg path for Windows
def _setup_ffmpeg_path():
    """Try to find and setup FFmpeg in common Windows locations"""
    common_paths = [
        r"C:\Program Files\ffmpeg\bin",
        r"C:\Program Files (x86)\ffmpeg\bin",
        r"C:\ffmpeg\bin",
        os.path.expanduser(r"~\ffmpeg\bin"),
    ]
    
    for path in common_paths:
        if os.path.exists(path):
            if path not in os.environ.get('PATH', ''):
                os.environ['PATH'] = path + os.pathsep + os.environ.get('PATH', '')
            print(f"✅ Found FFmpeg at: {path}")
            return True
    
    return False

try:
    from pydub import AudioSegment
    from pydub.playback import play
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("⚠️ pydub not installed. Audio playback will not work.")
    print("   Install with: pip install pydub")


class BacksoundManager:
    """Manages background music playback for the game"""
    
    def __init__(self):
        """Initialize the backsound manager"""
        self.current_music: Optional[str] = None
        self.volume = 0.3  # Default volume (30%)
        self.is_playing = False
        self.play_thread: Optional[threading.Thread] = None
        self.should_stop = False
        self.should_pause = False
        
        if not PYDUB_AVAILABLE:
            print("⚠️ Backsound manager initialized but pydub is not available")
    
    def load_music(self, music_path: str) -> bool:
        """
        Load music file
        
        Args:
            music_path: Path to the music file
            
        Returns:
            True if music loaded successfully, False otherwise
        """
        if not PYDUB_AVAILABLE:
            print("⚠️ pydub not installed. Cannot load music.")
            return False
        
        try:
            # Convert to absolute path if relative
            if not os.path.isabs(music_path):
                # Get the directory of this script
                current_dir = Path(__file__).parent
                music_path = str(current_dir / music_path)
            
            print(f"🔍 Attempting to load music from: {music_path}")
            
            # Check if file exists
            if not os.path.exists(music_path):
                print(f"❌ Music file not found: {music_path}")
                return False
            
            # Load the audio file
            print(f"📁 Loading audio file...")
            self.audio = AudioSegment.from_file(music_path)
            self.current_music = music_path
            print(f"✅ Music loaded: {os.path.basename(music_path)}")
            return True
        
        except FileNotFoundError as e:
            print(f"⚠️ FFmpeg/FFprobe not found. Audio playback requires FFmpeg.")
            print(f"   Searching common installation paths...")
            
            # Try to setup FFmpeg path
            if _setup_ffmpeg_path():
                print(f"🔄 Retrying music loading with found FFmpeg...")
                try:
                    self.audio = AudioSegment.from_file(music_path)
                    self.current_music = music_path
                    print(f"✅ Music loaded: {os.path.basename(music_path)}")
                    return True
                except Exception as retry_err:
                    print(f"❌ Still failed after FFmpeg setup: {retry_err}")
                    return False
            else:
                print(f"   Tried: C:\\Program Files\\ffmpeg\\bin, C:\\ffmpeg\\bin, etc.")
                print(f"   Please install FFmpeg from: https://ffmpeg.org/download.html")
                print(f"   Or use Windows Package Manager: winget install ffmpeg")
                print(f"   Then restart your terminal/command prompt.")
                print(f"   The game will continue to work without audio.")
                return False
        except Exception as e:
            print(f"❌ Failed to load music: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _play_loop(self):
        """Internal method to play music in a loop"""
        try:
            while not self.should_stop:
                # Apply volume
                audio_with_volume = self.audio - (60 * (1 - self.volume))  # Simple volume reduction
                
                # Play the audio
                play(audio_with_volume)
                
                if self.should_stop:
                    break
        except Exception as e:
            print(f"❌ Error during playback: {e}")
        finally:
            self.is_playing = False
    
    def play(self, loops: int = -1) -> bool:
        """
        Play the loaded music
        
        Args:
            loops: Number of times to loop (-1 means infinite loop, ignored for now)
            
        Returns:
            True if music started playing, False otherwise
        """
        if not PYDUB_AVAILABLE:
            print("⚠️ pydub not installed. Cannot play music.")
            return False
        
        if not self.current_music:
            print("⚠️ No music loaded. Load music first using load_music()")
            return False
        
        if self.is_playing:
            print("⚠️ Music is already playing")
            return False
        
        try:
            self.should_stop = False
            self.is_playing = True
            self.play_thread = threading.Thread(target=self._play_loop, daemon=True)
            self.play_thread.start()
            print(f"🎵 Now playing music (looping: {loops == -1})")
            return True
        
        except Exception as e:
            print(f"❌ Failed to play music: {e}")
            return False
    
    def stop(self) -> bool:
        """
        Stop the music playback
        
        Returns:
            True if music stopped successfully, False otherwise
        """
        try:
            self.should_stop = True
            self.is_playing = False
            print("⏹️ Music stopped")
            return True
        
        except Exception as e:
            print(f"❌ Failed to stop music: {e}")
            return False
    
    def pause(self) -> bool:
        """
        Pause the music playback
        Note: Current implementation doesn't support true pause
        
        Returns:
            True if pause signal sent, False otherwise
        """
        try:
            self.should_pause = True
            print("⏸️ Music paused (note: implementation limitation)")
            return True
        
        except Exception as e:
            print(f"❌ Failed to pause music: {e}")
            return False
    
    def unpause(self) -> bool:
        """
        Resume paused music
        Note: Current implementation doesn't support true pause
        
        Returns:
            True if unpause signal sent, False otherwise
        """
        try:
            self.should_pause = False
            print("▶️ Music resumed")
            return True
        
        except Exception as e:
            print(f"❌ Failed to resume music: {e}")
            return False
    
    def set_volume(self, volume: float) -> bool:
        """
        Set music volume (0.0 to 1.0)
        
        Args:
            volume: Volume level (0.0 = mute, 1.0 = max)
            
        Returns:
            True if volume set successfully, False otherwise
        """
        try:
            # Clamp volume between 0 and 1
            volume = max(0.0, min(1.0, volume))
            self.volume = volume
            print(f"🔊 Volume set to {volume * 100:.0f}%")
            return True
        
        except Exception as e:
            print(f"❌ Failed to set volume: {e}")
            return False
    
    def get_status(self) -> dict:
        """
        Get current music status
        
        Returns:
            Dictionary with current music status information
        """
        try:
            status = {
                "initialized": PYDUB_AVAILABLE,
                "current_music": self.current_music,
                "is_playing": self.is_playing,
                "volume": self.volume,
                "music_name": os.path.basename(self.current_music) if self.current_music else "None"
            }
            return status
        
        except Exception as e:
            return {"initialized": PYDUB_AVAILABLE, "error": str(e)}


# Global backsound manager instance
backsound_manager = BacksoundManager()


def init_backsound(music_filename: str = "backsound chill - 1.mp3") -> bool:
    """
    Initialize and start background music
    
    Args:
        music_filename: Name of the music file in the music folder
        
    Returns:
        True if music started successfully, False otherwise
    """
    if not PYDUB_AVAILABLE:
        print("⚠️ pydub not installed. To enable audio, install it with:")
        print("   pip install pydub")
        return False
    
    # Use absolute path from this script directory
    backend_dir = Path(__file__).parent
    music_path = str(backend_dir / "music" / music_filename)
    
    if backsound_manager.load_music(music_path):
        return backsound_manager.play(loops=-1)  # Loop infinitely
    
    return False

