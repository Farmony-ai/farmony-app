import axios from 'axios';
import apiInterceptor from './apiInterceptor';
import { API_BASE_URL, GOOGLE_MAPS_API_KEY } from '../config/api';

export interface Address {
  _id: string;
  userId: string;
  tag: string; // Changed from enum to string to allow free-text names
  addressLine1: string;
  addressLine2?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  state: string;
  pincode: string;
  coordinates: [number, number]; // [longitude, latitude]
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressDto {
  userId?: string;
  tag: string; // Changed from enum to string
  addressLine1: string;
  addressLine2?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  state: string;
  pincode: string;
  coordinates: [number, number];
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  tag?: string; // Changed from enum to string
  addressLine1?: string;
  addressLine2?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  state?: string;
  pincode?: string;
  coordinates?: [number, number];
  isDefault?: boolean;
}

class AddressService {
  async createAddress(dto: CreateAddressDto): Promise<Address> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Address>('/addresses', {
        method: 'POST',
        body: JSON.stringify(dto),
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create address');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error creating address:', error);
      throw error;
    }
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Address[]>(`/addresses/user/${userId}`, {
        method: 'GET',
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch addresses');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error fetching user addresses:', error);
      throw error;
    }
  }

  async getAddressById(id: string): Promise<Address> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Address>(`/addresses/${id}`, {
        method: 'GET',
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch address');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error fetching address:', error);
      throw error;
    }
  }

  async updateAddress(id: string, dto: UpdateAddressDto): Promise<Address> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Address>(`/addresses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(dto),
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update address');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error updating address:', error);
      throw error;
    }
  }

  async deleteAddress(id: string): Promise<Address> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Address>(`/addresses/${id}`, {
        method: 'DELETE',
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to delete address');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error deleting address:', error);
      throw error;
    }
  }

  async setDefaultAddress(id: string): Promise<Address> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Address>(`/addresses/${id}/set-default`, {
        method: 'PATCH',
        body: JSON.stringify({}),
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