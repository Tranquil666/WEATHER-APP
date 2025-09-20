# Weather App - HTML/CSS/Bootstrap Version

A beautiful, responsive weather application built with HTML, CSS, Bootstrap, and JavaScript, featuring real-time weather data, interactive charts, and immersive weather sounds.

## Features

### 🌟 Core Features
- **Real-time Weather Data**: Current conditions, temperature, humidity, wind speed, and more
- **5-Day Forecast**: Extended weather predictions with detailed information
- **Hourly Forecast**: 12-hour detailed weather breakdown
- **Interactive Charts**: Visual temperature trends and hourly data
- **Auto-location Detection**: Automatic location detection using IP geolocation
- **Popular Cities**: Quick access to weather for major cities worldwide
- **Weather Sounds**: Immersive audio that matches current weather conditions

### 🎨 Design Features
- **Dynamic Backgrounds**: Beautiful gradients that change based on weather conditions
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Modern UI**: Clean, glass-morphism design with smooth animations
- **Accessibility**: Keyboard navigation and screen reader friendly

### 📊 Weather Metrics
- Temperature (Celsius/Fahrenheit)
- Feels-like temperature
- Humidity levels
- Wind speed and direction
- Visibility
- UV Index
- Cloud cover
- Atmospheric pressure
- Air Quality Index (simulated)
- Sunrise and sunset times

### 💡 Smart Features
- **Comfort Level Indicator**: Shows how comfortable the weather feels
- **Activity Recommendations**: Suggests activities based on current conditions
- **Lifestyle Tips**: Personalized advice based on weather and air quality
- **Weather Alerts**: Warnings for extreme weather conditions

## Setup Instructions

### Prerequisites
- Python 3.7 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Clone or Download the Project**
   ```bash
   cd "WEATHER APP"
   ```

2. **Install Python Dependencies**
   ```bash
   pip install -r requirements_web.txt
   ```

3. **Start the Flask Backend**
   ```bash
   python backend.py
   ```
   The backend will start on `http://localhost:5000`

4. **Open the Web Application**
   - Open `index.html` in your web browser
   - Or serve it using a local web server:
   ```bash
   # Using Python's built-in server
   python -m http.server 8080
   ```
   Then visit `http://localhost:8080`

### API Configuration

The app uses AccuWeather API. The API key is already included for demo purposes, but for production use, you should:

1. Get your own API key from [AccuWeather Developer Portal](https://developer.accuweather.com/)
2. Replace the `API_KEY` in `backend.py` with your key

## File Structure

```
WEATHER APP/
├── index.html              # Main HTML file
├── styles.css              # CSS styles and animations
├── app.js                  # Frontend JavaScript logic
├── backend.py              # Flask backend API
├── requirements_web.txt    # Python dependencies
├── sounds/                 # Weather sound files
│   ├── rain.wav
│   ├── thunder.wav
│   └── wind.wav
├── app.py                  # Original Streamlit app
└── README_WEB.md          # This file
```

## Usage

### Basic Usage
1. **Search for a City**: Type any city name in the search box
2. **Use Popular Cities**: Click on any of the popular city buttons
3. **Auto-location**: Click "My Location" to detect your current location
4. **Navigate Tabs**: Switch between Current, Forecast, Charts, and Details tabs

### Features Guide

#### Current Weather Tab
- View current temperature and conditions
- See comfort level and weather metrics
- Get activity recommendations and lifestyle tips
- Toggle weather sounds on/off

#### Forecast Tab
- 5-day weather forecast with icons and temperatures
- 12-hour detailed hourly forecast
- Precipitation probability for each period

#### Charts Tab
- Interactive temperature trend chart for 5 days
- Hourly temperature chart for next 12 hours
- Responsive charts that work on all devices

#### Details Tab
- Comprehensive weather information
- Sun and moon data (sunrise/sunset times)
- Air quality information
- Atmospheric conditions
- Weather alerts and warnings
- Extended lifestyle recommendations
- Weekly weather summary

### Weather Sounds
- **Rain Sound**: Plays during rainy conditions
- **Thunder Sound**: Plays during storms
- **Wind Sound**: Plays during windy conditions
- **Sound Toggle**: Enable/disable sounds using the toggle switch
- **Sound Test**: Test different weather sounds from the welcome screen

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile Browsers**: Responsive design works on all mobile browsers

## Troubleshooting

### Common Issues

1. **Backend Not Starting**
   - Ensure Python is installed and in PATH
   - Install dependencies: `pip install -r requirements_web.txt`
   - Check if port 5000 is available

2. **API Errors**
   - Check internet connection
   - Verify API key is valid
   - Some locations might not be found - try different city names

3. **Sounds Not Playing**
   - Ensure sound files exist in the `sounds/` directory
   - Check browser audio permissions
   - Some browsers require user interaction before playing audio

4. **Charts Not Loading**
   - Ensure Chart.js is loaded (check internet connection)
   - Try refreshing the page
   - Check browser console for JavaScript errors

### Performance Tips

- **Caching**: The app caches location data to reduce API calls
- **Lazy Loading**: Charts are only rendered when the Charts tab is opened
- **Responsive Images**: Weather icons are optimized for all screen sizes

## Development

### Customization

1. **Styling**: Modify `styles.css` to change colors, animations, or layout
2. **Weather Sources**: Update `backend.py` to use different weather APIs
3. **Sound Effects**: Add new sound files to the `sounds/` directory
4. **Cities**: Modify the popular cities list in `index.html`

### Adding New Features

1. **New Weather Metrics**: Add to the `displayWeatherMetrics()` function in `app.js`
2. **Additional Charts**: Use Chart.js to create new visualizations
3. **Enhanced Animations**: Add CSS animations in `styles.css`

## Credits

- **Weather Data**: AccuWeather API
- **Icons**: Unicode emoji and Bootstrap Icons
- **Charts**: Chart.js library
- **Framework**: Bootstrap 5
- **Fonts**: Google Fonts (Inter)

## License

This project is for educational and personal use. Please respect the AccuWeather API terms of service.

---

**Enjoy your beautiful weather app! 🌤️**
