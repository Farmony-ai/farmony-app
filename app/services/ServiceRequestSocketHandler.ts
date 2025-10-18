import { Socket } from 'socket.io-client';
import { store } from '../store';
import {
  updateRequestInStore,
  addToMyRequests,
  addToAvailableRequests,
  removeFromAvailableRequests,
} from '../store/slices/serviceRequestsSlice';
import { ServiceRequest } from './ServiceRequestService';
import { Alert } from 'react-native';

export class ServiceRequestSocketHandler {
  private socket: Socket;
  private userId: string | null = null;
  private userRole: 'seeker' | 'provider' | null = null;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  initialize(userId: string, userRole: 'seeker' | 'provider') {
    this.userId = userId;
    this.userRole = userRole;
    this.setupListeners();

    // Join user-specific room
    this.socket.emit('join-user-room', { userId });

    // If provider, join provider room for new matches
    if (userRole === 'provider') {
      this.socket.emit('join-provider-room', { providerId: userId });
    }
  }

  private setupListeners() {
    // Listen for request status updates
    this.socket.on('service-request-updated', (data: { request: ServiceRequest }) => {
      const { request } = data;
      store.dispatch(updateRequestInStore(request));

      // Show notification for important status changes
      if (request.status === 'matched' && this.userRole === 'seeker') {
        Alert.alert('Match Found!', `Your service request "${request.title}" has been matched with providers.`);
      } else if (request.status === 'accepted' && this.userRole === 'seeker') {
        Alert.alert('Request Accepted!', `Your service request "${request.title}" has been accepted by a provider.`);
      }
    });

    // Listen for new matches (for providers)
    if (this.userRole === 'provider') {
      this.socket.on('new-service-request-match', (data: { request: ServiceRequest }) => {
        const { request } = data;
        store.dispatch(addToAvailableRequests(request));
        Alert.alert('New Match!', `You've been matched with a new service request: "${request.title}"`);
      });

      // Listen when a request is no longer available (accepted by another provider)
      this.socket.on('service-request-unavailable', (data: { requestId: string }) => {
        const { requestId } = data;
        store.dispatch(removeFromAvailableRequests(requestId));
      });
    }

    // Listen for new requests created by seeker
    if (this.userRole === 'seeker') {
      this.socket.on('service-request-created', (data: { request: ServiceRequest }) => {
        const { request } = data;
        store.dispatch(addToMyRequests(request));
      });
    }

    // Listen for request expiry
    this.socket.on('service-request-expired', (data: { requestId: string }) => {
      const { requestId } = data;
      // Update the request status to expired in the store
      const currentState = store.getState();
      const request = currentState.serviceRequests.myRequests.find((r: ServiceRequest) => r._id === requestId) ||
                     currentState.serviceRequests.availableRequests.find((r: ServiceRequest) => r._id === requestId);

      if (request) {
        store.dispatch(updateRequestInStore({ ...request, status: 'expired' }));

        if (this.userRole === 'seeker' && request.seekerId === this.userId) {
          Alert.alert('Request Expired', `Your service request "${request.title}" has expired.`);
        }
      }
    });

    // Listen for order creation after acceptance
    this.socket.on('order-created-from-request', (data: { orderId: string, requestId: string }) => {
      const { orderId, requestId } = data;
      const currentState = store.getState();
      const request = currentState.serviceRequests.myRequests.find((r: ServiceRequest) => r._id === requestId);

      if (request && this.userRole === 'seeker') {
        Alert.alert(
          'Order Created!',
          `Your service request has been converted to an order. Order ID: ${orderId}`,
          [
            { text: 'View Order', onPress: () => {
              // Navigate to order details
              const navigation = (global as any).navigation;
              if (navigation) {
                navigation.navigate('SeekerOrderDetail', { orderId });
              }
            }},
            { text: 'OK' }
          ]
        );
      }
    });
  }

  cleanup() {
    // Remove all listeners
    this.socket.off('service-request-updated');
    this.socket.off('new-service-request-match');
    this.socket.off('service-request-unavailable');
    this.socket.off('service-request-created');
    this.socket.off('service-request-expired');
    this.socket.off('order-created-from-request');

    // Leave rooms
    if (this.userId) {
      this.socket.emit('leave-user-room', { userId: this.userId });
      if (this.userRole === 'provider') {
        this.socket.emit('leave-provider-room', { providerId: this.userId });
      }
    }

    this.userId = null;
    this.userRole = null;
  }
}

export default ServiceRequestSocketHandler;