# Generate rain sound using numpy and scipy
import numpy as np
import wave
import struct

def generate_rain_sound(duration=10, sample_rate=44100):
    """Generate a rain sound effect"""
    # Generate white noise
    noise = np.random.normal(0, 0.1, int(sample_rate * duration))
    
    # Apply low-pass filter to simulate rain
    from scipy import signal
    b, a = signal.butter(4, 0.3, 'low')
    rain_sound = signal.filtfilt(b, a, noise)
    
    # Add some variation
    rain_sound = rain_sound * (0.5 + 0.5 * np.sin(np.linspace(0, 4*np.pi, len(rain_sound))))
    
    # Normalize
    rain_sound = rain_sound / np.max(np.abs(rain_sound)) * 0.3
    
    return rain_sound

def save_wav(filename, data, sample_rate=44100):
    """Save audio data as WAV file"""
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        
        # Convert to 16-bit integers
        audio_data = (data * 32767).astype(np.int16)
        wav_file.writeframes(audio_data.tobytes())

if __name__ == "__main__":
    rain = generate_rain_sound(5)  # 5 seconds
    save_wav("rain.wav", rain)
    print("Rain sound generated: rain.wav")