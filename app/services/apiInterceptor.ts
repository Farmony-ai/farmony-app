import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: any;
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
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  }

  // Save tokens to storage
  private async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem('access_token', accessToken),
        AsyncStorage.setItem('refresh_token', refreshToken)
      ]);
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
        AsyncStorage.removeItem('user')
      ]);
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  // Refresh token logic
  private async refreshAuthToken(refreshToken: string): Promise<string | null> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.subscribeToRefresh((token) => resolve(token));
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json();

      if (response.ok && data.access_token) {
        const { access_token, refresh_token } = data;
        await this.saveTokens(access_token, refresh_token);
        this.notifyRefreshSubscribers(access_token);
        this.isRefreshing = false;
        return access_token;
      } else {
        // Refresh failed, clear tokens
        await this.clearTokens();
        this.isRefreshing = false;
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearTokens();
      this.isRefreshing = false;
      return null;
    }
  }

  // Make authenticated request with auto-refresh
  async makeAuthenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const { accessToken } = await this.getStoredTokens();
      const url = `${API_BASE_URL}${endpoint}`;

      // Default headers
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add auth token if available
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Check for new token in headers
      const newToken = response.headers.get('X-New-Token');
      if (newToken) {
        console.log('🔄 New token received in headers');
        const { refreshToken } = await this.getStoredTokens();
        if (refreshToken) {
          await this.saveTokens(newToken, refreshToken);
        }
      }

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else if (response.status === 401 && retryCount === 0) {
        // Token expired, try to refresh
        console.log('🔄 Token expired, attempting refresh...');
        const { refreshToken } = await this.getStoredTokens();
        
        if (refreshToken) {
          const newToken = await this.refreshAuthToken(refreshToken);
          
          if (newToken) {
            // Retry the request with new token
            return this.makeAuthenticatedRequest<T>(endpoint, options, retryCount + 1);
          }
        }
        
        // Refresh failed, return error
        return { success: false, error: 'Authentication failed' };
      } else {
        return { success: false, error: data.message || 'An error occurred' };
      }
    } catch (error) {
      console.error('Network error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Handle login response
  async handleLoginResponse(response: LoginResponse): Promise<void> {
    const { access_token, refresh_token, user } = response;
    await this.saveTokens(access_token, refresh_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
  }

  // Validate token
  async validateToken(): Promise<{ valid: boolean; user?: any }> {
    try {
      const result = await this.makeAuthenticatedRequest('/auth/validate-token', {
        method: 'POST',
      });

      if (result.success && result.data) {
        return { valid: true, user: result.data.user };
      } else {
        return { valid: false };
      }
    } catch (error) {
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
