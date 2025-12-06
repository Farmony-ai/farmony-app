import apiInterceptor from './apiInterceptor';

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
  availableServiceRequests: any[]; // TODO: Define strict type
}

export interface ProviderPreferencesPayload {
  defaultLandingPage: 'seeker' | 'provider';
  defaultProviderTab: 'active' | 'inactive' | 'all';
  preferredLanguage: string; // e.g., 'en', 'te'
  notificationsEnabled: boolean;
}

class ProviderService {
  async getDashboard(providerId: string): Promise<ProviderDashboardResponse> {
    try {
      console.log('getDashboard', providerId);
      const response = await apiInterceptor.makeAuthenticatedRequest<ProviderDashboardResponse>(
        `/providers/${providerId}/dashboard`,
        {
          method: 'GET',
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || 'Failed to fetch provider dashboard');
    } catch (error: any) {
      console.error('ProviderService.getDashboard error:', error?.response?.data || error?.message);
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to fetch provider dashboard');
    }
  }

  async updatePreferences(
    preferences: ProviderPreferencesPayload
  ): Promise<ProviderPreferencesPayload> {
    try {
      const response = await apiInterceptor.makeAuthenticatedRequest<ProviderPreferencesPayload>(
        `/providers/preferences`,
        {
          method: 'PATCH',
          body: JSON.stringify(preferences),
        }
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error || 'Failed to update provider preferences');
    } catch (error: any) {
      console.error('ProviderService.updatePreferences error:', error?.response?.data || error?.message);
      throw new Error(error?.response?.data?.message || error?.message || 'Failed to update provider preferences');
    }
  }
}

export default new ProviderService();


