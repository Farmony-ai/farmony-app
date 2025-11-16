// 🌐 API Configuration for Rural Share
// This file contains network configuration for different development environments

// 🏗️ Network Configuration Options
export const API_CONFIG = {
  // 🔧 Development Settings
  development: {
    // For Android Emulator (most common)
    // android: 'http://localhost:3000',
    android: 'http://10.0.2.2:3000',
    // android: 'http:// 192.168.1.101:3000', 
    
    // For iOS Simulator (replace with your actual IP)F
    ios: 'http://192.168.1.6:3000',
    
    // For Physical Device (replace with your actual IP)
    device: 'http://192.168.1.101:3000', // Replace with your computer's IP
  },
  
  // 🚀 Production Settings
  production: {
    api: 'https://your-production-api.com',
  },
};

// 🔑 Google Maps API Key
// IMPORTANT: It's recommended to use react-native-config or a similar library 
// to avoid exposing your API key in the source code.
export const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "AIzaSyA_dOZ8Oxb5t3Lm5knvuJdDE_sqgEHWctc"; // Replace with your actual key

// 🎯 Auto-detect Platform and Environment
const getBaseURL = () => {
  // For now, we'll use Android emulator settings
  // You can make this more dynamic based on Platform.OS or __DEV__
  return API_CONFIG.development.ios;
};

// 📡 Export the current base URL
export const BASE_URL = getBaseURL();
export const API_BASE_URL = `${BASE_URL}/api`;

// 🔍 Debug Information
console.log('🌐 API Configuration:');
console.log('📍 Base URL:', BASE_URL);
console.log('📡 API URL:', API_BASE_URL);

// 📝 Instructions for Different Scenarios
export const NETWORK_INSTRUCTIONS = {
  androidEmulator: {
    url: 'http://10.0.2.2:3000',
    description: 'Use this for Android emulator (default)',
  },
  iosSimulator: {
    url: 'http://YOUR_IP:3000',
    description: 'Replace YOUR_IP with your computer\'s IP address',
    howToFind: 'Run "ipconfig" (Windows) or "ifconfig" (Mac/Linux) to find your IP',
  },
  physicalDevice: {
    url: 'http://YOUR_IP:3000',
    description: 'Replace YOUR_IP with your computer\'s IP address',
    note: 'Make sure your device and computer are on the same network',
  },
  common_issues: [
    'Make sure your backend server is running on port 3000',
    'Check firewall settings if requests are timing out',
    'Verify both device and computer are on same network',
    'For Windows: Allow Node.js through Windows Firewall',
  ],
}; 