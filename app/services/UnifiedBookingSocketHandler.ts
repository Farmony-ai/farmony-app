import io, { Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import { UnifiedBooking } from './SeekerService';

class UnifiedBookingSocketHandler {
  private socket: Socket | null = null;
  private seekerId: string | null = null;
  private updateCallback: ((booking: Partial<UnifiedBooking>) => void) | null = null;

  connect(seekerId: string, onUpdate: (booking: Partial<UnifiedBooking>) => void) {
    // Disconnect existing connection if any
    if (this.socket) {
      this.disconnect();
    }

    this.seekerId = seekerId;
    this.updateCallback = onUpdate;
    this.socket = io(API_BASE_URL);

    // Connection events
    this.socket.on('connect', () => {
      console.log('UnifiedBookingSocket connected');
      // Join seeker room
      this.socket?.emit('join-seeker-room', seekerId);
    });

    this.socket.on('disconnect', () => {
      console.log('UnifiedBookingSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('UnifiedBookingSocket error:', error);
    });

    // Order events
    this.socket.on(`order-update-${seekerId}`, (order) => {
      console.log('Order update received:', order);
      this.handleOrderUpdate(order);
    });

    this.socket.on(`order-status-changed`, (data) => {
      if (data.seekerId === seekerId) {
        console.log('Order status changed:', data);
        this.handleOrderUpdate(data.order);
      }
    });

    // Service request events
    this.socket.on('service-request-accepted', (data) => {
      if (data.seekerId === seekerId) {
        console.log('Service request accepted:', data);
        this.handleServiceRequestUpdate({
          ...data,
          displayStatus: 'matched',
          type: 'service_request',
        });
      }
    });

    this.socket.on('service-request-expired', (data) => {
      if (data.seekerId === seekerId) {
        console.log('Service request expired:', data);
        this.handleServiceRequestUpdate({
          ...data,
          displayStatus: 'no_accept',
          type: 'service_request',
        });
      }
    });

    this.socket.on('service-request-no-providers', (data) => {
      if (data.seekerId === seekerId) {
        console.log('No providers available:', data);
        this.handleServiceRequestUpdate({
          ...data,
          displayStatus: 'no_accept',
          type: 'service_request',
        });
      }
    });

    this.socket.on('service-request-wave-sent', (data) => {
      if (data.seekerId === seekerId) {
        console.log('New wave sent:', data);
        this.handleServiceRequestUpdate({
          ...data,
          displayStatus: 'searching',
          type: 'service_request',
        });
      }
    });

    this.socket.on('service-request-cancelled', (data) => {
      if (data.seekerId === seekerId) {
        console.log('Service request cancelled:', data);
        this.handleServiceRequestUpdate({
          ...data,
          displayStatus: 'cancelled',
          type: 'service_request',
        });
      }
    });
  }

  private handleOrderUpdate(order: any) {
    if (!this.updateCallback) return;

    // Map order status to display status
    const displayStatus = this.mapOrderStatus(order.status);

    const unifiedUpdate: Partial<UnifiedBooking> = {
      id: order._id || order.id,
      type: 'order',
      displayStatus,
      originalStatus: order.status,
      title: order.title || 'Service',
      providerName: order.providerName || order.provider?.name,
      providerPhone: order.providerPhone || order.provider?.phone,
      totalAmount: order.totalAmount || order.totalCost,
      serviceStartDate: order.serviceStartDate || order.scheduledDate,
      serviceEndDate: order.serviceEndDate,
      location: order.location,
      updatedAt: order.updatedAt || new Date().toISOString(),
    };

    this.updateCallback(unifiedUpdate);
  }

  private handleServiceRequestUpdate(data: any) {
    if (!this.updateCallback) return;

    const isSearching = data.displayStatus === 'searching';
    const createdAt = new Date(data.createdAt || Date.now()).getTime();
    const now = Date.now();
    const elapsedMinutes = isSearching
      ? Math.floor((now - createdAt) / 60000)
      : undefined;

    const unifiedUpdate: Partial<UnifiedBooking> = {
      id: data._id || data.requestId || data.id,
      type: 'service_request',
      displayStatus: data.displayStatus,
      originalStatus: data.status,
      title: data.title,
      description: data.description,
      providerName: data.providerName,
      providerPhone: data.providerPhone,
      isSearching,
      searchElapsedMinutes: elapsedMinutes,
      matchedProvidersCount: data.matchedProvidersCount || data.matchedProviders?.length,
      nextWaveAt: data.nextWaveAt,
      orderId: data.orderId,
      updatedAt: data.updatedAt || new Date().toISOString(),
    };

    this.updateCallback(unifiedUpdate);
  }

  private mapOrderStatus(status: string): UnifiedBooking['displayStatus'] {
    const mapping: Record<string, UnifiedBooking['displayStatus']> = {
      'pending': 'pending',
      'accepted': 'matched',
      'paid': 'in_progress',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'rejected': 'no_accept',
    };
    return mapping[status?.toLowerCase()] || 'pending';
  }

  disconnect() {
    if (this.socket) {
      console.log('Disconnecting UnifiedBookingSocket');
      this.socket.disconnect();
      this.socket = null;
      this.seekerId = null;
      this.updateCallback = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export default new UnifiedBookingSocketHandler();