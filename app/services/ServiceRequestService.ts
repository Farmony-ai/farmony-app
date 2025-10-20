import apiInterceptor from './apiInterceptor';

export interface ServiceRequest {
  _id: string;
  seekerId: string | any;
  categoryId: string | any;
  subCategoryId?: string | any;
  title: string;
  description: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  address?: string;
  serviceStartDate: Date | string;
  serviceEndDate: Date | string;
  budget?: {
    min: number;
    max: number;
  };
  urgency: 'immediate' | 'scheduled' | 'flexible';
  status: 'open' | 'matched' | 'accepted' | 'expired' | 'cancelled' | 'completed';
  matchRequestId?: string;
  matchedProviderIds: string[];
  acceptedProviderId?: string | any;
  orderId?: string;
  viewCount: number;
  viewedBy?: any[];
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  metadata?: {
    quantity?: number;
    unitOfMeasure?: string;
    duration?: number;
    specialRequirements?: string[];
  };
  attachments?: string[];
  isAutoExpired?: boolean;
  cancellationReason?: string;
  completedAt?: Date | string;
}

export interface CreateServiceRequestDto {
  categoryId: string;
  subCategoryId?: string;
  title: string;
  description: string;
  addressId?: string;
  serviceAddressId?: string;
  location?: {
    lat: number;
    lon: number;
  };
  address?: string;
  serviceStartDate: Date | string;
  serviceEndDate: Date | string;
  budget?: {
    min: number;
    max: number;
  };
  urgency?: 'immediate' | 'scheduled' | 'flexible';
  metadata?: {
    quantity?: number;
    unitOfMeasure?: string;
    duration?: number;
    specialRequirements?: string[];
  };
  attachments?: string[];
  expiresInHours?: number;
  idempotencyKey?: string;
}

export interface AcceptServiceRequestDto {
  price: number;
  message?: string;
  estimatedCompletionTime?: string;
}

export interface ServiceRequestFilters {
  status?: string;
  categoryId?: string;
  urgency?: string;
  page?: number;
  limit?: number;
}

export interface ServiceRequestsResponse {
  requests: ServiceRequest[];
  total: number;
}

export interface AcceptRequestResponse {
  request: ServiceRequest;
  orderId: string;
}

class ServiceRequestService {
  // Create a new service request
  async createRequest(data: CreateServiceRequestDto): Promise<ServiceRequest> {
    try {
      console.log('[ServiceRequestService] Creating request with data:', data);

      const result = await apiInterceptor.makeAuthenticatedRequest('/service-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create service request');
      }

      console.log('[ServiceRequestService] Request created successfully:', result.data);
      return result.data;
    } catch (error) {
      console.error('[ServiceRequestService] Error creating request:', error);
      throw error;
    }
  }

  // Get my requests as a seeker
  async getMyRequests(filters?: ServiceRequestFilters): Promise<ServiceRequestsResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const url = `/service-requests/my-requests${params.toString() ? '?' + params.toString() : ''}`;
      console.log('[ServiceRequestService] Fetching my requests:', url);

      const result = await apiInterceptor.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch requests');
      }

      console.log(`[ServiceRequestService] Fetched ${result.data.requests?.length || 0} requests`);
      return result.data;
    } catch (error) {
      console.error('[ServiceRequestService] Error fetching my requests:', error);
      throw error;
    }
  }

  // Get available requests as a provider
  async getAvailableRequests(filters?: ServiceRequestFilters): Promise<ServiceRequestsResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.categoryId) params.append('categoryId', filters.categoryId);
      if (filters?.urgency) params.append('urgency', filters.urgency);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const url = `/service-requests/available${params.toString() ? '?' + params.toString() : ''}`;
      console.log('[ServiceRequestService] Fetching available requests:', url);

      const result = await apiInterceptor.makeAuthenticatedRequest(url, {
        method: 'GET',
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch available requests');
      }

      console.log(`[ServiceRequestService] Fetched ${result.data.requests?.length || 0} available requests`);
      return result.data;
    } catch (error) {
      console.error('[ServiceRequestService] Error fetching available requests:', error);
      throw error;
    }
  }

  // Get request by ID
  async getRequestById(id: string): Promise<ServiceRequest> {
    try {
      console.log('[ServiceRequestService] Fetching request:', id);

      const result = await apiInterceptor.makeAuthenticatedRequest(`/service-requests/${id}`, {
        method: 'GET',
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch request');
      }

      console.log('[ServiceRequestService] Request fetched successfully');
      return result.data;
    } catch (error) {
      console.error('[ServiceRequestService] Error fetching request:', error);
      throw error;
    }
  }

  // Accept a service request as a provider
  async acceptRequest(
    requestId: string,
    data: AcceptServiceRequestDto
  ): Promise<AcceptRequestResponse> {
    try {
      console.log('[ServiceRequestService] Accepting request:', requestId, data);

      const result = await apiInterceptor.makeAuthenticatedRequest(
        `/service-requests/${requestId}/accept`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to accept request');
      }

      console.log('[ServiceRequestService] Request accepted successfully, orderId:', result.data.orderId);
      return result.data;
    } catch (error) {
      console.error('[ServiceRequestService] Error accepting request:', error);
      throw error;
    }
  }

  // Update a service request
  async updateRequest(
    requestId: string,
    data: Partial<CreateServiceRequestDto>
  ): Promise<ServiceRequest> {
    try {
      console.log('[ServiceRequestService] Updating request:', requestId);

      const result = await apiInterceptor.makeAuthenticatedRequest(
        `/service-requests/${requestId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update request');
      }

      console.log('[ServiceRequestService] Request updated successfully');
      return result.data;
    } catch (error) {
      console.error('[ServiceRequestService] Error updating request:', error);
      throw error;
    }
  }

  // Cancel a service request
  async cancelRequest(requestId: string, reason?: string): Promise<ServiceRequest> {
    try {
      console.log('[ServiceRequestService] Cancelling request:', requestId);

      const result = await apiInterceptor.makeAuthenticatedRequest(
        `/service-requests/${requestId}/cancel`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to cancel request');
      }

      console.log('[ServiceRequestService] Request cancelled successfully');
      return result.data;
    } catch (error) {
      console.error('[ServiceRequestService] Error cancelling request:', error);
      throw error;
    }
  }

  // Helper method to format dates
  formatRequestDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Helper method to get status color
  getStatusColor(status: ServiceRequest['status']): string {
    switch (status) {
      case 'open':
        return '#4CAF50'; // Green
      case 'matched':
        return '#2196F3'; // Blue
      case 'accepted':
        return '#FF9800'; // Orange
      case 'completed':
        return '#9E9E9E'; // Gray
      case 'expired':
      case 'cancelled':
        return '#F44336'; // Red
      default:
        return '#757575';
    }
  }

  // Helper method to get urgency badge color
  getUrgencyColor(urgency: ServiceRequest['urgency']): string {
    switch (urgency) {
      case 'immediate':
        return '#F44336'; // Red
      case 'scheduled':
        return '#FF9800'; // Orange
      case 'flexible':
        return '#4CAF50'; // Green
      default:
        return '#757575';
    }
  }
}

export default new ServiceRequestService();
