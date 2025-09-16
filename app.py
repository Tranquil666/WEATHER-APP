import streamlit as st
import requests
import pandas as pd
from datetime import datetime, timedelta
import plotly.graph_objects as go
import plotly.express as px
from PIL import Image
import io
import base64
import time
import os
import json
import os

# Configure page
st.set_page_config(
    page_title="Weather",
    page_icon="🌤️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# AccuWeather API configuration
API_KEY = "zpka_9f619c9946024b80a7d88a0aba311535_7b0c917b"
BASE_URL = "http://dataservice.accuweather.com"

def get_weather_background(condition):
    """Get background gradient based on weather condition"""
    condition_lower = condition.lower()
    
    if any(word in condition_lower for word in ['sunny', 'clear', 'bright']):
        return "linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #fdcb6e 100%)"
    elif any(word in condition_lower for word in ['rain', 'shower', 'drizzle']):
        return "linear-gradient(135deg, #636e72 0%, #2d3436 50%, #74b9ff 100%)"
    elif any(word in condition_lower for word in ['cloud', 'overcast']):
        return "linear-gradient(135deg, #ddd 0%, #74b9ff 50%, #636e72 100%)"
    elif any(word in condition_lower for word in ['snow', 'blizzard']):
        return "linear-gradient(135deg, #ffffff 0%, #ddd 50%, #74b9ff 100%)"
    elif any(word in condition_lower for word in ['storm', 'thunder']):
        return "linear-gradient(135deg, #2d3436 0%, #636e72 50%, #74b9ff 100%)"
    elif any(word in condition_lower for word in ['fog', 'mist', 'haze']):
        return "linear-gradient(135deg, #b2bec3 0%, #ddd 50%, #74b9ff 100%)"
    else:
        return "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)"

def get_weather_icon(condition):
    """Get weather icon based on condition"""
    condition_lower = condition.lower()
    
    if any(word in condition_lower for word in ['sunny', 'clear', 'bright']):
        return "☀️"
    elif any(word in condition_lower for word in ['partly cloudy', 'partly sunny']):
        return "⛅"
    elif any(word in condition_lower for word in ['cloudy', 'overcast']):
        return "☁️"
    elif any(word in condition_lower for word in ['rain', 'shower', 'drizzle']):
        return "🌧️"
    elif any(word in condition_lower for word in ['storm', 'thunder']):
        return "⛈️"
    elif any(word in condition_lower for word in ['snow', 'blizzard']):
        return "❄️"
    elif any(word in condition_lower for word in ['fog', 'mist', 'haze']):
        return "🌫️"
    elif any(word in condition_lower for word in ['wind']):
        return "💨"
    else:
        return "🌤️"

def get_comfort_level(temp, humidity, wind_speed):
    """Calculate comfort level based on weather conditions"""
    # Heat index calculation (simplified)
    if temp > 27 and humidity > 40:
        heat_index = temp + (humidity * 0.1)
        if heat_index > 35:
            return "🔥 Very Hot", "#ff4444"
        elif heat_index > 30:
            return "🌡️ Hot", "#ff8800"
    
    # Wind chill effect
    if temp < 10 and wind_speed > 15:
        wind_chill = temp - (wind_speed * 0.2)
        if wind_chill < 0:
            return "🧊 Very Cold", "#4488ff"
        elif wind_chill < 5:
            return "❄️ Cold", "#66aaff"
    
    # Comfort zones
    if 18 <= temp <= 24 and 30 <= humidity <= 60:
        return "😊 Perfect", "#00dd44"
    elif 15 <= temp <= 27 and 25 <= humidity <= 70:
        return "👍 Comfortable", "#88dd00"
    elif temp > 30:
        return "🔥 Hot", "#ff6600"
    elif temp < 5:
        return "🧊 Cold", "#4488ff"
    else:
        return "😐 Moderate", "#ffaa00"

def get_activity_recommendations(weather_data):
    """Get activity recommendations based on weather"""
    if not weather_data:
        return []
    
    temp = weather_data.get('Temperature', {}).get('Metric', {}).get('Value', 20)
    condition = weather_data.get('WeatherText', '').lower()
    uv_index = weather_data.get('UVIndex', 0)
    wind_speed = weather_data.get('Wind', {}).get('Speed', {}).get('Metric', {}).get('Value', 0)
    
    activities = []
    
    if any(word in condition for word in ['sunny', 'clear']) and 20 <= temp <= 28:
        activities.extend([
            "🏃‍♂️ Perfect for outdoor running",
            "🚴‍♀️ Great cycling weather",
            "🏖️ Beach day recommended",
            "🧺 Ideal for picnics"
        ])
    elif any(word in condition for word in ['rain', 'shower']):
        activities.extend([
            "☕ Perfect for indoor cafes",
            "🎬 Great movie weather",
            "📚 Reading by the window",
            "🏠 Cozy indoor activities"
        ])
    elif temp > 30:
        activities.extend([
            "🏊‍♂️ Swimming recommended",
            "🌳 Seek shaded areas",
            "💧 Stay hydrated",
            "🏠 Indoor activities preferred"
        ])
    elif temp < 10:
        activities.extend([
            "🧥 Bundle up for walks",
            "☕ Hot drinks recommended",
            "🏠 Indoor workouts",
            "🔥 Cozy fireplace time"
        ])
    
    if uv_index > 6:
        activities.append("🧴 Don't forget sunscreen")
    
    if wind_speed > 20:
        activities.append("🪁 Great for kite flying")
    
    return activities[:4]  # Return max 4 activities

@st.cache_data(ttl=3600)  # Cache for 1 hour
def get_user_location():
    """Get user's location using IP geolocation"""
    try:
        # Using ipapi.co for free IP geolocation
        response = requests.get('https://ipapi.co/json/', timeout=5)
        if response.status_code == 200:
            data = response.json()
            return {
                'city': data.get('city', ''),
                'region': data.get('region', ''),
                'country': data.get('country_name', ''),
                'lat': data.get('latitude', 0),
                'lon': data.get('longitude', 0),
                'timezone': data.get('timezone', ''),
                'ip': data.get('ip', '')
            }
    except Exception as e:
        st.error(f"Could not detect location: {str(e)}")
    
    # Fallback to another service
    try:
        response = requests.get('http://ip-api.com/json/', timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return {
                    'city': data.get('city', ''),
                    'region': data.get('regionName', ''),
                    'country': data.get('country', ''),
                    'lat': data.get('lat', 0),
                    'lon': data.get('lon', 0),
                    'timezone': data.get('timezone', ''),
                    'ip': data.get('query', '')
                }
    except Exception:
        pass
    
    return None

def get_location_by_coordinates(lat, lon):
    """Get AccuWeather location key using coordinates"""
    url = f"{BASE_URL}/locations/v1/cities/geoposition/search"
    params = {
        'apikey': API_KEY,
        'q': f"{lat},{lon}"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data:
            return data['Key'], data['LocalizedName'], data['Country']['LocalizedName']
        return None, None, None
    except Exception as e:
        st.error(f"Error fetching location by coordinates: {str(e)}")
        return None, None, None

def get_weather_sound(condition):
    """Get appropriate sound file for weather condition"""
    condition_lower = condition.lower()
    
    if any(word in condition_lower for word in ['rain', 'shower', 'drizzle']):
        return "sounds/rain.wav"
    elif any(word in condition_lower for word in ['storm', 'thunder']):
        return "sounds/thunder.wav"
    elif any(word in condition_lower for word in ['wind']):
        return "sounds/wind.wav"
    else:
        return None

def get_aqi_info(aqi):
    """Get AQI category and color"""
    if aqi is None:
        return "N/A", "#999", "No data available"
    
    if aqi <= 50:
        return "Good", "#00e400", "Air quality is satisfactory"
    elif aqi <= 100:
        return "Moderate", "#ffff00", "Air quality is acceptable"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups", "#ff7e00", "Sensitive people should limit outdoor activities"
    elif aqi <= 200:
        return "Unhealthy", "#ff0000", "Everyone should limit outdoor activities"
    elif aqi <= 300:
        return "Very Unhealthy", "#8f3f97", "Avoid outdoor activities"
    else:
        return "Hazardous", "#7e0023", "Stay indoors"

def get_lifestyle_tips(weather_data, aqi=None):
    """Generate lifestyle tips based on weather conditions"""
    if not weather_data:
        return []
    
    tips = []
    temp = weather_data.get('Temperature', {}).get('Metric', {}).get('Value', 20)
    condition = weather_data.get('WeatherText', '').lower()
    humidity = weather_data.get('RelativeHumidity', 50)
    uv_index = weather_data.get('UVIndex', 0)
    wind_speed = weather_data.get('Wind', {}).get('Speed', {}).get('Metric', {}).get('Value', 0)
    
    # Temperature-based tips
    if temp > 30:
        tips.append("🌡️ Stay hydrated and wear light, breathable clothing")
        tips.append("🏠 Avoid prolonged sun exposure during peak hours (10 AM - 4 PM)")
    elif temp < 5:
        tips.append("🧥 Dress in layers and protect exposed skin")
        tips.append("❄️ Be cautious of icy conditions when walking or driving")
    elif temp < 15:
        tips.append("🧥 Consider wearing a jacket or sweater")
    
    # Condition-based tips
    if any(word in condition for word in ['rain', 'shower', 'drizzle']):
        tips.append("☔ Carry an umbrella and wear waterproof clothing")
        tips.append("🚗 Drive carefully - roads may be slippery")
    elif any(word in condition for word in ['snow', 'blizzard']):
        tips.append("❄️ Wear warm, waterproof boots with good traction")
        tips.append("🚗 Allow extra time for travel and keep emergency supplies in car")
    elif any(word in condition for word in ['fog', 'mist']):
        tips.append("🌫️ Use headlights when driving and reduce speed")
        tips.append("👀 Be extra cautious when walking or cycling")
    
    # UV Index tips
    if uv_index >= 8:
        tips.append("☀️ Use SPF 30+ sunscreen and wear protective clothing")
        tips.append("🕶️ Wear sunglasses and seek shade when possible")
    elif uv_index >= 6:
        tips.append("☀️ Apply sunscreen and consider wearing a hat")
    
    # Humidity tips
    if humidity > 80:
        tips.append("💧 High humidity - stay cool and drink plenty of water")
    elif humidity < 30:
        tips.append("🏜️ Low humidity - use moisturizer and stay hydrated")
    
    # Wind tips
    if wind_speed > 25:
        tips.append("💨 Strong winds - secure loose objects and be cautious outdoors")
    
    # AQI tips
    if aqi:
        if aqi > 100:
            tips.append("🏭 Poor air quality - limit outdoor activities")
            tips.append("😷 Consider wearing a mask if you must go outside")
        elif aqi > 150:
            tips.append("🚫 Very poor air quality - avoid outdoor exercise")
    
    return tips[:6]  # Return max 6 tips

def get_sun_times(forecast_data):
    """Extract sunrise and sunset times from forecast data"""
    if not forecast_data or 'DailyForecasts' not in forecast_data:
        return None, None
    
    today_forecast = forecast_data['DailyForecasts'][0]
    sunrise = today_forecast.get('Sun', {}).get('Rise')
    sunset = today_forecast.get('Sun', {}).get('Set')
    
    if sunrise:
        sunrise_time = datetime.fromisoformat(sunrise.replace('Z', '+00:00'))
        sunrise = sunrise_time.strftime('%I:%M %p')
    
    if sunset:
        sunset_time = datetime.fromisoformat(sunset.replace('Z', '+00:00'))
        sunset = sunset_time.strftime('%I:%M %p')
    
    return sunrise, sunset

def play_weather_sound(sound_file):
    """Create HTML audio player for weather sounds"""
    if sound_file and os.path.exists(sound_file):
        # Read the audio file and encode it
        with open(sound_file, 'rb') as f:
            audio_data = f.read()
        
        # Convert to base64
        audio_base64 = base64.b64encode(audio_data).decode()
        
        # Create HTML audio player
        audio_html = f"""
        <div style="margin: 1rem 0; text-align: center;">
            <audio autoplay loop controls style="width: 300px; opacity: 0.8;">
                <source src="data:audio/wav;base64,{audio_base64}" type="audio/wav">
                Your browser does not support the audio element.
            </audio>
            <div style="color: white; opacity: 0.7; font-size: 0.8rem; margin-top: 0.5rem;">
                🔊 Weather sounds are playing
            </div>
        </div>
        """
        return audio_html
    return None

class WeatherApp:
    def __init__(self):
        self.api_key = API_KEY
        
    def get_location_key(self, city_name):
        """Get location key for a city"""
        url = f"{BASE_URL}/locations/v1/cities/search"
        params = {
            'apikey': self.api_key,
            'q': city_name
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data:
                return data[0]['Key'], data[0]['LocalizedName'], data[0]['Country']['LocalizedName']
            return None, None, None
        except Exception as e:
            st.error(f"Error fetching location: {str(e)}")
            return None, None, None
    
    def get_current_weather(self, location_key):
        """Get current weather conditions"""
        url = f"{BASE_URL}/currentconditions/v1/{location_key}"
        params = {
            'apikey': self.api_key,
            'details': 'true'
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            return data[0] if data else None
        except Exception as e:
            st.error(f"Error fetching current weather: {str(e)}")
            return None
    
    def get_5day_forecast(self, location_key):
        """Get 5-day weather forecast"""
        url = f"{BASE_URL}/forecasts/v1/daily/5day/{location_key}"
        params = {
            'apikey': self.api_key,
            'details': 'true',
            'metric': 'true'
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Error fetching forecast: {str(e)}")
            return None
    
    def get_hourly_forecast(self, location_key):
        """Get 12-hour forecast"""
        url = f"{BASE_URL}/forecasts/v1/hourly/12hour/{location_key}"
        params = {
            'apikey': self.api_key,
            'details': 'true',
            'metric': 'true'
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            st.error(f"Error fetching hourly forecast: {str(e)}")
            return None
    
    def get_air_quality(self, location_key):
        """Get air quality index"""
        url = f"{BASE_URL}/currentconditions/v1/{location_key}"
        params = {
            'apikey': self.api_key,
            'details': 'true'
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            if data and len(data) > 0:
                # AccuWeather doesn't provide AQI directly, so we'll simulate it based on visibility and conditions
                visibility = data[0].get('Visibility', {}).get('Metric', {}).get('Value', 10)
                condition = data[0].get('WeatherText', '').lower()
                
                # Simulate AQI based on visibility and weather conditions
                if visibility >= 10:
                    aqi = 25  # Good
                elif visibility >= 7:
                    aqi = 55  # Moderate
                elif visibility >= 5:
                    aqi = 85  # Unhealthy for sensitive groups
                else:
                    aqi = 125  # Unhealthy
                
                # Adjust based on weather conditions
                if any(word in condition for word in ['fog', 'haze', 'smoke']):
                    aqi += 30
                elif any(word in condition for word in ['rain', 'shower']):
                    aqi -= 15
                
                return max(0, min(300, aqi))  # Keep within 0-300 range
        except Exception as e:
            st.error(f"Error fetching air quality: {str(e)}")
        return None

def main():
    # Initialize session state for background
    if 'weather_bg' not in st.session_state:
        st.session_state.weather_bg = "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)"
    
    # Fixed CSS - Clean Weather App Design
    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    .stApp {{
        background: {st.session_state.weather_bg};
        font-family: 'Inter', sans-serif;
    }}
    
    @keyframes float {{
        0%, 100% {{ transform: translateY(0px); }}
        50% {{ transform: translateY(-5px); }}
    }}
    
    @keyframes pulse {{
        0%, 100% {{ opacity: 0.9; }}
        50% {{ opacity: 1; }}
    }}
    
    .main-container {{
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 2rem;
        margin: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }}
    
    .premium-card {{
        background: rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
        border-radius: 15px;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
    }}
    
    .premium-card:hover {{
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        border-color: rgba(255,255,255,0.3);
    }}
    
    .weather-title {{
        font-size: 2.5rem;
        font-weight: 300;
        text-align: center;
        color: white;
        margin-bottom: 2rem;
        text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        animation: pulse 3s ease-in-out infinite;
    }}
    
    .search-container {{
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(15px);
        border-radius: 20px;
        padding: 2rem;
        margin-bottom: 2.5rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }}
    
    .weather-main {{
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(15px);
        border-radius: 25px;
        padding: 3rem;
        text-align: center;
        color: white;
        margin: 2rem 0;
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        animation: float 4s ease-in-out infinite;
    }}
    
    .weather-icon-main {{
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: float 3s ease-in-out infinite;
    }}
    
    .temp-display {{
        font-size: 4rem;
        font-weight: 300;
        margin: 1rem 0;
        text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        color: white;
    }}
    
    .condition-text {{
        font-size: 1.5rem;
        font-weight: 400;
        opacity: 0.9;
        margin-bottom: 1rem;
    }}
    
    .weather-main::before {{
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        animation: shimmer 3s ease-in-out infinite;
    }}
    
    @keyframes shimmer {{
        0%, 100% {{ transform: rotate(0deg); }}
        50% {{ transform: rotate(180deg); }}
    }}
    
    .temp-display {{
        font-size: 5rem;
        font-weight: 200;
        margin: 1.5rem 0;
        text-shadow: 0 4px 20px rgba(0,0,0,0.3);
        position: relative;
        z-index: 1;
    }}
    
    .condition-text {{
        font-size: 1.8rem;
        font-weight: 400;
        opacity: 0.95;
        margin-bottom: 1.5rem;
        position: relative;
        z-index: 1;
    }}
    
    .metric-grid {{
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
        margin: 2rem 0;
    }}
    
    .metric-item {{
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 15px;
        padding: 1.5rem;
        text-align: center;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
    }}
    
    .metric-item:hover {{
        transform: translateY(-5px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }}
    
    .metric-icon {{
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
        opacity: 0.8;
    }}
    
    .metric-value {{
        font-size: 1.8rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: white;
    }}
    
    .metric-label {{
        font-size: 0.9rem;
        opacity: 0.8;
        font-weight: 300;
    }}
    
    .metric-description {{
        font-size: 0.7rem;
        opacity: 0.6;
        margin-top: 0.3rem;
        font-style: italic;
    }}
    
    .metric-item::before {{
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        transition: left 0.5s;
    }}
    
    .metric-item:hover {{
        transform: translateY(-8px) scale(1.02);
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }}
    
    .metric-item:hover::before {{
        left: 100%;
    }}
    
    .metric-value {{
        font-size: 2.2rem;
        font-weight: 600;
        margin-bottom: 0.8rem;
        color: #fff;
    }}
    
    .metric-label {{
        font-size: 1rem;
        opacity: 0.85;
        font-weight: 400;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }}
    
    .forecast-section {{
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        border-radius: 24px;
        padding: 2rem;
        margin: 2rem 0;
        border: 1px solid rgba(255, 255, 255, 0.15);
    }}
    
    .forecast-title {{
        color: white;
        font-size: 1.5rem;
        font-weight: 500;
        margin-bottom: 2rem;
        text-align: center;
        opacity: 0.95;
    }}
    
    .forecast-grid {{
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
    }}
    
    .forecast-card {{
        background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%);
        backdrop-filter: blur(15px);
        border-radius: 18px;
        padding: 1.8rem 1.2rem;
        text-align: center;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
    }}
    
    .forecast-card:hover {{
        transform: translateY(-6px);
        box-shadow: 0 15px 35px rgba(0,0,0,0.2);
        background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.1) 100%);
    }}
    
    .forecast-day {{
        font-size: 1rem;
        font-weight: 500;
        margin-bottom: 1rem;
        opacity: 0.9;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }}
    
    .forecast-icon {{
        font-size: 2.5rem;
        margin: 1rem 0;
        display: block;
    }}
    
    .forecast-temps {{
        font-size: 1.3rem;
        font-weight: 600;
        margin: 1rem 0;
    }}
    
    .forecast-condition {{
        font-size: 0.85rem;
        opacity: 0.8;
        font-weight: 400;
        line-height: 1.3;
    }}
    
    .hourly-container {{
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        border-radius: 20px;
        padding: 1.5rem;
        max-height: 500px;
        overflow-y: auto;
        border: 1px solid rgba(255, 255, 255, 0.15);
    }}
    
    .hourly-item {{
        background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
        border-radius: 15px;
        padding: 1.2rem 1.5rem;
        margin: 0.8rem 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
    }}
    
    .hourly-item:hover {{
        background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.08) 100%);
        transform: translateX(5px);
    }}
    
    .hourly-time {{
        font-weight: 500;
        font-size: 1rem;
        min-width: 60px;
    }}
    
    .hourly-temp {{
        font-size: 1.3rem;
        font-weight: 600;
        text-align: center;
        min-width: 50px;
    }}
    
    .hourly-condition {{
        font-size: 0.9rem;
        opacity: 0.85;
        text-align: right;
        max-width: 120px;
        line-height: 1.2;
    }}
    
    .hourly-rain {{
        font-size: 0.8rem;
        opacity: 0.7;
        color: #87CEEB;
    }}
    
    .stTabs [data-baseweb="tab-list"] {{
        gap: 2rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        padding: 0.8rem;
        backdrop-filter: blur(10px);
    }}
    
    .stTabs [data-baseweb="tab"] {{
        background: transparent;
        color: white;
        border-radius: 15px;
        font-weight: 500;
        font-size: 1.1rem;
        padding: 0.8rem 1.5rem;
        transition: all 0.3s ease;
    }}
    
    .stTabs [aria-selected="true"] {{
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }}
    
    .search-container {{
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border-radius: 15px;
        padding: 1.5rem;
        margin-bottom: 2rem;
        border: 1px solid rgba(255, 255, 255, 0.3);
    }}
    
    .stTabs [data-baseweb="tab-list"] {{
        gap: 2rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 15px;
        padding: 0.5rem;
    }}
    
    .stTabs [data-baseweb="tab"] {{
        background: transparent;
        color: white;
        border-radius: 10px;
        font-weight: 400;
    }}
    
    .stTabs [aria-selected="true"] {{
        background: rgba(255, 255, 255, 0.2);
    }}
    
    /* Hide Streamlit elements */
    #MainMenu {{visibility: hidden;}}
    footer {{visibility: hidden;}}
    header {{visibility: hidden;}}
    .stDeployButton {{display: none;}}
    </style>
    """, unsafe_allow_html=True)
    
    # Main container
    st.markdown('<div class="main-container">', unsafe_allow_html=True)
    
    # Header
    st.markdown('<h1 class="weather-title">Weather</h1>', unsafe_allow_html=True)
    
    # Initialize weather app
    weather_app = WeatherApp()
    
    # Search container
    st.markdown('<div class="search-container">', unsafe_allow_html=True)
    
    # Auto-location and search input
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        city_input = st.text_input(
            "Search City", 
            placeholder="🔍 Search for any city worldwide...", 
            label_visibility="collapsed",
            help="Enter a city name like 'New York', 'London', or 'Tokyo'"
        )
    
    with col2:
        search_btn = st.button("🌤️ Search", use_container_width=True, type="primary")
    
    with col3:
        auto_location_btn = st.button("📍 My Location", use_container_width=True, help="Auto-detect your location using IP geolocation")
    
    # Popular cities with better layout
    st.markdown("""
    <div style="margin: 1.5rem 0 1rem 0;">
        <div style="color: white; font-weight: 500; margin-bottom: 1rem; opacity: 0.9;">
            🌍 Popular Destinations
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    popular_cities = ["New York", "London", "Tokyo", "Paris", "Sydney", "Mumbai", "Dubai", "Singapore"]
    
    # Create 2 rows of 4 cities each
    cols1 = st.columns(4)
    cols2 = st.columns(4)
    selected_city = None
    
    for i, city in enumerate(popular_cities):
        if i < 4:
            with cols1[i]:
                if st.button(f"🏙️ {city}", key=f"btn_{city}", help=f"Get weather for {city}", use_container_width=True):
                    selected_city = city
        else:
            with cols2[i-4]:
                if st.button(f"🏙️ {city}", key=f"btn_{city}", help=f"Get weather for {city}", use_container_width=True):
                    selected_city = city
    
    st.markdown('</div>', unsafe_allow_html=True)
    
    # Handle auto-location
    auto_location_data = None
    if auto_location_btn:
        with st.spinner("🌍 Detecting your location..."):
            auto_location_data = get_user_location()
            if auto_location_data and auto_location_data['city']:
                st.success(f"📍 Detected location: {auto_location_data['city']}, {auto_location_data['country']}")
                st.info(f"🌐 Your IP: {auto_location_data['ip']} | Timezone: {auto_location_data['timezone']}")
            else:
                st.error("❌ Could not detect your location. Please search manually.")
    
    # Use selected city, input, or auto-detected location
    search_city = None
    if selected_city:
        search_city = selected_city
    elif city_input and search_btn:
        search_city = city_input
    elif auto_location_data and auto_location_data['city']:
        search_city = auto_location_data['city']
    elif city_input:  # Auto-search as user types
        search_city = city_input
    
    if search_city:
        # Get location data
        with st.spinner("🔍 Searching location..."):
            location_key, city_name, country = weather_app.get_location_key(search_city)
        
        # Try coordinate-based lookup for auto-detected location
        if not location_key and auto_location_data and auto_location_data['lat'] and auto_location_data['lon']:
            with st.spinner("🎯 Getting precise location data..."):
                location_key, city_name, country = get_location_by_coordinates(
                    auto_location_data['lat'], 
                    auto_location_data['lon']
                )
                if location_key:
                    st.success(f"🎯 Precise location found: {city_name}, {country}")
        
        if location_key:
            # Create tabs
            tab1, tab2, tab3, tab4 = st.tabs(["Current", "Forecast", "Charts", "Details"])
            
            with tab1:
                # Current weather
                with st.spinner("Loading..."):
                    current_weather = weather_app.get_current_weather(location_key)
                
                if current_weather:
                    temp_c = current_weather['Temperature']['Metric']['Value']
                    temp_f = current_weather['Temperature']['Imperial']['Value']
                    condition = current_weather['WeatherText']
                    
                    # Update background based on weather
                    new_bg = get_weather_background(condition)
                    if st.session_state.weather_bg != new_bg:
                        st.session_state.weather_bg = new_bg
                        st.rerun()
                    
                    # Add weather sound with toggle
                    col_sound1, col_sound2 = st.columns([3, 1])
                    
                    with col_sound2:
                        sound_enabled = st.checkbox("🔊 Weather Sounds", value=True, help="Enable/disable weather sounds")
                    
                    if sound_enabled:
                        sound_file = get_weather_sound(condition)
                        if sound_file:
                            audio_html = play_weather_sound(sound_file)
                            if audio_html:
                                st.markdown(audio_html, unsafe_allow_html=True)
                            else:
                                st.info("🔇 Weather sound file not found. Sounds are generated locally.")
                    else:
                        st.markdown('<div style="text-align: center; color: white; opacity: 0.6; margin: 1rem 0;">🔇 Weather sounds disabled</div>', unsafe_allow_html=True)
                    
                    # Enhanced location info with coordinates if auto-detected
                    location_display = f"{city_name}, {country}"
                    if auto_location_data:
                        location_display += f" 📍"
                        if auto_location_data.get('timezone'):
                            location_display += f" | {auto_location_data['timezone']}"
                    
                    st.markdown(f"""
                    <div style="
                        text-align: center; 
                        color: white; 
                        opacity: 0.9; 
                        margin-bottom: 2rem;
                        background: rgba(255,255,255,0.1);
                        border-radius: 10px;
                        padding: 1rem;
                        border: 1px solid rgba(255,255,255,0.2);
                    ">
                        <div style="font-size: 1.1rem; font-weight: 500;">{location_display}</div>
                        {f'<div style="font-size: 0.8rem; opacity: 0.7; margin-top: 0.5rem;">Auto-detected from your IP address</div>' if auto_location_data else ''}
                    </div>
                    """, unsafe_allow_html=True)
                    
                    # Main weather display with enhanced features
                    weather_icon = get_weather_icon(condition)
                    feels_like = int(current_weather['RealFeelTemperature']['Metric']['Value'])
                    humidity = current_weather['RelativeHumidity']
                    wind_speed = current_weather['Wind']['Speed']['Metric']['Value']
                    
                    # Get comfort level and activity recommendations
                    comfort_level, comfort_color = get_comfort_level(temp_c, humidity, wind_speed)
                    activities = get_activity_recommendations(current_weather)
                    
                    st.markdown(f"""
                    <div class="weather-main">
                        <div class="weather-icon-main">{weather_icon}</div>
                        <div class="temp-display">{int(temp_c)}°</div>
                        <div class="condition-text">{condition}</div>
                        <div style="opacity: 0.8; font-size: 1.2rem; margin-bottom: 1rem;">
                            Feels like {feels_like}°
                        </div>
                        <div style="
                            background: rgba(255,255,255,0.1);
                            border-radius: 15px;
                            padding: 1rem 1.5rem;
                            margin: 1.5rem 0;
                            border: 1px solid rgba(255,255,255,0.2);
                        ">
                            <div style="font-size: 1.1rem; color: {comfort_color}; font-weight: 500;">
                                {comfort_level}
                            </div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    # Activity Recommendations
                    if activities:
                        st.markdown("### 🎯 Recommended Activities")
                        activity_cols = st.columns(2)
                        for i, activity in enumerate(activities):
                            with activity_cols[i % 2]:
                                st.markdown(f"""
                                <div class="premium-card" style="padding: 1rem; margin: 0.5rem 0; text-align: center;">
                                    <div style="color: white; font-size: 0.9rem;">{activity}</div>
                                </div>
                                """, unsafe_allow_html=True)
                    
                    # Get additional data
                    aqi = weather_app.get_air_quality(location_key)
                    aqi_category, aqi_color, aqi_description = get_aqi_info(aqi)
                    
                    # Get forecast data for sunrise/sunset
                    forecast_data = weather_app.get_5day_forecast(location_key)
                    sunrise, sunset = get_sun_times(forecast_data)
                    
                    # Enhanced weather metrics with premium styling
                    st.markdown(f"""
                    <div class="metric-grid">
                        <div class="metric-item">
                            <div class="metric-icon">💧</div>
                            <div class="metric-value">{current_weather['RelativeHumidity']}%</div>
                            <div class="metric-label">Humidity</div>
                            <div class="metric-description">
                                {'High' if current_weather['RelativeHumidity'] > 70 else 'Low' if current_weather['RelativeHumidity'] < 30 else 'Comfortable'}
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">💨</div>
                            <div class="metric-value">{current_weather['Wind']['Speed']['Metric']['Value']}</div>
                            <div class="metric-label">Wind km/h</div>
                            <div class="metric-description">{current_weather['Wind']['Direction']['Localized']}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">👁️</div>
                            <div class="metric-value">{current_weather['Visibility']['Metric']['Value']}</div>
                            <div class="metric-label">Visibility km</div>
                            <div class="metric-description">
                                {'Excellent' if current_weather['Visibility']['Metric']['Value'] > 10 else 'Good' if current_weather['Visibility']['Metric']['Value'] > 5 else 'Poor'}
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">☀️</div>
                            <div class="metric-value">{current_weather.get('UVIndex', 'N/A')}</div>
                            <div class="metric-label">UV Index</div>
                            <div class="metric-description">
                                {'Very High' if (current_weather.get('UVIndex', 0) or 0) > 8 else 'High' if (current_weather.get('UVIndex', 0) or 0) > 6 else 'Moderate' if (current_weather.get('UVIndex', 0) or 0) > 3 else 'Low'}
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">☁️</div>
                            <div class="metric-value">{current_weather.get('CloudCover', 'N/A')}%</div>
                            <div class="metric-label">Cloud Cover</div>
                            <div class="metric-description">
                                {'Overcast' if (current_weather.get('CloudCover', 0) or 0) > 80 else 'Partly Cloudy' if (current_weather.get('CloudCover', 0) or 0) > 40 else 'Clear'}
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">🌪️</div>
                            <div class="metric-value">{current_weather['Pressure']['Metric']['Value']}</div>
                            <div class="metric-label">Pressure mb</div>
                            <div class="metric-description">
                                {'High' if current_weather['Pressure']['Metric']['Value'] > 1020 else 'Low' if current_weather['Pressure']['Metric']['Value'] < 1000 else 'Normal'}
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">🏭</div>
                            <div class="metric-value" style="color: {aqi_color};">{aqi if aqi else 'N/A'}</div>
                            <div class="metric-label">Air Quality</div>
                            <div class="metric-description">{aqi_category if aqi else 'No data'}</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">🌅</div>
                            <div class="metric-value">{sunrise if sunrise else 'N/A'}</div>
                            <div class="metric-label">Sunrise</div>
                            <div class="metric-description">Dawn</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">🌇</div>
                            <div class="metric-value">{sunset if sunset else 'N/A'}</div>
                            <div class="metric-label">Sunset</div>
                            <div class="metric-description">Dusk</div>
                        </div>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    # Air Quality Information
                    if aqi:
                        st.markdown(f"""
                        <div style="
                            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                            backdrop-filter: blur(15px);
                            border-radius: 20px;
                            padding: 1.5rem;
                            margin: 2rem 0;
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            text-align: center;
                            color: white;
                        ">
                            <div style="font-size: 1.2rem; margin-bottom: 1rem;">🏭 Air Quality</div>
                            <div style="font-size: 2rem; font-weight: 600; color: {aqi_color}; margin: 0.5rem 0;">{aqi_category}</div>
                            <div style="opacity: 0.8; font-size: 0.9rem;">{aqi_description}</div>
                        </div>
                        """, unsafe_allow_html=True)
                    
                    # Lifestyle Tips
                    tips = get_lifestyle_tips(current_weather, aqi)
                    if tips:
                        st.markdown("""
                        <div style="
                            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                            backdrop-filter: blur(15px);
                            border-radius: 20px;
                            padding: 2rem;
                            margin: 2rem 0;
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            color: white;
                        ">
                            <div style="font-size: 1.3rem; margin-bottom: 1.5rem; text-align: center;">💡 Lifestyle Tips</div>
                        """, unsafe_allow_html=True)
                        
                        # Display tips in columns
                        tip_cols = st.columns(2)
                        for i, tip in enumerate(tips):
                            with tip_cols[i % 2]:
                                st.markdown(f"""
                                <div style="
                                    background: rgba(255,255,255,0.1);
                                    border-radius: 10px;
                                    padding: 1rem;
                                    margin: 0.5rem 0;
                                    border-left: 3px solid rgba(255,255,255,0.3);
                                ">
                                    <div style="font-size: 0.9rem; line-height: 1.4;">{tip}</div>
                                </div>
                                """, unsafe_allow_html=True)
                        
                        st.markdown("</div>", unsafe_allow_html=True)
            
            with tab2:
                # Get forecast data first
                with st.spinner("Loading forecast data..."):
                    forecast_data = weather_app.get_5day_forecast(location_key)
                    hourly_data = weather_app.get_hourly_forecast(location_key)
                
                # 5-Day Forecast Section using Streamlit columns
                if forecast_data:
                    st.markdown("### 📅 5-Day Weather Forecast")
                    
                    # Create columns for forecast cards
                    cols = st.columns(5)
                    
                    for i, day in enumerate(forecast_data['DailyForecasts']):
                        with cols[i]:
                            date = datetime.fromisoformat(day['Date'].replace('Z', '+00:00'))
                            day_short = "Today" if i == 0 else date.strftime('%a')
                            
                            min_temp = int(day['Temperature']['Minimum']['Value'])
                            max_temp = int(day['Temperature']['Maximum']['Value'])
                            condition = day['Day']['IconPhrase']
                            icon = get_weather_icon(condition)
                            rain_prob = day.get('Day', {}).get('PrecipitationProbability', 0)
                            
                            # Create forecast card using container
                            with st.container():
                                st.markdown(f"""
                                <div style="
                                    background: linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%);
                                    backdrop-filter: blur(15px);
                                    border-radius: 18px;
                                    padding: 1.5rem 1rem;
                                    text-align: center;
                                    color: white;
                                    border: 1px solid rgba(255, 255, 255, 0.2);
                                    margin: 0.5rem 0;
                                    transition: transform 0.3s ease;
                                ">
                                    <div style="font-weight: 500; margin-bottom: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px;">{day_short}</div>
                                    <div style="font-size: 2.5rem; margin: 1rem 0;">{icon}</div>
                                    <div style="font-size: 1.2rem; font-weight: 600; margin: 0.8rem 0;">{max_temp}° / {min_temp}°</div>
                                    <div style="font-size: 0.8rem; opacity: 0.8; line-height: 1.3; margin-bottom: 0.5rem;">{condition}</div>
                                    <div style="font-size: 0.7rem; opacity: 0.7; color: #87CEEB;">💧 {rain_prob}%</div>
                                </div>
                                """, unsafe_allow_html=True)
                
                st.markdown("---")
                
                # Hourly Forecast Section using Streamlit components
                if hourly_data:
                    st.markdown("### ⏰ 12-Hour Detailed Forecast")
                    
                    # Create hourly forecast using containers
                    for i, hour in enumerate(hourly_data[:8]):  # Show 8 hours
                        time = datetime.fromisoformat(hour['DateTime'].replace('Z', '+00:00'))
                        time_str = "Now" if i == 0 else time.strftime('%I %p')
                        temp = int(hour['Temperature']['Value'])
                        condition = hour['IconPhrase']
                        rain_prob = hour['PrecipitationProbability']
                        humidity = hour['RelativeHumidity']
                        icon = get_weather_icon(condition)
                        
                        col1, col2, col3, col4 = st.columns([1, 1, 2, 1])
                        
                        with col1:
                            st.markdown(f"**{time_str}**")
                        
                        with col2:
                            st.markdown(f"<div style='font-size: 1.5rem; text-align: center;'>{icon}</div>", unsafe_allow_html=True)
                        
                        with col3:
                            st.markdown(f"**{temp}°C** - {condition}")
                            st.markdown(f"<small style='opacity: 0.7;'>Humidity: {humidity}%</small>", unsafe_allow_html=True)
                        
                        with col4:
                            st.markdown(f"<div style='color: #87CEEB; text-align: center;'>💧 {rain_prob}%</div>", unsafe_allow_html=True)
            
            with tab3:
                # Weather charts
                if forecast_data and hourly_data:
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        # Temperature trend chart
                        dates = []
                        min_temps = []
                        max_temps = []
                        
                        for day in forecast_data['DailyForecasts']:
                            date = datetime.fromisoformat(day['Date'].replace('Z', '+00:00'))
                            dates.append(date.strftime('%a'))
                            min_temps.append(day['Temperature']['Minimum']['Value'])
                            max_temps.append(day['Temperature']['Maximum']['Value'])
                        
                        fig = go.Figure()
                        fig.add_trace(go.Scatter(
                            x=dates, y=max_temps, 
                            mode='lines+markers', 
                            name='Max', 
                            line=dict(color='rgba(255,255,255,0.8)', width=3),
                            marker=dict(size=8)
                        ))
                        fig.add_trace(go.Scatter(
                            x=dates, y=min_temps, 
                            mode='lines+markers', 
                            name='Min', 
                            line=dict(color='rgba(255,255,255,0.5)', width=3),
                            marker=dict(size=8)
                        ))
                        
                        fig.update_layout(
                            title=dict(text='Temperature Trend', font=dict(color='white', size=16)),
                            xaxis=dict(color='white', gridcolor='rgba(255,255,255,0.2)'),
                            yaxis=dict(color='white', gridcolor='rgba(255,255,255,0.2)'),
                            paper_bgcolor='rgba(0,0,0,0)',
                            plot_bgcolor='rgba(0,0,0,0)',
                            font=dict(color='white'),
                            legend=dict(font=dict(color='white')),
                            height=300
                        )
                        
                        st.plotly_chart(fig, use_container_width=True)
                    
                    with col2:
                        # Hourly temperature chart
                        times = []
                        temps = []
                        
                        for hour in hourly_data[:12]:
                            time = datetime.fromisoformat(hour['DateTime'].replace('Z', '+00:00'))
                            times.append(time.strftime('%I%p'))
                            temps.append(hour['Temperature']['Value'])
                        
                        fig2 = go.Figure()
                        fig2.add_trace(go.Scatter(
                            x=times, y=temps, 
                            mode='lines+markers', 
                            name='Temperature',
                            line=dict(color='rgba(255,255,255,0.8)', width=3),
                            marker=dict(size=6),
                            fill='tonexty',
                            fillcolor='rgba(255,255,255,0.1)'
                        ))
                        
                        fig2.update_layout(
                            title=dict(text='Hourly Temperature', font=dict(color='white', size=16)),
                            xaxis=dict(color='white', gridcolor='rgba(255,255,255,0.2)'),
                            yaxis=dict(color='white', gridcolor='rgba(255,255,255,0.2)'),
                            paper_bgcolor='rgba(0,0,0,0)',
                            plot_bgcolor='rgba(0,0,0,0)',
                            font=dict(color='white'),
                            showlegend=False,
                            height=300
                        )
                        
                        st.plotly_chart(fig2, use_container_width=True)
            
            with tab4:
                # Detailed Information Tab
                st.markdown("### 📊 Detailed Weather Information")
                
                # Get all data
                current_weather = weather_app.get_current_weather(location_key)
                forecast_data = weather_app.get_5day_forecast(location_key)
                aqi = weather_app.get_air_quality(location_key)
                
                if current_weather:
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        # Sun & Moon Information
                        st.markdown("#### 🌅 Sun & Moon")
                        sunrise, sunset = get_sun_times(forecast_data)
                        
                        sun_info = f"""
                        **Sunrise:** {sunrise if sunrise else 'N/A'}  
                        **Sunset:** {sunset if sunset else 'N/A'}  
                        **UV Index:** {current_weather.get('UVIndex', 'N/A')}  
                        **Cloud Cover:** {current_weather.get('CloudCover', 'N/A')}%
                        """
                        st.markdown(sun_info)
                        
                        # Air Quality Details
                        st.markdown("#### 🏭 Air Quality")
                        if aqi:
                            aqi_category, aqi_color, aqi_description = get_aqi_info(aqi)
                            st.markdown(f"""
                            **AQI:** <span style="color: {aqi_color};">{aqi}</span>  
                            **Category:** <span style="color: {aqi_color};">{aqi_category}</span>  
                            **Description:** {aqi_description}
                            """, unsafe_allow_html=True)
                        else:
                            st.markdown("Air quality data not available")
                    
                    with col2:
                        # Atmospheric Conditions
                        st.markdown("#### 🌪️ Atmospheric Conditions")
                        
                        feels_like = current_weather['RealFeelTemperature']['Metric']['Value']
                        pressure = current_weather['Pressure']['Metric']['Value']
                        humidity = current_weather['RelativeHumidity']
                        visibility = current_weather['Visibility']['Metric']['Value']
                        wind_speed = current_weather['Wind']['Speed']['Metric']['Value']
                        wind_direction = current_weather['Wind']['Direction']['Localized']
                        
                        atmo_info = f"""
                        **Real Feel:** {feels_like}°C  
                        **Pressure:** {pressure} mb  
                        **Humidity:** {humidity}%  
                        **Visibility:** {visibility} km  
                        **Wind:** {wind_speed} km/h {wind_direction}
                        """
                        st.markdown(atmo_info)
                        
                        # Weather Alerts (simulated)
                        st.markdown("#### ⚠️ Weather Alerts")
                        temp = current_weather['Temperature']['Metric']['Value']
                        condition = current_weather['WeatherText'].lower()
                        
                        alerts = []
                        if temp > 35:
                            alerts.append("🔥 **Heat Warning:** Extreme temperatures expected")
                        elif temp < 0:
                            alerts.append("❄️ **Freeze Warning:** Sub-zero temperatures")
                        
                        if wind_speed > 30:
                            alerts.append("💨 **Wind Advisory:** Strong winds expected")
                        
                        if any(word in condition for word in ['storm', 'thunder']):
                            alerts.append("⛈️ **Storm Warning:** Thunderstorms in the area")
                        
                        if humidity > 90 and temp > 25:
                            alerts.append("🌡️ **Heat Index Warning:** High humidity and temperature")
                        
                        if alerts:
                            for alert in alerts:
                                st.markdown(alert)
                        else:
                            st.markdown("No weather alerts at this time")
                    
                    # Extended Lifestyle Recommendations
                    st.markdown("#### 💡 Extended Lifestyle Recommendations")
                    tips = get_lifestyle_tips(current_weather, aqi)
                    
                    if tips:
                        for i, tip in enumerate(tips, 1):
                            st.markdown(f"**{i}.** {tip}")
                    
                    # Weekly Overview
                    if forecast_data:
                        st.markdown("#### 📅 Weekly Weather Summary")
                        
                        temps = []
                        conditions = []
                        
                        for day in forecast_data['DailyForecasts']:
                            min_temp = day['Temperature']['Minimum']['Value']
                            max_temp = day['Temperature']['Maximum']['Value']
                            temps.extend([min_temp, max_temp])
                            conditions.append(day['Day']['IconPhrase'])
                        
                        avg_temp = sum(temps) / len(temps)
                        min_temp_week = min(temps)
                        max_temp_week = max(temps)
                        
                        # Count weather conditions
                        condition_counts = {}
                        for condition in conditions:
                            condition_counts[condition] = condition_counts.get(condition, 0) + 1
                        
                        most_common_condition = max(condition_counts, key=condition_counts.get)
                        
                        summary = f"""
                        **Average Temperature:** {avg_temp:.1f}°C  
                        **Temperature Range:** {min_temp_week}°C to {max_temp_week}°C  
                        **Most Common Condition:** {most_common_condition}  
                        **Days with Similar Weather:** {condition_counts[most_common_condition]} out of 5
                        """
                        st.markdown(summary)
        
        else:
            st.markdown('<div style="text-align: center; color: white; opacity: 0.8; margin: 2rem 0;">City not found. Please try a different name.</div>', unsafe_allow_html=True)
    
    else:
        # Beautiful Welcome Screen with Auto-Location Info
        st.markdown("""
        <div style="text-align: center; color: white; margin: 4rem 0;">
            <div style="
                background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
                backdrop-filter: blur(20px);
                border-radius: 30px;
                padding: 4rem 3rem;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 20px 60px rgba(0,0,0,0.15);
                margin: 2rem 0;
            ">
                <div style="font-size: 4rem; margin-bottom: 2rem;">🌍</div>
                <div style="font-size: 2.5rem; font-weight: 300; margin-bottom: 1.5rem; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
                    Welcome to Weather
                </div>
                <div style="font-size: 1.3rem; opacity: 0.9; margin-bottom: 2rem; line-height: 1.6;">
                    Get real-time weather data with beautiful visualizations<br>
                    <span style="opacity: 0.7; font-size: 1.1rem;">Search manually, use popular cities, or click "My Location" for instant weather</span>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Quick Start Options using Streamlit components
        st.markdown('<div style="color: white; text-align: center; margin: 2rem 0; font-size: 1.2rem;">🚀 Quick Start Options</div>', unsafe_allow_html=True)
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.markdown("""
            <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 1rem;
                text-align: center;
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
            ">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📍</div>
                <div style="font-size: 0.9rem;">Auto-detect location</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            st.markdown("""
            <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 1rem;
                text-align: center;
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
            ">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
                <div style="font-size: 0.9rem;">Search any city</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            st.markdown("""
            <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 1rem;
                text-align: center;
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
            ">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🌍</div>
                <div style="font-size: 0.9rem;">Popular destinations</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col4:
            st.markdown("""
            <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                padding: 1rem;
                text-align: center;
                color: white;
                border: 1px solid rgba(255,255,255,0.2);
            ">
                <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🎵</div>
                <div style="font-size: 0.9rem;">Weather sounds</div>
            </div>
            """, unsafe_allow_html=True)
        
        # Privacy notice
        st.markdown("""
        <div style="
            text-align: center;
            color: white;
            opacity: 0.6;
            font-size: 0.8rem;
            font-style: italic;
            margin: 2rem 0;
        ">
            Auto-location uses IP geolocation (approximate) and doesn't access device GPS
        </div>
        """, unsafe_allow_html=True)
        
        # Show auto-detected location info if available
        if 'user_location' not in st.session_state:
            with st.spinner("🌍 Detecting your approximate location..."):
                detected_location = get_user_location()
                st.session_state.user_location = detected_location
        
        if st.session_state.user_location:
            location_info = st.session_state.user_location
            st.markdown(f"""
            <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
                padding: 1.5rem;
                margin: 2rem 0;
                border: 1px solid rgba(255,255,255,0.2);
                text-align: center;
                color: white;
            ">
                <div style="font-size: 1.1rem; margin-bottom: 1rem;">📍 Detected Location</div>
                <div style="font-size: 1.3rem; font-weight: 500; margin-bottom: 0.5rem;">
                    {location_info.get('city', 'Unknown')}, {location_info.get('country', 'Unknown')}
                </div>
                <div style="opacity: 0.7; font-size: 0.9rem;">
                    Click "My Location" above to get weather for this location
                </div>
            </div>
            """, unsafe_allow_html=True)
        
        # Feature cards using Streamlit columns
        st.markdown('<div style="color: white; text-align: center; margin: 2rem 0; font-size: 1.2rem;">✨ App Features</div>', unsafe_allow_html=True)
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("""
            <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
                padding: 2rem 1.5rem;
                border: 1px solid rgba(255,255,255,0.2);
                text-align: center;
                color: white;
                margin: 1rem 0;
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🌡️</div>
                <div style="font-weight: 500; margin-bottom: 0.8rem; font-size: 1.1rem;">Current Weather</div>
                <div style="font-size: 0.9rem; opacity: 0.8; line-height: 1.4;">Real-time temperature, conditions, AQI, and detailed metrics</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            st.markdown("""
            <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
                padding: 2rem 1.5rem;
                border: 1px solid rgba(255,255,255,0.2);
                text-align: center;
                color: white;
                margin: 1rem 0;
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                <div style="font-weight: 500; margin-bottom: 0.8rem; font-size: 1.1rem;">5-Day Forecast</div>
                <div style="font-size: 0.9rem; opacity: 0.8; line-height: 1.4;">Extended predictions with sunrise, sunset, and lifestyle tips</div>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            st.markdown("""
            <div style="
                background: rgba(255,255,255,0.1);
                border-radius: 15px;
                padding: 2rem 1.5rem;
                border: 1px solid rgba(255,255,255,0.2);
                text-align: center;
                color: white;
                margin: 1rem 0;
            ">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📊</div>
                <div style="font-weight: 500; margin-bottom: 0.8rem; font-size: 1.1rem;">Interactive Charts</div>
                <div style="font-size: 0.9rem; opacity: 0.8; line-height: 1.4;">Visual weather trends and comprehensive data analysis</div>
            </div>
            """, unsafe_allow_html=True)
        
        # Sound test section
        st.markdown("""
        <div style="
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
            backdrop-filter: blur(15px);
            border-radius: 20px;
            padding: 2rem;
            margin: 3rem 0 2rem 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
            text-align: center;
            color: white;
        ">
            <div style="font-size: 1.3rem; margin-bottom: 1rem;">🎵 Test Weather Sounds</div>
            <div style="opacity: 0.8; font-size: 1rem; margin-bottom: 1.5rem;">
                Experience immersive weather sounds that match current conditions
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Sound test buttons
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("🌧️ Rain Sound", help="Test rain sound effect", use_container_width=True):
                rain_audio = play_weather_sound("sounds/rain.wav")
                if rain_audio:
                    st.markdown(rain_audio, unsafe_allow_html=True)
                else:
                    st.error("Rain sound file not found")
        
        with col2:
            if st.button("⛈️ Thunder Sound", help="Test thunder sound effect", use_container_width=True):
                thunder_audio = play_weather_sound("sounds/thunder.wav")
                if thunder_audio:
                    st.markdown(thunder_audio, unsafe_allow_html=True)
                else:
                    st.error("Thunder sound file not found")
        
        with col3:
            if st.button("💨 Wind Sound", help="Test wind sound effect", use_container_width=True):
                wind_audio = play_weather_sound("sounds/wind.wav")
                if wind_audio:
                    st.markdown(wind_audio, unsafe_allow_html=True)
                else:
                    st.error("Wind sound file not found")
    
    st.markdown('</div>', unsafe_allow_html=True)  # Close main container

if __name__ == "__main__":
    main()