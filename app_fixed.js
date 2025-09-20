// Weather App JavaScript - Enhanced Version
class WeatherApp {
    constructor() {
        // Dynamically set API base URL for both development and production
        this.API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? 'http://localhost:5000/api' 
            : `${window.location.protocol}//${window.location.host}/api`;
        this.currentLocationKey = null;
        this.currentWeatherData = null;
        this.forecastData = null;
        this.hourlyData = null;
        this.temperatureChart = null;
        this.hourlyChart = null;
        this.currentAudio = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.detectUserLocation();
    }

    // Retry mechanism for failed API calls
    async fetchWithRetry(url, options = {}, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    timeout: 10000 // 10 second timeout
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
            } catch (error) {
                console.log(`Attempt ${attempt} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    throw new Error(`Network request failed after ${maxRetries} attempts: ${error.message}`);
                }
                
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    }

    bindEvents() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => {
            const city = document.getElementById('cityInput').value.trim();
            if (city) this.searchWeather(city);
        });

        document.getElementById('cityInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const city = e.target.value.trim();
                if (city) this.searchWeather(city);
            }
        });

        document.getElementById('locationBtn').addEventListener('click', () => {
            this.getUserLocation();
        });

        document.querySelectorAll('.city-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const city = btn.getAttribute('data-city');
                this.searchWeather(city);
            });
        });

        document.getElementById('soundToggle').addEventListener('change', (e) => {
            if (!e.target.checked && this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
        });

        document.querySelectorAll('.sound-test-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const soundType = btn.getAttribute('data-sound');
                this.testSound(soundType);
            });
        });

        document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                const targetId = e.target.getAttribute('data-bs-target');
                if (targetId === '#charts' && this.forecastData && this.hourlyData) {
                    setTimeout(() => this.renderCharts(), 100);
                }
            });
        });
    }

    showLoading() {
        document.getElementById('loadingSpinner').classList.remove('d-none');
        document.getElementById('weatherContent').classList.add('d-none');
        document.getElementById('welcomeScreen').classList.add('d-none');
        document.getElementById('errorMessage').classList.add('d-none');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('d-none');
    }

    showError(message, showRetryButton = false, retryAction = null) {
        this.hideLoading();
        const errorEl = document.getElementById('errorMessage');
        
        let errorHTML = `
            <div class="d-flex align-items-center justify-content-between">
                <div>
                    <strong>⚠️ Network Error</strong><br>
                    ${message}
                </div>
        `;
        
        if (showRetryButton && retryAction) {
            errorHTML += `
                <button class="btn btn-outline-light btn-sm ms-3" onclick="(${retryAction.toString()})()">
                    🔄 Try Again
                </button>
            `;
        }
        
        errorHTML += '</div>';
        
        errorEl.innerHTML = errorHTML;
        errorEl.classList.remove('d-none');
        document.getElementById('weatherContent').classList.add('d-none');
        document.getElementById('welcomeScreen').classList.add('d-none');
    }

    showWeatherContent() {
        this.hideLoading();
        document.getElementById('weatherContent').classList.remove('d-none');
        document.getElementById('welcomeScreen').classList.add('d-none');
        document.getElementById('errorMessage').classList.add('d-none');
    }

    async detectUserLocation() {
        try {
            const response = await this.fetchWithRetry(`${this.API_BASE}/location/auto`);
            const result = await response.json();
            
            if (result.success && result.data.city) {
                this.displayDetectedLocation(result.data);
            }
        } catch (error) {
            console.log('Auto-location detection failed:', error);
        }
    }

    displayDetectedLocation(locationData) {
        const detectedEl = document.getElementById('detectedLocation');
        detectedEl.innerHTML = `
            <div class="detected-title">📍 Detected Location</div>
            <div class="detected-city">${locationData.city}, ${locationData.country}</div>
            <div class="detected-note">Click "My Location" above to get weather for this location</div>
        `;
        detectedEl.classList.remove('d-none');
    }

    async getUserLocation() {
        this.showLoading();
        
        try {
            const response = await this.fetchWithRetry(`${this.API_BASE}/location/auto`);
            const result = await response.json();
            
            if (result.success && result.data.city) {
                await this.searchWeather(result.data.city, result.data);
            } else {
                this.showError('Could not detect your location. Please search manually.');
            }
        } catch (error) {
            this.showError(
                'Please check your internet connection and try again.',
                true,
                () => this.getUserLocation()
            );
        }
    }

    async searchWeather(city, autoLocationData = null) {
        this.showLoading();
        
        try {
            const locationResponse = await this.fetchWithRetry(`${this.API_BASE}/location/${encodeURIComponent(city)}`);
            const locationResult = await locationResponse.json();
            
            if (!locationResult.success) {
                if (autoLocationData && autoLocationData.lat && autoLocationData.lon) {
                    const coordResponse = await this.fetchWithRetry(`${this.API_BASE}/location/coordinates/${autoLocationData.lat}/${autoLocationData.lon}`);
                    const coordResult = await coordResponse.json();
                    if (coordResult.success) {
                        this.currentLocationKey = coordResult.locationKey;
                        await this.loadWeatherData(coordResult.cityName, coordResult.country, autoLocationData);
                        return;
                    }
                }
                this.showError('City not found. Please try a different name.');
                return;
            }

            this.currentLocationKey = locationResult.locationKey;
            await this.loadWeatherData(locationResult.cityName, locationResult.country, autoLocationData);
            
        } catch (error) {
            this.showError(
                'Please check your internet connection and try again.',
                true,
                () => this.searchWeather(city, autoLocationData)
            );
        }
    }

    async loadWeatherData(cityName, country, autoLocationData = null) {
        try {
            const [currentResponse, forecastResponse, hourlyResponse] = await Promise.all([
                this.fetchWithRetry(`${this.API_BASE}/weather/current/${this.currentLocationKey}`),
                this.fetchWithRetry(`${this.API_BASE}/weather/forecast/${this.currentLocationKey}`),
                this.fetchWithRetry(`${this.API_BASE}/weather/hourly/${this.currentLocationKey}`)
            ]);

            const [currentResult, forecastResult, hourlyResult] = await Promise.all([
                currentResponse.json(),
                forecastResponse.json(),
                hourlyResponse.json()
            ]);

            if (!currentResult.success) {
                this.showError('Error loading current weather: ' + currentResult.error);
                return;
            }

            this.currentWeatherData = currentResult;
            this.forecastData = forecastResult.success ? forecastResult.data : null;
            this.hourlyData = hourlyResult.success ? hourlyResult.data : null;

            this.updateBackground(currentResult.computed.weatherBackground);
            this.displayLocationInfo(cityName, country, autoLocationData);
            this.displayCurrentWeather(currentResult);
            this.displayForecast();
            this.displayHourlyForecast();
            this.displayDetailedInfo(currentResult, cityName, country);
            
            this.showWeatherContent();

        } catch (error) {
            this.showError(
                'Please check your internet connection and try again.',
                true,
                () => this.loadWeatherData(cityName, country, autoLocationData)
            );
        }
    }

    displayLocationInfo(cityName, country, autoLocationData) {
        let locationDisplay = `${cityName}, ${country}`;
        let locationNote = '';
        
        if (autoLocationData) {
            locationDisplay += ' 📍';
            if (autoLocationData.timezone) {
                locationDisplay += ` | ${autoLocationData.timezone}`;
            }
            locationNote = '<div class="location-note">Auto-detected from your IP address</div>';
        }

        document.getElementById('locationInfo').innerHTML = `
            <div class="location-name">${locationDisplay}</div>
            ${locationNote}
        `;
    }

    displayCurrentWeather(weatherResult) {
        const data = weatherResult.data;
        const computed = weatherResult.computed;
        
        const tempC = Math.round(data.Temperature.Metric.Value);
        const feelsLike = Math.round(data.RealFeelTemperature.Metric.Value);
        
        document.getElementById('mainWeather').innerHTML = `
            <div class="weather-icon-main">${computed.weatherIcon}</div>
            <div class="temp-display">${tempC}°</div>
            <div class="condition-text">${data.WeatherText}</div>
            <div class="feels-like">Feels like ${feelsLike}°</div>
            <div class="comfort-level">
                <div class="comfort-level-text" style="color: ${computed.comfortLevel.color};">
                    ${computed.comfortLevel.text}
                </div>
            </div>
        `;

        if (computed.activities && computed.activities.length > 0) {
            document.getElementById('activitiesGrid').innerHTML = computed.activities.map(activity => `
                <div class="col-md-6">
                    <div class="activity-card">
                        <div>${activity}</div>
                    </div>
                </div>
            `).join('');
            document.getElementById('activityRecommendations').classList.remove('d-none');
        }

        this.displayWeatherMetrics(data, computed);

        if (computed.aqi) {
            this.displayAirQuality(computed.aqi, computed.aqiInfo);
        }

        if (computed.lifestyleTips && computed.lifestyleTips.length > 0) {
            this.displayLifestyleTips(computed.lifestyleTips);
        }

        this.playWeatherSound(computed.weatherSound);
    }

    displayWeatherMetrics(data, computed) {
        const metrics = [
            {
                icon: '💧',
                value: `${data.RelativeHumidity}%`,
                label: 'Humidity',
                description: data.RelativeHumidity > 70 ? 'High' : data.RelativeHumidity < 30 ? 'Low' : 'Comfortable'
            },
            {
                icon: '💨',
                value: Math.round(data.Wind.Speed.Metric.Value),
                label: 'Wind km/h',
                description: data.Wind.Direction.Localized
            },
            {
                icon: '👁️',
                value: data.Visibility.Metric.Value,
                label: 'Visibility km',
                description: data.Visibility.Metric.Value > 10 ? 'Excellent' : data.Visibility.Metric.Value > 5 ? 'Good' : 'Poor'
            },
            {
                icon: '🌡️',
                value: Math.round(data.Pressure.Metric.Value),
                label: 'Pressure mb',
                description: data.Pressure.Metric.Value > 1013 ? 'High' : data.Pressure.Metric.Value < 1000 ? 'Low' : 'Normal'
            },
            {
                icon: '☀️',
                value: data.UVIndex || 0,
                label: 'UV Index',
                description: this.getUVDescription(data.UVIndex || 0),
                color: this.getUVColor(data.UVIndex || 0)
            }
        ];

        if (data.Sun && data.Sun.Rise && data.Sun.Set) {
            const sunrise = new Date(data.Sun.Rise).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const sunset = new Date(data.Sun.Set).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            metrics.push(
                {
                    icon: '🌅',
                    value: sunrise,
                    label: 'Sunrise',
                    description: 'Dawn'
                },
                {
                    icon: '🌇',
                    value: sunset,
                    label: 'Sunset',
                    description: 'Dusk'
                }
            );
        }

        document.getElementById('weatherMetrics').innerHTML = metrics.map(metric => `
            <div class="metric-item">
                <div class="metric-icon">${metric.icon}</div>
                <div class="metric-value" ${metric.color ? `style="color: ${metric.color};"` : ''}>${metric.value}</div>
                <div class="metric-label">${metric.label}</div>
                <div class="metric-description">${metric.description}</div>
            </div>
        `).join('');
    }

    getUVDescription(uvIndex) {
        if (uvIndex <= 2) return 'Low - Safe';
        if (uvIndex <= 5) return 'Moderate';
        if (uvIndex <= 7) return 'High - Protection needed';
        if (uvIndex <= 10) return 'Very High - Extra protection';
        return 'Extreme - Avoid sun';
    }

    getUVColor(uvIndex) {
        if (uvIndex <= 2) return '#00e400';
        if (uvIndex <= 5) return '#ffff00';
        if (uvIndex <= 7) return '#ff7e00';
        if (uvIndex <= 10) return '#ff0000';
        return '#8f3f97';
    }

    displayAirQuality(aqi, aqiInfo) {
        document.getElementById('airQualityInfo').innerHTML = `
            <div class="aqi-title">🏭 Air Quality</div>
            <div class="aqi-value" style="color: ${aqiInfo.color};">${aqiInfo.category}</div>
            <div class="aqi-description">${aqiInfo.description}</div>
        `;
        document.getElementById('airQualityInfo').classList.remove('d-none');
    }

    displayLifestyleTips(tips) {
        const tipsGrid = tips.map((tip, index) => `
            <div class="col-md-6">
                <div class="tip-card">
                    <div class="tip-text">${tip}</div>
                </div>
            </div>
        `).join('');

        document.getElementById('lifestyleTips').innerHTML = `
            <div class="lifestyle-title">💡 Lifestyle Tips</div>
            <div class="row g-3">${tipsGrid}</div>
        `;
        document.getElementById('lifestyleTips').classList.remove('d-none');
    }

    displayDetailedInfo(weatherResult, cityName, country) {
        const data = weatherResult.data;
        const computed = weatherResult.computed;
        
        const sunrise = data.Sun?.Rise ? new Date(data.Sun.Rise).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';
        const sunset = data.Sun?.Set ? new Date(data.Sun.Set).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';
        
        document.getElementById('sunMoonInfo').innerHTML = `
            <h4>🌅 Sun & Moon</h4>
            <div class="row g-3">
                <div class="col-6">
                    <div class="detail-item">
                        <div class="detail-icon">🌅</div>
                        <div class="detail-label">Sunrise</div>
                        <div class="detail-value">${sunrise}</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="detail-item">
                        <div class="detail-icon">🌇</div>
                        <div class="detail-label">Sunset</div>
                        <div class="detail-value">${sunset}</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="detail-item">
                        <div class="detail-icon">☀️</div>
                        <div class="detail-label">UV Index</div>
                        <div class="detail-value" style="color: ${this.getUVColor(data.UVIndex || 0)}">${data.UVIndex || 0}</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="detail-item">
                        <div class="detail-icon">🌙</div>
                        <div class="detail-label">Moon Phase</div>
                        <div class="detail-value">Waxing</div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('airQualityDetails').innerHTML = `
            <h4>🏭 Air Quality Details</h4>
            <div class="aqi-large">
                <div class="aqi-number" style="color: ${computed.aqiInfo.color}">${computed.aqi}</div>
                <div class="aqi-category">${computed.aqiInfo.category}</div>
                <div class="aqi-desc">${computed.aqiInfo.description}</div>
            </div>
            <div class="mt-3">
                <small class="text-muted">Based on visibility and weather conditions</small>
            </div>
        `;
        
        document.getElementById('atmosphericInfo').innerHTML = `
            <h4>🌡️ Atmospheric Conditions</h4>
            <div class="row g-3">
                <div class="col-6">
                    <div class="detail-item">
                        <div class="detail-icon">🌡️</div>
                        <div class="detail-label">Pressure</div>
                        <div class="detail-value">${Math.round(data.Pressure.Metric.Value)} mb</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="detail-item">
                        <div class="detail-icon">💧</div>
                        <div class="detail-label">Humidity</div>
                        <div class="detail-value">${data.RelativeHumidity}%</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="detail-item">
                        <div class="detail-icon">👁️</div>
                        <div class="detail-label">Visibility</div>
                        <div class="detail-value">${data.Visibility.Metric.Value} km</div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="detail-item">
                        <div class="detail-icon">🌡️</div>
                        <div class="detail-label">Dew Point</div>
                        <div class="detail-value">${Math.round(data.DewPoint.Metric.Value)}°C</div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('weatherAlerts').innerHTML = `
            <h4>⚠️ Weather Alerts</h4>
            <div class="alert-item">
                <div class="alert-icon">✅</div>
                <div class="alert-text">No active weather alerts for ${cityName}</div>
            </div>
        `;
        
        if (computed.lifestyleTips && computed.lifestyleTips.length > 0) {
            document.getElementById('extendedTips').innerHTML = `
                <h4>💡 Extended Lifestyle Tips</h4>
                <div class="tips-grid">
                    ${computed.lifestyleTips.map(tip => `
                        <div class="tip-item">
                            <div class="tip-text">${tip}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        if (this.forecastData && this.forecastData.DailyForecasts) {
            const avgTemp = Math.round(
                this.forecastData.DailyForecasts.reduce((sum, day) => 
                    sum + (day.Temperature.Maximum.Value + day.Temperature.Minimum.Value) / 2, 0
                ) / this.forecastData.DailyForecasts.length
            );
            
            document.getElementById('weeklySummary').innerHTML = `
                <h4>📊 Weekly Summary</h4>
                <div class="summary-stats">
                    <div class="stat-item">
                        <div class="stat-label">Average Temperature</div>
                        <div class="stat-value">${avgTemp}°C</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Weather Pattern</div>
                        <div class="stat-value">${data.WeatherText}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Comfort Level</div>
                        <div class="stat-value" style="color: ${computed.comfortLevel.color}">${computed.comfortLevel.text}</div>
                    </div>
                </div>
            `;
        }
    }

    displayForecast() {
        if (!this.forecastData || !this.forecastData.DailyForecasts) return;

        const forecastGrid = this.forecastData.DailyForecasts.map((day, index) => {
            const date = new Date(day.Date);
            const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' });
            const minTemp = Math.round(day.Temperature.Minimum.Value);
            const maxTemp = Math.round(day.Temperature.Maximum.Value);
            const rainProb = day.Day.PrecipitationProbability || 0;

            return `
                <div class="forecast-card">
                    <div class="forecast-day">${dayName}</div>
                    <div class="forecast-icon">${day.computed.icon}</div>
                    <div class="forecast-temps">${maxTemp}° / ${minTemp}°</div>
                    <div class="forecast-condition">${day.Day.IconPhrase}</div>
                    <div class="forecast-rain">💧 ${rainProb}%</div>
                </div>
            `;
        }).join('');

        document.getElementById('forecastGrid').innerHTML = forecastGrid;
    }

    displayHourlyForecast() {
        if (!this.hourlyData) return;

        const hourlyItems = this.hourlyData.slice(0, 8).map((hour, index) => {
            const time = new Date(hour.DateTime);
            const timeStr = index === 0 ? 'Now' : time.toLocaleTimeString([], {hour: 'numeric'});
            const temp = Math.round(hour.Temperature.Value);
            const rainProb = hour.PrecipitationProbability;
            const humidity = hour.RelativeHumidity;

            return `
                <div class="hourly-item">
                    <div class="hourly-time">${timeStr}</div>
                    <div style="font-size: 1.5rem;">${hour.computed.icon}</div>
                    <div class="hourly-temp">${temp}°C</div>
                    <div class="hourly-condition">
                        ${hour.IconPhrase}
                        <div class="hourly-rain">Humidity: ${humidity}%</div>
                    </div>
                    <div class="hourly-rain">💧 ${rainProb}%</div>
                </div>
            `;
        }).join('');

        document.getElementById('hourlyForecast').innerHTML = hourlyItems;
    }

    renderCharts() {
        if (!this.forecastData || !this.hourlyData) return;
        this.renderTemperatureChart();
        this.renderHourlyChart();
    }

    renderTemperatureChart() {
        const ctx = document.getElementById('temperatureChart').getContext('2d');
        
        if (this.temperatureChart) {
            this.temperatureChart.destroy();
        }

        const dates = [];
        const minTemps = [];
        const maxTemps = [];

        this.forecastData.DailyForecasts.forEach((day, index) => {
            const date = new Date(day.Date);
            dates.push(index === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' }));
            minTemps.push(day.Temperature.Minimum.Value);
            maxTemps.push(day.Temperature.Maximum.Value);
        });

        this.temperatureChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Max Temperature',
                    data: maxTemps,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.4
                }, {
                    label: 'Min Temperature',
                    data: minTemps,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Temperature Trend',
                        color: 'white',
                        font: { size: 16 }
                    },
                    legend: {
                        labels: { color: 'white' }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.2)' }
                    },
                    y: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.2)' }
                    }
                }
            }
        });
    }

    renderHourlyChart() {
        const ctx = document.getElementById('hourlyChart').getContext('2d');
        
        if (this.hourlyChart) {
            this.hourlyChart.destroy();
        }

        const times = [];
        const temps = [];

        this.hourlyData.slice(0, 12).forEach(hour => {
            const time = new Date(hour.DateTime);
            times.push(time.toLocaleTimeString([], {hour: 'numeric'}));
            temps.push(hour.Temperature.Value);
        });

        this.hourlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: times,
                datasets: [{
                    label: 'Temperature',
                    data: temps,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Hourly Temperature',
                        color: 'white',
                        font: { size: 16 }
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.2)' }
                    },
                    y: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255,255,255,0.2)' }
                    }
                }
            }
        });
    }

    updateBackground(backgroundClass) {
        document.body.classList.remove('bg-sunny', 'bg-rainy', 'bg-cloudy', 'bg-snowy', 'bg-stormy', 'bg-foggy');
        document.body.classList.add(backgroundClass);
    }

    playWeatherSound(soundFile) {
        const soundToggle = document.getElementById('soundToggle');
        if (!soundToggle.checked) return;

        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        if (soundFile) {
            this.currentAudio = new Audio(soundFile);
            this.currentAudio.loop = true;
            this.currentAudio.volume = 0.3;
            this.currentAudio.play().catch(e => {
                console.log('Audio play failed:', e);
            });
        }
    }

    testSound(soundType) {
        const soundFiles = {
            'rain': 'sounds/rain.wav',
            'thunder': 'sounds/thunder.wav',
            'wind': 'sounds/wind.wav'
        };

        const soundFile = soundFiles[soundType];
        if (soundFile) {
            if (this.currentAudio) {
                this.currentAudio.pause();
            }
            
            this.currentAudio = new Audio(soundFile);
            this.currentAudio.volume = 0.3;
            this.currentAudio.play().catch(e => {
                console.log('Audio play failed:', e);
            });
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});
