import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import TokenStorage from '../utils/TokenStorage';
import firebaseTokenHelper from './firebaseTokenHelper';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: any;
  // Legacy fields
  token?: string;
}

class ApiInterceptor {
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  private lastRefreshAttempt: number = 0;
  private readonly REFRESH_COOLDOWN_MS = 5000; // Prevent refresh spam

  // Subscribe to token refresh
  private subscribeToRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  // Notify subscribers of new token
  private notifyRefreshSubscribers(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  // Get stored tokens
  private async getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('refresh_token')
      ]);

      // Fallback to legacy token if new one doesn't exist
      if (!accessToken) {
        const legacyToken = await AsyncStorage.getItem('token');
        return { accessToken: legacyToken, refreshToken };
      }

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  }

  // Save tokens to storage using TokenStorage utility
  private async saveTokens(accessToken: string, refreshToken: string, expiresIn?: number): Promise<void> {
    try {
      await TokenStorage.saveTokens({
        accessToken,
        refreshToken,
        expiresIn: expiresIn || 900,
        tokenType: 'Bearer',
      });

      // Also save legacy token for backward compatibility
      await AsyncStorage.setItem('token', accessToken);
      console.log('✅ [ApiInterceptor] Tokens saved successfully');
    } catch (error) {
      console.error('❌ [ApiInterceptor] Failed to save tokens:', error);
    }
  }

  // Clear tokens from storage using TokenStorage utility
  private async clearTokens(): Promise<void> {
    try {
      await TokenStorage.clearTokens();
      await AsyncStorage.removeItem('user'); // Also clear user data
      console.log('✅ [ApiInterceptor] Tokens cleared');
    } catch (error) {
      console.error('❌ [ApiInterceptor] Failed to clear tokens:', error);
    }
  }

  private async refreshAuthToken(refreshToken: string): Promise<string | null> {
    if (this.isRefreshing) {
      console.log('🔄 [ApiInterceptor] Already refreshing, waiting for result...');
      // Add timeout to prevent infinite waiting
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('⚠️ [ApiInterceptor] Refresh wait timeout, resetting state');
          this.isRefreshing = false;
          resolve(null);
        }, 10000); // 10 second timeout

        this.subscribeToRefresh((token) => {
          clearTimeout(timeout);
          resolve(token);
        });
      });
    }

    this.isRefreshing = true;

    try {
      console.log('🔄 [ApiInterceptor] Attempting token refresh via Firebase...');

      // Ensure Firebase Auth is initialized
      await firebaseTokenHelper.waitForAuthReady();

      // Use Firebase SDK to refresh the ID token
      // This is the recommended way for Firebase Authentication
      const newIdToken = await firebaseTokenHelper.getIdToken(true); // Force refresh

      if (newIdToken) {
        await this.saveTokens(newIdToken, refreshToken, 3600); // Firebase tokens expire in 1 hour
        this.notifyRefreshSubscribers(newIdToken);
        this.isRefreshing = false;
        console.log('✅ [ApiInterceptor] Token refreshed successfully via Firebase SDK');
        return newIdToken;
      } else {
        console.error('❌ [ApiInterceptor] Token refresh failed - no Firebase user');
        this.notifyRefreshSubscribers(''); // Notify with empty to unblock waiters
        this.isRefreshing = false;
        return null;
      }
    } catch (error) {
      console.error('❌ [ApiInterceptor] Token refresh failed:', error);
      this.notifyRefreshSubscribers(''); // Notify with empty to unblock waiters
      this.isRefreshing = false;
      return null;
    }
  }

  async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      // **PROACTIVE REFRESH**: Check if token needs refresh before making request
      const shouldRefresh = await TokenStorage.shouldRefreshToken();
      if (shouldRefresh && retryCount === 0) {
        const refreshToken = await TokenStorage.getRefreshToken();
        if (refreshToken) {
          const now = Date.now();
          // Prevent refresh spam with cooldown
          if (now - this.lastRefreshAttempt > this.REFRESH_COOLDOWN_MS) {
            console.log('🔄 [ApiInterceptor] Proactive token refresh triggered');
            this.lastRefreshAttempt = now;
            await this.refreshAuthToken(refreshToken);
          }
        }
      }

      const { accessToken } = await this.getStoredTokens();
      const url = `${API_BASE_URL}${endpoint}`;

      console.log(`📡 [ApiInterceptor] ${options.method || 'GET'} ${endpoint}`);

      const headers: any = { ...options.headers };

      if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      // 🧾 DEBUG: If this is an orders POST, log the outgoing body as text
      if (endpoint === '/orders' && (options.method || 'GET').toUpperCase() === 'POST') {
        try {
          const bodyPreview = typeof options.body === 'string' ? options.body : '[non-string body]';
          console.log('[ApiInterceptor] ➜ POST', endpoint, 'body:', bodyPreview);
        } catch (e) {
          console.log('[ApiInterceptor] ➜ POST', endpoint, 'body: [unavailable]', e);
        }
      }

      const response = await fetch(url, { ...options, headers });

      // REMOVED HEADER CHECK LOGIC - This part is no longer needed.

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (response.ok) {
        return { success: true, data };
      } else if (response.status === 401 && retryCount === 0) {
        console.log('🔄 [ApiInterceptor] Got 401, attempting token refresh...');

        // Wait for Firebase Auth to initialize to know if we can refresh via SDK
        await firebaseTokenHelper.waitForAuthReady();

        const { refreshToken } = await this.getStoredTokens();
        const isFirebaseAuthenticated = firebaseTokenHelper.isAuthenticated();

        console.log('🔄 [ApiInterceptor] Refresh token available:', !!refreshToken, 'Firebase Auth:', isFirebaseAuthenticated);

        // Check if refreshToken is not null OR if we have an authenticated Firebase user
        if (refreshToken !== null || isFirebaseAuthenticated) {
          const newAccessToken = await this.refreshAuthToken(refreshToken || '');
          console.log('🔄 [ApiInterceptor] New access token received:', !!newAccessToken);

          if (newAccessToken) {
            // Retry the request with new token
            console.log('🔄 [ApiInterceptor] Retrying request with new token...');
            return this.makeAuthenticatedRequest<T>(endpoint, options, 1); // Increment retryCount
          }
        }

        // Refresh failed or no refresh token, return error
        console.error('❌ [ApiInterceptor] Authentication failed - no valid token');
        return { success: false, error: 'Authentication failed' };
      } else {
        const errorMessage = data?.message || (typeof data === 'string' ? data : 'An error occurred');
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Network error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Handle login response
  async handleLoginResponse(response: LoginResponse): Promise<void> {
    const access_token = response.access_token || response.token;
    const refresh_token = response.refresh_token || '';
    const expires_in = response.expires_in || 900;
    const { user } = response;

    if (access_token) {
      await this.saveTokens(access_token, refresh_token, expires_in);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log('✅ Login response handled successfully');
    } else {
      console.error('❌ Invalid login response - missing access token');
    }
  }

  // Validate token - Fixed endpoint
  async validateToken(): Promise<{ valid: boolean; user?: any }> {
    try {
      const result = await this.makeAuthenticatedRequest<any>('/identity/auth/verify-token', {
        method: 'GET', // Changed to GET based on your backend
      });

      if (result.success && result.data) {
        return {
          valid: result.data.valid || true,
          user: result.data.user || result.data
        };
      } else {
        return { valid: false };
      }
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false };
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint to revoke Firebase refresh tokens
      await this.makeAuthenticatedRequest('/identity/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Backend logout error:', error);
    } finally {
      // Clear local tokens
      await this.clearTokens();

      // Sign out from Firebase
      try {
        await firebaseTokenHelper.signOut();
        console.log('✅ Signed out from Firebase');
      } catch (error) {
        console.error('❌ Firebase sign out error:', error);
      }
    }
  }

  // Get user profile
  async getProfile(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.makeAuthenticatedRequest(`/identity/users/${userId}`, {
      method: 'GET',
    });
  }

  // Axios-like convenience methods
  async get<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.makeAuthenticatedRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.makeAuthenticatedRequest<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.makeAuthenticatedRequest<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.makeAuthenticatedRequest<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<{ success: boolean; data?: T; error?: string }> {
    return this.makeAuthenticatedRequest<T>(endpoint, { method: 'DELETE' });
  }
}

// Create singleton instance
const apiInterceptor = new ApiInterceptor();

export default apiInterceptor;