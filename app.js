// Weather App JavaScript - Enhanced Version
class WeatherApp {
    constructor() {
        // Open-Meteo API endpoints (free, no API key required, CORS enabled)
        this.GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
        this.WEATHER_URL = 'https://api.open-meteo.com/v1/forecast';
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
        this.initializeMobileOptimizations();
    }

    // ========== WEATHER DATA HELPER FUNCTIONS ==========
    // Ported from backend.py to run client-side

    wmoCodeToText(code) {
        const wmoMap = {
            0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
            45: "Foggy", 48: "Depositing rime fog",
            51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
            56: "Light freezing drizzle", 57: "Dense freezing drizzle",
            61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
            66: "Light freezing rain", 67: "Heavy freezing rain",
            71: "Slight snowfall", 73: "Moderate snowfall", 75: "Heavy snowfall", 77: "Snow grains",
            80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
            85: "Slight snow showers", 86: "Heavy snow showers",
            95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
        };
        return wmoMap[code] || "Clear sky";
    }

    windDegreeToDirection(degrees) {
        const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                           "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        const idx = Math.round(degrees / 22.5) % 16;
        return directions[idx];
    }

    getWeatherBackground(condition) {
        const cl = condition.toLowerCase();
        if (['sunny', 'clear', 'bright'].some(w => cl.includes(w))) return "bg-sunny";
        if (['rain', 'shower', 'drizzle'].some(w => cl.includes(w))) return "bg-rainy";
        if (['cloud', 'overcast'].some(w => cl.includes(w))) return "bg-cloudy";
        if (['snow', 'blizzard'].some(w => cl.includes(w))) return "bg-snowy";
        if (['storm', 'thunder'].some(w => cl.includes(w))) return "bg-stormy";
        if (['fog', 'mist', 'haze'].some(w => cl.includes(w))) return "bg-foggy";
        return "bg-sunny";
    }

    getWeatherIconEmoji(condition) {
        const cl = condition.toLowerCase();
        if (['sunny', 'clear', 'bright'].some(w => cl.includes(w))) return "\u2600\uFE0F";
        if (['partly cloudy', 'partly sunny'].some(w => cl.includes(w))) return "\u26C5";
        if (['cloudy', 'overcast'].some(w => cl.includes(w))) return "\u2601\uFE0F";
        if (['rain', 'shower', 'drizzle'].some(w => cl.includes(w))) return "\uD83C\uDF27\uFE0F";
        if (['storm', 'thunder'].some(w => cl.includes(w))) return "\u26C8\uFE0F";
        if (['snow', 'blizzard'].some(w => cl.includes(w))) return "\u2744\uFE0F";
        if (['fog', 'mist', 'haze'].some(w => cl.includes(w))) return "\uD83C\uDF2B\uFE0F";
        if (cl.includes('wind')) return "\uD83D\uDCA8";
        return "\uD83C\uDF24\uFE0F";
    }

    getWeatherSoundFile(condition) {
        const cl = condition.toLowerCase();
        if (['rain', 'shower', 'drizzle'].some(w => cl.includes(w))) return "sounds/rain.wav";
        if (['storm', 'thunder'].some(w => cl.includes(w))) return "sounds/thunder.wav";
        if (cl.includes('wind')) return "sounds/wind.wav";
        return null;
    }

    getComfortLevel(temp, humidity, windSpeed) {
        if (temp > 27 && humidity > 40) {
            const heatIndex = temp + (humidity * 0.1);
            if (heatIndex > 35) return { text: "\uD83D\uDD25 Very Hot", color: "#ff4444" };
            if (heatIndex > 30) return { text: "\uD83C\uDF21\uFE0F Hot", color: "#ff8800" };
        }
        if (temp < 10 && windSpeed > 15) {
            const windChill = temp - (windSpeed * 0.2);
            if (windChill < 0) return { text: "\uD83E\uDDCA Very Cold", color: "#4488ff" };
            if (windChill < 5) return { text: "\u2744\uFE0F Cold", color: "#66aaff" };
        }
        if (temp >= 18 && temp <= 24 && humidity >= 30 && humidity <= 60) return { text: "\uD83D\uDE0A Perfect", color: "#00dd44" };
        if (temp >= 15 && temp <= 27 && humidity >= 25 && humidity <= 70) return { text: "\uD83D\uDC4D Comfortable", color: "#88dd00" };
        if (temp > 30) return { text: "\uD83D\uDD25 Hot", color: "#ff6600" };
        if (temp < 5) return { text: "\uD83E\uDDCA Cold", color: "#4488ff" };
        return { text: "\uD83D\uDE10 Moderate", color: "#ffaa00" };
    }

