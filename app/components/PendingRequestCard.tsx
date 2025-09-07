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

  const getUnitText = () => {
    if (booking.unitOfMeasure) {
      if (booking.quantity > 1) {
        return `${booking.quantity} per ${booking.unitOfMeasure}`;
      }
      return `per ${booking.unitOfMeasure}`;
    }
    return null;
  };

  return (
    <View style={styles.card}>
      {/* Thumbnail */}
      {booking.listing?.thumbnailUrl && (
        <Image source={{ uri: booking.listing.thumbnailUrl }} style={styles.thumbnail} />
      )}

      <View style={styles.content}>
        {/* Requested Time */}
        <View style={styles.raisedRow}>
          <Ionicons name="time-outline" size={12} color="#6B7280" />
          <Text style={styles.raisedText}>Requested {getTimeSince(booking.createdAt)}</Text>
        </View>

        {/* Service & Customer Info */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.title}>{booking.listing?.title || 'Service'}</Text>
            <Text style={styles.customer}>{booking.seeker?.name || 'Customer'}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color="#9CA3AF" />
              <Text style={styles.location} numberOfLines={1}>
                {booking.seeker?.location || 'Location not available'}
                {booking.distance && ` • ${booking.distance.toFixed(1)} km`}
              </Text>
            </View>
          </View>

          <View style={styles.priceBox}>
            <Text style={styles.price}>₹{booking.totalAmount}</Text>
            {getUnitText() && <Text style={styles.unit}>{getUnitText()}</Text>}
          </View>
        </View>

        {/* Service Date */}
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
          <Text style={styles.date}>{serviceDate}</Text>
        </View>

        {/* Expiry */}
        <View style={styles.expiryRow}>
          <Ionicons name="time-outline" size={12} color="#EF4444" />
          <Text style={styles.expiryText}>
            Expires at{' '}
            {new Date(booking.requestExpiresAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* Actions */}
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
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 110,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  content: { padding: 14 },
  raisedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  raisedText: { fontSize: 11, color: '#6B7280', marginLeft: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 15, fontFamily: FONTS.POPPINS.MEDIUM, color: COLORS.TEXT.PRIMARY },
  customer: { fontSize: 13, fontFamily: FONTS.POPPINS.REGULAR, color: '#4B5563', marginBottom: 5 },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  location: { fontSize: 11, color: '#9CA3AF', marginLeft: 4, flex: 1 },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 18, fontFamily: FONTS.POPPINS.SEMIBOLD, color: COLORS.TEXT.PRIMARY },
  unit: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  date: { fontSize: 12, color: '#6B7280', marginLeft: 5 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  expiryText: { fontSize: 11, color: '#EF4444', marginLeft: 5 },
  // --- Reverted Action Styles ---
  actions: { flexDirection: 'row', gap: 12 },
  acceptBtn: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptText: { color: COLORS.NEUTRAL.WHITE, fontSize: 13, fontFamily: FONTS.POPPINS.MEDIUM },
  declineBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  declineText: { color: '#6B7280', fontSize: 13, fontFamily: FONTS.POPPINS.MEDIUM },
});

export default PendingRequestCard;