
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { Category, SubCategory } from './CatalogueService';

const BASE_URL = API_BASE_URL;

// Interface for populated listing structure
export interface PopulatedListingInBooking {
  _id: string;
  title: string;
  categoryId: Category;
  subCategoryId: SubCategory;
  category?: string;
  subcategory?: string;
  [key: string]: any;
}

export interface SeekerBooking {
  _id: string;
  listingId: string | PopulatedListingInBooking;
  listingTitle?: string;
  providerId: string;
  providerName?: string;
  providerPhone?: string;
  seekerId: string;
  seekerName?: string;
  serviceType?: string;
  category?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  scheduledDate: string;
  scheduledTime?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  totalCost: number;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  paymentMethod?: string;
  location?: {
    address?: string;
    coordinates?: [number, number];
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

class SeekerService {
  private getAuthHeaders(token?: string) {
    return token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};
  }

  async getBookings(seekerId: string, token?: string): Promise<SeekerBooking[]> {
    try {
      console.log('getBookings for seeker:', seekerId);
      const response = await axios.get(
        `${BASE_URL}/orders/seeker/${seekerId}`,
        this.getAuthHeaders(token)
      );
      console.log('Bookings response:', response.data);
      return response.data as SeekerBooking[];
    } catch (error: any) {
      console.error('SeekerService.getBookings error:', error?.response?.data || error?.message);
      throw new Error(error?.response?.data?.message || 'Failed to fetch seeker bookings');
    }
  }
}

export default new SeekerService();