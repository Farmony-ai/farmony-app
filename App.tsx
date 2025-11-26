import React, { useEffect } from 'react';
import { Provider, useSelector } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, AppStateStatus } from 'react-native';
import { store, RootState } from './app/store';
import RootNavigator from './app/navigation/RootNavigator';
import TokenRefreshService from './app/services/TokenRefreshService';
import FCMService from './app/services/FCMService';
import '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

function AppContent() {
  const { user } = useSelector((state: RootState) => state.auth);

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

  useEffect(() => {
    let unsubscribeTokenRefresh: (() => void) | undefined;

    // Initialize FCM when user is authenticated
    const initializeFCM = async () => {
      if (user?.id) {
        console.log('📱 Initializing FCM for user:', user.id);
        await FCMService.registerToken(user.id);
        unsubscribeTokenRefresh = FCMService.setupTokenRefreshListener();
      }
    };

    initializeFCM();

    // Cleanup FCM token on logout
    return () => {
      if (unsubscribeTokenRefresh) {
        unsubscribeTokenRefresh();
      }
      if (!user?.id) {
        FCMService.removeToken();
      }
    };
  }, [user?.id]);

  return <RootNavigator />;
}

export default function App() {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <AppContent />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