    getActivityRecommendations(weatherData) {
        const temp = weatherData?.Temperature?.Metric?.Value ?? 20;
        const condition = (weatherData?.WeatherText || '').toLowerCase();
        const uvIndex = weatherData?.UVIndex || 0;
        const windSpeed = weatherData?.Wind?.Speed?.Metric?.Value || 0;
        const activities = [];

        if (['sunny', 'clear'].some(w => condition.includes(w)) && temp >= 20 && temp <= 28) {
            activities.push("\uD83C\uDFC3\u200D\u2642\uFE0F Perfect for outdoor running",
                "\uD83D\uDEB4\u200D\u2640\uFE0F Great cycling weather",
                "\uD83C\uDFD6\uFE0F Beach day recommended",
                "\uD83E\uDDFA Ideal for picnics");
        } else if (['rain', 'shower'].some(w => condition.includes(w))) {
            activities.push("\u2615 Perfect for indoor cafes",
                "\uD83C\uDFAC Great movie weather",
                "\uD83D\uDCDA Reading by the window",
                "\uD83C\uDFE0 Cozy indoor activities");
        } else if (temp > 30) {
            activities.push("\uD83C\uDFCA\u200D\u2642\uFE0F Swimming recommended",
                "\uD83C\uDF33 Seek shaded areas",
                "\uD83D\uDCA7 Stay hydrated",
                "\uD83C\uDFE0 Indoor activities preferred");
        } else if (temp < 10) {
            activities.push("\uD83E\uDDE5 Bundle up for walks",
                "\u2615 Hot drinks recommended",
                "\uD83C\uDFE0 Indoor workouts",
                "\uD83D\uDD25 Cozy fireplace time");
        }
        if (uvIndex > 6) activities.push("\uD83E\uDDF4 Don't forget sunscreen");
        if (windSpeed > 20) activities.push("\uD83E\uDE81 Great for kite flying");
        return activities.slice(0, 4);
    }

    getLifestyleTips(weatherData) {
        const tips = [];
        const temp = weatherData?.Temperature?.Metric?.Value ?? 20;
        const condition = (weatherData?.WeatherText || '').toLowerCase();
        const humidity = weatherData?.RelativeHumidity ?? 50;
        const uvIndex = weatherData?.UVIndex ?? 0;
        const windSpeed = weatherData?.Wind?.Speed?.Metric?.Value ?? 0;

        if (temp > 30) {
            tips.push("\uD83C\uDF21\uFE0F Stay hydrated and wear light, breathable clothing");
            tips.push("\uD83C\uDFE0 Avoid prolonged sun exposure during peak hours (10 AM - 4 PM)");
        } else if (temp < 5) {
            tips.push("\uD83E\uDDE5 Dress in layers and protect exposed skin");
            tips.push("\u2744\uFE0F Be cautious of icy conditions when walking or driving");
        } else if (temp < 15) {
            tips.push("\uD83E\uDDE5 Consider wearing a jacket or sweater");
        }
        if (['rain', 'shower', 'drizzle'].some(w => condition.includes(w))) {
            tips.push("\u2614 Carry an umbrella and wear waterproof clothing");
            tips.push("\uD83D\uDE97 Drive carefully - roads may be slippery");
        } else if (['snow', 'blizzard'].some(w => condition.includes(w))) {
            tips.push("\u2744\uFE0F Wear warm, waterproof boots with good traction");
            tips.push("\uD83D\uDE97 Allow extra time for travel and keep emergency supplies in car");
        } else if (['fog', 'mist'].some(w => condition.includes(w))) {
            tips.push("\uD83C\uDF2B\uFE0F Use headlights when driving and reduce speed");
            tips.push("\uD83D\uDC40 Be extra cautious when walking or cycling");
        }
        if (uvIndex >= 8) {
            tips.push("\u2600\uFE0F Use SPF 30+ sunscreen and wear protective clothing");
            tips.push("\uD83D\uDD76\uFE0F Wear sunglasses and seek shade when possible");
        } else if (uvIndex >= 6) {
            tips.push("\u2600\uFE0F Apply sunscreen and consider wearing a hat");
        }
        if (humidity > 80) tips.push("\uD83D\uDCA7 High humidity - stay cool and drink plenty of water");
        else if (humidity < 30) tips.push("\uD83C\uDFDC\uFE0F Low humidity - use moisturizer and stay hydrated");
        if (windSpeed > 25) tips.push("\uD83D\uDCA8 Strong winds - secure loose objects and be cautious outdoors");
        return tips.slice(0, 6);
    }

