import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const BASE_URL = API_BASE_URL;

export interface ProviderDashboardSummary {
  totalBookings: number;
  completedBookings: number;
  revenue: number;
  activeListings: number;
  averageRating: number;
  totalRatings: number;
}

export interface ProviderRecentBooking {
  // Shape may vary; include known/common fields and keep index signature for safety
  id?: string;
  service?: string;
  listingTitle?: string;
  customer?: string;
  customerName?: string;
  time?: string;
  scheduledAt?: string;
  status?: string;
  [key: string]: any;
}

export interface ProviderDashboardResponse {
  summary: ProviderDashboardSummary;
  pendingBookings: ProviderRecentBooking[];
  upcomingBookings: ProviderRecentBooking[];
  recentBookings: ProviderRecentBooking[]; // Keep for backward compatibility
}

export interface ProviderPreferencesPayload {
  defaultLandingPage: 'seeker' | 'provider';
  defaultProviderTab: 'active' | 'inactive' | 'all';
  preferredLanguage: string; // e.g., 'en', 'te'
  notificationsEnabled: boolean;
}

class ProviderService {
  private getAuthHeaders(token?: string) {
    return token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};
  }

  async getDashboard(providerId: string, token?: string): Promise<ProviderDashboardResponse> {
    try {
      console.log('getDashboard', providerId, token);
      const response = await axios.get(
        `${BASE_URL}/providers/${providerId}/dashboard`,
        this.getAuthHeaders(token)
      );
      return response.data as ProviderDashboardResponse;
    } catch (error: any) {
      console.error('ProviderService.getDashboard error:', error?.response?.data || error?.message);
      throw new Error(error?.response?.data?.message || 'Failed to fetch provider dashboard');
    }
  }

  async updatePreferences(
    preferences: ProviderPreferencesPayload,
    token?: string
  ): Promise<ProviderPreferencesPayload> {
    try {
      const response = await axios.patch(
        `${BASE_URL}/providers/preferences`,
        preferences,
        this.getAuthHeaders(token)
      );
      return response.data as ProviderPreferencesPayload;
    } catch (error: any) {
      console.error('ProviderService.updatePreferences error:', error?.response?.data || error?.message);
      throw new Error(error?.response?.data?.message || 'Failed to update provider preferences');
    }
  }
}

export default new ProviderService();


