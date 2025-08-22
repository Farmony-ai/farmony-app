import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';
import apiInterceptor from '../../services/apiInterceptor';

// Storage keys constants - matching apiInterceptor
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  TOKEN_EXPIRY: 'token_expiry',
};

// Helper to decode JWT token
const decodeJwt = (token: string) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding JWT:', e);
    return null;
  }
};

// Helper functions for auth data persistence
const saveAuthData = async (accessToken: string, refreshToken: string, user: any, expiresIn: number = 900) => {
  try {
    const expiryTime = new Date().getTime() + (expiresIn * 1000);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
      [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
      [STORAGE_KEYS.USER, JSON.stringify(user)],
      [STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString()],
      ['token', accessToken], // Legacy key for backward compatibility
      ['user', JSON.stringify(user)], // Legacy key
    ]);
    
    console.log('✅ Auth data saved successfully');
  } catch (error) {
    console.error('❌ Error saving auth data:', error);
  }
};

const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.TOKEN_EXPIRY,
      'token', // Legacy key
      'user',  // Legacy key
    ]);
    console.log('✅ Auth data cleared');
  } catch (error) {
    console.error('❌ Error clearing auth data:', error);
  }
};

// Types for authentication state
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'individual' | 'SHG' | 'FPO' | 'admin';
  isVerified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'none';
}

interface AuthState {
  // Authentication status
  isAuthenticated: boolean;
  user: User | null; 
  token: string | null;
  refreshToken: string | null;
  
  // Loading states for better UX
  isLoading: boolean;
  isSigningIn: boolean;
  isSigningUp: boolean;
  isVerifyingOTP: boolean;
  isUpdatingUserVerification: boolean;
  isCreatingProfile: boolean;
  
  // Error handling
  error: string | null;
  
  // OTP verification state
  isOTPRequired: boolean;
  pendingUserPhone: string | null;
  pendingUserId: string | null;
  // Forgot-password flow flag
  isForgotPassword: boolean;
  
  // Screen navigation state
  currentScreen: 'signIn' | 'signUp' | 'otp' | 'authenticated' | 'forgotPassword';
  otpChannel: 'sms' | 'whatsapp' | null;
}

// Initial state - clean and organized
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  
  isLoading: true, // Start with loading true to check auth
  isSigningIn: false,
  isSigningUp: false,
  isVerifyingOTP: false,
  isUpdatingUserVerification: false,
  isCreatingProfile: false,
  
  error: null,
  
  isOTPRequired: false,
  pendingUserPhone: null,
  pendingUserId: null,
  isForgotPassword: false,
  
  currentScreen: 'signIn',
  otpChannel: null,
};

// Debug helper
const debugAsyncStorage = async () => {
  try {
    const keys = [
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.TOKEN_EXPIRY,
      'token',
      'user'
    ];
    const values = await AsyncStorage.multiGet(keys);
    
    console.log('=== AsyncStorage Debug ===');
    values.forEach(([key, value]) => {
      console.log(`${key}: ${value ? value.substring(0, 50) + '...' : 'null'}`);
    });
    console.log('========================');
  } catch (error) {
    console.error('Debug error:', error);
  }
};

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  console.log('🔄 checkAuth: Checking authentication status...');
  try {
    const [[, accessToken], [, refreshToken], [, userJson]] = await AsyncStorage.multiGet([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);

    if (!accessToken || !userJson) {
      console.log('❌ checkAuth: No token or user found.');
      return rejectWithValue('No token or user found.');
    }

    // At this point, we assume the user is "authenticated" from the client's perspective.
    // We will let the apiInterceptor handle refreshing the token when the first
    // authenticated API call is made. This avoids making a network request on every app start.

    const user = JSON.parse(userJson);
    return { token: accessToken, refreshToken, user };

  } catch (error: any) {
    console.error('❌ checkAuth: Error reading from AsyncStorage:', error);
    return rejectWithValue(error.message || 'Failed to check auth status');
  }
});