    getAqiInfo(aqi) {
        if (aqi == null) return { category: "N/A", color: "#999", description: "No data available" };
        if (aqi <= 50) return { category: "Good", color: "#00e400", description: "Air quality is satisfactory" };
        if (aqi <= 100) return { category: "Moderate", color: "#ffff00", description: "Air quality is acceptable" };
        if (aqi <= 150) return { category: "Unhealthy for Sensitive Groups", color: "#ff7e00", description: "Sensitive people should limit outdoor activities" };
        if (aqi <= 200) return { category: "Unhealthy", color: "#ff0000", description: "Everyone should limit outdoor activities" };
        if (aqi <= 300) return { category: "Very Unhealthy", color: "#8f3f97", description: "Avoid outdoor activities" };
        return { category: "Hazardous", color: "#7e0023", description: "Stay indoors" };
    }

    generateFallbackInsights(tempC, condition, humidity, windSpeed, locationName) {
        let tempAnalysis, clothing, comfort;
        if (tempC < 0) {
            tempAnalysis = "Freezing conditions with potential for ice formation";
            clothing = "Heavy winter coat, thermal layers, waterproof boots, gloves and hat";
            comfort = "Extreme cold can cause frostbite. Limit outdoor exposure and stay hydrated.";
        } else if (tempC < 10) {
            tempAnalysis = "Cold weather requiring warm clothing and precautions";
            clothing = "Warm jacket, long pants, closed shoes, light gloves";
            comfort = "Cool temperatures may affect circulation. Warm up gradually when coming indoors.";
        } else if (tempC < 20) {
            tempAnalysis = "Mild conditions suitable for most outdoor activities";
            clothing = "Light jacket or sweater, comfortable layers";
            comfort = "Pleasant conditions for most people. Good for outdoor exercise.";
        } else if (tempC < 30) {
            tempAnalysis = "Warm and comfortable weather ideal for outdoor activities";
            clothing = "Light, breathable clothing, sun protection recommended";
            comfort = "Excellent conditions for outdoor activities. Stay hydrated in direct sunlight.";
        } else {
            tempAnalysis = "Hot weather requiring heat precautions and sun protection";
            clothing = "Lightweight, loose-fitting, light-colored clothing, wide-brimmed hat";
            comfort = "High temperatures can cause heat exhaustion. Seek shade, drink plenty of water.";
        }

        const cl = condition.toLowerCase();
        let activityRec, risk;
        if (cl.includes('rain') || cl.includes('shower')) {
            activityRec = "Indoor activities recommended. If going out, bring waterproof gear.";
            risk = "Wet surfaces may be slippery. Reduced visibility while driving.";
        } else if (cl.includes('snow')) {
            activityRec = "Winter sports opportunities. Exercise caution on icy surfaces.";
            risk = "Icy conditions possible. Allow extra travel time and drive carefully.";
        } else if (cl.includes('wind') || windSpeed > 25) {
            activityRec = "Avoid outdoor activities with loose objects. Good for kite flying in safe areas.";
            risk = "Strong winds may affect driving and outdoor activities. Secure loose items.";
        } else if (cl.includes('clear') || cl.includes('sunny')) {
            activityRec = "Perfect for outdoor activities, hiking, sports, and photography.";
            risk = "UV exposure risk. Use sunscreen and protective clothing during peak hours.";
        } else {
            activityRec = "Generally suitable for planned outdoor activities.";
            risk = "Standard weather precautions apply.";
        }

        const humidityNote = humidity > 70 ? 'may feel muggy' : humidity > 30 ? 'provides comfortable conditions' : 'may feel dry';
        const exerciseNote = (tempC >= 15 && tempC <= 25) ? 'Excellent' : 'Challenging';

        return {
            weather_pattern_analysis: `Current conditions in ${locationName} show ${tempAnalysis.toLowerCase()}. ${condition} weather with ${humidity}% humidity and ${windSpeed} km/h winds. Atmospheric pressure and temperature patterns suggest stable conditions for the immediate period.`,
            personalized_recommendations: [
                `Clothing: ${clothing}`,
                `Activities: ${activityRec}`,
                "Stay informed about weather changes through reliable sources",
                "Plan indoor alternatives for outdoor activities if conditions worsen"
            ],
            predictive_insights: `Based on current ${condition.toLowerCase()} conditions and ${tempC}\u00B0C temperature, expect similar weather patterns to continue for the next few hours. Monitor local forecasts for any developing weather systems that might affect ${locationName}.`,
            health_and_comfort: `${comfort} Current humidity of ${humidity}% ${humidityNote}. ${exerciseNote} conditions for outdoor exercise.`,
            smart_tips: [
                `Energy tip: ${tempC < 15 ? 'Use heating efficiently' : tempC > 25 ? 'Consider natural cooling' : 'Optimal temperature for energy savings'}`,
                `Transportation: ${cl.includes('rain') || cl.includes('snow') ? 'Allow extra travel time' : 'Normal travel conditions expected'}`,
                `Photography: ${cl.includes('clear') ? 'Great lighting for outdoor photography' : 'Consider indoor or creative weather photography'}`,
                `Sleep: ${tempC < 22 ? 'Cool, comfortable sleeping weather' : 'May need cooling for comfortable sleep'}`
            ],
            risk_assessment: `${risk} Temperature of ${tempC}\u00B0C ${tempC < 5 ? 'poses cold exposure risks' : tempC > 32 ? 'poses heat risks' : 'is within comfortable range'}. UV precautions ${cl.includes('sunny') ? 'strongly recommended' : 'standard'} during daylight hours. Overall risk level: ${tempC < 0 || tempC > 35 || windSpeed > 30 ? 'High' : 'Low to Moderate'}.`
        };
    }

