import streamlit as st
import requests
import pandas as pd
from datetime import datetime
import plotly.graph_objects as go

# Configure page
st.set_page_config(
    page_title="⚡ Fast Weather",
    page_icon="🌤️",
    layout="wide"
)

# API configuration
API_KEY = "zpka_9f619c9946024b80a7d88a0aba311535_7b0c917b"
BASE_URL = "http://dataservice.accuweather.com"

# Cache API calls for 5 minutes to improve speed
@st.cache_data(ttl=300)
def get_location_key(city_name):
    """Get location key for a city - cached"""
    url = f"{BASE_URL}/locations/v1/cities/search"
    params = {'apikey': API_KEY, 'q': city_name}
    
    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data:
                return data[0]['Key'], data[0]['LocalizedName'], data[0]['Country']['LocalizedName']
    except:
        pass
    return None, None, None

@st.cache_data(ttl=300)
def get_current_weather(location_key):
    """Get current weather - cached"""
    url = f"{BASE_URL}/currentconditions/v1/{location_key}"
    params = {'apikey': API_KEY, 'details': 'true'}
    
    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            data = response.json()
            return data[0] if data else None
    except:
        pass
    return None

@st.cache_data(ttl=300)
def get_forecast(location_key):
    """Get 5-day forecast - cached"""
    url = f"{BASE_URL}/forecasts/v1/daily/5day/{location_key}"
    params = {'apikey': API_KEY, 'metric': 'true'}
    
    try:
        response = requests.get(url, params=params, timeout=5)
        if response.status_code == 200:
            return response.json()
    except:
        pass
    return None

# Custom CSS for fast loading
st.markdown("""
<style>
.weather-main {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 2rem;
    border-radius: 15px;
    color: white;
    text-align: center;
    margin: 1rem 0;
}
.metric-box {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
    margin: 0.5rem 0;
}
.forecast-item {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
    margin: 0.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>
""", unsafe_allow_html=True)

def main():
    st.title("⚡ Fast Weather Dashboard")
    
    # Simple search
    col1, col2 = st.columns([3, 1])
    with col1:
        city = st.text_input("🔍 Enter city name:", placeholder="New York, London, Tokyo...")
    with col2:
        search_btn = st.button("Search", type="primary")
    
    # Quick city buttons
    st.write("**Quick Search:**")
    cities = ["New York", "London", "Tokyo", "Paris", "Mumbai", "Dubai"]
    cols = st.columns(6)
    
    selected_city = None
    for i, city_name in enumerate(cities):
        with cols[i]:
            if st.button(city_name, key=f"city_{i}"):
                selected_city = city_name
    
    # Use selected city or typed city
    search_city = selected_city if selected_city else city
    
    if search_city and (search_btn or selected_city):
        # Show loading
        with st.spinner(f"Getting weather for {search_city}..."):
            # Get location
            location_key, city_name, country = get_location_key(search_city)
            
            if location_key:
                st.success(f"📍 {city_name}, {country}")
                
                # Get weather data
                current = get_current_weather(location_key)
                forecast = get_forecast(location_key)
                
                if current:
                    # Current weather - main display
                    temp_c = current['Temperature']['Metric']['Value']
                    temp_f = current['Temperature']['Imperial']['Value']
                    condition = current['WeatherText']
                    feels_like = current['RealFeelTemperature']['Metric']['Value']
                    
                    st.markdown(f"""
                    <div class="weather-main">
                        <h1>{temp_c}°C / {temp_f}°F</h1>
                        <h2>{condition}</h2>
                        <p>Feels like {feels_like}°C</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    # Quick metrics
                    col1, col2, col3, col4 = st.columns(4)
                    with col1:
                        st.metric("💧 Humidity", f"{current['RelativeHumidity']}%")
                    with col2:
                        st.metric("💨 Wind", f"{current['Wind']['Speed']['Metric']['Value']} km/h")
                    with col3:
                        st.metric("👁️ Visibility", f"{current['Visibility']['Metric']['Value']} km")
                    with col4:
                        st.metric("🌡️ Pressure", f"{current['Pressure']['Metric']['Value']} mb")
                    
                    # 5-day forecast
                    if forecast:
                        st.subheader("📅 5-Day Forecast")
                        cols = st.columns(5)
                        
                        for i, day in enumerate(forecast['DailyForecasts']):
                            with cols[i]:
                                date = datetime.fromisoformat(day['Date'].replace('Z', '+00:00'))
                                day_name = date.strftime('%a')
                                
                                min_temp = day['Temperature']['Minimum']['Value']
                                max_temp = day['Temperature']['Maximum']['Value']
                                condition = day['Day']['IconPhrase']
                                
                                st.markdown(f"""
                                <div class="forecast-item">
                                    <strong>{day_name}</strong><br>
                                    <span style="font-size: 1.2em;">{max_temp}° / {min_temp}°</span><br>
                                    <small>{condition}</small>
                                </div>
                                """, unsafe_allow_html=True)
                        
                        # Simple temperature chart
                        st.subheader("📈 Temperature Trend")
                        dates = []
                        highs = []
                        lows = []
                        
                        for day in forecast['DailyForecasts']:
                            date = datetime.fromisoformat(day['Date'].replace('Z', '+00:00'))
                            dates.append(date.strftime('%m/%d'))
                            highs.append(day['Temperature']['Maximum']['Value'])
                            lows.append(day['Temperature']['Minimum']['Value'])
                        
                        fig = go.Figure()
                        fig.add_trace(go.Scatter(x=dates, y=highs, mode='lines+markers', 
                                               name='High', line=dict(color='red', width=3)))
                        fig.add_trace(go.Scatter(x=dates, y=lows, mode='lines+markers', 
                                               name='Low', line=dict(color='blue', width=3)))
                        
                        fig.update_layout(
                            title='5-Day Temperature Range',
                            xaxis_title='Date',
                            yaxis_title='Temperature (°C)',
                            height=400,
                            showlegend=True
                        )
                        
                        st.plotly_chart(fig, use_container_width=True)
                
                else:
                    st.error("❌ Could not fetch weather data")
            else:
                st.error("❌ City not found. Try a different name.")
    
    elif not search_city:
        # Welcome screen
        st.info("👋 Enter a city name or click a quick search button to get weather data!")
        
        st.markdown("""
        ### ⚡ Features:
        - **Fast Loading**: Cached API calls for quick responses
        - **Current Weather**: Real-time temperature and conditions
        - **5-Day Forecast**: Daily weather predictions
        - **Temperature Charts**: Visual weather trends
        - **Global Cities**: Search any city worldwide
        """)

if __name__ == "__main__":
    main()