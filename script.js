// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Get Location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(successLocation, errorLocation);
    } else {
        errorLocation();
    }

    // 2. Initialize Calculators
    initCalculators();
    
    // 3. Initialize Pollution Footprint Calculator
    initPollutionCalculator();
}

function successLocation(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    
    document.getElementById('location-display').innerHTML = 
        `<i class="fa-solid fa-location-dot"></i> Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;

    fetchWeatherData(lat, lon);
    fetchAirQuality(lat, lon);
}

function errorLocation() {
    // Default to London if user blocks location
    const lat = 51.50;
    const lon = -0.12;
    document.getElementById('location-display').innerHTML = 
        `<i class="fa-solid fa-triangle-exclamation"></i> Using Default Location (London)`;
    
    fetchWeatherData(lat, lon);
    fetchAirQuality(lat, lon);
}

// --- API SECTION ---

async function fetchWeatherData(lat, lon) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=precipitation_probability_mean&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();

        document.getElementById('temp-val').innerText = `${data.current_weather.temperature}°C`;
        document.getElementById('wind-val').innerText = `${data.current_weather.windspeed} km/h`;
        document.getElementById('humid-val').innerText = `76%`; 

        renderRainChart(data.daily.precipitation_probability_mean, data.daily.time);

    } catch (err) {
        console.error("Weather fetch failed", err);
    }
}

async function fetchAirQuality(lat, lon) {
    try {
        const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,nitrogen_dioxide,ozone&timezone=auto`;
        const res = await fetch(url);
        const data = await res.json();
        const current = data.current;

        document.getElementById('pm25-val').innerText = `${current.pm2_5} µg/m³`;
        document.getElementById('no2-val').innerText = `${current.nitrogen_dioxide} µg/m³`;

        renderAirChart(current);

    } catch (err) {
        console.error("Air Quality fetch failed", err);
    }
}

// --- CHARTS SECTION ---

function renderRainChart(dataPoints, labels) {
    const ctx = document.getElementById('rainfallChart').getContext('2d');
    const shortLabels = labels.map(date => new Date(date).toLocaleDateString('en-US', {weekday: 'short'}));

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: shortLabels,
            datasets: [{
                label: 'Rain Probability (%)',
                data: dataPoints,
                borderColor: '#0056b3', 
                backgroundColor: 'rgba(0, 86, 179, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: '#e0e0e0' }, ticks: { color: '#666666' } },
                x: { grid: { display: false }, ticks: { color: '#666666' } }
            }
        }
    });
}

function renderAirChart(data) {
    const ctx = document.getElementById('airQualityRadar').getContext('2d');
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['PM10', 'PM2.5', 'NO2', 'Ozone'],
            datasets: [{
                label: 'Current Level',
                data: [data.pm10, data.pm2_5, data.nitrogen_dioxide, data.ozone],
                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    grid: { color: '#e0e0e0' },
                    pointLabels: { color: '#333333', font: { size: 12 } },
                    ticks: { display: false, backdropColor: 'transparent' }
                }
            }
        }
    });
}

// --- CALCULATORS ---

function initCalculators() {
    const treeInput = document.getElementById('treeInput');
    const soilInput = document.getElementById('soilInput');
    
    function updateCarbon() {
        const trees = treeInput.value;
        const soil = soilInput.value;
        document.getElementById('tree-count').innerText = trees;
        document.getElementById('soil-count').innerText = soil;
        
        const total = (trees * 0.022) + (soil * 0.0004);
        document.getElementById('sequestrationResult').innerText = total.toFixed(3);
    }
    
    treeInput.addEventListener('input', updateCarbon);
    soilInput.addEventListener('input', updateCarbon);

    const plantData = {
        snake: { co2: "0.02 g/hr (Night)", o2: "High (Night)", best: "Bedrooms" },
        areca: { co2: "0.05 g/hr (Day)", o2: "Very High", best: "Living Room" },
        spider: { co2: "0.01 g/hr", o2: "Moderate", best: "Workspace" },
        peace: { co2: "0.03 g/hr", o2: "Moderate", best: "Bathrooms" }
    };

    document.getElementById('plantSelector').addEventListener('change', (e) => {
        const key = e.target.value;
        const stats = plantData[key];
        const container = document.getElementById('plantStats');
        
        container.classList.remove('hidden');
        document.getElementById('p-co2').innerText = stats.co2;
        document.getElementById('p-o2').innerText = stats.o2;
        document.getElementById('p-best').innerText = stats.best;
    });
}

// --- IMPROVED POLLUTION CALCULATOR (NEW LOGIC) ---

function initPollutionCalculator() {
    function setupOptionGroup(groupId) {
        const buttons = document.querySelectorAll(`#${groupId} .option-btn`);
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    setupOptionGroup('q1-options');
    setupOptionGroup('q2-options');
    setupOptionGroup('q3-options');

    document.getElementById('calculate-footprint-btn').addEventListener('click', () => {
        const selectedOptions = document.querySelectorAll('.option-btn.selected');
        
        if (selectedOptions.length < 3) {
            alert("Please answer all 3 questions to calculate your footprint.");
            return;
        }

        let totalScore = 0;
        let tips = []; // Array to store dynamic tips

        selectedOptions.forEach(btn => {
            // 1. Add Score
            totalScore += parseInt(btn.getAttribute('data-score'));

            // 2. Check for Tip
            // If the button has a specific tip attached (data-tip), add it to the list
            const tip = btn.getAttribute('data-tip');
            if (tip) {
                tips.push(tip);
            }
        });

        // Display Result
        const resultDiv = document.getElementById('footprint-result');
        const scoreDisplay = document.getElementById('impact-score');
        const msgDisplay = document.getElementById('impact-message');
        const tipsBox = document.getElementById('tips-box');
        const tipsList = document.getElementById('tips-list');
        
        resultDiv.classList.remove('hidden');
        scoreDisplay.innerText = totalScore + " / 90";

        // Logic: Lower is better (0-20 Eco, 21-50 Moderate, 51+ High)
        if (totalScore <= 20) {
            msgDisplay.innerText = "🌱 Excellent! You are an Eco-Warrior.";
            msgDisplay.style.color = "#28a745"; 
        } else if (totalScore <= 50) {
            msgDisplay.innerText = "⚠️ Moderate. Good start, but room to improve.";
            msgDisplay.style.color = "#d39e00"; 
        } else {
            msgDisplay.innerText = "🛑 High Impact. Please consider the tips below.";
            msgDisplay.style.color = "#dc3545"; 
        }

        // Render Tips
        tipsList.innerHTML = ""; // Clear old tips
        if (tips.length > 0) {
            tipsBox.classList.remove('hidden');
            tips.forEach(tipText => {
                const li = document.createElement('li');
                li.innerText = tipText;
                tipsList.appendChild(li);
            });
        } else {
            // If score is 0 and no tips generated
            tipsBox.classList.remove('hidden');
            const li = document.createElement('li');
            li.innerText = "Keep up the amazing work! Spread the message to your friends.";
            tipsList.appendChild(li);
        }
    });
}
