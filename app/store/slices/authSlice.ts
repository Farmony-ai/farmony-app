import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../config/api';
import apiInterceptor from '../../services/apiInterceptor';

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
  
  isLoading: true, // Start with loading true to check auth
  isSigningIn: false,
  isSigningUp: false,
  isVerifyingOTP: false,
  isUpdatingUserVerification: false,
  isCreatingProfile: false, // Initialize the new state
  
  error: null,
  
  isOTPRequired: false,
  pendingUserPhone: null,
  pendingUserId: null,
  isForgotPassword: false,
  
  currentScreen: 'signIn',
  otpChannel: null, // Initialize new state
};

// Async action to check auth status from storage
export const checkAuth = createAsyncThunk('auth/checkAuth', async () => {
  console.log('🔄 checkAuth: Attempting to retrieve auth data from AsyncStorage...');
  const token = await AsyncStorage.getItem('token');
  let userJson = await AsyncStorage.getItem('user');
  let user = userJson ? JSON.parse(userJson) : null;

  console.log('🔄 checkAuth: Retrieved token:', token ? 'exists' : 'null');
  console.log('🔄 checkAuth: Retrieved userJson:', userJson ? 'exists' : 'null');

  if (token) {
    if (!user) {
      console.log('⚠️ checkAuth: Token found but user data missing. Attempting to fetch user profile...');
      const decodedToken = decodeJwt(token);
      if (decodedToken && decodedToken.sub) {
        const userId = decodedToken.sub;
        const userProfileResponse = await apiInterceptor.getProfile(userId);
        if (userProfileResponse.success && userProfileResponse.data) {
          user = userProfileResponse.data;
          await AsyncStorage.setItem('user', JSON.stringify(user));
          console.log('✅ checkAuth: Successfully fetched and stored user profile.', user);
        } else {
          console.error('❌ checkAuth: Failed to fetch user profile:', userProfileResponse.error);
          await AsyncStorage.removeItem('token');
          await AsyncStorage.removeItem('user');
          return null;
        }
      } else {
        console.error('❌ checkAuth: Invalid token, cannot decode user ID.');
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        return null;
      }
    }
    console.log('✅ checkAuth: Successfully retrieved and parsed user:', user);
    return { token, user };
  }
  console.log('❌ checkAuth: No valid auth data found in AsyncStorage.');
  return null;
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
      // Assuming the registration endpoint returns the user ID as '_id'
      const userId = result.user?._id; 
      if (!userId) {
        console.error('❌ registerUser: User ID not found in registration response.', result);
        return rejectWithValue('User ID not found after registration.');
      }
      return { userId, phone: userData.phone };
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
      // Step 1: Log in to get a token
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
      const token = loginResult.access_token;
      console.log('✅ loginAndVerifyUser: Login successful, token received.');

      if (!token) {
        console.error('❌ loginAndVerifyUser: Login did not return a token.');
        return rejectWithValue('Login did not return a token.');
      }

      // Step 2: Update verification status using the obtained token and userId
      console.log('🔄 loginAndVerifyUser: Attempting to verify user phone for userId:', credentials.userId);
      const verifyResponse = await fetch(
        `${API_BASE_URL}/users/${credentials.userId}/verify`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
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

      // Step 3: Fetch the final user profile with updated verification status
      console.log('🔄 loginAndVerifyUser: Fetching updated user profile for userId:', credentials.userId);
      const profileResponse = await apiInterceptor.getProfile(credentials.userId);
      if (!profileResponse.success || !profileResponse.data) {
        console.error('❌ loginAndVerifyUser: Failed to fetch user profile after verification.', profileResponse.error);
        return rejectWithValue('Failed to fetch user profile after verification.');
      }
      console.log('✅ loginAndVerifyUser: User profile fetched successfully.', profileResponse.data);

      // Dispatch signIn.fulfilled to update auth state and persist data
      console.log('🔄 loginAndVerifyUser: Dispatching signIn.fulfilled to update auth state.');
      dispatch(signIn.fulfilled({ access_token: token, refresh_token: '', user: profileResponse.data }, '', { emailOrPhone: credentials.phone, password: credentials.password }));

      console.log('✅ loginAndVerifyUser: Completed login and verification process.');
      return { token, user: profileResponse.data };
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
      
      // Handle the new login response format with refresh tokens
      if (result.access_token && result.refresh_token && result.user) {
        // Use the apiInterceptor to handle token storage
        await apiInterceptor.handleLoginResponse(result);
        
        return {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          user: result.user,
        };
      } else {
        throw new Error('Invalid login response format');
      }
    } catch (error) {
      console.error('🔥 Network error during login:', error);
      throw error;
    }
  }
);