export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (
    userData: {
      name: string;
      email: string;
      phone: string;
      password: string;
      role: 'individual' | 'SHG' | 'FPO';
    },
    {rejectWithValue},
  ) => {
    try {
      console.log('🔄 registerUser: Attempting to register user...', userData.phone);
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(userData),
      });

      console.log('📡 registerUser: Registration response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ registerUser: Registration failed:', errorData);
        return rejectWithValue(errorData.message || 'Registration failed');
      }

      const result = await response.json();
      console.log('✅ registerUser: Registration successful, response:', result);
      
      // Handle new registration response format with tokens
      if (result.access_token && result.refresh_token && result.user) {
        // Use apiInterceptor to handle token storage
        await apiInterceptor.handleLoginResponse({
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          expires_in: result.expires_in || 900,
          token_type: result.token_type || 'Bearer',
          user: result.user
        });
        
        // Also save token expiry
        const expiryTime = new Date().getTime() + ((result.expires_in || 900) * 1000);
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
        
        // Save legacy token
        await AsyncStorage.setItem('token', result.access_token);
        
        return { 
          userId: result.user.id || result.user._id,
          phone: userData.phone,
          token: result.access_token,
          refreshToken: result.refresh_token,
          user: result.user,
          autoLoggedIn: true
        };
      }
      
      // Legacy response format
      const userId = result.user?._id;
      if (!userId) {
        console.error('❌ registerUser: User ID not found in registration response.', result);
        return rejectWithValue('User ID not found after registration.');
      }
      return { userId, phone: userData.phone, autoLoggedIn: false };
    } catch (error: any) {
      console.error('🔥 Network error during registration:', error);
      return rejectWithValue(error.message);
    }
  },
);

export const loginAndVerifyUser = createAsyncThunk(
  'auth/loginAndVerifyUser',
  async (credentials: { phone: string; password: string; userId: string }, { rejectWithValue, dispatch }) => {
    try {
      console.log('🔄 loginAndVerifyUser: Attempting login and verification for userId:', credentials.userId);
      
      // Step 1: Log in to get tokens
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: credentials.phone,
          password: credentials.password,
        }),
      });

      console.log('📡 loginAndVerifyUser: Login response status:', loginResponse.status);

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        console.error('❌ loginAndVerifyUser: Login failed:', errorData);
        return rejectWithValue(errorData.message || 'Login failed after OTP verification');
      }
      
      const loginResult = await loginResponse.json();
      
      // Extract tokens based on response format
      const accessToken = loginResult.access_token || loginResult.token;
      const refreshToken = loginResult.refresh_token || '';
      const expiresIn = loginResult.expires_in || 900;
      
      if (!accessToken) {
        console.error('❌ loginAndVerifyUser: Login did not return a token.');
        return rejectWithValue('Login did not return a token.');
      }

      // Step 2: Update verification status
      console.log('🔄 loginAndVerifyUser: Attempting to verify user phone for userId:', credentials.userId);
      const verifyResponse = await fetch(
        `${API_BASE_URL}/users/${credentials.userId}/verify`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      console.log('📡 loginAndVerifyUser: Verify response status:', verifyResponse.status);

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        console.error('❌ loginAndVerifyUser: User verification failed:', errorData);
        return rejectWithValue(errorData.message || 'User verification failed');
      }
      
      console.log('✅ loginAndVerifyUser: User phone verified successfully.');

      // Step 3: Get updated user profile using apiInterceptor
      const profileResponse = await apiInterceptor.getProfile(credentials.userId);
      
      if (!profileResponse.success || !profileResponse.data) {
        console.error('❌ Failed to fetch user profile');
        return rejectWithValue('Failed to fetch user profile');
      }
      
      const userProfile = profileResponse.data;
      console.log('✅ loginAndVerifyUser: User profile fetched successfully.', userProfile);

      // Use apiInterceptor to handle token storage
      await apiInterceptor.handleLoginResponse({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        token_type: loginResult.token_type || 'Bearer',
        user: userProfile
      });
      
      // Also save token expiry
      const expiryTime = new Date().getTime() + (expiresIn * 1000);
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      
      // Save legacy token
      await AsyncStorage.setItem('token', accessToken);

      console.log('✅ loginAndVerifyUser: Completed login and verification process.');
      return { token: accessToken, refreshToken, user: userProfile };
    } catch (error: any) {
      console.error('🔥 Network error during login and verification:', error);
      return rejectWithValue(error.message);
    }
  },
);

