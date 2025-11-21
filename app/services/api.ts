// 🌾 Rural Share API Service
// This service handles all API calls to the Rural Share backend
// Built with clean, readable code that feels like plain english

import { API_BASE_URL } from '../config/api';
import apiInterceptor from './apiInterceptor';

interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'individual' | 'SHG' | 'FPO';
}

interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'individual' | 'SHG' | 'FPO' | 'admin';
  isVerified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'none';
  // Newly supported optional fields from backend
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  // ISO string (e.g., "1995-09-22T00:00:00.000Z") or date-only string ("YYYY-MM-DD")
  dateOfBirth?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserUpdateRequest {
  name?: string;
  phone?: string;
  isVerified?: boolean;
  kycStatus?: 'pending' | 'approved' | 'rejected';
  // Allow minimal partial updates for profile fields per backend docs
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  // Send as YYYY-MM-DD per backend examples
  dateOfBirth?: string;
}

// 📧 Helper functions for easier usage
export const authAPI = {
  // 📝 Register new user
  register: async (userData: RegisterRequest) => {
    const response = await fetch(`${API_BASE_URL}/identity/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }
    
    const data = await response.json();
    
    // Handle auto-login response
    if (data.access_token && data.refresh_token && data.user) {
      await apiInterceptor.handleLoginResponse(data);
    }
    
    return data;
  },
  
  // 🔐 Login user
  login: async (credentials: LoginRequest) => {
    const response = await fetch(`${API_BASE_URL}/identity/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }
    
    const data = await response.json();
    await apiInterceptor.handleLoginResponse(data);
    return data;
  },
  
  // 📱 OTP Login
  otpLogin: async (phone: string) => {
    const response = await fetch(`${API_BASE_URL}/identity/auth/otp-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'OTP login failed');
    }
    
    const data = await response.json();
    await apiInterceptor.handleLoginResponse(data);
    return data;
  },
  
  // 🔄 Refresh token
  refreshToken: async (refreshToken: string) => {
    const response = await fetch(`${API_BASE_URL}/identity/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Token refresh failed');
    }
    
    const data = await response.json();
    await apiInterceptor.handleLoginResponse(data);
    return data;
  },
  
  // ✅ Validate token
  validateToken: () => apiInterceptor.validateToken(),
  
  // 🚪 Logout
  logout: () => apiInterceptor.logout(),
};

// 👤 User API
export const usersAPI = {
  // Get user profile
  getProfile: (userId: string) => apiInterceptor.getProfile(userId),

  // Update user
  updateUser: async (userId: string, updates: UserUpdateRequest) => {
    return apiInterceptor.makeAuthenticatedRequest(`/identity/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Verify user
  verifyUser: async (userId: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/identity/users/${userId}/verify`, {
      method: 'PATCH',
    });
  },

  // Unverify user
  unverifyUser: async (userId: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/identity/users/${userId}/unverify`, {
      method: 'PATCH',
    });
  },

  // Upload profile picture
  uploadProfilePicture: async (userId: string, formData: FormData) => {
    return apiInterceptor.makeAuthenticatedRequest(`/identity/users/${userId}/profile-picture`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - FormData sets it automatically with boundary
    });
  },

  // Delete profile picture
  deleteProfilePicture: async (userId: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/identity/users/${userId}/profile-picture`, {
      method: 'DELETE',
    });
  },

  // Check if phone exists
  checkPhone: async (phone: string) => {
    const url = `${API_BASE_URL}/identity/users/check-phone/${phone}`;
    console.log('[usersAPI.checkPhone] ➜ GET', url);
    const startedAt = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const durationMs = Date.now() - startedAt;
    console.log('[usersAPI.checkPhone] ⇦ status:', response.status, 'in', durationMs + 'ms');

    let body: any = null;
    try {
      body = await response.json();
    } catch (e) {
      console.log('[usersAPI.checkPhone] ⚠️ Non-JSON response or parse error:', e);
    }

    if (!response.ok) {
      console.log('[usersAPI.checkPhone] ❌ Error body:', body);
      throw new Error(`Phone check failed: ${response.status}`);
    }
    console.log('[usersAPI.checkPhone] ✅ Body:', body);
    return body;
  },
};

export const checkPhoneExists = async (phone: string) => {
  const response = await fetch(`${API_BASE_URL}/identity/users/check-phone/${phone}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Phone check failed: ${response.status}`);
  }

  return response.json();
};