// Async action for OTP verification - now handles real verification
export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async (otpData: {phone: string; otp: string; password: string; userId: string | null}, { getState, dispatch }) => {
    try {
      console.log('🔄 Verifying OTP for phone:', otpData.phone);
      
      // Get the current state to access pending user info
      const state = getState() as { auth: AuthState };
      const pendingUserId = otpData.userId || state.auth.pendingUserId; // Use passed userId first
      
      if (!pendingUserId) {
        throw new Error('No pending user found. Please restart the authentication process.');
      }
      
      // Since OTP verification is handled by OTPLess service,
      // we assume OTP is valid if we reach this point
      // Now we need to mark the user as verified
      console.log('✅ OTP verification successful, marking user as verified');
      
      // Dispatch loginAndVerifyUser with the pendingUserId from the state
      dispatch(loginAndVerifyUser({ phone: otpData.phone, password: otpData.password, userId: pendingUserId }));

      // Return success with user verification update
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

// Async action to update user verification status
export const updateUserVerification = createAsyncThunk(
  'auth/updateUserVerification',
  async (userData: { userId: string; isVerified: boolean; token: string }) => {
    try {
      console.log('🔄 Updating user verification status:', userData.userId);
      
      // Method 1: Use the quick verify endpoint from the API guide
      const endpoint = userData.isVerified 
        ? `/users/${userData.userId}/verify`
        : `/users/${userData.userId}/unverify`;
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.token}`,
        },
      });
      
      console.log('📡 User verification response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ User verification failed:', errorData);
        throw new Error(errorData.message || 'User verification failed');
      }
      
      const result = await response.json();
      console.log('✅ User verification updated:', result);
      return result;
    } catch (error) {
      console.error('🔥 Network error during user verification:', error);
      throw error;
    }
  }
);

// Async action to get user profile
export const getUserProfile = createAsyncThunk(
  'auth/getUserProfile',
  async (userData: { userId: string; token: string }) => {
    try {
      console.log('🔄 Getting user profile:', userData.userId);
      
      const response = await fetch(`${API_BASE_URL}/users/${userData.userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
        },
      });
      
      console.log('📡 User profile response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to get user profile:', errorData);
        throw new Error(errorData.message || 'Failed to get user profile');
      }
      
      const result = await response.json();
      console.log('✅ User profile retrieved:', result);
      return result;
    } catch (error) {
      console.error('🔥 Network error during profile retrieval:', error);
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
      
      // Persist auth state
      console.log('🔄 otpLogin: Saving token to AsyncStorage...');
      await AsyncStorage.setItem('token', data.token);
      if (data.user) {
        console.log('🔄 otpLogin: Saving user to AsyncStorage...', data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
      } else {
        console.log('⚠️ otpLogin: data.user is undefined, removing user from AsyncStorage.');
        await AsyncStorage.removeItem('user');
      }
      
      return data; // expects { token, user }
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
      state.pendingUserPhone = action.payload; // phone number
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
      state.isOTPRequired = false;
      state.pendingUserPhone = null;
      state.pendingUserId = null;
      state.currentScreen = 'signIn';
      state.error = null;
      AsyncStorage.removeItem('token');
      AsyncStorage.removeItem('user');
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
          state.user = action.payload.user;
          state.currentScreen = 'authenticated';
          console.log('✅ checkAuth.fulfilled: Auth state set to authenticated.');
        }
        state.isLoading = false;
        console.log('✅ checkAuth.fulfilled: isLoading set to false.');
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        console.log('❌ checkAuth.rejected: isLoading set to false.');
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
        
        // Direct login success with new token format
        state.isAuthenticated = true;
        state.user = action.payload.user || null;
        state.token = action.payload.access_token;
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
          // OTP verified, but we need to update user verification status
          state.isUpdatingUserVerification = true;
          console.log('✅ OTP verified, updating user verification status...');
        } else {
          // Direct success
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
    
    // Update User Verification reducers
    builder
      .addCase(updateUserVerification.pending, (state) => {
        state.isUpdatingUserVerification = true;
        state.error = null;
      })
      .addCase(updateUserVerification.fulfilled, (state, action) => {
        state.isUpdatingUserVerification = false;
        
        // User verification updated successfully
        if (action.payload.user) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
          state.isOTPRequired = false;
          state.pendingUserPhone = null;
          state.pendingUserId = null;
          state.currentScreen = 'authenticated';
        }
        
        state.error = null;
      })
      .addCase(updateUserVerification.rejected, (state, action) => {
        state.isUpdatingUserVerification = false;
        state.error = action.error.message || 'User verification failed';
      });

    builder
      .addCase(loginAndVerifyUser.pending, (state) => {
        state.isSigningIn = true;
        state.error = null;
      })
      .addCase(loginAndVerifyUser.fulfilled, (state, action) => {
        state.isSigningIn = false;
        state.isAuthenticated = true;
        state.user = action.payload.user as unknown as User;
        state.token = action.payload.token;
        state.currentScreen = 'authenticated';
        state.error = null;
        AsyncStorage.setItem('token', action.payload.token);
        AsyncStorage.setItem('user', JSON.stringify(action.payload.user));
      })
      .addCase(loginAndVerifyUser.rejected, (state, action) => {
        state.isSigningIn = false;
        state.error = action.error.message || 'Login and verification failed';
      });
    
    // Get User Profile reducers
    builder
      .addCase(getUserProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(getUserProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to get user profile';
      });

    builder
      .addCase(otpLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user || null;
        state.token = action.payload.token;
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

export const {clearError, setCurrentScreen, logout, resetLoadingStates, startForgotPassword, finishForgotPassword, setOtpChannel} = authSlice.actions;
export default authSlice.reducer;
