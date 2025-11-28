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

      // Extract userId for URL, don't send it in the body (backend gets it from URL param)
      const { userId, ...bodyData } = dto;

      console.log('AddressService.createAddress - Sending request to:', `/identity/users/${userId}/addresses`);
      console.log('AddressService.createAddress - Body:', JSON.stringify(bodyData, null, 2));

      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/identity/users/${userId}/addresses`, {
        method: 'POST',
        body: JSON.stringify(bodyData),
      });

      console.log('AddressService.createAddress - Response:', JSON.stringify(result, null, 2));

      if (!result.success || !result.data) {
        console.error('AddressService.createAddress - Failed:', result.error);
        throw new Error(result.error || 'Failed to create address');
      }

      // Extract address from response - handle both { address: {...} } and direct object
      const address = result.data.address || result.data;

      if (!address || !address._id) {
        console.error('AddressService.createAddress - Invalid address response:', result.data);
        throw new Error('Invalid address response from server');
      }

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
      console.error('AddressService.createAddress - Error:', error?.message || error);
      throw error;
    }
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      // Fetch addresses from the correct endpoint
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/identity/users/${userId}/addresses`, {
        method: 'GET',
      });

      if (!result.success || !result.data) {
        // Return empty array if no addresses found (not an error state)
        return [];
      }

      // Extract addresses from response - handle both array and object with addresses property
      const addresses: Address[] = Array.isArray(result.data)
        ? result.data
        : (result.data.addresses || []);

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
      // Return empty array for any error - the user just has no addresses yet
      console.log('getUserAddresses error (returning empty array):', error?.message);
      return [];
    }
  }

  async getAddressById(userId: string, addressId: string): Promise<Address> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/identity/users/${userId}/addresses/${addressId}`, {
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
      throw error;
    }
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/identity/users/${userId}/addresses/${addressId}`, {
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
      throw error;
    }
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/identity/users/${userId}/addresses/${addressId}`, {
        method: 'DELETE',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete address');
      }

    } catch (error: any) {
      throw error;
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<any> {
    try {
      // Backend has UsersService.setDefaultAddress(userId, addressId) but it's not exposed via REST API
      // TODO: Backend needs to implement PATCH /users/:userId/default-address endpoint
      const result = await apiInterceptor.makeAuthenticatedRequest<any>(`/identity/users/${userId}/default-address`, {
        method: 'PATCH',
        body: JSON.stringify({ addressId }),
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to set default address');
      }

      return result.data;
    } catch (error: any) {
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
      throw error;
    }
  }
}

export default new AddressService();