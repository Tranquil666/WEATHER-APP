from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import requests
from datetime import datetime
import json
import google.generativeai as genai

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# AccuWeather API configuration
API_KEY = "zpka_9f619c9946024b80a7d88a0aba311535_7b0c917b"
BASE_URL = "http://dataservice.accuweather.com"

# Gemini AI configuration - Using the most advanced model
GEMINI_API_KEY = "AIzaSyDGeftpKyhZ1dYh03h_dKwWD2CNZ_PirpY"
genai.configure(api_key=GEMINI_API_KEY)

# Use the most advanced Gemini model with enhanced configuration
generation_config = {
    "temperature": 0.7,
    "top_p": 0.8,
    "top_k": 40,
    "max_output_tokens": 2048,
}

safety_settings = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
]

model = genai.GenerativeModel(
    model_name="gemini-1.5-pro-latest",
    generation_config=generation_config,
    safety_settings=safety_settings
)

def get_weather_background(condition):
    """Get background gradient based on weather condition"""
    condition_lower = condition.lower()
    
    if any(word in condition_lower for word in ['sunny', 'clear', 'bright']):
        return "bg-sunny"
    elif any(word in condition_lower for word in ['rain', 'shower', 'drizzle']):
        return "bg-rainy"
    elif any(word in condition_lower for word in ['cloud', 'overcast']):
        return "bg-cloudy"
    elif any(word in condition_lower for word in ['snow', 'blizzard']):
        return "bg-snowy"
    elif any(word in condition_lower for word in ['storm', 'thunder']):
        return "bg-stormy"
    elif any(word in condition_lower for word in ['fog', 'mist', 'haze']):
        return "bg-foggy"
    else:
        return "bg-sunny"

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
            return {"text": "🔥 Very Hot", "color": "#ff4444"}
        elif heat_index > 30:
            return {"text": "🌡️ Hot", "color": "#ff8800"}
    
    # Wind chill effect
    if temp < 10 and wind_speed > 15:
        wind_chill = temp - (wind_speed * 0.2)
        if wind_chill < 0:
            return {"text": "🧊 Very Cold", "color": "#4488ff"}
        elif wind_chill < 5:
            return {"text": "❄️ Cold", "color": "#66aaff"}
    
    # Comfort zones
    if 18 <= temp <= 24 and 30 <= humidity <= 60:
        return {"text": "😊 Perfect", "color": "#00dd44"}
    elif 15 <= temp <= 27 and 25 <= humidity <= 70:
        return {"text": "👍 Comfortable", "color": "#88dd00"}
    elif temp > 30:
        return {"text": "🔥 Hot", "color": "#ff6600"}
    elif temp < 5:
        return {"text": "🧊 Cold", "color": "#4488ff"}
    else:
        return {"text": "😐 Moderate", "color": "#ffaa00"}

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

def get_aqi_info(aqi):
    """Get AQI category and color"""
    if aqi is None:
        return {"category": "N/A", "color": "#999", "description": "No data available"}
    
    if aqi <= 50:
        return {"category": "Good", "color": "#00e400", "description": "Air quality is satisfactory"}
    elif aqi <= 100:
        return {"category": "Moderate", "color": "#ffff00", "description": "Air quality is acceptable"}
    elif aqi <= 150:
        return {"category": "Unhealthy for Sensitive Groups", "color": "#ff7e00", "description": "Sensitive people should limit outdoor activities"}
    elif aqi <= 200:
        return {"category": "Unhealthy", "color": "#ff0000", "description": "Everyone should limit outdoor activities"}
    elif aqi <= 300:
        return {"category": "Very Unhealthy", "color": "#8f3f97", "description": "Avoid outdoor activities"}
    else:
        return {"category": "Hazardous", "color": "#7e0023", "description": "Stay indoors"}

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

@app.route('/')
def serve_index():
    """Serve the main HTML file"""
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory('.', filename)