// 📦 Listings API
export const listingsAPI = {
  // Search listings
  search: async (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiInterceptor.makeAuthenticatedRequest(`/listings/search?${queryString}`, {
      method: 'GET',
    });
  },
  
  // Get all listings
  getAll: async (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    return apiInterceptor.makeAuthenticatedRequest(`/listings?${queryString}`, {
      method: 'GET',
    });
  },
  
  // Get listing by ID
  getById: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/listings/${id}`, {
      method: 'GET',
    });
  },
  
  // Create listing
  create: async (formData: FormData) => {
    return apiInterceptor.makeAuthenticatedRequest('/listings', {
      method: 'POST',
      body: formData,
      // Don't set Content-Type for FormData
    });
  },
  
  // Update listing
  update: async (id: string, data: any) => {
    return apiInterceptor.makeAuthenticatedRequest(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  // Delete listing
  delete: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/listings/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Get listings by provider
  getByProvider: async (providerId: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/listings/provider/${providerId}`, {
      method: 'GET',
    });
  },
  
  // Refresh URLs
  refreshUrls: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/listings/${id}/refresh-urls`, {
      method: 'POST',
    });
  },
  
  // Get nearby listings
  nearby: async (lat: number, lng: number, distance: number) => {
    const params = { lat, lng, distance };
    const queryString = new URLSearchParams(params as any).toString();
    return apiInterceptor.makeAuthenticatedRequest(`/listings/nearby?${queryString}`, {
      method: 'GET',
    });
  },
  
  // Public listings (no auth required)
  public: async (params: any) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/listings/public?${queryString}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch listings');
    }
    
    return response.json();
  },
};

// 📋 Orders API
export const ordersAPI = {
  // Create order
  create: async (data: any) => {
    // 🧾 DEBUG: Log the payload at the API layer as well
    try {
      const pretty = JSON.stringify(data, null, 2);
      console.log('[ordersAPI.create] ➜ POST /orders with body:\n', pretty);
    } catch (e) {
      console.log('[ordersAPI.create] ➜ POST /orders with body (raw object):', data);
    }
    return apiInterceptor.makeAuthenticatedRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // Get all orders
  getAll: async () => {
    return apiInterceptor.makeAuthenticatedRequest('/orders', {
      method: 'GET',
    });
  },
  
  // Get order by ID
  getById: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/orders/${id}`, {
      method: 'GET',
    });
  },
  
  // Get orders by seeker
  getBySeeker: async (seekerId: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/orders/seeker/${seekerId}`, {
      method: 'GET',
    });
  },
  
  // Get orders by provider
  getByProvider: async (providerId: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/orders/provider/${providerId}`, {
      method: 'GET',
    });
  },
  
  // Update order status
  updateStatus: async (id: string, status: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
  
  // Get provider summary
  getProviderSummary: async (providerId: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/orders/provider/${providerId}/summary`, {
      method: 'GET',
    });
  },
};

// 📚 Catalogue API
export const catalogueAPI = {
  // Get all catalogue items
  getAll: async (category?: string) => {
    const params = category ? `?category=${category}` : '';
    return apiInterceptor.makeAuthenticatedRequest(`/catalogue${params}`, {
      method: 'GET',
    });
  },
  
  // Get categories
  getCategories: async (category?: string) => {
    const params = category ? `?category=${category}` : '';
    return apiInterceptor.makeAuthenticatedRequest(`/catalogue/categories${params}`, {
      method: 'GET',
    });
  },
  
  // Get hierarchy
  getHierarchy: async () => {
    return apiInterceptor.makeAuthenticatedRequest('/catalogue/hierarchy', {
      method: 'GET',
    });
  },
  
  // Get by ID
  getById: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/catalogue/${id}`, {
      method: 'GET',
    });
  },
  
  // Get subcategories
  getSubcategories: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/catalogue/${id}/subcategories`, {
      method: 'GET',
    });
  },
};

// 📍 Addresses API
export const addressesAPI = {
  // Create address
  create: async (data: any) => {
    return apiInterceptor.makeAuthenticatedRequest('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  // Get addresses by user
  getByUser: async (userId: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/addresses/user/${userId}`, {
      method: 'GET',
    });
  },
  
  // Get address by ID
  getById: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/addresses/${id}`, {
      method: 'GET',
    });
  },
  
  // Update address
  update: async (id: string, data: any) => {
    return apiInterceptor.makeAuthenticatedRequest(`/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  // Delete address
  delete: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/addresses/${id}`, {
      method: 'DELETE',
    });
  },
  
  // Set default address
  setDefault: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/addresses/${id}/set-default`, {
      method: 'PATCH',
    });
  },
};

// 💬 Chat API
export const chatAPI = {
  // Get all chats
  getAll: async () => {
    return apiInterceptor.makeAuthenticatedRequest('/chat', {
      method: 'GET',
    });
  },
  
  // Get chat by ID
  getById: async (id: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/chat/${id}`, {
      method: 'GET',
    });
  },
  
  // Send message
  sendMessage: async (chatId: string, message: string) => {
    return apiInterceptor.makeAuthenticatedRequest(`/chat/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },
};

// 🎯 Export all APIs
export default {
  auth: authAPI,
  users: usersAPI,
  listings: listingsAPI,
  orders: ordersAPI,
  catalogue: catalogueAPI,
  addresses: addressesAPI,
  chat: chatAPI,
};

