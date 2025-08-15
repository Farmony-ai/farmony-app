// 🌾 Rural Share API Service
// This service handles all API calls to the Rural Share backend
// Built with clean, readable code that feels like plain english

import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'individual' | 'SHG' | 'FPO';
}

interface LoginRequest {
  emailOrPhone: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'individual' | 'SHG' | 'FPO' | 'admin';
  isVerified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: User;
}

interface RefreshTokenRequest {
  refreshToken: string;
}

interface TokenValidationResponse {
  valid: boolean;
  user?: User;
}

interface UserVerificationResponse {
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    isVerified: boolean;
  };
}

interface UserUpdateRequest {
  name?: string;
  phone?: string;
  isVerified?: boolean;
  kycStatus?: 'pending' | 'approved' | 'rejected';
}

// 🏗️ API Configuration
class ApiService {
  private baseURL: string;
  private authToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];
  
  constructor() {
    this.baseURL = API_BASE_URL;
    this.initializeTokens();
  }

  // Initialize tokens from storage
  private async initializeTokens() {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('refresh_token')
      ]);
      
      if (accessToken) this.authToken = accessToken;
      if (refreshToken) this.refreshToken = refreshToken;
    } catch (error) {
      console.error('Failed to initialize tokens:', error);
    }
  }
  
  // 🔑 Set authentication tokens
  async setAuthTokens(accessToken: string, refreshToken: string) {
    this.authToken = accessToken;
    this.refreshToken = refreshToken;
    
    try {
      await Promise.all([
        AsyncStorage.setItem('access_token', accessToken),
        AsyncStorage.setItem('refresh_token', refreshToken)
      ]);
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }
  
  // 🚫 Clear authentication tokens
  async clearAuthTokens() {
    this.authToken = null;
    this.refreshToken = null;
    this.isRefreshing = false;
    this.refreshSubscribers = [];
    
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

  // Subscribe to token refresh
  private subscribeToRefresh(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  // Notify subscribers of new token
  private notifyRefreshSubscribers(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  // Refresh token logic
  private async refreshAuthToken(): Promise<string | null> {
    if (!this.refreshToken) {
      return null;
    }

    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.subscribeToRefresh((token) => resolve(token));
      });
    }

    this.isRefreshing = true;

    try {
      const response = await this.makeRequest<LoginResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (response.success && response.data) {
        const { access_token, refresh_token } = response.data;
        await this.setAuthTokens(access_token, refresh_token);
        this.notifyRefreshSubscribers(access_token);
        this.isRefreshing = false;
        return access_token;
      } else {
        // Refresh failed, clear tokens
        await this.clearAuthTokens();
        this.isRefreshing = false;
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearAuthTokens();
      this.isRefreshing = false;
      return null;
    }
  }
  
  // 📡 Generic API request handler with auto-refresh
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      console.log('📡 Making API request to:', url);
      
      // Default headers
      const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
      };
      
      // Add auth token if available
      if (this.authToken) {
        headers.Authorization = `Bearer ${this.authToken}`;
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
      });
      
      console.log('📡 Response status:', response.status);
      
      // Check for new token in headers
      const newToken = response.headers.get('X-New-Token');
      if (newToken) {
        console.log('🔄 New token received in headers');
        this.authToken = newToken;
        await AsyncStorage.setItem('access_token', newToken);
      }
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ API request successful:', data);
        return {
          success: true,
          data,
        };
      } else if (response.status === 401 && retryCount === 0) {
        // Token expired, try to refresh
        console.log('🔄 Token expired, attempting refresh...');
        const newToken = await this.refreshAuthToken();
        
        if (newToken) {
          // Retry the request with new token
          return this.makeRequest<T>(endpoint, options, retryCount + 1);
        } else {
          // Refresh failed, return error
          return {
            success: false,
            error: 'Authentication failed',
          };
        }
      } else {
        console.error('❌ API request failed:', data);
        return {
          success: false,
          error: data.message || 'An error occurred',
        };
      }
    } catch (error) {
      console.error('🔥 Network error in API request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
  
  // 📝 Register new user (now with phone number)
  async registerUser(userData: RegisterRequest): Promise<ApiResponse<User>> {
    return this.makeRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }
  
  // 🔐 Login user with email and password
  async loginUser(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.makeRequest<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }
  
  // 👤 Get user profile by ID (now includes phone number)
  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    return this.makeRequest<User>(`/users/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      },
    });
  }
  
  // ✅ Verify user (set isVerified to true) - Method 1 from guide
  async verifyUser(userId: string): Promise<ApiResponse<UserVerificationResponse>> {
    return this.makeRequest<UserVerificationResponse>(`/users/${userId}/verify`, {
      method: 'PATCH',
    });
  }
  
  // ❌ Unverify user (set isVerified to false) - Method 2 from guide
  async unverifyUser(userId: string): Promise<ApiResponse<UserVerificationResponse>> {
    return this.makeRequest<UserVerificationResponse>(`/users/${userId}/unverify`, {
      method: 'PATCH',
    });
  }
  
  // 🔄 Update user fields (including isVerified) - Method 3 from guide
  async updateUser(userId: string, updates: UserUpdateRequest): Promise<ApiResponse<User>> {
    return this.makeRequest<User>(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
  
  // 🔓 Refresh authentication token
  async refreshToken(refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    return this.makeRequest<LoginResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // ✅ Validate token
  async validateToken(): Promise<ApiResponse<TokenValidationResponse>> {
    return this.makeRequest<TokenValidationResponse>('/auth/validate-token', {
      method: 'POST',
    });
  }
  
  // 📱 Send OTP for verification
  async sendOTP(email: string): Promise<ApiResponse<{message: string}>> {
    return this.makeRequest<{message: string}>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }
  
  // ✅ Verify OTP
  async verifyOTP(email: string, otp: string): Promise<ApiResponse<{message: string}>> {
    return this.makeRequest<{message: string}>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }
  
  // 🔒 Change password (protected route)
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<{message: string}>> {
    return this.makeRequest<{message: string}>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }
  
  // 📧 Request password reset
  async requestPasswordReset(email: string): Promise<ApiResponse<{message: string}>> {
    return this.makeRequest<{message: string}>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }
  
  // 🔄 Reset password with token
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<ApiResponse<{message: string}>> {
    return this.makeRequest<{message: string}>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }
  
  // 🚪 Logout user (optional server-side logout)
  async logoutUser(): Promise<ApiResponse<{message: string}>> {
    return this.makeRequest<{message: string}>('/auth/logout', {
      method: 'POST',
    });
  }
}

// 🎯 Create singleton instance
const apiService = new ApiService();

// 🔧 Helper functions for easier usage
export const authAPI = {
  // 📝 Register new user (now with phone number)
  register: (userData: RegisterRequest) => apiService.registerUser(userData),
  
  // 🔐 Login user
  login: (credentials: LoginRequest) => apiService.loginUser(credentials),
  
  // 👤 Get user profile by ID
  getProfile: (userId: string) => apiService.getUserProfile(userId),
  
  // ✅ Verify user (Method 1 from guide)
  verifyUser: (userId: string) => apiService.verifyUser(userId),
  
  // ❌ Unverify user (Method 2 from guide)
  unverifyUser: (userId: string) => apiService.unverifyUser(userId),
  
  // 🔄 Update user fields (Method 3 from guide)
  updateUser: (userId: string, updates: UserUpdateRequest) => apiService.updateUser(userId, updates),
  
  // 📱 Send OTP
  sendOTP: (email: string) => apiService.sendOTP(email),
  
  // ✅ Verify OTP
  verifyOTP: (email: string, otp: string) => apiService.verifyOTP(email, otp),
  
  // 🔒 Change password
  changePassword: (currentPassword: string, newPassword: string) =>
    apiService.changePassword(currentPassword, newPassword),
  
  // 📧 Request password reset
  requestPasswordReset: (email: string) => apiService.requestPasswordReset(email),
  
  // 🔄 Reset password
  resetPassword: (token: string, newPassword: string) =>
    apiService.resetPassword(token, newPassword),
  
  // 🚪 Logout
  logout: () => apiService.logoutUser(),
  
  // 🔑 Set auth tokens
  setTokens: (accessToken: string, refreshToken: string) => apiService.setAuthTokens(accessToken, refreshToken),
  
  // 🚫 Clear auth tokens
  clearTokens: () => apiService.clearAuthTokens(),
  
  // ✅ Validate token
  validateToken: () => apiService.validateToken(),
  
  // 🔓 Refresh token
  refreshToken: (refreshToken: string) => apiService.refreshToken(refreshToken),
};

// 📱 Check if phone number exists in database
export const checkPhoneExists = async (phone: string): Promise<{ exists: boolean; message: string }> => {
  try {
    console.log('🔍 Checking phone existence:', phone);
    
    const response = await fetch(`${API_BASE_URL}/users/check-phone/${phone}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('📡 Phone check response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Phone check failed: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Phone check result:', result);
    
    return {
      exists: result.exists,
      message: result.message,
    };
  } catch (error) {
    console.error('❌ Phone check error:', error);
    throw error;
  }
};

// Export the main service and helper functions
export default apiService;
