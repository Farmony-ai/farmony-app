import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, AppStateStatus } from 'react-native';
import { store } from './app/store';
import RootNavigator from './app/navigation/RootNavigator';
import TokenRefreshService from './app/services/TokenRefreshService';
import '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

export default function App() {
  useEffect(() => {
    // Start automatic token refresh when app loads
    TokenRefreshService.start();

    // Handle app state changes (background/foreground)
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground, restart token refresh
        console.log('📱 App came to foreground, ensuring token refresh is running');
        TokenRefreshService.start();
      } else if (nextAppState === 'background') {
        // App went to background, stop token refresh to save battery
        console.log('📱 App went to background, stopping token refresh');
        TokenRefreshService.stop();
      }
    });

    // Cleanup on unmount
    return () => {
      subscription.remove();
      TokenRefreshService.stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <RootNavigator />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
