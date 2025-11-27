import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import apiInterceptor from './apiInterceptor';

class FCMService {
  private static instance: FCMService;
  private currentToken: string | null = null;

  static getInstance(): FCMService {
    if (!FCMService.instance) {
      FCMService.instance = new FCMService();
    }
    return FCMService.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
             authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    } else {
      // Android 13+ requires POST_NOTIFICATIONS permission
      const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(Platform.Version, 10);
      if (androidVersion >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
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
            console.log('✅ iOS device registered for remote messages');
          } catch (err) {
            console.error('❌ Failed to register device for remote messages:', err);
            return null;
          }
        } else {
          console.log('✅ iOS device already registered for remote messages');
        }
      }

      const token = await messaging().getToken();
      this.currentToken = token;
      await AsyncStorage.setItem('fcmToken', token);
      console.log('✅ FCM token obtained:', token);
      return token;
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
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
}

export default FCMService.getInstance();
