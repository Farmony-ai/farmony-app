/**
 * @format
 */

// Ensure crypto.getRandomValues exists in React Native before any module loads
import 'react-native-get-random-values';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import './app/utils/shimGlobalRequire'; // Ensures global.require exists before anything else

// 🚀 Initialise Firebase via explicit JS config (Option B)
import './app/services/firebase';
import firebase from '@react-native-firebase/app';
console.log('🔥 Firebase apps after init:', firebase.apps.map(app => app.name));

AppRegistry.registerComponent(appName, () => App);
