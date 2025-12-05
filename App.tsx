import React, { useEffect, useRef } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { store, RootState, AppDispatch } from './app/store';
import RootNavigator from './app/navigation/RootNavigator';
import TokenRefreshService from './app/services/TokenRefreshService';
import FCMService from './app/services/FCMService';
import { fetchUnreadCount, incrementUnreadCount } from './app/store/slices/notificationSlice';
import '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';

function AppContent() {
    const { user } = useSelector((state: RootState) => state.auth);
    const dispatch: AppDispatch = useDispatch();
    const navigationRef = useRef<NavigationContainerRef<any>>(null);

    useEffect(() => {
        // Start automatic token refresh when app loads
        TokenRefreshService.start();

        // Handle app state changes (background/foreground)
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                // App came to foreground, restart token refresh
                console.log('App came to foreground, ensuring token refresh is running');
                TokenRefreshService.start();
            } else if (nextAppState === 'background') {
                // App went to background, stop token refresh to save battery
                console.log('App went to background, stopping token refresh');
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
        let unsubscribeNotificationListeners: (() => void) | undefined;

        // Initialize FCM when user is authenticated
        const initializeFCM = async () => {
            if (user?.id) {
                console.log('Initializing FCM for user:', user.id);

                // Set navigation ref for FCM service
                FCMService.setNavigationRef(navigationRef.current);

                // Register FCM token
                await FCMService.registerToken(user.id);

                // Setup token refresh listener
                unsubscribeTokenRefresh = FCMService.setupTokenRefreshListener();

                // Setup notification listeners
                unsubscribeNotificationListeners = FCMService.setupNotificationListeners((message) => {
                    // When notification received in foreground, increment unread count
                    console.log('Notification received in foreground:', message.notification?.title);
                    dispatch(incrementUnreadCount());
                });

                // Fetch initial unread count
                dispatch(fetchUnreadCount());
            }
        };

        initializeFCM();

        // Cleanup FCM token on logout
        return () => {
            if (unsubscribeTokenRefresh) {
                unsubscribeTokenRefresh();
            }
            if (unsubscribeNotificationListeners) {
                unsubscribeNotificationListeners();
            }
            if (!user?.id) {
                FCMService.removeToken();
            }
        };
    }, [user?.id, dispatch]);

    // Update navigation ref when it changes
    useEffect(() => {
        if (navigationRef.current) {
            FCMService.setNavigationRef(navigationRef.current);
        }
    }, [navigationRef.current]);

    return <RootNavigator ref={navigationRef} />;
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