@app.route('/api/location/<city>')
def get_location_key(city):
    """Get location key for a city"""
    url = f"{BASE_URL}/locations/v1/cities/search"
    params = {
        'apikey': API_KEY,
        'q': city
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data:
            return jsonify({
                'success': True,
                'locationKey': data[0]['Key'],
                'cityName': data[0]['LocalizedName'],
                'country': data[0]['Country']['LocalizedName']
            })
        else:
            return jsonify({'success': False, 'error': 'City not found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/location/coordinates/<lat>/<lon>')
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
            return jsonify({
                'success': True,
                'locationKey': data['Key'],
                'cityName': data['LocalizedName'],
                'country': data['Country']['LocalizedName']
            })
        else:
            return jsonify({'success': False, 'error': 'Location not found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/weather/current/<location_key>')
def get_current_weather(location_key):
    """Get current weather conditions"""
    current_url = f"{BASE_URL}/currentconditions/v1/{location_key}"
    forecast_url = f"{BASE_URL}/forecasts/v1/daily/1day/{location_key}"
    
    current_params = {
        'apikey': API_KEY,
        'details': 'true'
    }
    
    forecast_params = {
        'apikey': API_KEY,
        'details': 'true',
        'metric': 'true'
    }
    
    try:
        # Get both current conditions and today's forecast for sunrise/sunset
        current_response = requests.get(current_url, params=current_params, timeout=10)
        forecast_response = requests.get(forecast_url, params=forecast_params, timeout=10)
        
        current_response.raise_for_status()
        current_data = current_response.json()
        
        if current_data:
            weather_data = current_data[0]
            
            # Add sunrise/sunset from forecast if available
            if forecast_response.status_code == 200:
                forecast_data = forecast_response.json()
                if forecast_data and 'DailyForecasts' in forecast_data and len(forecast_data['DailyForecasts']) > 0:
                    today_forecast = forecast_data['DailyForecasts'][0]
                    if 'Sun' in today_forecast:
                        weather_data['Sun'] = today_forecast['Sun']
            
            # Add computed values
            temp_c = weather_data['Temperature']['Metric']['Value']
            humidity = weather_data['RelativeHumidity']
            wind_speed = weather_data['Wind']['Speed']['Metric']['Value']
            condition = weather_data['WeatherText']
            
            # Get additional info
            comfort_level = get_comfort_level(temp_c, humidity, wind_speed)
            activities = get_activity_recommendations(weather_data)
            lifestyle_tips = get_lifestyle_tips(weather_data)
            weather_icon = get_weather_icon(condition)
            weather_bg = get_weather_background(condition)
            weather_sound = get_weather_sound(condition)
            
            # Simulate AQI based on visibility and conditions
            visibility = weather_data.get('Visibility', {}).get('Metric', {}).get('Value', 10)
            if visibility >= 10:
                aqi = 25  # Good
            elif visibility >= 7:
                aqi = 55  # Moderate
            elif visibility >= 5:
                aqi = 85  # Unhealthy for sensitive groups
            else:
                aqi = 125  # Unhealthy
            
            # Adjust based on weather conditions
            if any(word in condition.lower() for word in ['fog', 'haze', 'smoke']):
                aqi += 30
            elif any(word in condition.lower() for word in ['rain', 'shower']):
                aqi -= 15
            
            aqi = max(0, min(300, aqi))  # Keep within 0-300 range
            aqi_info = get_aqi_info(aqi)
            
            return jsonify({
                'success': True,
                'data': weather_data,
                'computed': {
                    'comfortLevel': comfort_level,
                    'activities': activities,
                    'lifestyleTips': lifestyle_tips,
                    'weatherIcon': weather_icon,
                    'weatherBackground': weather_bg,
                    'weatherSound': weather_sound,
                    'aqi': aqi,
                    'aqiInfo': aqi_info
                }
            })
        else:
            return jsonify({'success': False, 'error': 'No weather data found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/weather/forecast/<location_key>')
def get_5day_forecast(location_key):
    """Get 5-day weather forecast"""
    url = f"{BASE_URL}/forecasts/v1/daily/5day/{location_key}"
    params = {
        'apikey': API_KEY,
        'details': 'true',
        'metric': 'true'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data:
            # Add icons for each day
            for day in data['DailyForecasts']:
                day['computed'] = {
                    'icon': get_weather_icon(day['Day']['IconPhrase'])
                }
            
            return jsonify({
                'success': True,
                'data': data
            })
        else:
            return jsonify({'success': False, 'error': 'No forecast data found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/weather/hourly/<location_key>')
def get_hourly_forecast(location_key):
    """Get 12-hour forecast"""
    url = f"{BASE_URL}/forecasts/v1/hourly/12hour/{location_key}"
    params = {
        'apikey': API_KEY,
        'details': 'true',
        'metric': 'true'
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data:
            # Add icons for each hour
            for hour in data:
                hour['computed'] = {
                    'icon': get_weather_icon(hour['IconPhrase'])
                }
            
            return jsonify({
                'success': True,
                'data': data
            })
        else:
            return jsonify({'success': False, 'error': 'No hourly data found'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/location/auto')
def get_user_location():
    """Get user's location using IP geolocation"""
    try:
        # Using ipapi.co for free IP geolocation
        response = requests.get('https://ipapi.co/json/', timeout=5)
        if response.status_code == 200:
            data = response.json()
            return jsonify({
                'success': True,
                'data': {
                    'city': data.get('city', ''),
                    'region': data.get('region', ''),
                    'country': data.get('country_name', ''),
                    'lat': data.get('latitude', 0),
                    'lon': data.get('longitude', 0),
                    'timezone': data.get('timezone', ''),
                    'ip': data.get('ip', '')
                }
            })
    except Exception as e:
        pass
    
    # Fallback to another service
    try:
        response = requests.get('http://ip-api.com/json/', timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                return jsonify({
                    'success': True,
                    'data': {
                        'city': data.get('city', ''),
                        'region': data.get('regionName', ''),
                        'country': data.get('country', ''),
                        'lat': data.get('lat', 0),
                        'lon': data.get('lon', 0),
                        'timezone': data.get('timezone', ''),
                        'ip': data.get('query', '')
                    }
                })
    except Exception as e:
        pass
    
    return jsonify({'success': False, 'error': 'Could not detect location'})

# AI-POWERED WEATHER INTELLIGENCE FUNCTIONS
def generate_ai_weather_insights(current_weather, forecast_data, location_name):
    """Generate AI-powered weather insights using advanced Gemini model"""
    try:
        # Prepare comprehensive weather data for AI analysis
        temp_c = current_weather['Temperature']['Metric']['Value']
        condition = current_weather['WeatherText']
        humidity = current_weather['RelativeHumidity']
        wind_speed = current_weather['Wind']['Speed']['Metric']['Value']
        pressure = current_weather['Pressure']['Metric']['Value']
        uv_index = current_weather.get('UVIndex', 0)
        feels_like = current_weather['RealFeelTemperature']['Metric']['Value']
        
        # Build forecast summary
        forecast_summary = ""
        if forecast_data and 'DailyForecasts' in forecast_data:
            forecast_summary = "Next 3 days: "
            for i, day in enumerate(forecast_data['DailyForecasts'][:3]):
                day_name = ["Today", "Tomorrow", "Day 3"][i]
                min_temp = day['Temperature']['Minimum']['Value']
                max_temp = day['Temperature']['Maximum']['Value']
                day_condition = day['Day']['IconPhrase']
                forecast_summary += f"{day_name}: {min_temp}°-{max_temp}°C, {day_condition}. "
        
        # Create advanced AI prompt with structured output
        prompt = f"""You are an expert meteorologist and weather analyst. Analyze the current weather conditions for {location_name} and provide comprehensive insights.

CURRENT CONDITIONS:
- Temperature: {temp_c}°C (feels like {feels_like}°C)
- Weather: {condition}
- Humidity: {humidity}%
- Wind Speed: {wind_speed} km/h
- Pressure: {pressure} mb
- UV Index: {uv_index}
{forecast_summary}

Provide your analysis in this EXACT JSON format (no markdown, no extra text):

{{
  "weather_pattern_analysis": "Detailed analysis of current weather patterns, atmospheric conditions, and what's driving the current weather. Include scientific insights about pressure systems, humidity effects, and temperature trends.",
  "personalized_recommendations": [
    "Specific clothing recommendation based on temperature and conditions",
    "Best outdoor activities for these conditions", 
    "Indoor alternatives if weather is unfavorable",
    "Health considerations for sensitive individuals"
  ],
  "predictive_insights": "What to expect in the next 6-24 hours based on current conditions and forecast trends. Include timing of any weather changes.",
  "health_and_comfort": "Detailed impact on human comfort, health considerations for different groups (elderly, children, athletes), air quality implications, and wellness advice.",
  "smart_tips": [
    "Energy-saving tip based on weather",
    "Transportation advice for current conditions",
    "Photography/outdoor hobby recommendations",
    "Sleep quality considerations"
  ],
  "risk_assessment": "Comprehensive assessment of weather-related risks including UV exposure, temperature extremes, wind hazards, precipitation impacts, and safety precautions."
}}

Make each section detailed, practical, and location-specific. Use scientific weather knowledge while keeping language accessible."""

        # Generate content with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = model.generate_content(prompt)
                response_text = response.text.strip()
                
                # Clean up response text
                if response_text.startswith('```json'):
                    response_text = response_text[7:]
                if response_text.endswith('```'):
                    response_text = response_text[:-3]
                response_text = response_text.strip()
                
                # Parse JSON
                ai_insights = json.loads(response_text)
                
                # Validate required fields
                required_fields = ['weather_pattern_analysis', 'personalized_recommendations', 
                                 'predictive_insights', 'health_and_comfort', 'smart_tips', 'risk_assessment']
                
                if all(field in ai_insights for field in required_fields):
                    return ai_insights
                else:
                    print(f"Missing fields in AI response, attempt {attempt + 1}")
                    
            except json.JSONDecodeError as e:
                print(f"JSON parsing error on attempt {attempt + 1}: {e}")
                print(f"Response text: {response_text[:200]}...")
                
            except Exception as e:
                print(f"AI generation error on attempt {attempt + 1}: {e}")
        
        # If all retries failed, return enhanced fallback
        return generate_enhanced_fallback_insights(temp_c, condition, humidity, wind_speed, location_name)
        
    except Exception as e:
        print(f"Critical AI analysis error: {e}")
        return generate_enhanced_fallback_insights(temp_c if 'temp_c' in locals() else 20, 
                                                 condition if 'condition' in locals() else "Clear", 
                                                 humidity if 'humidity' in locals() else 50, 
                                                 wind_speed if 'wind_speed' in locals() else 10, 
                                                 location_name)

def generate_enhanced_fallback_insights(temp_c, condition, humidity, wind_speed, location_name):
    """Generate intelligent fallback insights when AI is unavailable"""
    
    # Temperature-based analysis
    if temp_c < 0:
        temp_analysis = "Freezing conditions with potential for ice formation"
        clothing = "Heavy winter coat, thermal layers, waterproof boots, gloves and hat"
        comfort = "Extreme cold can cause frostbite. Limit outdoor exposure and stay hydrated."
    elif temp_c < 10:
        temp_analysis = "Cold weather requiring warm clothing and precautions"
        clothing = "Warm jacket, long pants, closed shoes, light gloves"
        comfort = "Cool temperatures may affect circulation. Warm up gradually when coming indoors."
    elif temp_c < 20:
        temp_analysis = "Mild conditions suitable for most outdoor activities"
        clothing = "Light jacket or sweater, comfortable layers"
        comfort = "Pleasant conditions for most people. Good for outdoor exercise."
    elif temp_c < 30:
        temp_analysis = "Warm and comfortable weather ideal for outdoor activities"
        clothing = "Light, breathable clothing, sun protection recommended"
        comfort = "Excellent conditions for outdoor activities. Stay hydrated in direct sunlight."
    else:
        temp_analysis = "Hot weather requiring heat precautions and sun protection"
        clothing = "Lightweight, loose-fitting, light-colored clothing, wide-brimmed hat"
        comfort = "High temperatures can cause heat exhaustion. Seek shade, drink plenty of water."
    
    # Condition-based insights
    condition_lower = condition.lower()
    if 'rain' in condition_lower or 'shower' in condition_lower:
        activity_rec = "Indoor activities recommended. If going out, bring waterproof gear."
        risk = "Wet surfaces may be slippery. Reduced visibility while driving."
    elif 'snow' in condition_lower:
        activity_rec = "Winter sports opportunities. Exercise caution on icy surfaces."
        risk = "Icy conditions possible. Allow extra travel time and drive carefully."
    elif 'wind' in condition_lower or wind_speed > 25:
        activity_rec = "Avoid outdoor activities with loose objects. Good for kite flying in safe areas."
        risk = "Strong winds may affect driving and outdoor activities. Secure loose items."
    elif 'clear' in condition_lower or 'sunny' in condition_lower:
        activity_rec = "Perfect for outdoor activities, hiking, sports, and photography."
        risk = "UV exposure risk. Use sunscreen and protective clothing during peak hours."
    else:
        activity_rec = "Generally suitable for planned outdoor activities."
        risk = "Standard weather precautions apply."
    
    return {
        "weather_pattern_analysis": f"Current conditions in {location_name} show {temp_analysis.lower()}. {condition} weather with {humidity}% humidity and {wind_speed} km/h winds. Atmospheric pressure and temperature patterns suggest stable conditions for the immediate period.",
        
        "personalized_recommendations": [
            f"Clothing: {clothing}",
            f"Activities: {activity_rec}",
            "Stay informed about weather changes through reliable sources",
            "Plan indoor alternatives for outdoor activities if conditions worsen"
        ],
        
        "predictive_insights": f"Based on current {condition.lower()} conditions and {temp_c}°C temperature, expect similar weather patterns to continue for the next few hours. Monitor local forecasts for any developing weather systems that might affect {location_name}.",
        
        "health_and_comfort": comfort + f" Current humidity of {humidity}% {'may feel muggy' if humidity > 70 else 'provides comfortable conditions' if humidity > 30 else 'may feel dry'}. {'Excellent' if 15 <= temp_c <= 25 else 'Challenging'} conditions for outdoor exercise.",
        
        "smart_tips": [
            f"Energy tip: {'Use heating efficiently' if temp_c < 15 else 'Consider natural cooling' if temp_c > 25 else 'Optimal temperature for energy savings'}",
            f"Transportation: {'Allow extra travel time' if 'rain' in condition_lower or 'snow' in condition_lower else 'Normal travel conditions expected'}",
            f"Photography: {'Great lighting for outdoor photography' if 'clear' in condition_lower else 'Consider indoor or creative weather photography'}",
            f"Sleep: {'Cool, comfortable sleeping weather' if temp_c < 22 else 'May need cooling for comfortable sleep'}"
        ],
        
        "risk_assessment": f"{risk} Temperature of {temp_c}°C {'poses cold exposure risks' if temp_c < 5 else 'poses heat risks' if temp_c > 32 else 'is within comfortable range'}. UV precautions {'strongly recommended' if 'sunny' in condition_lower else 'standard'} during daylight hours. Overall risk level: {'High' if temp_c < 0 or temp_c > 35 or wind_speed > 30 else 'Low to Moderate'}."
    }

def generate_ai_weather_story(weather_data, location_name):
    """Generate a creative weather story using AI"""
    try:
        temp_c = weather_data['Temperature']['Metric']['Value']
        condition = weather_data['WeatherText']
        humidity = weather_data['RelativeHumidity']
        
        prompt = f"""Write a beautiful, poetic weather story for {location_name}. Current conditions: {temp_c}°C, {condition}, {humidity}% humidity.

Create an inspiring 2-3 sentence narrative that captures the atmospheric essence and mood of this weather. Use vivid imagery and emotional language. Make it feel like nature is telling a story.

Examples of style:
- "The morning sun dances across the city, painting golden shadows..."
- "Gentle raindrops whisper secrets to the earth below..."
- "A crisp breeze carries the promise of adventure..."

Write only the story, no extra text or formatting."""
        
        response = model.generate_content(prompt)
        story = response.text.strip()
        
        # Clean up any unwanted formatting
        story = story.replace('"', '').replace('*', '').strip()
        
        return story if story else generate_fallback_story(temp_c, condition, location_name)
        
    except Exception as e:
        print(f"Weather story generation error: {e}")
        return generate_fallback_story(
            weather_data['Temperature']['Metric']['Value'], 
            weather_data['WeatherText'], 
            location_name
        )

def generate_fallback_story(temp_c, condition, location_name):
    """Generate a fallback weather story"""
    condition_lower = condition.lower()
    
    if 'sunny' in condition_lower or 'clear' in condition_lower:
        return f"Golden sunlight bathes {location_name} in warmth at {temp_c}°C, as nature awakens to a perfect day filled with endless possibilities."
    elif 'rain' in condition_lower:
        return f"Gentle raindrops dance across {location_name}, creating a symphony of renewal while the air cools to a refreshing {temp_c}°C."
    elif 'cloud' in condition_lower:
        return f"Soft clouds drift lazily over {location_name}, painting the sky in shades of silver while maintaining a comfortable {temp_c}°C embrace."
    elif 'snow' in condition_lower:
        return f"Delicate snowflakes transform {location_name} into a winter wonderland, each crystal telling stories of the crisp {temp_c}°C air."
    elif 'wind' in condition_lower:
        return f"Spirited winds sweep through {location_name}, carrying whispers of distant places while the temperature holds steady at {temp_c}°C."
    else:
        return f"The atmosphere in {location_name} weaves its own unique tale today, with nature's canvas painted at a perfect {temp_c}°C."

@app.route('/api/ai/weather-insights/<location_key>')
def get_ai_weather_insights(location_key):
    """Get AI-powered weather insights"""
    try:
        # Get current weather data
        current_url = f"{BASE_URL}/currentconditions/v1/{location_key}"
        forecast_url = f"{BASE_URL}/forecasts/v1/daily/3day/{location_key}"
        
        current_params = {'apikey': API_KEY, 'details': 'true'}
        forecast_params = {'apikey': API_KEY, 'details': 'true', 'metric': 'true'}
        
        current_response = requests.get(current_url, params=current_params, timeout=10)
        forecast_response = requests.get(forecast_url, params=forecast_params, timeout=10)
        
        if current_response.status_code == 200:
            current_data = current_response.json()[0]
            forecast_data = forecast_response.json() if forecast_response.status_code == 200 else None
            
            # Get location name from request or use default
            location_name = request.args.get('location', 'your area')
            
            # Generate AI insights
            ai_insights = generate_ai_weather_insights(current_data, forecast_data, location_name)
            weather_story = generate_ai_weather_story(current_data, location_name)
            
            return jsonify({
                'success': True,
                'ai_insights': ai_insights,
                'weather_story': weather_story,
                'generated_at': datetime.now().isoformat()
            })
        else:
            return jsonify({'success': False, 'error': 'Weather data not available'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/ai/smart-recommendations')
def get_smart_recommendations():
    """Get AI-powered smart recommendations based on user preferences"""
    try:
        user_preferences = request.json or {}
        weather_condition = request.args.get('condition', 'clear')
        temperature = float(request.args.get('temperature', 20))
        
        prompt = f"""
        Based on these conditions:
        - Weather: {weather_condition}
        - Temperature: {temperature}°C
        - User preferences: {json.dumps(user_preferences)}
        
        Provide smart recommendations in JSON format:
        {{
            "clothing": ["specific clothing recommendations"],
            "activities": ["activity suggestions"],
            "health_tips": ["health and wellness tips"],
            "travel_advice": ["travel and commute advice"],
            "productivity_tips": ["how weather affects productivity"]
        }}
        
        Return only valid JSON.
        """
        
        response = model.generate_content(prompt)
        recommendations = json.loads(response.text)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.errorhandler(404)
def not_found(error):
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
