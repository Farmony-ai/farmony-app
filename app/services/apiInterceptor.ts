import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

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

  // Save tokens to storage
  private async saveTokens(accessToken: string, refreshToken: string, expiresIn?: number): Promise<void> {
    try {
      const promises = [
        AsyncStorage.setItem('access_token', accessToken),
        AsyncStorage.setItem('refresh_token', refreshToken),
        AsyncStorage.setItem('token', accessToken), // Legacy support
      ];
      
      if (expiresIn) {
        const expiryTime = new Date().getTime() + (expiresIn * 1000);
        promises.push(AsyncStorage.setItem('token_expiry', expiryTime.toString()));
      }
      
      await Promise.all(promises);
      console.log('✅ Tokens saved successfully');
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  // Clear tokens from storage
  private async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem('access_token'),
        AsyncStorage.removeItem('refresh_token'),
        AsyncStorage.removeItem('user'),
        AsyncStorage.removeItem('token'), // Legacy
        AsyncStorage.removeItem('token_expiry'),
      ]);
      console.log('✅ Tokens cleared');
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

   private async refreshAuthToken(refreshToken: string): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.subscribeToRefresh((token) => resolve(token));
      });
    }

    this.isRefreshing = true;

    try {
      console.log('🔄 Attempting token refresh...');
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        const { access_token, refresh_token, expires_in } = data;
        await this.saveTokens(access_token, refresh_token || refreshToken, expires_in);
        this.notifyRefreshSubscribers(access_token);
        this.isRefreshing = false;
        console.log('✅ Token refreshed successfully');
        return access_token;
      } else {
        console.error('❌ Token refresh failed:', data);
        await this.clearTokens();
        this.isRefreshing = false;
        // IMPORTANT: Propagate logout or redirect to login screen from here in your app
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearTokens();
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
      const { accessToken } = await this.getStoredTokens();
      const url = `${API_BASE_URL}${endpoint}`;

      console.log(`🔄 API Request: ${options.method || 'GET'} ${endpoint}`);

      const headers: any = { ...options.headers };

      if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
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
        console.log('🔄 Token expired, attempting refresh...');
        const { refreshToken } = await this.getStoredTokens();

        if (refreshToken) {
          const newAccessToken = await this.refreshAuthToken(refreshToken);

          if (newAccessToken) {
            // Retry the request with new token
            return this.makeAuthenticatedRequest<T>(endpoint, options, 1); // Increment retryCount
          }
        }

        // Refresh failed or no refresh token, return error
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
    
    if (access_token && refresh_token) {
      await this.saveTokens(access_token, refresh_token, expires_in);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      console.log('✅ Login response handled successfully');
    } else {
      console.error('❌ Invalid login response - missing tokens');
    }
  }

  // Validate token - Fixed endpoint
  async validateToken(): Promise<{ valid: boolean; user?: any }> {
    try {
      const result = await this.makeAuthenticatedRequest<any>('/auth/verify-token', {
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
      await this.makeAuthenticatedRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearTokens();
    }
  }

  // Get user profile
  async getProfile(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    return this.makeAuthenticatedRequest(`/users/${userId}`, {
      method: 'GET',
    });
  }
}

// Create singleton instance
const apiInterceptor = new ApiInterceptor();

export default apiInterceptor;