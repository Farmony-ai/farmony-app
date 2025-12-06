import React, { useEffect, useState, useRef } from 'react';
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
  Dimensions,
  Animated,
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import BookingService, { Booking } from '../../services/BookingService';
import { canTransition, setOrderStatus } from '../../services/orderStatus';
import apiInterceptor from '../../services/apiInterceptor';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const UBER_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#f5f5f5' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#757575' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e5e5e5' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b6b6b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#fdfdfd' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#737373' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#dadada' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
  {
    featureType: 'transit.line',
    elementType: 'geometry',
    stylers: [{ color: '#e5e5e5' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'geometry',
    stylers: [{ color: '#eeeeee' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9c9c9' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9e9e9e' }],
  },
];

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OrderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { bookingId, orderId } = route.params;
  const orderIdentifier = bookingId || orderId;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<'accept' | 'cancel' | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(true);

  useEffect(() => {
    fetchBookingDetails();
  }, []);

  const fetchBookingDetails = async () => {
    if (!orderIdentifier) {
      Alert.alert('Error', 'Order ID is required.');
      navigation.goBack();
      return;
    }

    try {
      setLoading(true);
      const data = await BookingService.getBookingById(orderIdentifier);

      // Hydrate seeker details if needed
      if (typeof data.seekerId === 'string') {
        try {
          const seekerResult = await apiInterceptor.makeAuthenticatedRequest(`/users/${data.seekerId}`, {
            method: 'GET',
          });
          if (seekerResult.success && seekerResult.data) {
            const seekerData = seekerResult.data as any;
            data.seekerId = {
              _id: seekerData.id,
              name: seekerData.name,
              phone: seekerData.phone,
              email: seekerData.email
            };
          }
        } catch (error) {
          console.error('Error fetching seeker details:', error);
        }
      }

      // Hydrate listing details if needed
      if (typeof data.listingId === 'string') {
        try {
          const listingResult = await apiInterceptor.makeAuthenticatedRequest(`/listings/${data.listingId}`, {
            method: 'GET',
          });
          if (listingResult.success && listingResult.data) {
            const listingData = listingResult.data as any;
            data.listingId = {
              _id: listingData._id,
              title: listingData.title,
              price: listingData.price,
              unitOfMeasure: listingData.unitOfMeasure,
              description: listingData.description,
              subCategory: listingData.subCategoryId?.name,
              categoryId: listingData.categoryId,
              photoUrls: listingData.photoUrls,
            };
          }
        } catch (error) {
          console.error('Error fetching listing details:', error);
        }
      }

      setBooking(data);
    } catch (error) {
      console.error('Error loading booking details:', error);
      Alert.alert('Error', 'Failed to load booking details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
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

  const getCleanServiceName = (listing: any) => {
    if (!listing?.title) {
      return listing?.subCategory || 'Service Booking';
    }
    const hexPattern = /[a-f0-9]{20,}/i;
    if (hexPattern.test(listing.title)) {
      return listing?.subCategory || 'Service Booking';
    }
    return listing.title;
  };

  const cleanImageUrl = (url: string): string => {
    if (!url || typeof url !== 'string') {
      return 'https://via.placeholder.com/80x80';
    }

    let cleanedUrl = url
      .replace(/https:\/\/"([^"]+)"/g, 'https://$1')
      .replace(/"([^"]+)"/g, '$1')
      .replace(/([^/])en\/listings/g, '$1/listings')
      .replace(/\/\/+/g, '/')
      .replace(/https:\/([^/])/, 'https://$1');

    try {
      new URL(cleanedUrl);
      return cleanedUrl;
    } catch (error) {
      return 'https://via.placeholder.com/80x80';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'canceled': return 'Canceled';
      case 'completed': return 'Completed';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const formatQuantityUnit = (quantity: number, unit: string) => {
    if (unit === 'per_hour') {
      return `${quantity} ${quantity === 1 ? 'hour' : 'hours'}`;
    }
    return `${quantity} ${unit}`;
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
              Alert.alert('Error', 'Failed to accept booking. Please try again.');
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
      'Decline Booking',
      'Are you sure you want to decline this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!booking) return;
              setIsProcessing('cancel');
              if (!canTransition(booking.status as any, 'canceled')) {
                Alert.alert('Not allowed', 'This booking cannot be declined.');
                return;
              }
              const updated: any = await setOrderStatus({ orderId: booking._id, status: 'canceled' });
              setBooking(prev => ({ ...(prev as any), ...(updated || {}), status: 'canceled' as any }));
              Alert.alert('Success', 'Booking declined');
              setTimeout(() => navigation.goBack(), 1000);
            } catch (error) {
              console.error('Error declining booking:', error);
              Alert.alert('Error', 'Failed to decline booking. Please try again.');
            } finally {
              setIsProcessing(null);
            }
          },
        },
      ],
    );
  };

  // Get status badge configuration
  const getStatusBadgeConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Pending',
          backgroundColor: '#FEF3C7',
          textColor: '#F59E0B',
        };
      case 'accepted':
        return {
          text: 'Accepted',
          backgroundColor: '#E8F5E9',
          textColor: '#4CAF50',
        };
      case 'completed':
        return {
          text: 'Completed',
          backgroundColor: '#F5F5F5',
          textColor: '#757575',
        };
      case 'canceled':
        return {
          text: 'Cancelled',
          backgroundColor: '#FFEBEE',
          textColor: '#D32F2F',
        };
      default:
        return {
          text: status.charAt(0).toUpperCase() + status.slice(1),
          backgroundColor: '#FFF3E0',
          textColor: '#FF9800',
        };
    }
  };

  // Format header subtitle
  const formatHeaderSubtitle = () => {
    if (!booking) return 'Order Details';
    const parts = [];

    if (booking.serviceStartDate) {
      try {
        const date = new Date(booking.serviceStartDate);
        if (!isNaN(date.getTime())) {
          const formatted = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          parts.push(formatted);
        }
      } catch (e) {
        console.error('Error formatting service start date:', e);
      }
    }

    if (booking.quantity && booking.unitOfMeasure) {
      parts.push(formatQuantityUnit(booking.quantity, booking.unitOfMeasure));
    }

    return parts.length > 0 ? parts.join(' • ') : `#${booking._id.slice(-6).toUpperCase()}`;
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
  const statusBadge = getStatusBadgeConfig(booking.status);

  const hasCoordinates = booking.coordinates &&
    Array.isArray(booking.coordinates) &&
    booking.coordinates.length === 2;

  const mapCenter = hasCoordinates ? {
    latitude: booking.coordinates[1],
    longitude: booking.coordinates[0],
  } : null;

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Header - Figma Design */}
        <View style={styles.header}>
          <View style={styles.appBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle}>
                {getCleanServiceName(listing)}
              </Text>
              <Text style={styles.headerSubtitle}>{formatHeaderSubtitle()}</Text>
            </View>
            <View style={styles.appBarRight}>
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.backgroundColor }]}>
                <Text style={[styles.statusText, { color: statusBadge.textColor }]}>
                  {statusBadge.text}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollContent}
          contentContainerStyle={booking.status === 'pending' ? { paddingBottom: 100 } : undefined}
        >
          {/* Map Section */}
          {mapCenter && (
            <View style={styles.mapSection}>
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: mapCenter.latitude,
                    longitude: mapCenter.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  customMapStyle={UBER_MAP_STYLE}
                >
                  <Marker coordinate={mapCenter} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.mapMarker}>
                      <Ionicons name="location-sharp" size={34} color="#0F172A" />
                    </View>
                  </Marker>
                </MapView>
              </View>

              {/* Service Info Card */}
              <View style={styles.serviceInfoSection}>
                <View style={styles.serviceInfoRow}>
                  {listing?.photoUrls && listing.photoUrls.length > 0 ? (
                    <Image
                      source={{ uri: cleanImageUrl(listing.photoUrls[0]) }}
                      style={styles.serviceImage}
                    />
                  ) : (
                    <View style={styles.serviceImagePlaceholder}>
                      <Ionicons name="cube-outline" size={24} color="#94A3B8" />
                    </View>
                  )}
                  <View style={styles.serviceInfoContent}>
                    <Text style={styles.serviceTitle}>{getCleanServiceName(listing)}</Text>
                    <Text style={styles.serviceCategory}>
                      {listing?.categoryId?.name || 'Service'}
                    </Text>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>₹{booking.totalAmount.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Get Directions Button */}
                <TouchableOpacity
                  style={styles.directionsButton}
                  onPress={() => {
                    const [lng, lat] = booking.coordinates;
                    const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
                    const url = Platform.OS === 'ios'
                      ? `${scheme}${lat},${lng}`
                      : `${scheme}${lat},${lng}?q=${lat},${lng}`;
                    Linking.openURL(url);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="navigate-outline" size={20} color="#0F172A" />
                  <Text style={styles.directionsText}>Get Directions</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Response Required Alert - Only for pending */}
          {booking.status === 'pending' && booking.requestExpiresAt && (
            <View style={styles.alertCard}>
              <View style={styles.alertIconWrap}>
                <Ionicons name="time-outline" size={20} color="#EA580C" />
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>Response Required</Text>
                <Text style={styles.alertText}>
                  By {formatDate(booking.requestExpiresAt)} at {formatTime(booking.requestExpiresAt)}
                </Text>
              </View>
            </View>
          )}

          {/* Customer Card */}
          {seeker && (
            <View style={styles.customerCard}>
              <View style={styles.customerRow}>
                <View style={styles.customerAvatarWrap}>
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerAvatarText}>
                      {seeker?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                </View>

                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>
                    {seeker?.name || 'Unknown Customer'}
                  </Text>
                  <View style={styles.customerMetaRow}>
                    <Text style={styles.customerMetaText}>Customer</Text>
                  </View>
                </View>
              </View>

              <View style={styles.customerActions}>
                {seeker?.phone && (
                  <TouchableOpacity
                    style={styles.customerActionBtn}
                    onPress={() => handleCall(seeker.phone)}
                  >
                    <Ionicons name="call-outline" size={22} color="#0F172A" />
                    <Text style={styles.customerActionLabel}>Call</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.customerActionBtn, !seeker?.phone && styles.customerActionBtnLast]}
                  onPress={() => {
                    navigation.navigate('Chat' as never, {
                      recipientId: seeker._id,
                      recipientName: seeker.name,
                      orderId: booking._id,
                    } as never);
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={22} color="#0F172A" />
                  <Text style={styles.customerActionLabel}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Order Details Card */}
          <View style={styles.orderDetailsCard}>
            <TouchableOpacity
              style={styles.orderDetailsHeader}
              onPress={() => setShowOrderDetails(!showOrderDetails)}
              activeOpacity={0.7}
            >
              <Text style={styles.orderDetailsTitle}>Order details</Text>
              <View style={styles.orderDetailsToggle}>
                <Ionicons
                  name={showOrderDetails ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#0F172A"
                />
              </View>
            </TouchableOpacity>

            {showOrderDetails && (
              <View style={styles.orderDetailsBody}>
                {/* Service Summary */}
                <View style={styles.orderSummaryRow}>
                  <View style={styles.orderSummaryInfo}>
                    <Text style={styles.orderSummaryTitle}>{getCleanServiceName(listing)}</Text>
                    <Text style={styles.orderSummaryMeta}>
                      {booking.serviceStartDate && formatDate(booking.serviceStartDate)}
                      {booking.quantity && booking.unitOfMeasure &&
                        ` • ${formatQuantityUnit(booking.quantity, booking.unitOfMeasure)}`}
                    </Text>
                  </View>
                  <Text style={styles.orderSummaryPrice}>₹{booking.totalAmount.toLocaleString()}</Text>
                </View>

                {/* Timeline */}
                <View style={styles.orderDetailsDivider} />
                <View style={styles.orderBlock}>
                  <Text style={styles.orderBlockLabel}>Timeline</Text>
                  <View style={styles.timelineCompact}>
                    <View style={styles.timelineCompactItem}>
                      <View style={[styles.timelineCompactDot, styles.timelineCompactDotCompleted]} />
                      <Text style={styles.timelineCompactText}>
                        Created: {formatDate(booking.createdAt)} at {formatTime(booking.createdAt)}
                      </Text>
                    </View>
                    {booking.serviceStartDate && (
                      <View style={styles.timelineCompactItem}>
                        <View style={[styles.timelineCompactDot,
                          booking.status === 'completed' ? styles.timelineCompactDotCompleted : styles.timelineCompactDotPending
                        ]} />
                        <Text style={styles.timelineCompactText}>
                          Scheduled: {formatDate(booking.serviceStartDate)} • {getStatusLabel(booking.status)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Category */}
                {listing?.categoryId?.name && (
                  <>
                    <View style={styles.orderDetailsDivider} />
                    <View style={styles.orderBlock}>
                      <Text style={styles.orderBlockLabel}>Service type</Text>
                      <Text style={styles.orderBlockValue}>{listing.categoryId.name}</Text>
                    </View>
                  </>
                )}

                {/* Notes */}
                {booking.notes && (
                  <>
                    <View style={styles.orderDetailsDivider} />
                    <View style={styles.orderBlock}>
                      <Text style={styles.orderBlockLabel}>Customer notes</Text>
                      <Text style={styles.orderBlockValue}>{booking.notes}</Text>
                    </View>
                  </>
                )}

                {/* Order ID */}
                <View style={styles.orderDetailsDivider} />
                <View style={styles.orderBlock}>
                  <Text style={styles.orderBlockLabel}>Order ID</Text>
                  <Text style={styles.orderBlockValue}>#{booking._id.slice(-8).toUpperCase()}</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        {booking.status === 'pending' && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={handleRejectBooking}
              disabled={isProcessing === 'cancel'}
              activeOpacity={0.8}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={handleAcceptBooking}
              disabled={isProcessing === 'accept'}
              activeOpacity={0.8}
            >
              {isProcessing === 'accept' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.acceptBtnText}>Accept Booking</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Header styles
  header: {
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.SM,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTextGroup: {
    flex: 1,
    marginHorizontal: 12,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    marginBottom: 1,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  // Scroll content
  scrollContent: {
    flex: 1,
  },
  // Map section
  mapSection: {
    backgroundColor: '#FFF',
    marginBottom: 24,
  },
  mapContainer: {
    position: 'relative',
    height: 280,
    width: '100%',
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Service info section
  serviceInfoSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  serviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  serviceImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginBottom: 2,
  },
  serviceCategory: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  priceTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceTagText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginLeft: 8,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  // Alert card
  alertCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#C2410C',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginBottom: 2,
  },
  alertText: {
    fontSize: 13,
    color: '#EA580C',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  // Customer card
  customerCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
    overflow: 'hidden',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  customerAvatarWrap: {
    position: 'relative',
  },
  customerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginBottom: 2,
  },
  customerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerMetaText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  customerActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  customerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  customerActionBtnLast: {
    borderRightWidth: 0,
  },
  customerActionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginLeft: 8,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  // Order details card
  orderDetailsCard: {
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  orderDetailsTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  orderDetailsToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderDetailsBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderSummaryInfo: {
    flex: 1,
    paddingRight: 12,
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  orderSummaryMeta: {
    fontSize: 13,
    color: '#475569',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  orderSummaryPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  orderDetailsDivider: {
    height: 1,
    backgroundColor: '#EEF2F6',
    marginVertical: 16,
  },
  orderBlock: {},
  orderBlockLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#94A3B8',
    marginBottom: 4,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  orderBlockValue: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  // Compact timeline
  timelineCompact: {
    marginTop: 8,
  },
  timelineCompactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineCompactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  timelineCompactDotCompleted: {
    backgroundColor: '#10B981',
  },
  timelineCompactDotPending: {
    backgroundColor: '#F59E0B',
  },
  timelineCompactText: {
    fontSize: 14,
    color: '#475569',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  // Footer
  footer: {
    flexDirection: 'row',
    padding: SPACING.MD,
    paddingBottom: Platform.OS === 'ios' ? 32 : SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  declineBtnText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#64748B',
  },
  acceptBtn: {
    flex: 1.5,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#FFFFFF',
  },
});

export default OrderDetailScreen;