// Async action for user login
export const signIn = createAsyncThunk(
  'auth/signIn',
  async (credentials: {emailOrPhone: string; password: string}) => {
    try {
      console.log('🔄 Attempting to sign in user:', credentials.emailOrPhone);

      let requestBody: { email?: string; phone?: string; password: string };

      // Simple regex to check if it's likely an email
      if (credentials.emailOrPhone.includes('@') && credentials.emailOrPhone.includes('.')) {
        requestBody = { email: credentials.emailOrPhone, password: credentials.password };
      } else {
        // Assume it's a phone number if it's not an email
        requestBody = { phone: credentials.emailOrPhone, password: credentials.password };
      }

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Login failed:', errorData);
        throw new Error(errorData.message || 'Login failed');
      }
      
      const result = await response.json();
      console.log('✅ Login successful:', result);
      
      // Handle both new and legacy response formats
      const accessToken = result.access_token || result.token;
      const refreshToken = result.refresh_token || '';
      const expiresIn = result.expires_in || 900;
      const user = result.user;
      
      if (!accessToken || !user) {
        throw new Error('Invalid login response format');
      }
      
      // Use apiInterceptor to handle token storage
      await apiInterceptor.handleLoginResponse({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        token_type: result.token_type || 'Bearer',
        user: user
      });
      
      // Also save token expiry for our auth slice
      const expiryTime = new Date().getTime() + (expiresIn * 1000);
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      
      // Save legacy token for backward compatibility
      await AsyncStorage.setItem('token', accessToken);
      
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: user,
      };
    } catch (error) {
      console.error('🔥 Network error during login:', error);
      throw error;
    }
  }
);

// Async action for OTP verification
export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (otpData: {phone: string; otp: string; password: string; userId: string | null}, { getState, dispatch }) => {
    try {
      console.log('🔄 Verifying OTP for phone:', otpData.phone);
      
      const state = getState() as { auth: AuthState };
      const pendingUserId = otpData.userId || state.auth.pendingUserId;
      
      if (!pendingUserId) {
        throw new Error('No pending user found. Please restart the authentication process.');
      }
      
      console.log('✅ OTP verification successful, marking user as verified');
      
      // Dispatch loginAndVerifyUser
      dispatch(loginAndVerifyUser({ phone: otpData.phone, password: otpData.password, userId: pendingUserId }));

      return {
        success: true,
        userId: pendingUserId,
        phone: otpData.phone,
        requiresUserVerification: true,
      };
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      throw error;
    }
  }
);

