import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { getSocket } from '../services/socket';
import ServiceRequestSocketHandler from '../services/ServiceRequestSocketHandler';

export const useServiceRequestSocket = () => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const socketHandlerRef = useRef<ServiceRequestSocketHandler | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Initialize socket and handler
      const socket = getSocket();
      socketHandlerRef.current = new ServiceRequestSocketHandler(socket);

      // Determine user role (this is simplified - you may need to get this from user data)
      // Assuming user object has a role field or we can determine from other fields
      const userRole = user.isProvider ? 'provider' : 'seeker';

      // Initialize the handler with user info
      socketHandlerRef.current.initialize(user.id, userRole);

      // Note: Navigation can be accessed via the socket handler if needed
      // You may need to pass navigation as a prop or use a navigation service

      return () => {
        // Cleanup on unmount or when auth changes
        if (socketHandlerRef.current) {
          socketHandlerRef.current.cleanup();
          socketHandlerRef.current = null;
        }
      };
    }
  }, [isAuthenticated, user]);

  return socketHandlerRef.current;
};

export default useServiceRequestSocket;