    generateFallbackStory(tempC, condition, locationName) {
        const cl = condition.toLowerCase();
        if (cl.includes('sunny') || cl.includes('clear'))
            return `Golden sunlight bathes ${locationName} in warmth at ${tempC}\u00B0C, as nature awakens to a perfect day filled with endless possibilities.`;
        if (cl.includes('rain'))
            return `Gentle raindrops dance across ${locationName}, creating a symphony of renewal while the air cools to a refreshing ${tempC}\u00B0C.`;
        if (cl.includes('cloud'))
            return `Soft clouds drift lazily over ${locationName}, painting the sky in shades of silver while maintaining a comfortable ${tempC}\u00B0C embrace.`;
        if (cl.includes('snow'))
            return `Delicate snowflakes transform ${locationName} into a winter wonderland, each crystal telling stories of the crisp ${tempC}\u00B0C air.`;
        if (cl.includes('wind'))
            return `Spirited winds sweep through ${locationName}, carrying whispers of distant places while the temperature holds steady at ${tempC}\u00B0C.`;
        return `The atmosphere in ${locationName} weaves its own unique tale today, with nature's canvas painted at a perfect ${tempC}\u00B0C.`;
    }

    // ========== END HELPER FUNCTIONS ==========

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
            await new Promise(resolve => setTimeout(resolve, 1000));
            const locationData = await this.getIPLocation();
            if (locationData && locationData.city) {
                this.displayDetectedLocation(locationData);
            } else {
                console.log('Location detection returned no data');
            }
        } catch (error) {
            console.log('Auto-location detection failed:', error);
        }
    }

    async getIPLocation() {
        const services = [
            {
                url: 'https://ipapi.co/json/',
                parse: (data) => ({
                    city: data.city || '', region: data.region || '',
                    country: data.country_name || '',
                    lat: data.latitude || 0, lon: data.longitude || 0,
                    timezone: data.timezone || '', ip: data.ip || ''
                })
            },
            {
                url: 'https://ipinfo.io/json',
                parse: (data) => {
                    const [lat, lon] = (data.loc || '0,0').split(',').map(Number);
                    return {
                        city: data.city || '', region: data.region || '',
                        country: data.country || '',
                        lat, lon,
                        timezone: data.timezone || '', ip: data.ip || ''
                    };
                }
            }
        ];
        for (const service of services) {
            try {
                const resp = await fetch(service.url, { signal: AbortSignal.timeout(8000) });
                if (resp.ok) {
                    const data = await resp.json();
                    const parsed = service.parse(data);
                    if (parsed.city) return parsed;
                }
            } catch (e) {
                console.warn(`IP geo service failed: ${service.url}`, e.message);
            }
        }
        return null;
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
            const locationData = await this.getIPLocation();
            if (locationData && locationData.city) {
                await this.searchWeather(locationData.city, locationData);
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
            // Use Open-Meteo Geocoding API directly
            const geoResp = await this.fetchWithRetry(
                `${this.GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
            );
            const geoData = await geoResp.json();

            if (geoData.results && geoData.results.length > 0) {
                const result = geoData.results[0];
                this.currentLocationKey = `${result.latitude},${result.longitude}`;
                await this.loadWeatherData(result.name || city, result.country || '', autoLocationData);
            } else if (autoLocationData && autoLocationData.lat && autoLocationData.lon) {
                // Fallback to coordinates from auto-location
                this.currentLocationKey = `${autoLocationData.lat},${autoLocationData.lon}`;
                await this.loadWeatherData(autoLocationData.city || city, autoLocationData.country || '', autoLocationData);
            } else {
                this.showError('City not found. Please try a different name.');
            }
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
            const [lat, lon] = this.currentLocationKey.split(',');

            // Fetch all weather data from Open-Meteo in parallel
            const [currentResp, forecastResp, hourlyResp] = await Promise.all([
                this.fetchWithRetry(
                    `${this.WEATHER_URL}?latitude=${lat}&longitude=${lon}` +
                    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
                    `&hourly=uv_index,dew_point_2m,visibility&daily=sunrise,sunset,uv_index_max&timezone=auto&forecast_days=1`
                ),
                this.fetchWithRetry(
                    `${this.WEATHER_URL}?latitude=${lat}&longitude=${lon}` +
                    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max,wind_speed_10m_max` +
                    `&timezone=auto&forecast_days=5`
                ),
                this.fetchWithRetry(
                    `${this.WEATHER_URL}?latitude=${lat}&longitude=${lon}` +
                    `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code,visibility,wind_speed_10m,wind_direction_10m,uv_index,is_day` +
                    `&timezone=auto&forecast_days=1`
                )
            ]);

            const [currentData, forecastData, hourlyData] = await Promise.all([
                currentResp.json(), forecastResp.json(), hourlyResp.json()
            ]);

            // Transform current weather
            const currentResult = this.transformCurrentWeather(currentData);
            if (!currentResult) {
                this.showError('Error loading current weather data.');
                return;
            }

            // Transform forecast
            const forecastResult = this.transformForecast(forecastData);

            // Transform hourly
            const hourlyResult = this.transformHourly(hourlyData);

            this.currentWeatherData = currentResult;
            this.forecastData = forecastResult;
            this.hourlyData = hourlyResult;

            this.updateBackground(currentResult.computed.weatherBackground);
            this.displayLocationInfo(cityName, country, autoLocationData);
            this.displayCurrentWeather(currentResult);
            this.displayForecast();
            this.displayHourlyForecast();
            this.displayDetailedInfo(currentResult, cityName, country);

            this.showWeatherContent();

        } catch (error) {
            console.error('Weather load error:', error);
            this.showError(
                'Please check your internet connection and try again.',
                true,
                () => this.loadWeatherData(cityName, country, autoLocationData)
            );
        }
    }

    transformCurrentWeather(data) {
        if (!data || !data.current) return null;

        const current = data.current;
        const hourly = data.hourly || {};
        const daily = data.daily || {};

        const nowHour = new Date().getHours();
        let uvIndex = 0, dewPoint = 0, visibilityM = 10000;
        if (hourly.uv_index && hourly.uv_index.length > nowHour) uvIndex = hourly.uv_index[nowHour] || 0;
        if (hourly.dew_point_2m && hourly.dew_point_2m.length > nowHour) dewPoint = hourly.dew_point_2m[nowHour] || 0;
        if (hourly.visibility && hourly.visibility.length > nowHour) visibilityM = hourly.visibility[nowHour] || 10000;

        const visibilityKm = Math.round(visibilityM / 1000 * 10) / 10;
        const condition = this.wmoCodeToText(current.weather_code || 0);
        const tempC = current.temperature_2m || 0;
        const humidity = current.relative_humidity_2m || 0;
        const windSpeed = current.wind_speed_10m || 0;
        const windDir = current.wind_direction_10m || 0;
        const pressure = current.pressure_msl || 1013;
        const feelsLike = current.apparent_temperature || tempC;
        const sunrise = daily.sunrise ? daily.sunrise[0] : null;
        const sunset = daily.sunset ? daily.sunset[0] : null;

        const weatherData = {
            WeatherText: condition,
            Temperature: { Metric: { Value: tempC, Unit: 'C' } },
            RealFeelTemperature: { Metric: { Value: feelsLike, Unit: 'C' } },
            RelativeHumidity: humidity,
            Wind: {
                Speed: { Metric: { Value: windSpeed, Unit: 'km/h' } },
                Direction: { Localized: this.windDegreeToDirection(windDir) }
            },
            Visibility: { Metric: { Value: visibilityKm, Unit: 'km' } },
            Pressure: { Metric: { Value: pressure, Unit: 'mb' } },
            UVIndex: Math.round(uvIndex),
            DewPoint: { Metric: { Value: dewPoint, Unit: 'C' } }
        };
        if (sunrise && sunset) weatherData.Sun = { Rise: sunrise, Set: sunset };

        const comfortLevel = this.getComfortLevel(tempC, humidity, windSpeed);
        const activities = this.getActivityRecommendations(weatherData);
        const lifestyleTips = this.getLifestyleTips(weatherData);
        const weatherIcon = this.getWeatherIconEmoji(condition);
        const weatherBg = this.getWeatherBackground(condition);
        const weatherSound = this.getWeatherSoundFile(condition);

        // Simulate AQI based on visibility
        let aqi;
        if (visibilityKm >= 10) aqi = 25;
        else if (visibilityKm >= 7) aqi = 55;
        else if (visibilityKm >= 5) aqi = 85;
        else aqi = 125;
        if (['fog', 'haze', 'smoke'].some(w => condition.toLowerCase().includes(w))) aqi += 30;
        else if (['rain', 'shower'].some(w => condition.toLowerCase().includes(w))) aqi -= 15;
        aqi = Math.max(0, Math.min(300, aqi));
        const aqiInfo = this.getAqiInfo(aqi);

        return {
            success: true,
            data: weatherData,
            computed: {
                comfortLevel, activities, lifestyleTips,
                weatherIcon, weatherBackground: weatherBg,
                weatherSound, aqi, aqiInfo
            }
        };
    }

    transformForecast(data) {
        if (!data || !data.daily) return null;
        const daily = data.daily;
        const forecasts = [];
        for (let i = 0; i < (daily.time || []).length; i++) {
            const condition = this.wmoCodeToText(daily.weather_code[i]);
            forecasts.push({
                Date: daily.time[i],
                Temperature: {
                    Minimum: { Value: daily.temperature_2m_min[i], Unit: 'C' },
                    Maximum: { Value: daily.temperature_2m_max[i], Unit: 'C' }
                },
                Day: {
                    IconPhrase: condition,
                    PrecipitationProbability: daily.precipitation_probability_max ? (daily.precipitation_probability_max[i] || 0) : 0
                },
                computed: { icon: this.getWeatherIconEmoji(condition) }
            });
        }
        return { DailyForecasts: forecasts };
    }

    transformHourly(data) {
        if (!data || !data.hourly) return null;
        const hourly = data.hourly;
        const result = [];
        const nowHour = new Date().getHours();
        const total = (hourly.time || []).length;
        for (let i = nowHour; i < Math.min(nowHour + 12, total); i++) {
            const condition = this.wmoCodeToText(hourly.weather_code[i]);
            result.push({
                DateTime: hourly.time[i],
                Temperature: { Value: hourly.temperature_2m[i], Unit: 'C' },
                IconPhrase: condition,
                PrecipitationProbability: hourly.precipitation_probability ? (hourly.precipitation_probability[i] || 0) : 0,
                RelativeHumidity: hourly.relative_humidity_2m ? hourly.relative_humidity_2m[i] : 0,
                computed: { icon: this.getWeatherIconEmoji(condition) }
            });
        }
        return result;
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
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 600000
        };

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, options);
            });

            const { latitude, longitude } = position.coords;
            this.currentLocationKey = `${latitude},${longitude}`;

            // Reverse geocode using Open-Meteo geocoding (find nearest city)
            let cityName = 'Your Location';
            let country = '';
            try {
                const geoResp = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`,
                    { headers: { 'User-Agent': 'WEATHER-APP (https://github.com/Tranquil666/WEATHER-APP)' } }
                );
                if (geoResp.ok) {
                    const geoData = await geoResp.json();
                    const addr = geoData.address || {};
                    cityName = addr.city || addr.town || addr.village || addr.municipality || 'Your Location';
                    country = addr.country || '';
                }
            } catch (e) {
                console.error('Reverse geocoding failed:', e);
            }

            await this.loadWeatherData(cityName, country, {
                lat: latitude,
                lon: longitude,
                accuracy: position.coords.accuracy
            });
        } catch (error) {
            console.log('GPS location failed:', error);
            this.fallbackToIPLocation();
        }
    }

    async fallbackToIPLocation() {
        try {
            const locationData = await this.getIPLocation();
            if (locationData && locationData.city) {
                await this.searchWeather(locationData.city, locationData);
            } else {
                this.showLocationError();
            }
        } catch (error) {
            console.log('IP location failed:', error);
            this.showLocationError();
        }
    }

    showLocationError() {
        this.hideLoading();
        const errorEl = document.getElementById('errorMessage');
        errorEl.innerHTML = `
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <div class="error-title">Location Error</div>
                <div class="error-message">Unable to detect location. Please search manually.</div>
                <div class="error-suggestions mt-3">
                    <div class="mb-2"><strong>Try these options:</strong></div>
                    <div>• Search for your city in the search box above</div>
                    <div>• Click on one of the popular cities</div>
                    <div>• Enable location permissions and try again</div>
                </div>
                <button class="retry-btn mt-3" onclick="document.getElementById('cityInput').focus()">
                    <i class="bi bi-search"></i> Search Manually
                </button>
            </div>
        `;
        
        errorEl.classList.remove('d-none');
        document.getElementById('weatherContent').classList.add('d-none');
        document.getElementById('welcomeScreen').classList.add('d-none');
        
        // Focus on search input after a short delay
        setTimeout(() => {
            document.getElementById('cityInput').focus();
        }, 500);
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
            const data = this.currentWeatherData.data;
            const tempC = data.Temperature.Metric.Value;
            const condition = data.WeatherText;
            const humidity = data.RelativeHumidity;
            const windSpeed = data.Wind.Speed.Metric.Value;

            // Generate insights locally (no backend/AI API needed)
            const insights = this.generateFallbackInsights(tempC, condition, humidity, windSpeed, locationName);
            const story = this.generateFallbackStory(tempC, condition, locationName);

            this.displayAIInsights(insights, story, new Date().toISOString());
        } catch (error) {
            console.error('AI insights error:', error);
            this.showAIError('Unable to generate weather insights.');
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

    // MOBILE OPTIMIZATIONS
    initializeMobileOptimizations() {
        this.detectMobileDevice();
        this.setupTouchInteractions();
        this.optimizeForMobile();
        this.handleOrientationChange();
        this.preventZoomOnInputFocus();
    }

    detectMobileDevice() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isTablet = /iPad|Android(?=.*Tablet)|(?=.*\bAndroid\b)(?=.*\b(?:7|10)\.\d+)/i.test(navigator.userAgent);
        this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
        }
        if (this.isTablet) {
            document.body.classList.add('tablet-device');
        }
        if (this.isTouch) {
            document.body.classList.add('touch-device');
        }
    }

    setupTouchInteractions() {
        if (!this.isTouch) return;

        // Add very subtle touch feedback to interactive elements
        const interactiveElements = document.querySelectorAll('.btn, .city-btn, .metric-item, .forecast-card');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', (e) => {
                // Very subtle feedback - no scaling to prevent shaking
                element.style.opacity = '0.9';
                element.style.transition = 'opacity 0.1s ease';
            }, { passive: true });

            element.addEventListener('touchend', (e) => {
                setTimeout(() => {
                    element.style.opacity = '';
                    element.style.transition = '';
                }, 100);
            }, { passive: true });

            element.addEventListener('touchcancel', (e) => {
                element.style.opacity = '';
                element.style.transition = '';
            }, { passive: true });
        });

        // Improve tab scrolling on mobile
        const tabsContainer = document.querySelector('.weather-tabs');
        if (tabsContainer) {
            let isScrolling = false;
            
            tabsContainer.addEventListener('touchstart', () => {
                isScrolling = false;
            }, { passive: true });

            tabsContainer.addEventListener('touchmove', () => {
                isScrolling = true;
            }, { passive: true });

            tabsContainer.addEventListener('touchend', (e) => {
                if (isScrolling) {
                    e.preventDefault();
                }
            });
        }
    }

    optimizeForMobile() {
        if (!this.isMobile) return;

        // Completely disable problematic animations on mobile
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                /* Disable all animations that cause shaking */
                * {
                    animation-duration: 0s !important;
                    transition-duration: 0.15s !important;
                }
                
                /* Specifically target floating animations */
                .weather-main,
                .main-container,
                .search-container,
                .metric-item,
                .forecast-card,
                .weather-icon-main,
                .temp-display {
                    animation: none !important;
                    transform: none !important;
                }
                
                /* Remove all pseudo-element animations */
                *::before,
                *::after {
                    animation: none !important;
                }
                
                /* Only allow very subtle transitions for touch feedback */
                .btn:active,
                .city-btn:active,
                .metric-item:active,
                .forecast-card:active {
                    transition: transform 0.1s ease, opacity 0.1s ease !important;
                }
            }
        `;
        document.head.appendChild(style);

        // Optimize chart rendering for mobile with minimal animations
        if (window.Chart) {
            Chart.defaults.responsive = true;
            Chart.defaults.maintainAspectRatio = false;
            Chart.defaults.animation.duration = 0; // No chart animations on mobile
            
            // Ensure charts have proper dimensions on mobile
            Chart.defaults.layout = {
                padding: {
                    left: 10,
                    right: 10,
                    top: 10,
                    bottom: 10
                }
            };
        }
    }

    handleOrientationChange() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Refresh charts if they exist
                if (this.temperatureChart) {
                    this.temperatureChart.resize();
                }
                if (this.hourlyChart) {
                    this.hourlyChart.resize();
                }

                // Scroll to top on orientation change
                window.scrollTo(0, 0);
                
                // Re-adjust layout
                this.adjustMobileLayout();
            }, 100);
        });
    }

    adjustMobileLayout() {
        const isLandscape = window.innerHeight < window.innerWidth;
        
        if (this.isMobile && isLandscape) {
            document.body.classList.add('mobile-landscape');
            
            // Reduce padding in landscape mode
            const mainContainer = document.querySelector('.main-container');
            if (mainContainer) {
                mainContainer.style.padding = '1rem';
            }
        } else {
            document.body.classList.remove('mobile-landscape');
            
            // Restore normal padding
            const mainContainer = document.querySelector('.main-container');
            if (mainContainer) {
                mainContainer.style.padding = '';
            }
        }
    }

    preventZoomOnInputFocus() {
        // Prevent zoom on input focus for iOS Safari
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            const inputs = document.querySelectorAll('input[type="text"], input[type="search"]');
            inputs.forEach(input => {
                input.addEventListener('focus', () => {
                    input.style.fontSize = '16px';
                });
                
                input.addEventListener('blur', () => {
                    input.style.fontSize = '';
                });
            });
        }
    }

    // Enhanced error handling for mobile
    showError(message, showRetryButton = false, retryAction = null) {
        this.hideLoading();
        const errorEl = document.getElementById('errorMessage');
        
        let errorHTML = `
            <div class="d-flex align-items-center justify-content-between flex-column flex-md-row">
                <div class="text-center text-md-start mb-3 mb-md-0">
                    <strong>⚠️ ${this.isMobile ? 'Connection Issue' : 'Network Error'}</strong><br>
                    ${this.isMobile ? this.getMobileFriendlyErrorMessage(message) : message}
                </div>
        `;
        
        if (showRetryButton && retryAction) {
            errorHTML += `
                <button class="btn btn-outline-light btn-sm ${this.isMobile ? 'w-100' : 'ms-3'}" onclick="(${retryAction.toString()})()">
                    🔄 ${this.isMobile ? 'Retry' : 'Try Again'}
                </button>
            `;
        }
        
        errorHTML += '</div>';
        
        errorEl.innerHTML = errorHTML;
        errorEl.classList.remove('d-none');
        document.getElementById('weatherContent').classList.add('d-none');
        document.getElementById('welcomeScreen').classList.add('d-none');
    }

    getMobileFriendlyErrorMessage(message) {
        if (message.includes('network') || message.includes('connection')) {
            return 'Check your internet connection and try again.';
        }
        if (message.includes('location')) {
            return 'Unable to detect location. Try searching manually.';
        }
        if (message.includes('City not found')) {
            return 'City not found. Check spelling or try a different city.';
        }
        return message.length > 60 ? message.substring(0, 60) + '...' : message;
    }

    // Override chart rendering for mobile optimization
    renderCharts() {
        if (!this.forecastData || !this.hourlyData) return;
        
        // Use smaller charts on mobile
        const isMobileView = window.innerWidth <= 768;
        
        if (isMobileView) {
            this.renderMobileOptimizedCharts();
        } else {
            this.renderTemperatureChart();
            this.renderHourlyChart();
        }
    }

    renderMobileOptimizedCharts() {
        // Simplified charts for mobile with less data points
        const ctx1 = document.getElementById('temperatureChart').getContext('2d');
        const ctx2 = document.getElementById('hourlyChart').getContext('2d');
        
        if (this.temperatureChart) this.temperatureChart.destroy();
        if (this.hourlyChart) this.hourlyChart.destroy();

        // Ensure canvas elements have proper dimensions
        const canvas1 = document.getElementById('temperatureChart');
        const canvas2 = document.getElementById('hourlyChart');
        
        canvas1.style.width = '100%';
        canvas1.style.height = '200px';
        canvas2.style.width = '100%';
        canvas2.style.height = '200px';

        // Temperature chart with fewer data points
        const dates = [];
        const maxTemps = [];
        const minTemps = [];

        this.forecastData.DailyForecasts.slice(0, 3).forEach((day, index) => {
            const date = new Date(day.Date);
            dates.push(index === 0 ? 'Today' : date.toLocaleDateString('en', { weekday: 'short' }));
            minTemps.push(day.Temperature.Minimum.Value);
            maxTemps.push(day.Temperature.Maximum.Value);
        });

        this.temperatureChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'High',
                    data: maxTemps,
                    borderColor: '#FF6B6B',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }, {
                    label: 'Low',
                    data: minTemps,
                    borderColor: '#4ECDC4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 2,
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10
                    }
                },
                plugins: {
                    legend: {
                        labels: { 
                            color: 'white',
                            font: { size: 12 }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: 'white',
                            font: { size: 11 }
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: {
                        ticks: { 
                            color: 'white',
                            font: { size: 11 }
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        // Hourly chart with fewer data points
        const times = [];
        const temps = [];

        this.hourlyData.slice(0, 6).forEach(hour => {
            const time = new Date(hour.DateTime);
            times.push(time.toLocaleTimeString([], {hour: 'numeric'}));
            temps.push(hour.Temperature.Value);
        });

        this.hourlyChart = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: times,
                datasets: [{
                    label: 'Temperature',
                    data: temps,
                    borderColor: '#45B7D1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 2,
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 10,
                        bottom: 10
                    }
                },
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { 
                            color: 'white',
                            font: { size: 11 }
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    y: {
                        ticks: { 
                            color: 'white',
                            font: { size: 11 }
                        },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherApp();
});
