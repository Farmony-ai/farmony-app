import axios from 'axios';
import apiInterceptor from './apiInterceptor';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config/api';

export interface Address {
  _id: string;
  addressType?: string; // 'home', 'work', 'farm', etc. (backend field)
  customLabel?: string;
  tag?: string; // For backward compatibility
  addressLine1: string;
  addressLine2?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  state?: string;
  pincode?: string;
  coordinates: [number, number]; // [longitude, latitude] - from location.coordinates in backend
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  isDefault: boolean;
  isActive?: boolean;
  isVerified?: boolean;
  accuracy?: number;
  accessInstructions?: string;
  serviceCategories?: string[];
  lastUsedAt?: string;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressDto {
  userId?: string;
  addressType?: string; // 'home', 'work', 'farm', etc.
  customLabel?: string;
  tag?: string; // For backward compatibility
  addressLine1: string;
  addressLine2?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  state?: string;
  pincode?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  coordinates?: [number, number]; // For backward compatibility
  accuracy?: number;
  isDefault?: boolean;
  isActive?: boolean;
  accessInstructions?: string;
  serviceCategories?: string[];
}

export interface UpdateAddressDto {
  addressType?: string;
  customLabel?: string;
  tag?: string; // For backward compatibility
  addressLine1?: string;
  addressLine2?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  state?: string;
  pincode?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  coordinates?: [number, number]; // For backward compatibility
  accuracy?: number;
  isDefault?: boolean;
  isActive?: boolean;
  accessInstructions?: string;
  serviceCategories?: string[];
}

class AddressService {
  async createAddress(dto: CreateAddressDto): Promise<Address> {
    try {
      if (!dto.userId) {
        throw new Error('User ID is required');
      }

      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/users/${dto.userId}/addresses`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create address');
      }

      // Extract address from response
      const address = result.data.address;

      // Transform to frontend format
      return {
        _id: address._id,
        addressType: address.addressType,
        customLabel: address.customLabel,
        tag: address.customLabel || address.addressType,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        village: address.village,
        tehsil: address.tehsil,
        district: address.district,
        state: address.state,
        pincode: address.pincode,
        coordinates: address.location?.coordinates || [0, 0],
        location: address.location,
        isDefault: address.isDefault || false,
        isActive: address.isActive,
        isVerified: address.isVerified,
        accuracy: address.accuracy,
        accessInstructions: address.accessInstructions,
        serviceCategories: address.serviceCategories,
        lastUsedAt: address.lastUsedAt,
        usageCount: address.usageCount,
        createdAt: address.createdAt,
        updatedAt: address.updatedAt,
      };
    } catch (error: any) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      // Backend stores addresses as embedded documents in the User model
      // We need to fetch the user profile to get addresses
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/users/${userId}`, {
        method: 'GET',
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch user profile');
      }

      // Extract addresses from user object
      const addresses: Address[] = result.data.addresses || [];

      // Transform backend address format to frontend format
      return addresses.map((addr: any) => ({
        _id: addr._id,
        addressType: addr.addressType,
        customLabel: addr.customLabel,
        tag: addr.customLabel || addr.addressType, // Use customLabel or addressType as tag
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        village: addr.village,
        tehsil: addr.tehsil,
        district: addr.district,
        state: addr.state,
        pincode: addr.pincode,
        coordinates: addr.location?.coordinates || [0, 0], // Extract from GeoJSON
        location: addr.location,
        isDefault: addr.isDefault || false,
        isActive: addr.isActive,
        isVerified: addr.isVerified,
        accuracy: addr.accuracy,
        accessInstructions: addr.accessInstructions,
        serviceCategories: addr.serviceCategories,
        lastUsedAt: addr.lastUsedAt,
        usageCount: addr.usageCount,
        createdAt: addr.createdAt,
        updatedAt: addr.updatedAt,
      }));
    } catch (error: any) {
      console.error('Error fetching user addresses:', error);
      throw error;
    }
  }

