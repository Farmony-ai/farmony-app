import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import apiInterceptor from './apiInterceptor';
import { NavigationContainerRef } from '@react-navigation/native';

// Notification data from backend
interface NotificationData {
    type?: string;
    requestId?: string;
    orderId?: string;
    providerId?: string;
    categoryName?: string;
    distanceKm?: string;
    amount?: string;
    rating?: string;
}

class FCMService {
    private static instance: FCMService;
    private currentToken: string | null = null;
    private navigationRef: NavigationContainerRef<any> | null = null;

    static getInstance(): FCMService {
        if (!FCMService.instance) {
            FCMService.instance = new FCMService();
        }
        return FCMService.instance;
    }

    /**
     * Set navigation reference for handling notification taps
     */
    setNavigationRef(ref: NavigationContainerRef<any> | null): void {
        this.navigationRef = ref;
    }

    async requestPermission(): Promise<boolean> {
        if (Platform.OS === 'ios') {
            const authStatus = await messaging().requestPermission();
            return (
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL
            );
        } else {
            // Android 13+ requires POST_NOTIFICATIONS permission
            const androidVersion =
                typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);
            if (androidVersion >= 33) {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            }
            // Android 12 and below don't need runtime permission for notifications
            return true;
        }
    }

    async getToken(): Promise<string | null> {
        try {
            const hasPermission = await this.requestPermission();
            if (!hasPermission) {
                console.log('FCM permission not granted');
                return null;
            }

            // iOS requires device to be registered for remote messages
            if (Platform.OS === 'ios') {
                const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;

                if (!isRegistered) {
                    try {
                        console.log('Registering device for remote messages...');
                        await messaging().registerDeviceForRemoteMessages();
                        console.log('iOS device registered for remote messages');
                    } catch (err) {
                        console.error('Failed to register device for remote messages:', err);
                        return null;
                    }
                } else {
                    console.log('iOS device already registered for remote messages');
                }
            }

            const token = await messaging().getToken();
            this.currentToken = token;
            await AsyncStorage.setItem('fcmToken', token);
            console.log('FCM token obtained:', token);
            return token;
        } catch (error) {
            console.error('Error getting FCM token:', error);
            return null;
        }
    }

    async registerToken(userId: string): Promise<void> {
        try {
            const token = await this.getToken();
            if (!token) {
                console.log('No FCM token to register');
                return;
            }

            await apiInterceptor.makeAuthenticatedRequest('/identity/users/fcm-token', {
                method: 'POST',
                body: JSON.stringify({ token }),
            });
            console.log('FCM token registered successfully');
        } catch (error) {
            console.error('Error registering FCM token:', error);
        }
    }

    async removeToken(): Promise<void> {
        try {
            const token = await AsyncStorage.getItem('fcmToken');
            if (!token) {
                console.log('No FCM token to remove');
                return;
            }

            await apiInterceptor.makeAuthenticatedRequest('/identity/users/fcm-token', {
                method: 'DELETE',
                body: JSON.stringify({ token }),
            });
            await AsyncStorage.removeItem('fcmToken');
            await messaging().deleteToken();
            console.log('FCM token removed successfully');
        } catch (error) {
            console.error('Error removing FCM token:', error);
        }
    }

    setupTokenRefreshListener(): () => void {
        // Use the modular API to listen for token refresh
        const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
            console.log('FCM token refreshed:', newToken);
            const oldToken = this.currentToken;
            this.currentToken = newToken;
            await AsyncStorage.setItem('fcmToken', newToken);

            // Update token on backend
            try {
                if (oldToken) {
                    await apiInterceptor.makeAuthenticatedRequest('/identity/users/fcm-token', {
                        method: 'DELETE',
                        body: JSON.stringify({ token: oldToken }),
                    });
                }
                await apiInterceptor.makeAuthenticatedRequest('/identity/users/fcm-token', {
                    method: 'POST',
                    body: JSON.stringify({ token: newToken }),
                });
                console.log('FCM token updated successfully');
            } catch (error) {
                console.error('Error updating FCM token:', error);
            }
        });

        return unsubscribe;
    }

    /**
     * Handle notification tap - navigate to appropriate screen based on notification type
     */
    handleNotificationTap(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
        const data = remoteMessage.data as NotificationData | undefined;
        if (!data?.type) {
            console.log('No notification type in data, navigating to Notifications screen');
            this.navigateToNotifications();
            return;
        }

        console.log('Handling notification tap with type:', data.type);

        switch (data.type) {
            case 'service-request-accepted':
                // Seeker notification - their request was accepted
                if (data.requestId) {
                    this.navigateTo('ServiceRequestDetails', { requestId: data.requestId });
                } else {
                    this.navigateToNotifications();
                }
                break;

            case 'order-in-progress':
                // Seeker notification - service started
                // New format has requestId, old format only has orderId
                if (data.requestId) {
                    this.navigateTo('ServiceRequestDetails', { requestId: data.requestId });
                } else if (data.orderId) {
                    // Fallback to OrderDetail for old notifications
                    this.navigateTo('OrderDetail', { orderId: data.orderId });
                } else {
                    this.navigateToNotifications();
                }
                break;

            case 'service-request-expired':
            case 'service-request-no-providers':
            case 'service-request-new-opportunity':
            case 'service-request-closed':
                if (data.requestId) {
                    // Navigate to Provider tab > ServiceRequestDetail screen (provider's view)
                    this.navigateToNestedScreen('Provider', 'ServiceRequestDetail', { requestId: data.requestId });
                } else {
                    this.navigateToNotifications();
                }
                break;

            case 'order-completed':
            case 'payment-received':
            case 'new-review':
                if (data.orderId) {
                    // Navigate to order detail
                    this.navigateTo('OrderDetail', { orderId: data.orderId });
                } else {
                    this.navigateToNotifications();
                }
                break;

            default:
                this.navigateToNotifications();
                break;
        }
    }

    /**
     * Navigate to a specific screen
     */
    private navigateTo(screenName: string, params?: Record<string, any>): void {
        if (!this.navigationRef?.isReady()) {
            console.warn('Navigation ref not ready, cannot navigate to:', screenName);
            return;
        }

        try {
            this.navigationRef.navigate(screenName as never, params as never);
            console.log('Navigated to:', screenName, params);
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }

    /**
     * Navigate to a nested screen (e.g., Provider tab > ServiceRequestDetail)
     */
    private navigateToNestedScreen(tabName: string, screenName: string, params?: Record<string, any>): void {
        if (!this.navigationRef?.isReady()) {
            console.warn('Navigation ref not ready, cannot navigate to:', tabName, screenName);
            return;
        }

        try {
            this.navigationRef.navigate(tabName as never, {
                screen: screenName,
                params: params,
            } as never);
            console.log('Navigated to nested screen:', tabName, screenName, params);
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }

    /**
     * Navigate to notifications screen
     */
    private navigateToNotifications(): void {
        if (!this.navigationRef?.isReady()) {
            console.warn('Navigation ref not ready, cannot navigate to Notifications');
            return;
        }

        try {
            // Navigate to Main tab navigator, then to Notifications tab
            this.navigationRef.navigate('Main' as never, { screen: 'Notifications' } as never);
            console.log('Navigated to Notifications screen');
        } catch (error) {
            console.error('Navigation error:', error);
        }
    }

    /**
     * Setup all notification listeners
     * Returns cleanup function
     */
    setupNotificationListeners(onNotificationReceived?: (message: FirebaseMessagingTypes.RemoteMessage) => void): () => void {
        // Handle notification when app is in foreground
        const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
            console.log('FCM Message received in foreground:', remoteMessage);
            if (onNotificationReceived) {
                onNotificationReceived(remoteMessage);
            }
        });

        // Handle notification tap when app is in background
        const unsubscribeBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
            console.log('Notification opened app from background:', remoteMessage);
            this.handleNotificationTap(remoteMessage);
        });

        // Check if app was opened from a notification (killed state)
        messaging()
            .getInitialNotification()
            .then((remoteMessage) => {
                if (remoteMessage) {
                    console.log('Notification opened app from killed state:', remoteMessage);
                    // Delay navigation to ensure navigation ref is ready
                    setTimeout(() => {
                        this.handleNotificationTap(remoteMessage);
                    }, 1000);
                }
            });

        // Return cleanup function
        return () => {
            unsubscribeForeground();
            unsubscribeBackground();
        };
    }
}

export default FCMService.getInstance();
