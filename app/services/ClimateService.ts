import axios from 'axios';

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  feelsLike: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
}

class ClimateService {
  private readonly API_KEY = 'bfcedd9e753cb7ffe4a228117c581d90'; // You'll need to get a free API key from OpenWeatherMap
  private readonly BASE_URL = 'https://api.openweathermap.org/data/2.5';

  async getWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      const response = await axios.get(
        `${this.BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${this.API_KEY}&units=metric`
      );

      const data = response.data;
      
      return {
        temperature: Math.round(data.main.temp),
        condition: data.weather[0].main,
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
        description: data.weather[0].description,
        icon: data.weather[0].icon,
        feelsLike: Math.round(data.main.feels_like),
        pressure: data.main.pressure,
        visibility: data.visibility / 1000, // Convert to km
        uvIndex: 0, // UV index requires separate API call
      };
    } catch (error) {
      console.error('Error fetching weather data:', error);
      // Return mock data for development
      return this.getMockWeatherData();
    }
  }

  private getMockWeatherData(): WeatherData {
    return {
      temperature: 28,
      condition: 'Clear',
      humidity: 65,
      windSpeed: 12,
      description: 'clear sky',
      icon: '01d',
      feelsLike: 30,
      pressure: 1013,
      visibility: 10,
      uvIndex: 7,
    };
  }

  getWeatherIcon(iconCode: string): string {
    const iconMap: { [key: string]: string } = {
      '01d': 'sunny',
      '01n': 'moon',
      '02d': 'partly-sunny',
      '02n': 'partly-sunny',
      '03d': 'cloudy',
      '03n': 'cloudy',
      '04d': 'cloudy',
      '04n': 'cloudy',
      '09d': 'rainy',
      '09n': 'rainy',
      '10d': 'rainy',
      '10n': 'rainy',
      '11d': 'thunderstorm',
      '11n': 'thunderstorm',
      '13d': 'snow',
      '13n': 'snow',
      '50d': 'water',
      '50n': 'water',
    };
    
    return iconMap[iconCode] || 'partly-sunny';
  }

  getWeatherAdvice(condition: string, temperature: number): string {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes('rain')) {
      return 'Consider postponing outdoor farming activities';
    } else if (conditionLower.includes('storm')) {
      return 'Avoid outdoor activities, secure equipment';
    } else if (temperature > 35) {
      return 'High temperature - ensure proper irrigation';
    } else if (temperature < 10) {
      return 'Low temperature - protect sensitive crops';
    } else if (conditionLower.includes('clear') && temperature > 25) {
      return 'Perfect weather for farming activities';
    } else {
      return 'Moderate conditions for farming';
    }
  }
}

export default new ClimateService();
