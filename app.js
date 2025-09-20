// Weather App JavaScript - Enhanced Version
class WeatherApp {
    constructor() {
        this.API_BASE = 'http://localhost:5000/api';
        this.currentLocationKey = null;
        this.currentWeatherData = null;
        this.forecastData = null;
        this.hourlyData = null;
        this.temperatureChart = null;
        this.hourlyChart = null;
        this.currentAudio = null;
        this.currentCity = null;
        this.currentCountry = null;
        this.favoriteLocations = this.loadFavorites();
        this.isDarkMode = localStorage.getItem('darkMode') !== 'false';
        
        this.init();
    }

    init() {
        this.initializeTheme();
        this.bindEvents();
        this.displayFavorites();
        this.detectUserLocation();
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
            this.getUserLocationGPS();
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
                } else if (targetId === '#ai-insights' && this.currentLocationKey && this.currentWeatherData) {
                    setTimeout(() => this.loadAIInsights(), 100);
                }
            });
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('change', (e) => {
            this.toggleTheme();
        });

        // Favorite button
        document.getElementById('favoriteBtn').addEventListener('click', () => {
            this.toggleFavorite();
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

    showError(message) {
        this.hideLoading();
        const errorEl = document.getElementById('errorMessage');
        errorEl.textContent = message;
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
            const response = await fetch(`${this.API_BASE}/location/auto`);
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
            const response = await fetch(`${this.API_BASE}/location/auto`);
            const result = await response.json();
            
            if (result.success && result.data.city) {
                await this.searchWeather(result.data.city, result.data);
            } else {
                this.showError('Could not detect your location. Please search manually.');
            }
        } catch (error) {
            this.showError('Error detecting location: ' + error.message);
        }
    }

    async searchWeather(city, autoLocationData = null) {
        this.showLoading();
        
        try {
            const locationResponse = await fetch(`${this.API_BASE}/location/${encodeURIComponent(city)}`);
            const locationResult = await locationResponse.json();
            
            if (!locationResult.success) {
                if (autoLocationData && autoLocationData.lat && autoLocationData.lon) {
                    const coordResponse = await fetch(`${this.API_BASE}/location/coordinates/${autoLocationData.lat}/${autoLocationData.lon}`);
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
            this.showError('Error searching weather: ' + error.message);
        }
    }

    async loadWeatherData(cityName, country, autoLocationData = null) {
        try {
            const [currentResponse, forecastResponse, hourlyResponse] = await Promise.all([
                fetch(`${this.API_BASE}/weather/current/${this.currentLocationKey}`),
                fetch(`${this.API_BASE}/weather/forecast/${this.currentLocationKey}`),
                fetch(`${this.API_BASE}/weather/hourly/${this.currentLocationKey}`)
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
            this.showError('Error loading weather data: ' + error.message);
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
        
        let sunrise, sunset;
        if (data.Sun && data.Sun.Rise && data.Sun.Set) {
            sunrise = new Date(data.Sun.Rise).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            sunset = new Date(data.Sun.Set).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            // Provide approximate times as fallback
            const now = new Date();
            const approximateSunrise = new Date(now);
            const approximateSunset = new Date(now);
            
            approximateSunrise.setHours(6, 30, 0, 0);
            approximateSunset.setHours(18, 30, 0, 0);
            
            sunrise = approximateSunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            sunset = approximateSunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        
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
        
        // Get sunrise/sunset with fallback
        let sunrise = 'N/A';
        let sunset = 'N/A';
        
        if (data.Sun?.Rise && data.Sun?.Set) {
            sunrise = new Date(data.Sun.Rise).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            sunset = new Date(data.Sun.Set).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            // Provide approximate times as fallback
            const now = new Date();
            const approximateSunrise = new Date(now);
            const approximateSunset = new Date(now);
            
            // Set approximate sunrise (6:30 AM) and sunset (6:30 PM)
            approximateSunrise.setHours(6, 30, 0, 0);
            approximateSunset.setHours(18, 30, 0, 0);
            
            sunrise = approximateSunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            sunset = approximateSunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        
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

    // ADVANCED SOUND SYSTEM
    createAdvancedSound(weatherCondition) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const condition = weatherCondition.toLowerCase();
        
        if (condition.includes('rain')) {
            this.createRainSound();
        } else if (condition.includes('storm') || condition.includes('thunder')) {
            this.createThunderSound();
        } else if (condition.includes('wind')) {
            this.createWindSound();
        } else if (condition.includes('sunny') || condition.includes('clear')) {
            this.createAmbientSound();
        }
    }

    createRainSound() {
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.1 * Math.sin(i * 0.01);
        }

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        
        source.buffer = buffer;
        source.loop = true;
        gainNode.gain.value = 0.2;
        
        source.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        source.start();
        this.currentAudioSource = source;
    }

    testSound(soundType) {
        this.stopCurrentSound();
        
        if (soundType === 'rain') {
            this.createRainSound();
        } else if (soundType === 'thunder') {
            this.createThunderSound();
        } else if (soundType === 'wind') {
            this.createWindSound();
        }
    }

    stopCurrentSound() {
        if (this.currentAudioSource) {
            this.currentAudioSource.stop();
            this.currentAudioSource = null;
        }
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
    }

    // 1. Dark/Light Mode Toggle
    initializeTheme() {
        const themeToggle = document.getElementById('themeToggle');
        
        // Default to dark mode for better visual appeal
        if (localStorage.getItem('darkMode') === null) {
            this.isDarkMode = true;
            localStorage.setItem('darkMode', 'true');
        }
        
        if (this.isDarkMode) {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
            themeToggle.nextElementSibling.innerHTML = '🌙 Dark Mode';
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            themeToggle.checked = false;
            themeToggle.nextElementSibling.innerHTML = '☀️ Light Mode';
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        const themeToggle = document.getElementById('themeToggle');
        
        if (this.isDarkMode) {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
            themeToggle.nextElementSibling.innerHTML = '🌙 Dark Mode';
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
            themeToggle.nextElementSibling.innerHTML = '☀️ Light Mode';
        }
        
        localStorage.setItem('darkMode', this.isDarkMode);
    }

    // 2. GPS Location Detection
    async getUserLocationGPS() {
        this.showLoadingWithGPS();
        
        if (!navigator.geolocation) {
            this.fallbackToIPLocation();
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        };

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, options);
            });

            const { latitude, longitude } = position.coords;
            
            // Get location name from coordinates
            const response = await fetch(`${this.API_BASE}/location/coordinates/${latitude}/${longitude}`);
            const result = await response.json();
            
            if (result.success) {
                this.currentLocationKey = result.locationKey;
                await this.loadWeatherData(result.cityName, result.country, {
                    lat: latitude,
                    lon: longitude,
                    accuracy: position.coords.accuracy
                });
            } else {
                throw new Error('Location not found');
            }
        } catch (error) {
            console.log('GPS location failed:', error);
            this.fallbackToIPLocation();
        }
    }

    async fallbackToIPLocation() {
        try {
            const response = await fetch(`${this.API_BASE}/location/auto`);
            const result = await response.json();
            
            if (result.success && result.data.city) {
                await this.searchWeather(result.data.city, result.data);
            } else {
                this.showEnhancedError('Could not detect your location', 'Please search manually or check your location permissions.');
            }
        } catch (error) {
            this.showEnhancedError('Location Error', 'Unable to detect location. Please search manually.');
        }
    }

    showLoadingWithGPS() {
        document.getElementById('loadingSpinner').innerHTML = `
            <div class="gps-loading">
                <div class="gps-pulse"></div>
                <span>Getting your precise location...</span>
            </div>
            <div class="mt-2 text-light">Using GPS for accurate weather data</div>
        `;
        this.showLoading();
    }

    // 3. Favorite Locations
    loadFavorites() {
        const saved = localStorage.getItem('favoriteLocations');
        return saved ? JSON.parse(saved) : [];
    }

    saveFavorites() {
        localStorage.setItem('favoriteLocations', JSON.stringify(this.favoriteLocations));
    }

    toggleFavorite() {
        if (!this.currentCity || !this.currentCountry) return;

        const location = {
            city: this.currentCity,
            country: this.currentCountry,
            locationKey: this.currentLocationKey
        };

        const existingIndex = this.favoriteLocations.findIndex(
            fav => fav.city === location.city && fav.country === location.country
        );

        const favoriteBtn = document.getElementById('favoriteBtn');
        
        if (existingIndex > -1) {
            // Remove from favorites
            this.favoriteLocations.splice(existingIndex, 1);
            favoriteBtn.innerHTML = '<i class="bi bi-star"></i> Add to Favorites';
            favoriteBtn.classList.remove('favorited');
        } else {
            // Add to favorites
            this.favoriteLocations.push(location);
            favoriteBtn.innerHTML = '<i class="bi bi-star-fill"></i> Remove from Favorites';
            favoriteBtn.classList.add('favorited');
        }

        this.saveFavorites();
        this.displayFavorites();
    }

    displayFavorites() {
        const favoritesSection = document.getElementById('favoriteCitiesSection');
        const favoritesGrid = document.getElementById('favoriteCitiesGrid');

        if (this.favoriteLocations.length === 0) {
            favoritesSection.classList.add('d-none');
            return;
        }

        favoritesSection.classList.remove('d-none');
        
        favoritesGrid.innerHTML = this.favoriteLocations.map(location => `
            <div class="col-6 col-md-3">
                <button class="btn btn-outline-light w-100 city-btn favorite-city-btn" 
                        data-city="${location.city}" 
                        data-country="${location.country}"
                        data-location-key="${location.locationKey}">
                    ⭐ ${location.city}
                </button>
            </div>
        `).join('');

        // Add event listeners to favorite city buttons
        document.querySelectorAll('.favorite-city-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const city = btn.getAttribute('data-city');
                const country = btn.getAttribute('data-country');
                const locationKey = btn.getAttribute('data-location-key');
                
                this.currentLocationKey = locationKey;
                this.loadWeatherData(city, country);
            });
        });
    }

    updateFavoriteButton() {
        const favoriteBtn = document.getElementById('favoriteBtn');
        
        if (!this.currentCity || !this.currentCountry) {
            favoriteBtn.classList.add('d-none');
            return;
        }

        favoriteBtn.classList.remove('d-none');
        
        const isFavorited = this.favoriteLocations.some(
            fav => fav.city === this.currentCity && fav.country === this.currentCountry
        );

        if (isFavorited) {
            favoriteBtn.innerHTML = '<i class="bi bi-star-fill"></i> Remove from Favorites';
            favoriteBtn.classList.add('favorited');
        } else {
            favoriteBtn.innerHTML = '<i class="bi bi-star"></i> Add to Favorites';
            favoriteBtn.classList.remove('favorited');
        }
    }

    // 4. Enhanced Error Handling
    showEnhancedError(title, message, showRetry = true) {
        this.hideLoading();
        
        const errorEl = document.getElementById('errorMessage');
        errorEl.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <div class="error-title">${title}</div>
                <div class="error-message">${message}</div>
                ${showRetry ? `
                    <button class="retry-btn" onclick="location.reload()">
                        <i class="bi bi-arrow-clockwise"></i> Try Again
                    </button>
                ` : ''}
            </div>
        `;
        
        errorEl.classList.remove('d-none');
        document.getElementById('weatherContent').classList.add('d-none');
        document.getElementById('welcomeScreen').classList.add('d-none');
    }

    // 5. Enhanced Loading Animations
    showSkeletonLoading() {
        document.getElementById('weatherContent').innerHTML = `
            <div class="loading-card">
                <div class="loading-skeleton" style="width: 60%; height: 30px; margin-bottom: 2rem;"></div>
                <div class="loading-skeleton" style="width: 100%; height: 200px; margin-bottom: 2rem;"></div>
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="loading-skeleton" style="height: 120px;"></div>
                    </div>
                    <div class="col-md-4">
                        <div class="loading-skeleton" style="height: 120px;"></div>
                    </div>
                    <div class="col-md-4">
                        <div class="loading-skeleton" style="height: 120px;"></div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('weatherContent').classList.remove('d-none');
        document.getElementById('welcomeScreen').classList.add('d-none');
        document.getElementById('errorMessage').classList.add('d-none');
    }

    // Updated methods to use new features
    displayLocationInfo(cityName, country, autoLocationData) {
        this.currentCity = cityName;
        this.currentCountry = country;
        
        let locationDisplay = `${cityName}, ${country}`;
        let locationNote = '';
        
        if (autoLocationData) {
            locationDisplay += ' 📍';
            if (autoLocationData.accuracy) {
                locationDisplay += ` (±${Math.round(autoLocationData.accuracy)}m)`;
            }
            if (autoLocationData.timezone) {
                locationDisplay += ` | ${autoLocationData.timezone}`;
            }
            locationNote = '<div class="location-note">Detected using GPS</div>';
        }

        document.querySelector('#locationInfo .location-text').innerHTML = `
            <div class="location-name">${locationDisplay}</div>
            ${locationNote}
        `;
        
        this.updateFavoriteButton();
    }

    // Override showError to use enhanced error handling
    showError(message) {
        if (message.includes('City not found')) {
            this.showEnhancedError('City Not Found', 'Please check the spelling and try again, or use a different city name.');
        } else if (message.includes('location')) {
            this.showEnhancedError('Location Error', message);
        } else if (message.includes('network') || message.includes('fetch')) {
            this.showEnhancedError('Network Error', 'Please check your internet connection and try again.');
        } else {
            this.showEnhancedError('Weather Service Error', message);
        }
    }

    // AI-POWERED WEATHER INTELLIGENCE
    async loadAIInsights() {
        if (!this.currentLocationKey || !this.currentWeatherData) return;

        this.showAILoading();

        try {
            const locationName = `${this.currentCity}, ${this.currentCountry}`;
            const response = await fetch(
                `${this.API_BASE}/ai/weather-insights/${this.currentLocationKey}?location=${encodeURIComponent(locationName)}`
            );
            const result = await response.json();

            if (result.success) {
                this.displayAIInsights(result.ai_insights, result.weather_story, result.generated_at);
            } else {
                this.showAIError('AI analysis temporarily unavailable. Please try again later.');
            }
        } catch (error) {
            console.error('AI insights error:', error);
            this.showAIError('Unable to load AI insights. Please check your connection.');
        }
    }

    showAILoading() {
        document.querySelector('.ai-loading').classList.remove('d-none');
        document.getElementById('aiInsightsContent').style.opacity = '0.3';
    }

    hideAILoading() {
        document.querySelector('.ai-loading').classList.add('d-none');
        document.getElementById('aiInsightsContent').style.opacity = '1';
    }

    displayAIInsights(insights, weatherStory, timestamp) {
        this.hideAILoading();

        // Display weather story
        document.getElementById('weatherStory').innerHTML = `
            <h3 style="color: #8A2BE2; margin-bottom: 1.5rem;">🌟 Weather Story</h3>
            <p style="font-size: 1.2rem; line-height: 1.6; font-style: italic;">${weatherStory}</p>
        `;

        // Display pattern analysis
        document.getElementById('patternAnalysis').innerHTML = `
            <h4>📊 Pattern Analysis</h4>
            <p>${insights.weather_pattern_analysis}</p>
        `;

        // Display predictive insights
        document.getElementById('predictiveInsights').innerHTML = `
            <h4>🔮 Predictive Insights</h4>
            <p>${insights.predictive_insights}</p>
        `;

        // Display personalized recommendations
        const recommendations = Array.isArray(insights.personalized_recommendations) 
            ? insights.personalized_recommendations 
            : [insights.personalized_recommendations];

        document.getElementById('personalizedRecommendations').innerHTML = `
            <h4>💡 Personal Recommendations</h4>
            ${recommendations.map(rec => `
                <div class="ai-recommendation-item">${rec}</div>
            `).join('')}
        `;

        // Display health and comfort
        document.getElementById('healthComfort').innerHTML = `
            <h4>🏥 Health & Comfort</h4>
            <p>${insights.health_and_comfort}</p>
        `;

        // Display smart tips
        const smartTips = Array.isArray(insights.smart_tips) 
            ? insights.smart_tips 
            : [insights.smart_tips];

        document.getElementById('smartTips').innerHTML = `
            <h4>🎯 Smart Tips</h4>
            ${smartTips.map(tip => `
                <div class="ai-tip-item">
                    <div class="ai-tip-icon">💡</div>
                    <div>${tip}</div>
                </div>
            `).join('')}
        `;

        // Display risk assessment
        const riskLevel = this.assessRiskLevel(insights.risk_assessment);
        document.getElementById('riskAssessment').innerHTML = `
            <h4>⚠️ Risk Assessment</h4>
            <div class="ai-risk-item ${riskLevel.class}">
                <strong>${riskLevel.icon} ${riskLevel.level}</strong><br>
                ${insights.risk_assessment}
            </div>
        `;

        // Update timestamp
        const formattedTime = new Date(timestamp).toLocaleString();
        document.getElementById('aiTimestamp').textContent = formattedTime;
    }

    assessRiskLevel(riskText) {
        const text = riskText.toLowerCase();
        if (text.includes('high') || text.includes('severe') || text.includes('danger')) {
            return { level: 'High Risk', class: 'high-risk', icon: '🚨' };
        } else if (text.includes('moderate') || text.includes('caution')) {
            return { level: 'Moderate Risk', class: 'moderate-risk', icon: '⚠️' };
        } else {
            return { level: 'Low Risk', class: 'low-risk', icon: '✅' };
        }
    }

    showAIError(message) {
        this.hideAILoading();
        document.getElementById('aiInsightsContent').innerHTML = `
            <div class="ai-error text-center">
                <div class="error-icon" style="font-size: 3rem; margin-bottom: 1rem;">🤖💔</div>
                <h4>AI Analysis Unavailable</h4>
                <p>${message}</p>
                <button class="btn btn-outline-light mt-3" onclick="window.weatherApp.loadAIInsights()">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});