// Async action for OTP login (forgot-password / passwordless sign-in)
export const otpLogin = createAsyncThunk(
  'auth/otpLogin',
  async (payload: { phone: string }) => {
    try {
      console.log('🔄 Attempting OTP login for phone:', payload.phone);
      const response = await fetch(`${API_BASE_URL}/auth/otp-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: payload.phone }),
      });
      
      console.log('📡 OTP login status:', response.status);
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'OTP login failed');
      }
      
      const data = await response.json();
      console.log('✅ OTP login success:', data);
      
      // Handle both response formats
      const accessToken = data.access_token || data.token;
      const refreshToken = data.refresh_token || '';
      const expiresIn = data.expires_in || 900;
      const user = data.user;
      
      if (!accessToken || !user) {
        throw new Error('Invalid OTP login response');
      }
      
      // Use apiInterceptor to handle token storage
      await apiInterceptor.handleLoginResponse({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: expiresIn,
        token_type: data.token_type || 'Bearer',
        user: user
      });
      
      // Also save token expiry
      const expiryTime = new Date().getTime() + (expiresIn * 1000);
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime.toString());
      
      // Save legacy token
      await AsyncStorage.setItem('token', accessToken);
      
      return {
        token: accessToken,
        refreshToken,
        user,
      };
    } catch (error) {
      console.error('❌ OTP login error:', error);
      throw error;
    }
  }
);

// The main auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clear any errors
    clearError: (state) => {
      state.error = null;
    },
    
    // Navigate between auth screens
    setCurrentScreen: (state, action) => {
      state.currentScreen = action.payload;
    },

    // Start forgot-password flow
    startForgotPassword: (state, action) => {
      state.error = null;
      state.pendingUserPhone = action.payload;
      state.isForgotPassword = true;
      state.currentScreen = 'otp';
    },

    // Reset forgot-password flags on completion
    finishForgotPassword: (state) => {
      state.isForgotPassword = false;
      state.pendingUserPhone = null;
    },
    
    // Logout user completely
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isOTPRequired = false;
      state.pendingUserPhone = null;
      state.pendingUserId = null;
      state.currentScreen = 'signIn';
      state.error = null;
      // Use apiInterceptor's logout method which handles clearing tokens
      apiInterceptor.logout();
    },
    
    // Reset all loading states
    resetLoadingStates: (state) => {
      state.isLoading = false;
      state.isSigningIn = false;
      state.isSigningUp = false;
      state.isVerifyingOTP = false;
      state.isUpdatingUserVerification = false;
    },

    // Set the active OTP channel
    setOtpChannel: (state, action: PayloadAction<'sms' | 'whatsapp'>) => {
      state.otpChannel = action.payload;
    },
    
    // Update tokens (useful when refresh happens in background)
    updateTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.token = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
  },
  
  extraReducers: (builder) => {
    // Check Auth reducers
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        console.log('✅ checkAuth.fulfilled: Payload received:', action.payload ? 'exists' : 'null');
        if (action.payload) {
          state.isAuthenticated = true;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken || null;
          state.user = action.payload.user;
          state.currentScreen = 'authenticated';
          console.log('✅ checkAuth.fulfilled: Auth state set to authenticated.');
        } else {
          state.isAuthenticated = false;
          state.token = null;
          state.refreshToken = null;
          state.user = null;
        }
        state.isLoading = false;
        console.log('✅ checkAuth.fulfilled: isLoading set to false.');
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        console.log('❌ checkAuth.rejected: isLoading set to false.');
      });

    // Register User reducers
    builder
      .addCase(registerUser.pending, (state) => {
        state.isSigningUp = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isSigningUp = false;
        
        if (action.payload.autoLoggedIn && action.payload.token) {
          // New register endpoint that returns tokens
          state.isAuthenticated = true;
          state.token = action.payload.token;
          state.refreshToken = action.payload.refreshToken || null;
          state.user = action.payload.user;
          state.currentScreen = 'authenticated';
          state.isOTPRequired = false;
        } else {
          // Legacy flow - needs OTP
          state.pendingUserId = action.payload.userId;
          state.pendingUserPhone = action.payload.phone;
          state.currentScreen = 'otp';
          state.isOTPRequired = true;
        }
        
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isSigningUp = false;
        state.error = action.payload as string || 'Registration failed';
      });
    
    // Sign In reducers
    builder
      .addCase(signIn.pending, (state) => {
        state.isSigningIn = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isSigningIn = false;
        console.log('✅ signIn.fulfilled: Payload received:', action.payload);
        
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token || null;
        state.currentScreen = 'authenticated';
        console.log('✅ signIn.fulfilled: Login successful, auth state set.');
        
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isSigningIn = false;
        state.error = action.error.message || 'Login failed';
      });
    
    // OTP Verification reducers
    builder
      .addCase(verifyOTP.pending, (state) => {
        state.isVerifyingOTP = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isVerifyingOTP = false;
        
        if (action.payload.requiresUserVerification) {
          state.isUpdatingUserVerification = true;
          console.log('✅ OTP verified, updating user verification status...');
        } else {
          state.isAuthenticated = true;
          state.isOTPRequired = false;
          state.pendingUserPhone = null;
          state.pendingUserId = null;
          state.currentScreen = 'authenticated';
        }
        
        state.error = null;
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isVerifyingOTP = false;
        state.error = action.error.message || 'OTP verification failed';
      });

    // Login and Verify User reducers
    builder
      .addCase(loginAndVerifyUser.pending, (state) => {
        state.isSigningIn = true;
        state.error = null;
      })
      .addCase(loginAndVerifyUser.fulfilled, (state, action) => {
        state.isSigningIn = false;
        state.isAuthenticated = true;
        state.user = action.payload.user as User;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken || null;
        state.currentScreen = 'authenticated';
        state.isOTPRequired = false;
        state.pendingUserPhone = null;
        state.pendingUserId = null;
        state.error = null;
      })
      .addCase(loginAndVerifyUser.rejected, (state, action) => {
        state.isSigningIn = false;
        state.error = action.payload as string || 'Login and verification failed';
      });

    // OTP Login reducers
    builder
      .addCase(otpLogin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(otpLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken || null;
        state.currentScreen = 'authenticated';
        state.isForgotPassword = false;
        console.log('✅ otpLogin.fulfilled: OTP login successful, auth state set.');
      })
      .addCase(otpLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'OTP login failed';
        state.isForgotPassword = false;
      });
  },
});

export const {
  clearError, 
  setCurrentScreen, 
  logout, 
  resetLoadingStates, 
  startForgotPassword, 
  finishForgotPassword, 
  setOtpChannel,
  updateTokens
} = authSlice.actions;

export default authSlice.reducer;