import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import BookingService, { Booking } from '../services/BookingService';
import { canTransition, setOrderStatus } from '../services/orderStatus';

const OrderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<'accept' | 'cancel' | null>(null);

  useEffect(() => {
    fetchBookingDetails();
  }, []);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await BookingService.getBookingById(bookingId);
      try {
        const pretty = JSON.stringify(data, null, 2);
        console.log('[OrderDetailScreen] Loaded order detail for', bookingId, ':\n', pretty);
      } catch {}
      setBooking(data);
    } catch (error) {
      console.error('Error loading booking details:', error);
      Alert.alert('Error', 'Failed to load booking details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'accepted':
      case 'paid':
        return '#10B981';
      case 'completed':
        return '#3B82F6';
      case 'rejected':
      case 'canceled':
        return '#EF4444';
      default:
        return COLORS.TEXT.SECONDARY;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
      case 'paid':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'checkmark-done-outline';
      case 'rejected':
      case 'canceled':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleMapOpen = () => {
    if (booking?.coordinates) {
      const [lng, lat] = booking.coordinates;
      const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
      const url = Platform.OS === 'ios'
        ? `${scheme}${lat},${lng}`
        : `${scheme}${lat},${lng}?q=${lat},${lng}`;
      Linking.openURL(url);
    }
  };

  const handleAcceptBooking = async () => {
    Alert.alert(
      'Accept Booking',
      'Are you sure you want to accept this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              if (!booking) return;
              setIsProcessing('accept');
              if (!canTransition(booking.status as any, 'accepted')) {
                Alert.alert('Not allowed', 'This booking cannot be accepted.');
                return;
              }
              const updated: any = await setOrderStatus({ orderId: booking._id, status: 'accepted' });
              setBooking(prev => ({ ...(prev as any), ...(updated || {}), status: (updated?.status || 'accepted') as any }));
              Alert.alert('Success', 'Booking accepted successfully');
            } catch (error) {
              console.error('Error accepting booking:', error);
              const message = (error as any)?.message || 'Failed to accept booking. Please try again.';
              Alert.alert('Error', message);
            } finally {
              setIsProcessing(null);
            }
          },
        },
      ],
    );
  };

  const handleRejectBooking = async () => {
    Alert.alert(
      'Reject Booking',
      'Are you sure you want to reject this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!booking) return;
              setIsProcessing('cancel');
              if (!canTransition(booking.status as any, 'canceled')) {
                Alert.alert('Not allowed', 'This booking cannot be rejected.');
                return;
              }
              const updated: any = await setOrderStatus({ orderId: booking._id, status: 'canceled' });
              setBooking(prev => ({ ...(prev as any), ...(updated || {}), status: 'canceled' as any }));
              Alert.alert('Success', 'Booking rejected');
              setTimeout(() => navigation.goBack(), 1000);
            } catch (error) {
              console.error('Error rejecting booking:', error);
              const message = (error as any)?.message || 'Failed to reject booking. Please try again.';
              Alert.alert('Error', message);
            } finally {
              setIsProcessing(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!booking) return null;

  const listing = typeof booking.listingId === 'object' ? booking.listingId : null;
  const seeker = typeof booking.seekerId === 'object' ? booking.seekerId : null;

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text variant="h4" weight="semibold" style={styles.headerTitle}>
            Booking Details
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
          <Ionicons 
            name={getStatusIcon(booking.status)} 
            size={48} 
            color={getStatusColor(booking.status)} 
          />
          <View style={styles.statusInfo}>
            <Text variant="h3" weight="bold" style={{ color: getStatusColor(booking.status) }}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
            <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
              Booking ID: {booking._id.slice(-8).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Service Details */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Service Details
          </Text>
          <View style={styles.card}>
            <View style={styles.serviceHeader}>
              <View style={styles.serviceIcon}>
                <Ionicons name="construct-outline" size={32} color={COLORS.PRIMARY.MAIN} />
              </View>
              <View style={styles.serviceInfo}>
                <Text variant="body" weight="semibold" numberOfLines={2}>
                  {listing?.title || 'Service Booking'}
                </Text>
                <Text variant="h3" weight="bold" color={COLORS.PRIMARY.MAIN} style={{ marginTop: 4 }}>
                  ₹{booking.totalAmount}
                </Text>
                {listing?.unitOfMeasure && (
                  <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                    {listing.price} per {listing.unitOfMeasure}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Customer Details
          </Text>
          <View style={styles.card}>
            <View style={styles.customerHeader}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color={COLORS.PRIMARY.MAIN} />
              </View>
              <View style={styles.customerInfo}>
                <Text variant="body" weight="semibold">
                  {seeker?.name || 'Customer'}
                </Text>
                {seeker?.phone && (
                  <TouchableOpacity 
                    style={styles.contactRow}
                    onPress={() => handleCall(seeker.phone)}
                  >
                    <Ionicons name="call-outline" size={16} color={COLORS.TEXT.SECONDARY} />
                    <Text variant="body" color={COLORS.PRIMARY.MAIN} style={{ marginLeft: 6 }}>
                      {seeker.phone}
                    </Text>
                  </TouchableOpacity>
                )}
                {seeker?.email && (
                  <TouchableOpacity 
                    style={styles.contactRow}
                    onPress={() => handleEmail(seeker.email)}
                  >
                    <Ionicons name="mail-outline" size={16} color={COLORS.TEXT.SECONDARY} />
                    <Text variant="body" color={COLORS.PRIMARY.MAIN} style={{ marginLeft: 6 }}>
                      {seeker.email}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Booking Information */}
        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Booking Information
          </Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.TEXT.SECONDARY} />
                <View style={{ marginLeft: SPACING.SM }}>
                  <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                    Booking Date
                  </Text>
                  <Text variant="body" weight="medium">
                    {formatDate(booking.createdAt)}
                  </Text>
                  <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                    {formatTime(booking.createdAt)}
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="hourglass-outline" size={20} color={COLORS.TEXT.SECONDARY} />
                <View style={{ marginLeft: SPACING.SM }}>
                  <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                    Expires On
                  </Text>
                  <Text variant="body" weight="medium">
                    {formatDate(booking.expiresAt)}
                  </Text>
                </View>
              </View>
            </View>

            {booking.serviceDate && (
              <View style={[styles.infoRow, { marginTop: SPACING.MD }]}>
                <View style={styles.infoItem}>
                  <MaterialIcons name="event-available" size={20} color={COLORS.TEXT.SECONDARY} />
                  <View style={{ marginLeft: SPACING.SM }}>
                    <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                      Service Date
                    </Text>
                    <Text variant="body" weight="medium">
                      {formatDate(booking.serviceDate)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Location */}
        {booking.coordinates && (
          <View style={styles.section}>
            <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
              Service Location
            </Text>
            <TouchableOpacity style={styles.card} onPress={handleMapOpen}>
              <View style={styles.locationContent}>
                <View style={styles.mapIcon}>
                  <Ionicons name="location" size={32} color={COLORS.PRIMARY.MAIN} />
                </View>
                <View style={styles.locationInfo}>
                  <Text variant="body" weight="medium">
                    View on Map
                  </Text>
                  <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                    Lat: {booking.coordinates[1].toFixed(4)}, Lng: {booking.coordinates[0].toFixed(4)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT.SECONDARY} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Notes */}
        {booking.notes && (
          <View style={styles.section}>
            <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
              Additional Notes
            </Text>
            <View style={styles.card}>
              <Text variant="body" color={COLORS.TEXT.SECONDARY}>
                {booking.notes}
              </Text>
            </View>
          </View>
        )}

        {/* Action Buttons for Pending Bookings */}
        {booking.status === 'pending' && (
          <View style={styles.actionSection}>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.rejectButton} onPress={handleRejectBooking} disabled={isProcessing === 'cancel'}>
                <View style={styles.rejectIconWrapper}>
                  <Ionicons name="close" size={24} color="#EF4444" />
                </View>
                <View style={styles.buttonTextContainer}>
                  <Text variant="body" weight="semibold" color="#EF4444">
                    Decline
                  </Text>
                  <Text variant="caption" color="#F87171">
                    Not available
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptBooking} disabled={isProcessing === 'accept'}>
                <View style={styles.acceptIconWrapper}>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                </View>
                <View style={styles.buttonTextContainer}>
                  <Text variant="body" weight="semibold" color="#fff">
                    Accept Booking
                  </Text>
                  <Text variant="caption" color="rgba(255,255,255,0.9)">
                    Confirm service
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.MD,
    padding: SPACING.LG,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.MD,
  },
  statusInfo: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  section: {
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    marginBottom: SPACING.SM,
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    ...SHADOWS.SM,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  serviceInfo: {
    flex: 1,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  customerInfo: {
    flex: 1,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapIcon: {
    width: 56,
    height: 56,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  locationInfo: {
    flex: 1,
  },
  actionSection: {
    padding: SPACING.MD,
    paddingTop: 0,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.MD,
  },
  rejectButton: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  acceptIconWrapper: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  rejectIconWrapper: {
    width: 36,
    height: 36,
    backgroundColor: '#FEE2E2',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  buttonTextContainer: {
    flex: 1,
  },
});

export default OrderDetailScreen;