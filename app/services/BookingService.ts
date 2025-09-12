import apiInterceptor from './apiInterceptor';

export interface Booking {
  isAutoRejected: boolean;
  _id: string;
  listingId: string | {
    _id: string;
    title: string;
    price: number;
    unitOfMeasure: string;
    description?: string;
    subCategory?: string;
    categoryId?: {
      _id: string;
      name: string;
    };
    photoUrls?: string[];
  };
  seekerId: string | {
    _id: string;
    name: string;
    phone: string;
    email: string;
  };
  providerId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'paid' | 'completed' | 'canceled';
  createdAt: string;
  expiresAt: string;
  totalAmount: number;
  coordinates: number[];
  updatedAt: string;
  __v: number;
  quantity?: number;
  serviceDate?: string;
  notes?: string;
  // Additional properties from API response
  requestExpiresAt?: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  unitOfMeasure?: string;
  orderType?: string;
}

export interface BookingsResponse {
  active: Booking[];
  completed: Booking[];
  canceled: Booking[];
  toReview: Booking[];
}

class BookingService {
  // Get provider bookings
  async getProviderBookings(providerId: string): Promise<BookingsResponse> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<BookingsResponse>(`/providers/${providerId}/bookings`, {
        method: 'GET',
      });
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to load provider bookings');
      try {
        const pretty = JSON.stringify(result.data, null, 2);
        console.log('[BookingService.getProviderBookings] Fetched grouped bookings for provider', providerId, ':\n', pretty);
      } catch {}
      return result.data;
    } catch (error) {
      console.error('Error fetching provider bookings:', error);
      throw error;
    }
  }

  // Get booking details by ID
  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Booking>(`/orders/${bookingId}`, {
        method: 'GET',
      });
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to load order');
      try {
        const pretty = JSON.stringify(result.data, null, 2);
        console.log('[BookingService.getBookingById] Fetched order', bookingId, ':\n', pretty);
      } catch {}
      return result.data;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      throw error;
    }
  }

  // Accept booking (legacy) — no longer used; kept for compatibility
  async acceptBooking(bookingId: string): Promise<Booking> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Booking>(`/orders/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'accepted' }),
      });
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to accept order');
      return result.data;
    } catch (error) {
      console.error('Error accepting booking:', error);
      throw error;
    }
  }

  // Reject booking (legacy) — no longer used; kept for compatibility
  async rejectBooking(bookingId: string, reason?: string): Promise<Booking> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Booking>(`/orders/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'canceled', reason }),
      });
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to cancel order');
      return result.data;
    } catch (error) {
      console.error('Error rejecting booking:', error);
      throw error;
    }
  }

  // Update booking status via unified endpoint
  async updateBookingStatus(bookingId: string, status: string): Promise<Booking> {
    try {
      const result = await apiInterceptor.makeAuthenticatedRequest<Booking>(`/orders/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!result.success || !result.data) throw new Error(result.error || 'Failed to update order status');
      return result.data;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }
}

export default new BookingService();