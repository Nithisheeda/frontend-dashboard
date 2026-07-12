/**
 * Live weather lookup for Leipzig via Open-Meteo (free, no API key, CORS-enabled).
 * Runs directly in the browser — no backend involved.
 */
const weatherApi = (() => {
  const LEIPZIG = { latitude: 51.3397, longitude: 12.3731 };
  const ENDPOINT = `https://api.open-meteo.com/v1/forecast?latitude=${LEIPZIG.latitude}&longitude=${LEIPZIG.longitude}&current_weather=true`;

  // WMO weather codes -> [label, icon]
  const CODES = {
    0: ['Clear', '☀️'],
    1: ['Mainly clear', '🌤️'],
    2: ['Partly cloudy', '⛅'],
    3: ['Overcast', '☁️'],
    45: ['Fog', '🌫️'],
    48: ['Fog', '🌫️'],
    51: ['Light drizzle', '🌦️'],
    53: ['Drizzle', '🌦️'],
    55: ['Dense drizzle', '🌧️'],
    56: ['Freezing drizzle', '🌧️'],
    57: ['Freezing drizzle', '🌧️'],
    61: ['Light rain', '🌦️'],
    63: ['Rain', '🌧️'],
    65: ['Heavy rain', '🌧️'],
    66: ['Freezing rain', '🌧️'],
    67: ['Freezing rain', '🌧️'],
    71: ['Light snow', '🌨️'],
    73: ['Snow', '🌨️'],
    75: ['Heavy snow', '❄️'],
    77: ['Snow grains', '❄️'],
    80: ['Rain showers', '🌦️'],
    81: ['Rain showers', '🌧️'],
    82: ['Violent showers', '⛈️'],
    85: ['Snow showers', '🌨️'],
    86: ['Snow showers', '🌨️'],
    95: ['Thunderstorm', '⛈️'],
    96: ['Thunderstorm', '⛈️'],
    99: ['Thunderstorm', '⛈️'],
  };

  const describe = (code) => CODES[code] || ['Unknown', '🌡️'];

  return {
    async fetchLeipzigWeather() {
      const res = await fetch(ENDPOINT);
      if (!res.ok) throw new Error(`Weather request failed: ${res.status}`);
      const data = await res.json();
      const current = data.current_weather;
      const [label, icon] = describe(current.weathercode);
      return { label, icon, temp: Math.round(current.temperature) };
    },
  };
})();
