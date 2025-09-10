import React from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Text from './Text';
import { COLORS, FONTS } from '../utils';

interface PendingRequestCardProps {
  booking: any;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}

const PendingRequestCard: React.FC<PendingRequestCardProps> = ({ booking, onAccept, onDecline }) => {
  const serviceDate = new Date(booking.serviceStartDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Helper: time since request created
  const getTimeSince = (createdAt: string) => {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const diffMs = now - created;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} min ago`;
    return 'Just now';
  };

  // Convert backend unit format to clean display
  const getUnitText = () => {
    if (booking.unitOfMeasure) {
      // Map backend enum values to clean display format
      const unitMap: { [key: string]: string } = {
        'per_hour': '/hr',
        'per_day': '/day',
        'per_piece': '/piece',
        'per_kg': '/kg',
        'per_unit': '/unit'
      };
      
      const displayUnit = unitMap[booking.unitOfMeasure] || '';
      
      if (booking.quantity && booking.quantity > 1) {
        return `${booking.quantity}${displayUnit}`;
      }
      return displayUnit;
    }
    return '';
  };

  return (
    <View style={styles.card}>
      {/* Image Section with Overlays */}
      <View style={styles.imageContainer}>
        {booking.listing?.thumbnailUrl ? (
          <Image source={{ uri: booking.listing.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder} />
        )}
        
        {/* Time Since Badge - Left */}
        <View style={styles.timeOverlay}>
          <Text style={styles.timeOverlayText}>{getTimeSince(booking.createdAt)}</Text>
        </View>
        
        {/* Expiry Badge - Right */}
        <View style={styles.expiryOverlay}>
          <Ionicons name="timer-outline" size={12} color="#FFFFFF" />
          <Text style={styles.expiryOverlayText}>
            {new Date(booking.requestExpiresAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Service Info and Price */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{booking.listing?.title || 'Service'}</Text>
            <Text style={styles.customer}>{booking.seeker?.name || 'Customer'}</Text>
          </View>
          
          {/* Price with inline unit */}
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              ₹{booking.totalAmount}
              <Text style={styles.unit}>{getUnitText()}</Text>
            </Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color="#666666" />
          <Text style={styles.infoText} numberOfLines={1}>
            {booking.seeker?.location || 'Location not available'}
            {booking.distance && ` • ${booking.distance.toFixed(1)} km`}
          </Text>
        </View>

        {/* Service Date */}
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#666666" />
          <Text style={styles.infoText}>{serviceDate}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAccept(booking._id)}
            activeOpacity={0.7}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={() => onDecline(booking._id)}
            activeOpacity={0.7}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F7F7F7',
  },
  timeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeOverlayText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#FFFFFF',
  },
  expiryOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryOverlayText: {
    fontSize: 10,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  content: { 
    padding: 20,
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { 
    fontSize: 16, 
    fontFamily: FONTS.POPPINS.SEMIBOLD, 
    color: '#000000',
    marginBottom: 4,
  },
  customer: { 
    fontSize: 14, 
    fontFamily: FONTS.POPPINS.REGULAR, 
    color: '#666666',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: { 
    fontSize: 16, 
    fontFamily: FONTS.POPPINS.MEDIUM, 
    color: '#000000',
  },
  unit: { 
    fontSize: 14, 
    color: '#666666',
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  infoRow: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: { 
    fontSize: 13, 
    color: '#666666', 
    marginLeft: 8,
    flex: 1,
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  actions: { 
    flexDirection: 'row', 
    gap: 12,
    marginTop: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY.MAIN,  // Green from your app theme
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    letterSpacing: 0.3,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineText: { 
    color: '#666666', 
    fontSize: 14, 
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    letterSpacing: 0.3,
  },
});

export default PendingRequestCard;