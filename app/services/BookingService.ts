import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api'; // Replace with actual base URL

export interface Booking {
  isAutoRejected: boolean;
  _id: string;
  listingId: string | {
    _id: string;
    title: string;
    price: number;
    unitOfMeasure: string;
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
      const response = await axios.get(`${BASE_URL}/providers/${providerId}/bookings`);
      return response.data;
    } catch (error) {
      console.error('Error fetching provider bookings:', error);
      throw error;
    }
  }

  // Get booking details by ID
  async getBookingById(bookingId: string): Promise<Booking> {
    try {
      const response = await axios.get(`${BASE_URL}/bookings/${bookingId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      throw error;
    }
  }

  // Accept booking
  async acceptBooking(bookingId: string): Promise<Booking> {
    try {
      const response = await axios.patch(`${BASE_URL}/orders/${bookingId}/status`,{
          status: "accepted"
      });
      return response.data;
    } catch (error) {
      console.error('Error accepting booking:', error);
      throw error;
    }
  }

  // Reject booking
  async rejectBooking(bookingId: string, reason?: string): Promise<Booking> {
    try {
      const response = await axios.patch(`${BASE_URL}/bookings/${bookingId}/reject`, {
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Error rejecting booking:', error);
      throw error;
    }
  }

  // Update booking status
  async updateBookingStatus(bookingId: string, status: string): Promise<Booking> {
    try {
      const response = await axios.patch(`${BASE_URL}/bookings/${bookingId}/status`, {
        status
      });
      return response.data;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }
}

export default new BookingService();