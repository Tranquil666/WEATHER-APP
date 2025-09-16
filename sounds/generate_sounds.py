import numpy as np
import wave
import os

def create_rain_sound(duration=5, sample_rate=44100):
    """Generate rain sound effect"""
    # Create white noise
    noise = np.random.normal(0, 0.3, int(sample_rate * duration))
    
    # Apply filtering to make it sound like rain
    # Low-pass filter effect
    for i in range(1, len(noise)):
        noise[i] = noise[i] * 0.7 + noise[i-1] * 0.3
    
    # Add some variation
    envelope = np.sin(np.linspace(0, 4*np.pi, len(noise))) * 0.2 + 0.8
    rain_sound = noise * envelope
    
    # Normalize
    rain_sound = rain_sound / np.max(np.abs(rain_sound)) * 0.5
    return rain_sound

def create_thunder_sound(duration=3, sample_rate=44100):
    """Generate thunder sound effect"""
    # Create low frequency rumble
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # Base rumble
    rumble = np.sin(2 * np.pi * 60 * t) * 0.3
    rumble += np.sin(2 * np.pi * 40 * t) * 0.2
    
    # Add crack sound
    crack = np.random.normal(0, 0.8, len(t))
    crack_envelope = np.exp(-t * 3)  # Quick decay
    crack = crack * crack_envelope * 0.4
    
    # Combine
    thunder = rumble + crack
    
    # Add envelope
    envelope = np.exp(-t * 0.8)
    thunder = thunder * envelope
    
    # Normalize
    thunder = thunder / np.max(np.abs(thunder)) * 0.6
    return thunder

def create_wind_sound(duration=4, sample_rate=44100):
    """Generate wind sound effect"""
    # Create filtered noise
    noise = np.random.normal(0, 0.4, int(sample_rate * duration))
    
    # Apply low-pass filtering
    for i in range(2, len(noise)):
        noise[i] = noise[i] * 0.5 + noise[i-1] * 0.3 + noise[i-2] * 0.2
    
    # Add whooshing effect
    t = np.linspace(0, duration, len(noise))
    whoosh = np.sin(2 * np.pi * 0.5 * t) * 0.3 + 0.7
    wind = noise * whoosh
    
    # Normalize
    wind = wind / np.max(np.abs(wind)) * 0.4
    return wind

def save_wav(filename, data, sample_rate=44100):
    """Save audio data as WAV file"""
    # Convert to 16-bit integers
    audio_data = (data * 32767).astype(np.int16)
    
    with wave.open(filename, 'w') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(audio_data.tobytes())

def generate_all_sounds():
    """Generate all weather sound effects"""
    os.makedirs('sounds', exist_ok=True)
    
    print("Generating rain sound...")
    rain = create_rain_sound(8)
    save_wav('sounds/rain.wav', rain)
    
    print("Generating thunder sound...")
    thunder = create_thunder_sound(5)
    save_wav('sounds/thunder.wav', thunder)
    
    print("Generating wind sound...")
    wind = create_wind_sound(6)
    save_wav('sounds/wind.wav', wind)
    
    print("All weather sounds generated successfully!")

if __name__ == "__main__":
    generate_all_sounds()