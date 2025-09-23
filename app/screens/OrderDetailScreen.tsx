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
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import BookingService, { Booking } from '../services/BookingService';
import { canTransition, setOrderStatus } from '../services/orderStatus';
import apiInterceptor from '../services/apiInterceptor';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OrderDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { bookingId } = route.params;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<'accept' | 'cancel' | null>(null);
  
  // Subtle animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    fetchBookingDetails();
    
    // Gentle entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 90,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await BookingService.getBookingById(bookingId);
      
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

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
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
    // Convert "per_hour" to "hours"
    if (unit === 'per_hour') {
      return `${quantity} ${quantity === 1 ? 'hour' : 'hours'}`;
    }
    // Handle other units
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

  if (loading) {
    return (
      <SafeAreaWrapper backgroundColor="#FFFFFF">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!booking) return null;

  const listing = typeof booking.listingId === 'object' ? booking.listingId : null;
  const seeker = typeof booking.seekerId === 'object' ? booking.seekerId : null;

  return (
    <SafeAreaWrapper backgroundColor="#FFFFFF">
      {/* Minimal Elegant Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.orderId}>#{booking._id.slice(-6).toUpperCase()}</Text>
        </View>
        
        <View style={[styles.statusIndicator, 
          booking.status === 'pending' && styles.statusPending,
          booking.status === 'accepted' && styles.statusAccepted,
          booking.status === 'canceled' && styles.statusCanceled
        ]}>
          <View style={[styles.statusDot,
            booking.status === 'pending' && styles.dotPending,
            booking.status === 'accepted' && styles.dotAccepted,
            booking.status === 'canceled' && styles.dotCanceled
          ]} />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          booking.status === 'pending' && { paddingBottom: 100 }
        ]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Elegant Service Card */}
        <Animated.View style={[
          styles.serviceCard,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}>
          <View style={styles.serviceHeader}>
            {listing?.photoUrls && listing.photoUrls.length > 0 ? (
              <Image 
                source={{ uri: cleanImageUrl(listing.photoUrls[0]) }} 
                style={styles.serviceImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={28} color="#CBD5E1" />
              </View>
            )}
            
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTitle}>
                {getCleanServiceName(listing)}
              </Text>
              <Text style={styles.serviceCategory}>
                {listing?.categoryId?.name|| 'Service'}
              </Text>
              
              
              <View style={styles.priceSection}>
                <Text style={styles.price}>₹{booking.totalAmount.toLocaleString()}</Text>
                <Text style={styles.quantity}>
                  {formatQuantityUnit(booking.quantity || 2, booking.unitOfMeasure || 'per_hour')}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Status Card - Only for pending */}
        {booking.status === 'pending' && booking.requestExpiresAt && (
          <Animated.View style={[
            styles.alertCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.add(slideAnim, 5) }]
            }
          ]}>
            <View style={styles.alertIcon}>
              <Ionicons name="time" size={20} color="#F59E0B" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Response Required</Text>
              <Text style={styles.alertText}>
                By {formatDate(booking.requestExpiresAt)} at {formatTime(booking.requestExpiresAt)}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Timeline Section */}
        <Animated.View style={[
          styles.sectionCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: Animated.add(slideAnim, 10) }]
          }
        ]}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineIconWrapper}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Booking Created</Text>
                <Text style={styles.timelineDate}>{formatDate(booking.createdAt)}</Text>
                <Text style={styles.timelineTime}>{formatTime(booking.createdAt)}</Text>
              </View>
            </View>
            
            {booking.serviceStartDate && (
              <>
                <View style={styles.timelineConnector} />
                <View style={styles.timelineItem}>
                  <View style={styles.timelineIconWrapper}>
                    <Ionicons name="calendar" size={20} color="#10B981" />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineLabel}>Service Scheduled</Text>
                    <Text style={styles.timelineDate}>{formatDate(booking.serviceStartDate)}</Text>
                    <Text style={styles.timelineTime}>{getStatusLabel(booking.status)}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Map Section */}
        {booking.coordinates && (
          <Animated.View style={[
            styles.sectionCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.add(slideAnim, 15) }]
            }
          ]}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapWrapper}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: booking.coordinates[1],
                  longitude: booking.coordinates[0],
                  latitudeDelta: 0.006,
                  longitudeDelta: 0.006,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: booking.coordinates[1],
                    longitude: booking.coordinates[0],
                  }}
                >
                  <View style={styles.marker}>
                    <View style={styles.markerInner} />
                  </View>
                </Marker>
              </MapView>
              
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
                activeOpacity={0.8}
              >
                <Ionicons name="navigate" size={16} color="#10B981" />
                <Text style={styles.directionsText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Notes Section */}
        {booking.notes && (
          <Animated.View style={[
            styles.notesCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: Animated.add(slideAnim, 20) }]
            }
          ]}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={18} color="#6B7280" />
              <Text style={styles.notesTitle}>Customer Notes</Text>
            </View>
            <Text style={styles.notesText}>{booking.notes}</Text>
          </Animated.View>
        )}

        {/* Customer Section */}
        <Animated.View style={[
          styles.sectionCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: Animated.add(slideAnim, 25) }]
          }
        ]}>
          <Text style={styles.sectionTitle}>Customer</Text>
          
          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {seeker?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>
                {seeker?.name || 'Unknown Customer'}
              </Text>
              {seeker?.phone && (
                <Text style={styles.customerDetail}>{seeker.phone}</Text>
              )}
              {seeker?.email && (
                <Text style={styles.customerDetail}>{seeker.email}</Text>
              )}
            </View>
            
            <View style={styles.contactButtons}>
              {seeker?.phone && (
                <TouchableOpacity 
                  style={styles.contactBtn} 
                  onPress={() => handleCall(seeker.phone)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call-outline" size={20} color="#10B981" />
                </TouchableOpacity>
              )}
              {seeker?.email && (
                <TouchableOpacity 
                  style={styles.contactBtn} 
                  onPress={() => handleEmail(seeker.email)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="mail-outline" size={20} color="#10B981" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Elegant Bottom Actions */}
      {booking.status === 'pending' && (
        <Animated.View style={[
          styles.bottomActions,
          {
            opacity: fadeAnim,
            transform: [{ translateY: Animated.multiply(slideAnim, -0.5) }]
          }
        ]}>
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
        </Animated.View>
      )}
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16, // Increased from 14
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eaedf1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18, // Increased from 16
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#111827',
  },
  orderId: {
    fontSize: 14, // Increased from 12
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    marginTop: 2,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusAccepted: {
    backgroundColor: '#D1FAE5',
  },
  statusCanceled: {
    backgroundColor: '#FEE2E2',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9CA3AF',
  },
  dotPending: {
    backgroundColor: '#F59E0B',
  },
  dotAccepted: {
    backgroundColor: '#10B981',
  },
  dotCanceled: {
    backgroundColor: '#EF4444',
  },
  scrollContent: {
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 21,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
  },
  serviceImage: {
    width: 85,
    height: 85,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  imagePlaceholder: {
    width: 85,
    height: 85,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 16,
  },
  serviceCategory: {
    fontSize: 12, // Increased from 12
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 20, // Increased from 18
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#111827',
    marginBottom: 4,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 22, // Increased from 24
    fontFamily: FONTS.POPPINS.BOLD,
    color: '#10B981',
    marginRight: 8,
  },
  quantity: {
    fontSize: 15, // Increased from 13
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#9CA3AF',
  },
  alertCard: {
    backgroundColor: '#fef8e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16, // Increased from 14
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#92400E',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 14, // Increased from 12
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#B45309',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16, // Increased from 14
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#111827',
    marginBottom: 16,
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  timelineIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 15, // Increased from 13
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#6B7280',
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 16, // Increased from 14
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#111827',
    marginBottom: 2,
  },
  timelineTime: {
    fontSize: 14, // Increased from 12
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#9CA3AF',
  },
  timelineConnector: {
    position: 'absolute',
    left: 15,
    top: 35,
    bottom: 20,
    width: 2,
    backgroundColor: '#E5E7EB',
  },
  mapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    height: 180,
    borderRadius: 12,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981', // Changed from #4F46E5
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981', // Changed from #4F46E5
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  directionsButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  directionsText: {
    fontSize: 15, // Increased from 13
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#10B981', // Changed from #4F46E5
    marginLeft: 6,
  },
  notesCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 15, // Increased from 13
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#6B7280',
    marginLeft: 8,
  },
  notesText: {
    fontSize: 16, // Increased from 14
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#374151',
    lineHeight: 22, // Increased from 20
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCFCE7', // Changed from #EEF2FF (green tint)
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20, // Increased from 18
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#10B981', // Changed from #4F46E5
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 17, // Increased from 15
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#111827',
    marginBottom: 2,
  },
  customerDetail: {
    fontSize: 15, // Increased from 13
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    marginBottom: 1,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  declineBtnText: {
    fontSize: 17, // Increased from 15
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#6B7280',
  },
  acceptBtn: {
    flex: 1.5,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: 17, // Increased from 15
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#FFFFFF',
  },
});

export default OrderDetailScreen;