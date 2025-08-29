import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) throw new Error('Authentication token not found');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async createAddress(dto: CreateAddressDto): Promise<Address> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/addresses`,
        dto,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error creating address:', error);
      throw error.response?.data || error;
    }
  }

  async getUserAddresses(userId: string): Promise<Address[]> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/addresses/user/${userId}`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user addresses:', error);
      throw error.response?.data || error;
    }
  }

  async getAddressById(id: string): Promise<Address> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/addresses/${id}`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching address:', error);
      throw error.response?.data || error;
    }
  }

  async updateAddress(id: string, dto: UpdateAddressDto): Promise<Address> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.patch(
        `${API_BASE_URL}/addresses/${id}`,
        dto,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating address:', error);
      throw error.response?.data || error;
    }
  }

  async deleteAddress(id: string): Promise<Address> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.delete(
        `${API_BASE_URL}/addresses/${id}`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error deleting address:', error);
      throw error.response?.data || error;
    }
  }

  async setDefaultAddress(id: string): Promise<Address> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await axios.patch(
        `${API_BASE_URL}/addresses/${id}/set-default`,
        {},
        { headers }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error setting default address:', error);
      throw error.response?.data || error;
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