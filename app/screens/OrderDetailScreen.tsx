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
import apiInterceptor from '../services/apiInterceptor';

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
      console.log('🔍 [DEBUG] Starting fetchBookingDetails for bookingId:', bookingId);
      
      const data = await BookingService.getBookingById(bookingId);
      console.log('📦 [DEBUG] Initial booking data received:', data);
      console.log('🔗 [DEBUG] listingId type:', typeof data.listingId);
      console.log('🔗 [DEBUG] listingId value:', data.listingId);
      
      try {
        const pretty = JSON.stringify(data, null, 2);
        console.log('[OrderDetailScreen] Loaded order detail for', bookingId, ':\n', pretty);
      } catch {}
      
      // Hydrate seeker details if seekerId is just a string
      if (typeof data.seekerId === 'string') {
        console.log('👤 [DEBUG] Fetching seeker details for ID:', data.seekerId);
        try {
          const seekerResult = await apiInterceptor.makeAuthenticatedRequest(`/users/${data.seekerId}`, {
            method: 'GET',
          });
          console.log('👤 [DEBUG] Seeker API result:', seekerResult);
          if (seekerResult.success && seekerResult.data) {
            const seekerData = seekerResult.data as any;
            data.seekerId = {
              _id: seekerData.id,
              name: seekerData.name,
              phone: seekerData.phone,
              email: seekerData.email
            };
            console.log('👤 [DEBUG] Seeker data hydrated:', data.seekerId);
          }
        } catch (error) {
          console.error('❌ [DEBUG] Error fetching seeker details:', error);
        }
      } else {
        console.log('👤 [DEBUG] seekerId is already an object:', data.seekerId);
      }
      
      // Hydrate listing details if listingId is just a string
      if (typeof data.listingId === 'string') {
        console.log('🏷️ [DEBUG] Fetching listing details for ID:', data.listingId);
        try {
          const listingResult = await apiInterceptor.makeAuthenticatedRequest(`/listings/${data.listingId}`, {
            method: 'GET',
          });
          console.log('🏷️ [DEBUG] Listing API result success:', listingResult.success);
          console.log('🏷️ [DEBUG] Listing API data:', listingResult.data);
          
          if (listingResult.success && listingResult.data) {
            const listingData = listingResult.data as any;
            console.log('🖼️ [DEBUG] Raw photoUrls from API:', listingData.photoUrls);
            console.log('🖼️ [DEBUG] photoUrls type:', typeof listingData.photoUrls);
            console.log('🖼️ [DEBUG] photoUrls length:', listingData.photoUrls?.length);
            
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
            
            console.log('🏷️ [DEBUG] Final listing object:', data.listingId);
            console.log('🖼️ [DEBUG] Final photoUrls in listing object:', data.listingId.photoUrls);
          }
        } catch (error) {
          console.error('❌ [DEBUG] Error fetching listing details:', error);
        }
      } else {
        console.log('🏷️ [DEBUG] listingId is already an object:', data.listingId);
        if (data.listingId && typeof data.listingId === 'object') {
          console.log('🖼️ [DEBUG] Existing photoUrls:', (data.listingId as any).photoUrls);
        }
      }
      
      console.log('✅ [DEBUG] Final booking data before setState:', data);
      setBooking(data);
    } catch (error) {
      console.error('❌ [DEBUG] Error loading booking details:', error);
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

  // Helper function to get a clean service name without hexadecimal IDs
  const getCleanServiceName = (listing: any) => {
    if (!listing?.title) {
      return listing?.subCategory || 'Service Booking';
    }
    
    // Check if title contains hexadecimal pattern (like 687930fa94cb3e5d53ed23b4)
    const hexPattern = /[a-f0-9]{20,}/i;
    if (hexPattern.test(listing.title)) {
      return listing?.subCategory || 'Service Booking';
    }
    
    return listing.title;
  };

  // Helper function to clean and fix malformed image URLs
  const cleanImageUrl = (url: string): string => {
    if (!url || typeof url !== 'string') {
      return 'https://via.placeholder.com/56x56';
    }
    
    console.log('🧹 [DEBUG] Original URL:', url);
    
    // Remove extra quotes around domain and fix common malformations
    let cleanedUrl = url
      .replace(/https:\/\/"([^"]+)"/g, 'https://$1') // Remove quotes around domain
      .replace(/"([^"]+)"/g, '$1') // Remove any remaining quotes
      .replace(/([^/])en\/listings/g, '$1/listings') // Fix missing slash before path
      .replace(/\/\/+/g, '/') // Fix multiple slashes
      .replace(/https:\/([^/])/, 'https://$1'); // Ensure proper protocol format
    
    console.log('🧹 [DEBUG] Cleaned URL:', cleanedUrl);
    
    // Validate the cleaned URL
    try {
      new URL(cleanedUrl);
      return cleanedUrl;
    } catch (error) {
      console.log('🧹 [DEBUG] URL still invalid after cleaning, using placeholder');
      return 'https://via.placeholder.com/56x56';
    }
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

        {/* Status Card - Clean Design */}
        <View style={styles.statusCard}>
          <View style={[styles.statusIconContainer, { backgroundColor: getStatusColor(booking.status) }]}>
            <Ionicons 
              name={getStatusIcon(booking.status)} 
              size={28} 
              color="#fff" 
            />
          </View>
          <View style={styles.statusInfo}>
            <Text variant="h3" weight="bold" color={COLORS.TEXT.PRIMARY}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
            <Text variant="body" color={COLORS.TEXT.SECONDARY}>
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
                {(() => {
                  console.log('🎨 [DEBUG] === IMAGE RENDERING DEBUG ===');
                  console.log('🎨 [DEBUG] listing object:', listing);
                  console.log('🎨 [DEBUG] listing?.photoUrls:', listing?.photoUrls);
                  console.log('🎨 [DEBUG] typeof listing?.photoUrls:', typeof listing?.photoUrls);
                  console.log('🎨 [DEBUG] Array.isArray(listing?.photoUrls):', Array.isArray(listing?.photoUrls));
                  console.log('🎨 [DEBUG] listing?.photoUrls?.length:', listing?.photoUrls?.length);
                  
                  // Get images array just like other components do
                  const images = listing?.photoUrls && listing.photoUrls.length > 0 
                    ? listing.photoUrls 
                    : [];
                  
                  console.log('🎨 [DEBUG] Processed images array:', images);
                  console.log('🎨 [DEBUG] images.length:', images.length);
                  
                  if (images.length > 0) {
                    const rawImageUrl = typeof images[0] === 'string' ? images[0] : 'https://via.placeholder.com/56x56';
                    const cleanedImageUrl = cleanImageUrl(rawImageUrl);
                    console.log('🎨 [DEBUG] Final cleaned image URL to render:', cleanedImageUrl);
                    console.log('🎨 [DEBUG] RENDERING IMAGE COMPONENT');
                    
                    return (
                      <Image 
                        source={{ uri: cleanedImageUrl }} 
                        style={styles.serviceImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('❌ [DEBUG] Image load error:', error.nativeEvent.error);
                          console.log('❌ [DEBUG] Failed image URL:', cleanedImageUrl);
                        }}
                        onLoad={() => {
                          console.log('✅ [DEBUG] Image loaded successfully:', cleanedImageUrl);
                        }}
                        onLoadStart={() => {
                          console.log('⏳ [DEBUG] Image load started:', cleanedImageUrl);
                        }}
                      />
                    );
                  } else {
                    console.log('🎨 [DEBUG] No images found, rendering icon instead');
                    return <Ionicons name="construct-outline" size={32} color={COLORS.PRIMARY.MAIN} />;
                  }
                })()}
              </View>
              <View style={styles.serviceInfo}>
                {/* Category and Sub-Category Display */}
                {(listing?.categoryId?.name || listing?.subCategory) && (
                  <View style={styles.categoryRow}>
                    {listing?.categoryId?.name && (
                      <Text variant="caption" color={COLORS.PRIMARY.MAIN} style={styles.categoryTag}>
                        {listing.categoryId.name}
                      </Text>
                    )}
                    {listing?.subCategory && (
                      <Text variant="caption" color={COLORS.TEXT.SECONDARY} style={styles.subCategoryTag}>
                        • {listing.subCategory}
                      </Text>
                    )}
                  </View>
                )}
                
                {/* Enhanced Service Name Display */}
                <Text variant="h3" weight="bold" numberOfLines={3} style={styles.serviceName}>
                  {getCleanServiceName(listing)}
                </Text>
                {listing?.description && (
                  <Text variant="body" color={COLORS.TEXT.SECONDARY} numberOfLines={2} style={styles.serviceDescription}>
                    {listing.description}
                  </Text>
                )}
                
                {/* Total Amount Display */}
                <View style={styles.totalAmountContainer}>
                  <Text variant="caption" color={COLORS.TEXT.SECONDARY}>Total Amount</Text>
                  <Text variant="h2" weight="bold" color={COLORS.PRIMARY.MAIN}>
                    ₹{booking.totalAmount.toLocaleString()}
                  </Text>
                </View>
                
                {/* Quantity and Availability */}
                <View style={styles.serviceMetaRow}>
                  {booking.quantity && (
                    <Text variant="body" color={COLORS.TEXT.PRIMARY} weight="medium">
                      Quantity: {booking.quantity} • 
                    </Text>
                  )}
                  <Text variant="body" color="#10B981" weight="medium">
                    Available for booking
                  </Text>
                </View>
                
                <View style={styles.serviceMetaRow}>
                  <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                    {listing?.price ? `₹${listing.price}` : `₹${booking.totalAmount}`} per {listing?.unitOfMeasure || booking.unitOfMeasure || 'service'}
                  </Text>
                </View>
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
                {/* Enhanced Customer Name Display */}
                <Text variant="h3" weight="bold" style={styles.customerName}>
                  {seeker?.name || 'Customer Name Not Available'}
                </Text>
                {seeker?.email && (
                  <Text variant="body" color={COLORS.TEXT.SECONDARY} style={{ marginTop: 2 }}>
                    {seeker.email}
                  </Text>
                )}
                
                {/* Contact Information */}
                <View style={styles.contactSection}>
                  {seeker?.phone ? (
                    <TouchableOpacity 
                      style={styles.contactButton}
                      onPress={() => handleCall(seeker.phone)}
                    >
                      <Ionicons name="call" size={18} color="#fff" />
                      <Text variant="body" weight="medium" color="#fff" style={{ marginLeft: 8 }}>
                        Call {seeker.phone}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.unavailableContact}>
                      <Ionicons name="call-outline" size={16} color={COLORS.TEXT.SECONDARY} />
                      <Text variant="caption" color={COLORS.TEXT.SECONDARY} style={{ marginLeft: 6 }}>
                        Phone number not available
                      </Text>
                    </View>
                  )}
                  
                  {seeker?.email && (
                    <TouchableOpacity 
                      style={styles.emailButton}
                      onPress={() => handleEmail(seeker.email)}
                    >
                      <Ionicons name="mail" size={16} color={COLORS.PRIMARY.MAIN} />
                      <Text variant="body" color={COLORS.PRIMARY.MAIN} style={{ marginLeft: 6 }}>
                        Send Email
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
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
            {/* Request Expiry Warning for Pending Bookings */}
            {booking.status === 'pending' && booking.requestExpiresAt && (
              <View style={styles.expiryWarning}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <View style={{ marginLeft: SPACING.SM, flex: 1 }}>
                  <Text variant="body" weight="semibold" color="#F59E0B">
                    Request Expires Soon!
                  </Text>
                  <Text variant="caption" color="#F59E0B">
                    Please respond by {formatDate(booking.requestExpiresAt)} at {formatTime(booking.requestExpiresAt)}
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.TEXT.SECONDARY} />
                <View style={{ marginLeft: SPACING.SM }}>
                  <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                    Booking Created
                  </Text>
                  <Text variant="body" weight="medium">
                    {formatDate(booking.createdAt)}
                  </Text>
                  <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                    {formatTime(booking.createdAt)}
                  </Text>
                </View>
              </View>
              
              {/* Enhanced Expiry Information */}
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={20} color={booking.status === 'pending' ? '#F59E0B' : COLORS.TEXT.SECONDARY} />
                <View style={{ marginLeft: SPACING.SM }}>
                  <Text variant="caption" color={booking.status === 'pending' ? '#F59E0B' : COLORS.TEXT.SECONDARY}>
                    {booking.status === 'pending' ? 'Response Deadline' : 'Request Expired'}
                  </Text>
                  <Text variant="body" weight="medium" color={booking.status === 'pending' ? '#F59E0B' : COLORS.TEXT.PRIMARY}>
                    {formatDate(booking.requestExpiresAt || booking.expiresAt)}
                  </Text>
                  <Text variant="caption" color={booking.status === 'pending' ? '#F59E0B' : COLORS.TEXT.SECONDARY}>
                    {formatTime(booking.requestExpiresAt || booking.expiresAt)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Service Schedule Information */}
            {(booking.serviceStartDate || booking.serviceDate) && (
              <View style={[styles.infoRow, { marginTop: SPACING.MD }]}>
                <View style={styles.infoItem}>
                  <MaterialIcons name="event-available" size={20} color={COLORS.PRIMARY.MAIN} />
                  <View style={{ marginLeft: SPACING.SM }}>
                    <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                      Service Scheduled
                    </Text>
                    <Text variant="body" weight="medium" color={COLORS.PRIMARY.MAIN}>
                      {formatDate(booking.serviceStartDate || booking.serviceDate || booking.createdAt)}
                    </Text>
                    {booking.serviceEndDate && booking.serviceEndDate !== booking.serviceStartDate && (
                      <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                        Until {formatDate(booking.serviceEndDate)}
                      </Text>
                    )}
                  </View>
                </View>
                
                {booking.quantity && (
                  <View style={styles.infoItem}>
                    <Ionicons name="layers-outline" size={20} color={COLORS.TEXT.SECONDARY} />
                    <View style={{ marginLeft: SPACING.SM }}>
                      <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                        Quantity Requested
                      </Text>
                      <Text variant="body" weight="medium">
                        {booking.quantity} {booking.unitOfMeasure || 'unit(s)'}
                      </Text>
                    </View>
                  </View>
                )}
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

        {/* Communication Actions */}
        <View style={styles.communicationSection}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Communication
          </Text>
          <View style={styles.communicationButtons}>
            <TouchableOpacity style={styles.communicationButton} onPress={() => {/* Navigate to chat */}}>
              <View style={styles.communicationIcon}>
                <Ionicons name="chatbubble-outline" size={24} color={COLORS.PRIMARY.MAIN} />
              </View>
              <Text variant="body" weight="medium" color={COLORS.PRIMARY.MAIN}>Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.communicationButton} 
              onPress={() => seeker?.phone && handleCall(seeker.phone)}
            >
              <View style={styles.communicationIcon}>
                <Ionicons name="call-outline" size={24} color={COLORS.PRIMARY.MAIN} />
              </View>
              <Text variant="body" weight="medium" color={COLORS.PRIMARY.MAIN}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.communicationButton} onPress={() => {/* Navigate to help */}}>
              <View style={styles.communicationIcon}>
                <Ionicons name="help-circle-outline" size={24} color={COLORS.PRIMARY.MAIN} />
              </View>
              <Text variant="body" weight="medium" color={COLORS.PRIMARY.MAIN}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>

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
    paddingVertical: SPACING.LG,
    backgroundColor: COLORS.BACKGROUND?.PRIMARY || '#FAFAFA',
    elevation: 0,
    shadowOpacity: 0,
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
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.SM,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.SM,
  },
  statusInfo: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  section: {
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    marginBottom: SPACING.MD,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    ...SHADOWS.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER?.PRIMARY || '#E5E5E5',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.PRIMARY?.LIGHT || '#E3F2FD',
    borderRadius: BORDER_RADIUS.LG,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
    ...SHADOWS.SM,
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
  // New styles for enhanced UI elements
  serviceName: {
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4,
  },
  serviceDescription: {
    marginTop: 4,
    marginBottom: 8,
    lineHeight: 20,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customerName: {
    fontSize: 18,
    marginBottom: 4,
  },
  contactSection: {
    marginTop: SPACING.MD,
    gap: SPACING.SM,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    alignSelf: 'flex-start',
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.CARD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY.MAIN,
    alignSelf: 'flex-start',
  },
  unavailableContact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    alignSelf: 'flex-start',
  },
  expiryWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.MD,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  // New styles for added elements
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  categoryTag: {
    backgroundColor: COLORS.PRIMARY.LIGHT || '#E3F2FD',
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.SM,
    fontSize: 12,
  },
  subCategoryTag: {
    marginLeft: SPACING.SM,
    fontSize: 12,
  },
  totalAmountContainer: {
    marginTop: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  serviceImage: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.LG,
    backgroundColor: COLORS.BACKGROUND?.SECONDARY || '#F5F5F5',
  },
  communicationSection: {
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  communicationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    ...SHADOWS.SM,
  },
  communicationButton: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: SPACING.SM,
  },
  communicationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BACKGROUND.CARD || '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
});

export default OrderDetailScreen;