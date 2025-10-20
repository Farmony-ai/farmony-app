import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import Button from '../components/Button';
import { COLORS, SPACING, BORDER_RADIUS, FONTS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchRequestById,
  cancelServiceRequest,
  acceptServiceRequest,
} from '../store/slices/serviceRequestsSlice';
import ServiceRequestService from '../services/ServiceRequestService';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import RippleAnimation from '../components/RippleAnimation';

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
const ServiceRequestDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch<AppDispatch>();

  const { requestId, serviceRequest } = route.params;

  // Use passed serviceRequest if available, otherwise fall back to Redux
  const [currentRequest, setCurrentRequest] = useState(serviceRequest || null);
  const [loading, setLoading] = useState(!serviceRequest);

  const { accepting } = useSelector(
    (state: RootState) => state.serviceRequests
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  // Default to showing order details for easier viewing
  const [showOrderDetails, setShowOrderDetails] = useState(true);

  const isSeeker = currentRequest?.seekerId === user?.id ||
                   (typeof currentRequest?.seekerId === 'object' &&
                    currentRequest?.seekerId._id === user?.id);
  const isProvider = currentRequest?.matchedProviderIds?.includes(user?.id);

  useEffect(() => {
    console.log('ServiceRequestDetailsScreen: Mounted', {
      requestId,
      hasServiceRequest: !!serviceRequest,
      serviceRequestData: serviceRequest
    });

    // Only fetch from API if data wasn't passed
    if (!serviceRequest) {
      loadRequestDetails();
    } else {
      console.log('ServiceRequestDetailsScreen: Using passed serviceRequest data');
    }
  }, [requestId]);

  const loadRequestDetails = async () => {
    console.log('ServiceRequestDetailsScreen: Loading request details from API for:', requestId);
    setLoading(true);
    try {
      const result = await dispatch(fetchRequestById(requestId)).unwrap();
      console.log('ServiceRequestDetailsScreen: Request loaded successfully:', JSON.stringify(result, null, 2));
      setCurrentRequest(result);
    } catch (error) {
      console.error('ServiceRequestDetailsScreen: Error loading request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this service request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(
                cancelServiceRequest({ requestId, reason: 'Cancelled by user' })
              ).unwrap();
              Alert.alert('Success', 'Service request has been cancelled');
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  const handleAcceptRequest = () => {
    Alert.prompt(
      'Accept Request',
      'Enter your quote price (₹)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async (price) => {
            if (!price || parseFloat(price) <= 0) {
              Alert.alert('Error', 'Please enter a valid price');
              return;
            }

            try {
              const result = await dispatch(
                acceptServiceRequest({
                  requestId,
                  data: {
                    price: parseFloat(price),
                    message: 'I can help with this request',
                  },
                })
              ).unwrap();

              Alert.alert(
                'Success!',
                'You have accepted the request. An order has been created.',
                [
                  {
                    text: 'View Order',
                    onPress: () =>
                      navigation.navigate('OrderDetailScreen', { orderId: result.orderId }),
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to accept request');
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const handleContactSeeker = () => {
    if (typeof currentRequest?.seekerId === 'object' && currentRequest.seekerId.phone) {
      Linking.openURL(`tel:${currentRequest.seekerId.phone}`);
    }
  };

  const handleNavigateToOrder = () => {
    if (currentRequest?.orderId) {
      navigation.navigate('OrderDetailScreen', { orderId: currentRequest.orderId });
    }
  };

  if (loading || !currentRequest) {
    return (
      <SafeAreaWrapper>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
        </View>
      </SafeAreaWrapper>
    );
  }

  // Normalize field names for both unified booking and full service request formats
  const normalizedRequestId = currentRequest._id || currentRequest.id;
  const requestStatus = currentRequest.status || currentRequest.originalStatus || 'unknown';

  const statusColor = ServiceRequestService.getStatusColor(requestStatus);
  const urgencyColor = ServiceRequestService.getUrgencyColor(currentRequest.urgency || 'normal');
  const isExpired = currentRequest.expiresAt ? new Date(currentRequest.expiresAt) < new Date() : false;
  const isSearching = ['open', 'matched', 'searching', 'pending', 'finding_provider'].includes(
    (requestStatus || '').toLowerCase()
  );
  const canAccept =
    isProvider &&
    isSearching &&
    !isExpired;
  const canCancel =
    isSeeker &&
    isSearching;

  // Calculate elapsed time for searching status
  const getElapsedTime = () => {
    if (!isSearching) return null;
    const createdAt = new Date(currentRequest.createdAt).getTime();
    const now = Date.now();
    const elapsedMinutes = Math.floor((now - createdAt) / 60000);
    const hours = Math.floor(elapsedMinutes / 60);
    const minutes = elapsedMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Calculate time to next wave
  const getTimeToNextWave = () => {
    if (!currentRequest.nextWaveAt || !isSearching) return null;
    const nextWave = new Date(currentRequest.nextWaveAt).getTime();
    const now = Date.now();
    const minutesLeft = Math.ceil((nextWave - now) / 60000);
    if (minutesLeft <= 0) return 'Processing...';
    return `${minutesLeft} min`;
  };

  // Format header subtitle: "Kukatpally • 19 Jun • 2 hrs"
  const formatHeaderSubtitle = () => {
    const parts = [];

    // Extract location from address (get first part before comma)
    const address = currentRequest.address || currentRequest.location?.address;
    if (address) {
      const locationPart = address.split(',')[0].trim();
      if (locationPart) parts.push(locationPart);
    }

    // Format date
    if (currentRequest.serviceStartDate) {
      try {
        const date = new Date(currentRequest.serviceStartDate);
        if (!isNaN(date.getTime())) {
          const formatted = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          parts.push(formatted);
        }
      } catch (e) {
        console.error('Error formatting service start date:', e);
      }
    }

    // Add duration from metadata
    if (currentRequest.metadata?.durationHours) {
      parts.push(`${currentRequest.metadata.durationHours} hrs`);
    } else if (currentRequest.metadata?.durationLabel) {
      parts.push(currentRequest.metadata.durationLabel);
    }

    return parts.length > 0 ? parts.join(' • ') : 'Service Request';
  };

  // Get status badge configuration
  const getStatusBadgeConfig = () => {
    if (isSearching) {
      return {
        text: 'Searching',
        backgroundColor: '#E3F2FD',
        textColor: '#2196F3',
      };
    }

    const status = requestStatus.toLowerCase();
    switch (status) {
      case 'accepted':
        return {
          text: 'Matched',
          backgroundColor: '#E8F5E9',
          textColor: '#4CAF50',
        };
      case 'completed':
        return {
          text: 'Completed',
          backgroundColor: '#F5F5F5',
          textColor: '#757575',
        };
      case 'cancelled':
        return {
          text: 'Cancelled',
          backgroundColor: '#F5F5F5',
          textColor: '#757575',
        };
      case 'expired':
        return {
          text: 'Expired',
          backgroundColor: '#FFF3E0',
          textColor: '#FF9800',
        };
      case 'no_providers_available':
        return {
          text: 'No Providers',
          backgroundColor: '#FFEBEE',
          textColor: '#D32F2F',
        };
      default:
        return {
          text: currentRequest.status?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN',
          backgroundColor: '#FFF3E0',
          textColor: '#FF9800',
        };
    }
  };

  const statusBadge = getStatusBadgeConfig();

  const coordinates = currentRequest.location?.coordinates;
  const hasLocation =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.every((value: any) => !Number.isNaN(Number(value)));

  const latitude = hasLocation ? Number(coordinates?.[1]) : null;
  const longitude = hasLocation ? Number(coordinates?.[0]) : null;

  const mapCenter = useMemo(() => {
    if (
      latitude === null ||
      longitude === null ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  }, [latitude, longitude]);

  const mapDelta = isSearching ? 0.02 : 0.01;

  const rawWaveRadius =
    currentRequest.currentWaveRadius ??
    currentRequest.searchRadius ??
    currentRequest.metadata?.searchRadiusMeters ??
    currentRequest.metadata?.searchRadius;

  const waveRadiusValue =
    typeof rawWaveRadius === 'number'
      ? rawWaveRadius
      : rawWaveRadius
      ? parseFloat(rawWaveRadius)
      : null;

  const waveRadiusLabel = useMemo(() => {
    if (!waveRadiusValue || Number.isNaN(waveRadiusValue)) {
      return 'Searching nearby providers';
    }

    if (waveRadiusValue >= 1000) {
      const km = waveRadiusValue / 1000;
      const formattedKm = km >= 10 ? Math.round(km) : Number(km.toFixed(1));
      return `Searching within ${formattedKm} km`;
    }

    return `Searching within ${Math.round(waveRadiusValue)} m`;
  }, [waveRadiusValue]);

  const elapsedTime = getElapsedTime();
  const nextWaveCopy = getTimeToNextWave();
  const serviceTitle =
    currentRequest.title ||
    currentRequest.subCategoryId?.name ||
    currentRequest.categoryId?.name ||
    'Service Request';

  const serviceDateDisplay = currentRequest.serviceStartDate
    ? new Date(currentRequest.serviceStartDate).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const preferredTime = currentRequest.metadata?.preferredTime;
  const durationLabel =
    currentRequest.metadata?.durationLabel ||
    (currentRequest.metadata?.durationHours
      ? `${currentRequest.metadata.durationHours} hrs`
      : null);

  const summaryMeta = [preferredTime, durationLabel].filter(Boolean).join(' • ');
  const summaryLine = [serviceDateDisplay, summaryMeta].filter(Boolean).join(' • ');

  const rawPrice =
    currentRequest.metadata?.quotedPrice ??
    currentRequest.metadata?.estimatedCost ??
    currentRequest.metadata?.budget ??
    currentRequest.budget ??
    currentRequest.price ??
    currentRequest.estimatedAmount;

  const parsedPrice =
    typeof rawPrice === 'number'
      ? rawPrice
      : typeof rawPrice === 'string'
      ? parseFloat(rawPrice.replace(/[^0-9.]/g, ''))
      : null;

  const formattedPrice =
    parsedPrice !== null && !Number.isNaN(parsedPrice)
      ? `₹${parsedPrice.toLocaleString('en-IN', {
          maximumFractionDigits: 2,
          minimumFractionDigits: parsedPrice % 1 === 0 ? 0 : 2,
        })}`
      : null;

  const formattedAddress =
    currentRequest.address ||
    currentRequest.location?.address ||
    [
      currentRequest.metadata?.street,
      currentRequest.metadata?.area,
      currentRequest.metadata?.city,
      currentRequest.metadata?.postalCode,
    ]
      .filter(Boolean)
      .join(', ');

  const formattedAddressLines = formattedAddress
    ? formattedAddress
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* Header - Figma Design */}
        <View style={styles.headerNew}>
          <View style={styles.appBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={styles.headerTextGroup}>
              <Text style={styles.headerTitleNew}>
                {currentRequest.title ||
                  currentRequest.subCategoryId?.name ||
                  currentRequest.categoryId?.name ||
                  'Service Request'}
              </Text>
              <Text style={styles.headerSubtitle}>{formatHeaderSubtitle()}</Text>
            </View>
            <View style={[styles.statusBadgeNew, { backgroundColor: statusBadge.backgroundColor }]}>
              <Text style={[styles.statusTextNew, { color: statusBadge.textColor }]}>
                {statusBadge.text}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
          {/* Map - Figma Design */}
          {mapCenter && (
            <View style={styles.mapSection}>
              <View style={styles.mapContainerNew}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.mapNew}
                  initialRegion={{
                    latitude: mapCenter.latitude,
                    longitude: mapCenter.longitude,
                    latitudeDelta: mapDelta,
                    longitudeDelta: mapDelta,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  customMapStyle={UBER_MAP_STYLE}
                >
                  <Marker coordinate={mapCenter} anchor={{ x: 0.5, y: 1 }}>
                    <View style={styles.rippleMarker}>
                      {isSearching && (
                        <RippleAnimation
                          size={150}
                          duration={2400}
                          color="rgba(79, 70, 229, 0.28)"
                        />
                      )}
                      <Ionicons name="location-sharp" size={34} color="#0F172A" />
                    </View>
                  </Marker>
                </MapView>
                {isSearching && (
                  <View style={styles.mapOverlayContainer} pointerEvents="none">
                    <View style={styles.mapOverlayPill}>
                      <MaterialIcons name="wifi-tethering" size={18} color="#1E3A8A" />
                      <Text style={styles.mapOverlayText}>{waveRadiusLabel}</Text>
                    </View>
                    {nextWaveCopy && (
                      <View style={styles.mapOverlayChip}>
                        <MaterialIcons name="schedule" size={16} color="#1E3A8A" />
                        <Text style={styles.mapOverlayChipText}>
                          {nextWaveCopy === 'Processing...'
                            ? 'Next wave processing'
                            : `Next wave in ${nextWaveCopy}`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Finding Provider Section - Figma Design */}
              {(isSearching || requestStatus === 'no_providers_available') && (
                <View style={styles.findingProviderSection}>
                  <Text style={styles.findingProviderTitle}>
                    {requestStatus === 'no_providers_available' ? 'No Providers Found' : 'Finding Provider'}
                  </Text>
                  <Text style={styles.findingProviderTime}>
                    {requestStatus === 'no_providers_available'
                      ? 'Search completed with no matches'
                      : elapsedTime
                      ? `${elapsedTime} min elapsed`
                      : 'Tracking search...'}
                  </Text>

                  {/* Progress Timeline */}
                  <View style={styles.progressTimeline}>
                    {/* Step 1 - Request Placed */}
                    <View style={styles.timelineStep}>
                      <View style={[styles.timelineIcon, styles.timelineIconCompleted]}>
                        <Ionicons name="receipt-outline" size={20} color="#FFF" />
                      </View>
                      <View style={[styles.timelineLine, styles.timelineLineActive]} />
                    </View>

                    {/* Step 2 - Finding Provider */}
                    <View style={styles.timelineStep}>
                      <View style={[styles.timelineIcon, styles.timelineIconActive]}>
                        <Ionicons name="search-outline" size={20} color="#FFF" />
                      </View>
                      <View style={[styles.timelineLine, styles.timelineLineActive]} />
                    </View>

                    {/* Step 3 - Provider Matched */}
                    <View style={styles.timelineStep}>
                      <View style={styles.timelineIcon}>
                        <Ionicons name="construct-outline" size={18} color="#64748B" />
                      </View>
                      <View style={styles.timelineLine} />
                    </View>

                    {/* Step 4 - Service Complete */}
                    <View style={styles.timelineStepLast}>
                      <View style={styles.timelineIcon}>
                        <Ionicons name="home-outline" size={18} color="#64748B" />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.notificationText}>
                    We will notify you if you match with a provider
                  </Text>
                </View>
              )}

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
                    <View style={styles.orderSummaryRow}>
                      <View style={styles.orderSummaryInfo}>
                        <Text style={styles.orderSummaryTitle}>{serviceTitle}</Text>
                        {summaryLine ? (
                          <Text style={styles.orderSummaryMeta}>{summaryLine}</Text>
                        ) : null}
                      </View>
                      {formattedPrice && (
                        <Text style={styles.orderSummaryPrice}>{formattedPrice}</Text>
                      )}
                    </View>

                    {formattedAddress ? (
                      <>
                        <View style={styles.orderDetailsDivider} />
                        <View style={styles.orderBlock}>
                          <Text style={styles.orderBlockLabel}>Service address</Text>
                          <Text style={styles.orderBlockValue}>
                            {formattedAddressLines.length > 0
                              ? formattedAddressLines.join('\n')
                              : formattedAddress}
                          </Text>
                        </View>
                      </>
                    ) : null}

                    {currentRequest.description ? (
                      <>
                        <View style={styles.orderDetailsDivider} />
                        <View style={styles.orderBlock}>
                          <Text style={styles.orderBlockLabel}>Details</Text>
                          <Text style={styles.orderBlockValue}>{currentRequest.description}</Text>
                        </View>
                      </>
                    ) : null}

                    {(currentRequest.categoryId?.name || currentRequest.subCategoryId?.name) && (
                      <>
                        <View style={styles.orderDetailsDivider} />
                        <View style={styles.orderBlock}>
                          <Text style={styles.orderBlockLabel}>Service type</Text>
                          <Text style={styles.orderBlockValue}>
                            {currentRequest.subCategoryId?.name || currentRequest.categoryId?.name}
                          </Text>
                        </View>
                      </>
                    )}

                    {currentRequest.metadata?.powerLabel ? (
                      <>
                        <View style={styles.orderDetailsDivider} />
                        <View style={styles.orderBlock}>
                          <Text style={styles.orderBlockLabel}>Power phase</Text>
                          <Text style={styles.orderBlockValue}>{currentRequest.metadata.powerLabel}</Text>
                        </View>
                      </>
                    ) : null}

                    {currentRequest.metadata?.operatorIncluded !== undefined ? (
                      <>
                        <View style={styles.orderDetailsDivider} />
                        <View style={styles.orderBlock}>
                          <Text style={styles.orderBlockLabel}>Operator included</Text>
                          <Text style={styles.orderBlockValue}>
                            {currentRequest.metadata.operatorIncluded ? 'Yes' : 'No'}
                          </Text>
                        </View>
                      </>
                    ) : null}

                    {currentRequest.budget?.min || currentRequest.budget?.max ? (
                      <>
                        <View style={styles.orderDetailsDivider} />
                        <View style={styles.orderBlock}>
                          <Text style={styles.orderBlockLabel}>Budget range</Text>
                          <Text style={styles.orderBlockValue}>
                            {`₹${currentRequest.budget?.min?.toLocaleString() ?? '--'} - ₹${
                              currentRequest.budget?.max?.toLocaleString() ?? '--'
                            }`}
                          </Text>
                        </View>
                      </>
                    ) : null}

                    {currentRequest.urgency ? (
                      <>
                        <View style={styles.orderDetailsDivider} />
                        <View style={styles.orderBlock}>
                          <Text style={styles.orderBlockLabel}>Urgency</Text>
                          <Text style={styles.orderBlockValue}>
                            {currentRequest.urgency.charAt(0).toUpperCase() + currentRequest.urgency.slice(1)}
                          </Text>
                        </View>
                      </>
                    ) : null}

                    {requestStatus === 'no_providers_available' ? (
                      <>
                        <View style={styles.orderDetailsDivider} />
                        <View style={[styles.orderBlock, styles.orderBlockBanner]}>
                          <Ionicons name="information-circle-outline" size={18} color="#EA580C" />
                          <Text style={styles.orderBlockBannerText}>
                            No providers were found during the last wave. We will keep searching and alert you as soon as
                            a provider accepts.
                          </Text>
                        </View>
                      </>
                    ) : null}
                  </View>
                )}
              </View>
            </View>
          )}

        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          {currentRequest.status === 'accepted' && currentRequest.orderId ? (
            <Button
              title="View Order"
              onPress={handleNavigateToOrder}
              fullWidth
              leftIcon={<MaterialIcons name="receipt" size={20} color={COLORS.NEUTRAL.WHITE} />}
            />
          ) : (
            <>
              {canAccept && (
                <Button
                  title="Accept Request"
                  onPress={handleAcceptRequest}
                  loading={accepting}
                  disabled={accepting}
                  fullWidth
                  style={styles.acceptButton}
                />
              )}
              {canCancel && (
                <Button
                  title="Cancel Request"
                  variant="danger"
                  onPress={handleCancelRequest}
                  fullWidth
                  style={styles.cancelButton}
                />
              )}
              {!canAccept && !canCancel && !currentRequest.orderId && (
                <>
                  <Text style={styles.footerInfo}>
                    {isExpired
                      ? 'This request has expired'
                      : requestStatus === 'no_providers_available'
                      ? 'No providers matched during the last search wave'
                      : requestStatus === 'accepted'
                      ? 'This request has been accepted'
                      : requestStatus === 'completed'
                      ? 'This request has been completed'
                      : requestStatus === 'cancelled'
                      ? 'This request was cancelled'
                      : 'No actions available'}
                  </Text>
                </>
              )}
            </>
          )}
        </View>
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
    alignItems: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  statusBadge: {
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.NEUTRAL.WHITE,
  },
  section: {
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.SM,
    marginRight: SPACING.SM,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.NEUTRAL.WHITE,
    marginLeft: 4,
  },
  expiredBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.SM,
  },
  expiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.NEUTRAL.WHITE,
  },
  description: {
    fontSize: 15,
    color: COLORS.TEXT.SECONDARY,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  detailContent: {
    marginLeft: SPACING.SM,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: '500',
  },
  address: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.SM,
  },
  searchingOverlay: {
    backgroundColor: '#F0F8FF',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.MD,
  },
  searchingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  searchingAnimation: {
    width: 30,
    height: 30,
    marginRight: SPACING.SM,
  },
  searchingTextContainer: {
    flex: 1,
  },
  searchingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 2,
  },
  searchingSubtext: {
    fontSize: 13,
    color: COLORS.TEXT.SECONDARY,
  },
  nextWaveText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
    marginTop: SPACING.SM,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.SM,
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
  },
  expiryText: {
    fontSize: 13,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  footer: {
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  acceptButton: {
    marginBottom: SPACING.SM,
  },
  cancelButton: {
    marginTop: SPACING.SM,
  },
  footerInfo: {
    textAlign: 'center',
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
  },
  // New Figma-based styles
  headerNew: {
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
  headerTextGroup: {
    flex: 1,
    marginHorizontal: 12,
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  statusBadgeNew: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E8F2FF',
  },
  statusTextNew: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
  },
  headerTitleNew: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    marginBottom: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  scrollContent: {
    flex: 1,
  },
  mapSection: {
    backgroundColor: '#FFF',
    marginBottom: 24,
  },
  mapContainerNew: {
    position: 'relative',
    height: 360,
    width: '100%',
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  mapNew: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  rippleMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapOverlayContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  mapOverlayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  mapOverlayText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  mapOverlayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(30, 58, 138, 0.12)',
    marginTop: 12,
  },
  mapOverlayChipText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  findingProviderSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  findingProviderTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  findingProviderTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  progressTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 0,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timelineStepLast: {
    alignItems: 'center',
  },
  timelineIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  timelineIconCompleted: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  timelineIconActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  timelineLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 6,
  },
  timelineLineActive: {
    backgroundColor: '#0F172A',
  },
  notificationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'left',
    lineHeight: 20,
  },
  orderDetailsCard: {
    marginHorizontal: 12,
    marginVertical: 12,
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
  },
  orderSummaryMeta: {
    fontSize: 13,
    color: '#475569',
  },
  orderSummaryPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
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
  },
  orderBlockValue: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  orderBlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
  },
  orderBlockBannerText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: '#C2410C',
    lineHeight: 18,
  },
});

export default ServiceRequestDetailsScreen;