  async getAddressById(userId: string, addressId: string): Promise<Address> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/users/${userId}/addresses/${addressId}`, {
        method: 'GET',
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch address');
      }

      const addr = result.data.address;

      // Transform to frontend format
      return {
        _id: addr._id,
        addressType: addr.addressType,
        customLabel: addr.customLabel,
        tag: addr.customLabel || addr.addressType,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        village: addr.village,
        tehsil: addr.tehsil,
        district: addr.district,
        state: addr.state,
        pincode: addr.pincode,
        coordinates: addr.location?.coordinates || [0, 0],
        location: addr.location,
        isDefault: addr.isDefault || false,
        isActive: addr.isActive,
        isVerified: addr.isVerified,
        accuracy: addr.accuracy,
        accessInstructions: addr.accessInstructions,
        serviceCategories: addr.serviceCategories,
        lastUsedAt: addr.lastUsedAt,
        usageCount: addr.usageCount,
        createdAt: addr.createdAt,
        updatedAt: addr.updatedAt,
      };
    } catch (error: any) {
      console.error('Error fetching address:', error);
      throw error;
    }
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/users/${userId}/addresses/${addressId}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update address');
      }

      const addr = result.data.address;

      // Transform to frontend format
      return {
        _id: addr._id,
        addressType: addr.addressType,
        customLabel: addr.customLabel,
        tag: addr.customLabel || addr.addressType,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2,
        village: addr.village,
        tehsil: addr.tehsil,
        district: addr.district,
        state: addr.state,
        pincode: addr.pincode,
        coordinates: addr.location?.coordinates || [0, 0],
        location: addr.location,
        isDefault: addr.isDefault || false,
        isActive: addr.isActive,
        isVerified: addr.isVerified,
        accuracy: addr.accuracy,
        accessInstructions: addr.accessInstructions,
        serviceCategories: addr.serviceCategories,
        lastUsedAt: addr.lastUsedAt,
        usageCount: addr.usageCount,
        createdAt: addr.createdAt,
        updatedAt: addr.updatedAt,
      };
    } catch (error: any) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/users/${userId}/addresses/${addressId}`, {
        method: 'DELETE',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete address');
      }

      console.log('✅ Address deleted successfully');
    } catch (error: any) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<any> {
    try {
      // Backend has UsersService.setDefaultAddress(userId, addressId) but it's not exposed via REST API
      // TODO: Backend needs to implement PATCH /users/:userId/default-address endpoint
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/users/${userId}/default-address`, {
        method: 'PATCH',
        body: JSON.stringify({ addressId }),
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to set default address');
      }

      console.log('✅ Default address set successfully:', result.data);
      return result.data;
    } catch (error: any) {
      console.error('Error setting default address:', error);
      throw error;
    }
  }


  

  async reverseGeocode(latitude: number, longitude: number): Promise<any> {
    try {
      // This will need Google Maps API key configuration
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      return response.data;
    } catch (error: any) {
      console.error('--- DETAILED REVERSE GEOCODING ERROR ---');
      if (error.isAxiosError) {
        console.error('Axios Error:', {
          message: error.message,
          code: error.code,
          config: {
            url: error.config?.url,
            method: error.config?.method,
          },
          request: error.request ? 'Request object exists' : 'No request object',
          response: error.response ? {
            data: error.response.data,
            status: error.response.status,
          } : 'No response object',
        });
      } else {
        console.error('Non-Axios Error:', error);
      }
      console.error('-----------------------------------------');
      throw error;
    }
  }

  async searchPlaces(query: string): Promise<any> {
    try {
      // This will need Google Maps API key configuration
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${query}&key=${GOOGLE_MAPS_API_KEY}&components=country:in`
      );
      return response.data;
    } catch (error: any) {
      console.error('--- DETAILED SEARCH PLACES ERROR ---');
       if (error.isAxiosError) {
        console.error('Axios Error:', {
          message: error.message,
          code: error.code,
          config: {
            url: error.config?.url,
            method: error.config?.method,
          },
          request: error.request ? 'Request object exists' : 'No request object',
          response: error.response ? {
            data: error.response.data,
            status: error.response.status,
          } : 'No response object',
        });
      } else {
        console.error('Non-Axios Error:', error);
      }
      console.error('------------------------------------');
      throw error;
    }
  }
}

export default new AddressService();