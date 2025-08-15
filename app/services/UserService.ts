import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const BASE_URL = API_BASE_URL;

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'individual' | 'SHG' | 'FPO' | 'admin';
  isVerified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'none';
}

class UserService {
  private getAuthHeaders(token?: string) {
    return token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};
  }

  async getUserById(userId: string, token?: string): Promise<UserProfile> {
    try {
      const response = await axios.get(`${BASE_URL}/users/${userId}` , this.getAuthHeaders(token));
      return response.data as UserProfile;
    } catch (error: any) {
      console.error('UserService.getUserById error:', error?.response?.data || error?.message);
      throw new Error(error?.response?.data?.message || 'Failed to fetch user profile');
    }
  }
}

export default new UserService();


