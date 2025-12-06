import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { COLORS, FONTS, SPACING } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import ServiceRequestService from '../../services/ServiceRequestService';
import { calculateDistance, formatDistance } from '../../utils/distance';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const ProviderServiceRequestDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { booking } = route.params || {};
  const { latitude, longitude } = useSelector((state: RootState) => state.location);

  const [quotePrice, setQuotePrice] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serviceRequest, setServiceRequest] = useState<any>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(true);

  useEffect(() => {
    if (booking) {
      const listingPrice = booking.listing?.price || 0;
      setQuotePrice(listingPrice > 0 ? listingPrice.toString() : '');
      setServiceRequest(booking);
    } else if (route.params?.requestId) {
      loadServiceRequest(route.params.requestId);
    }
  }, [booking, route.params]);

  const loadServiceRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const request = await ServiceRequestService.getRequestById(requestId);
      setServiceRequest(request);
      const listingPrice = (request as any).listing?.price ||
                          (request as any).lifecycle?.order?.listingId?.price;
      if (listingPrice) {
        setQuotePrice(listingPrice.toString());
      }
    } catch (error) {
      console.error('Error loading service request:', error);
      Alert.alert('Error', 'Failed to load service request details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatUnitOfMeasure = (unit?: string): string => {
    if (!unit) return '';
    const unitMap: { [key: string]: string } = {
      'per_hour': '/hr',
      'per_day': '/day',
      'per_piece': '/piece',
      'per_kg': '/kg',
      'per_unit': '/unit'
    };
    return unitMap[unit] || unit.replace('per_', '/').replace('_', '');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatHeaderSubtitle = () => {
    if (!serviceRequest) return 'Service Request';
    const parts = [];

    const address = serviceRequest.serviceLocation?.address || serviceRequest.address;
    if (address) {
      const locationPart = address.split(',')[0].trim();
      if (locationPart) parts.push(locationPart);
    }

    if (serviceRequest.serviceStartDate) {
      try {
        const date = new Date(serviceRequest.serviceStartDate);
        if (!isNaN(date.getTime())) {
          const formatted = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          parts.push(formatted);
        }
      } catch (e) {
        console.error('Error formatting service start date:', e);
      }
    }

    return parts.length > 0 ? parts.join(' • ') : 'Service Request';
  };

  const cleanImageUrl = (url: string): string => {
    if (!url || typeof url !== 'string') {
      return '';
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
      return '';
    }
  };

  const submitAcceptance = async () => {
    if (!serviceRequest) return;

    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    try {
      setAccepting(true);
      const result = await ServiceRequestService.acceptRequest(serviceRequest._id, {
        price: parseFloat(quotePrice),
      });

      console.log('result of accepting service request', result);

      const orderId = result.orderId || result.order?._id || result.order?.id;

      if (!orderId) {
        console.error('Order ID not found in result:', result);
        Alert.alert('Error', 'Order was created but order ID is missing. Please check your orders.');
        navigation.goBack();
        return;
      }

      Alert.alert('Success!', 'You have successfully accepted the service request.', [
        {
          text: 'View Order',
          onPress: () => {
            navigation.goBack();
            setTimeout(() => {
              let rootNav = navigation.getParent();
              rootNav = rootNav?.getParent();
              rootNav = rootNav?.getParent();

              if (rootNav) {
                (rootNav as any).navigate('OrderDetail', { bookingId: orderId });
              } else {
                (navigation as any).navigate('OrderDetail', { bookingId: orderId });
              }
            }, 150);
          },
        },
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request. It may have been accepted by another provider.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!serviceRequest) return;

    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this service request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeclining(true);
              await ServiceRequestService.declineRequest(serviceRequest._id);
              Alert.alert('Success', 'Service request declined successfully', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.navigate('ProviderHome', { refresh: true });
                  },
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline request. Please try again.');
            } finally {
              setDeclining(false);
            }
          },
        },
      ]
    );
  };

  const openMaps = () => {
    const coords = serviceRequest?.serviceLocation?.coordinates || serviceRequest?.seeker?.coordinates;
    if (coords && coords.length === 2) {
      const [lng, lat] = coords;
      const scheme = Platform.OS === 'ios' ? 'maps:' : 'geo:';
      const url = Platform.OS === 'ios'
        ? `${scheme}${lat},${lng}`
        : `${scheme}${lat},${lng}?q=${lat},${lng}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <SafeAreaWrapper backgroundColor="#FFFFFF" style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!serviceRequest) {
    return (
      <SafeAreaWrapper backgroundColor="#FFFFFF" style={styles.container}>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color="#94A3B8" />
          </View>
          <Text style={styles.errorText}>Service request not found</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaWrapper>
    );
  }

  let calculatedDistance: number | null = null;
  if (latitude && longitude && serviceRequest.serviceLocation?.coordinates) {
    const [reqLng, reqLat] = serviceRequest.serviceLocation.coordinates;
    calculatedDistance = calculateDistance(latitude, longitude, reqLat, reqLng);
  }

  const distance = serviceRequest.distance || calculatedDistance;
  const listing = serviceRequest.listing || serviceRequest.lifecycle?.order?.listingId;
  const serviceTitle = listing?.title || serviceRequest.title || 'Service Request';
  const customerName = serviceRequest.seeker?.name || 'Customer';
  const serviceAddress = serviceRequest.serviceLocation?.address || serviceRequest.address || '';
  const serviceDescription = listing?.description || serviceRequest.description || '';
  const preferredTime = serviceRequest.serviceTime || serviceRequest.metadata?.preferredTime || '';
  const listingImage = listing?.photoUrls?.[0] || listing?.thumbnailUrl || '';
  const hasCoordinates = serviceRequest?.serviceLocation?.coordinates?.length === 2 ||
                         serviceRequest?.seeker?.coordinates?.length === 2;

  return (
    <SafeAreaWrapper backgroundColor="#FFFFFF" style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.appBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitle} numberOfLines={1}>{serviceTitle}</Text>
              <Text style={styles.headerSubtitle}>{formatHeaderSubtitle()}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>New</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Service Info Card with Image */}
          <View style={styles.serviceInfoCard}>
            <View style={styles.serviceInfoRow}>
              {listingImage ? (
                <Image
                  source={{ uri: cleanImageUrl(listingImage) }}
                  style={styles.serviceImage}
                />
              ) : (
                <View style={styles.serviceImagePlaceholder}>
                  <Ionicons name="cube-outline" size={28} color="#94A3B8" />
                </View>
              )}
              <View style={styles.serviceInfoContent}>
                <Text style={styles.serviceTitle} numberOfLines={2}>{serviceTitle}</Text>
                <Text style={styles.serviceCategory}>
                  {listing?.categoryId?.name || serviceRequest.categoryId?.name || 'Service'}
                </Text>
              </View>
              {listing?.price && (
                <View style={styles.priceTag}>
                  <Text style={styles.priceTagText}>₹{listing.price}</Text>
                  {listing?.unitOfMeasure && (
                    <Text style={styles.priceTagUnit}>{formatUnitOfMeasure(listing.unitOfMeasure)}</Text>
                  )}
                </View>
              )}
            </View>

            {serviceDescription ? (
              <Text style={styles.serviceDescription} numberOfLines={3}>
                {serviceDescription}
              </Text>
            ) : null}
          </View>

          {/* Location Card */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={styles.locationIconWrap}>
                <Ionicons name="location" size={20} color="#10B981" />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Service Location</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {serviceAddress || 'Address not provided'}
                </Text>
              </View>
              {distance !== null && distance !== undefined && (
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceText}>{formatDistance(distance)}</Text>
                </View>
              )}
            </View>

            {hasCoordinates && (
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={openMaps}
                activeOpacity={0.7}
              >
                <Ionicons name="navigate-outline" size={20} color="#0F172A" />
                <Text style={styles.directionsText}>Get Directions</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Customer Card */}
          <View style={styles.customerCard}>
            <View style={styles.customerRow}>
              <View style={styles.customerAvatarWrap}>
                <View style={styles.customerAvatar}>
                  <Text style={styles.customerAvatarText}>
                    {customerName?.charAt(0)?.toUpperCase() || 'C'}
                  </Text>
                </View>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{customerName}</Text>
                <Text style={styles.customerMetaText}>Customer</Text>
              </View>
            </View>
          </View>

          {/* Order Details Card */}
          <View style={styles.orderDetailsCard}>
            <TouchableOpacity
              style={styles.orderDetailsHeader}
              onPress={() => setShowOrderDetails(!showOrderDetails)}
              activeOpacity={0.7}
            >
              <Text style={styles.orderDetailsTitle}>Request details</Text>
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
                {serviceRequest.serviceStartDate && (
                  <>
                    <View style={styles.orderBlock}>
                      <Text style={styles.orderBlockLabel}>Service Date</Text>
                      <Text style={styles.orderBlockValue}>
                        {formatDate(serviceRequest.serviceStartDate)}
                      </Text>
                    </View>
                    <View style={styles.orderDetailsDivider} />
                  </>
                )}

                {preferredTime && (
                  <>
                    <View style={styles.orderBlock}>
                      <Text style={styles.orderBlockLabel}>Preferred Time</Text>
                      <Text style={styles.orderBlockValue}>{preferredTime}</Text>
                    </View>
                    <View style={styles.orderDetailsDivider} />
                  </>
                )}

                {serviceRequest.budget && (
                  <>
                    <View style={styles.orderBlock}>
                      <Text style={styles.orderBlockLabel}>Budget Range</Text>
                      <Text style={styles.orderBlockValue}>
                        ₹{serviceRequest.budget?.min?.toLocaleString() || '0'} - ₹{serviceRequest.budget?.max?.toLocaleString() || '0'}
                      </Text>
                    </View>
                    <View style={styles.orderDetailsDivider} />
                  </>
                )}

                {serviceRequest.urgency && (
                  <>
                    <View style={styles.orderBlock}>
                      <Text style={styles.orderBlockLabel}>Urgency</Text>
                      <View style={styles.urgencyBadge}>
                        <Text style={styles.urgencyText}>
                          {serviceRequest.urgency.charAt(0).toUpperCase() + serviceRequest.urgency.slice(1)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.orderDetailsDivider} />
                  </>
                )}

                <View style={styles.orderBlock}>
                  <Text style={styles.orderBlockLabel}>Request ID</Text>
                  <Text style={styles.orderBlockValue}>#{serviceRequest._id?.slice(-8).toUpperCase()}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Quote Section */}
          <View style={styles.quoteCard}>
            <Text style={styles.quoteTitle}>Your Quote</Text>
            <Text style={styles.quoteSubtitle}>
              Enter the price you want to charge for this service
            </Text>

            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.priceInput}
                placeholder={listing?.price ? "Adjust price if needed" : "Enter your quote"}
                placeholderTextColor="#94A3B8"
                value={quotePrice}
                onChangeText={setQuotePrice}
                keyboardType="numeric"
              />
              {listing?.unitOfMeasure && (
                <Text style={styles.inputUnit}>{formatUnitOfMeasure(listing.unitOfMeasure)}</Text>
              )}
            </View>

            {listing?.price && parseFloat(quotePrice) !== listing.price && quotePrice !== '' && (
              <View style={styles.priceHintRow}>
                <Ionicons name="information-circle-outline" size={16} color="#64748B" />
                <Text style={styles.priceHint}>
                  Your listing price: ₹{listing.price.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
            disabled={accepting || declining}
            activeOpacity={0.8}
          >
            {declining ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : (
              <Text style={styles.declineBtnText}>Decline</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.acceptBtn,
              (!quotePrice || parseFloat(quotePrice) <= 0 || accepting) && styles.acceptBtnDisabled
            ]}
            onPress={submitAcceptance}
            disabled={accepting || declining || !quotePrice || parseFloat(quotePrice) <= 0}
            activeOpacity={0.8}
          >
            {accepting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.acceptBtnText}>Accept Job</Text>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
    marginBottom: 24,
    textAlign: 'center',
  },
  errorBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  errorBtnText: {
    fontSize: 15,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#FFFFFF',
  },

  // Header
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
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  headerTextGroup: {
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#16A34A',
    fontFamily: FONTS.POPPINS.MEDIUM,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 120,
  },

  // Service Info Card
  serviceInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  serviceInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  serviceImagePlaceholder: {
    width: 64,
    height: 64,
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
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  priceTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  priceTagText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  priceTagUnit: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#475569',
    fontFamily: FONTS.POPPINS.REGULAR,
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },

  // Location Card
  locationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#94A3B8',
    fontFamily: FONTS.POPPINS.MEDIUM,
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 15,
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.MEDIUM,
    lineHeight: 22,
  },
  distanceBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginLeft: 8,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },

  // Customer Card
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#1E293B',
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
  customerMetaText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },

  // Order Details Card
  orderDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  orderDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  orderBlock: {
    marginBottom: 4,
  },
  orderBlockLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#94A3B8',
    fontFamily: FONTS.POPPINS.MEDIUM,
    marginBottom: 4,
  },
  orderBlockValue: {
    fontSize: 15,
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.REGULAR,
    lineHeight: 22,
  },
  orderDetailsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  urgencyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  urgencyText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F59E0B',
    fontFamily: FONTS.POPPINS.MEDIUM,
  },

  // Quote Card
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  quoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginBottom: 4,
  },
  quoteSubtitle: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
    marginBottom: 16,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#0F172A',
    paddingVertical: 14,
  },
  inputUnit: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  priceHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  priceHint: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#64748B',
    marginLeft: 6,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  acceptBtnText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#FFFFFF',
  },
});

export default ProviderServiceRequestDetailScreen;
