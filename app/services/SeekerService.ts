
import apiInterceptor from './apiInterceptor';
import { Category, SubCategory } from './CatalogueService';

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

// Unified booking interface for both orders and service requests
export interface UnifiedBooking {
  id: string;
  type: 'order' | 'service_request';
  displayStatus: 'searching' | 'matched' | 'in_progress' | 'no_accept' | 'completed' | 'cancelled' | 'pending';
  originalStatus: string;
  title: string;
  description?: string;
  providerName?: string;
  providerPhone?: string;
  serviceStartDate: string;
  serviceEndDate?: string;
  location?: any;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
  category?: any;
  subcategory?: any;
  images?: string[];
  // Service request specific fields
  isSearching?: boolean;
  searchElapsedMinutes?: number;
  nextWaveAt?: string;
  matchedProvidersCount?: number;
  urgency?: string;
  budget?: {
    min: number;
    max: number;
  };
  orderId?: string;
}

class SeekerService {
  async getBookings(seekerId: string): Promise<SeekerBooking[]> {
    try {
      console.log('getBookings for seeker:', seekerId);
      const result = await apiInterceptor.get<SeekerBooking[]>(`/orders/seeker/${seekerId}`);

      if (result.success && result.data) {
        console.log('Bookings response:', result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch seeker bookings');
      }
    } catch (error: any) {
      console.error('SeekerService.getBookings error:', error?.message);
      throw new Error(error?.message || 'Failed to fetch seeker bookings');
    }
  }

  async getUnifiedBookings(seekerId: string): Promise<UnifiedBooking[]> {
    try {
      console.log('getUnifiedBookings for seeker:', seekerId);
      const result = await apiInterceptor.get<UnifiedBooking[]>(`/seeker/${seekerId}/bookings`);

      if (result.success && result.data) {
        console.log('Unified bookings response:', result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch unified bookings');
      }
    } catch (error: any) {
      console.error('SeekerService.getUnifiedBookings error:', error?.message);
      throw new Error(error?.message || 'Failed to fetch unified bookings');
    }
  }
}

export default new SeekerService();