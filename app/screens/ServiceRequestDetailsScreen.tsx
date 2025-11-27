import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  ActionSheetIOS,
  Platform,
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
import MapView, { Marker, PROVIDER_GOOGLE, Circle } from 'react-native-maps';
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

const MARKER_ICON_SIZE = 34;
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
  const canCancelRequest = isSeeker && !isExpired;
  const showSearchMenu = canCancelRequest && isSearching;
  const showFooterCancelButton = canCancelRequest && !isSearching;

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
    if (nextWave <= now) {
      return 'Processing...';
    }
    const minutesLeft = Math.ceil((nextWave - now) / 60000);
    if (minutesLeft <= 0) return 'Processing...';
    return `${minutesLeft} min`;
  };

  const handleOpenSearchMenu = () => {
    if (!canCancelRequest) {
      return;
    }

    const executeCancel = () => {
      handleCancelRequest();
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel request', 'Dismiss'],
          cancelButtonIndex: 1,
          destructiveButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            executeCancel();
          }
        },
      );
    } else {
      Alert.alert('Manage request', undefined, [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Cancel request', style: 'destructive', onPress: executeCancel },
      ]);
    }
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
      return null;
    }

    if (waveRadiusValue >= 1000) {
      const km = waveRadiusValue / 1000;
      const formattedKm = km >= 10 ? Math.round(km) : Number(km.toFixed(1));
      return `Current search radius: ${formattedKm} km`;
    }

    return `Current search radius: ${Math.round(waveRadiusValue)} m`;
  }, [waveRadiusValue]);

  const rippleSize = useMemo(() => {
    if (!waveRadiusValue || Number.isNaN(waveRadiusValue)) {
      return 150;
    }
    const radiusKm = waveRadiusValue / 1000;
    const scaled = 150 + radiusKm * 18;
    return Math.max(140, Math.min(360, scaled));
  }, [waveRadiusValue]);

  const markerIconTop = useMemo(
    () => Math.max(rippleSize / 2 - MARKER_ICON_SIZE, 0),
    [rippleSize],
  );

  const rippleDimensionsStyle = useMemo(
    () => ({ width: rippleSize, height: rippleSize }),
    [rippleSize],
  );

  const markerIconWrapperStyle = useMemo(
    () => ({ top: markerIconTop, width: rippleSize }),
    [markerIconTop, rippleSize],
  );

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
  const powerLabel = currentRequest.metadata?.powerLabel;
  const operatorIncluded = currentRequest.metadata?.operatorIncluded;

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
  const description = currentRequest.description?.trim();

  const { detailItems, remainingDescription } = useMemo(() => {
    type DetailCard = {
      key: string;
      label: string;
      value: string;
      icon: string;
      accent: string;
      iconColor: string;
    };

    const iconConfig: Record<
      string,
      { key: string; label: string; icon: string; accent: string; iconColor: string; value?: string }
    > = {
      duration: {
        key: 'duration',
        label: 'Duration',
        icon: 'time-outline',
        accent: 'rgba(15, 118, 110, 0.18)',
        iconColor: '#0F766E',
      },
      'power phase': {
        key: 'power',
        label: 'Power phase',
        icon: 'flash-outline',
        accent: 'rgba(15, 118, 110, 0.18)',
        iconColor: '#0F766E',
      },
      power: {
        key: 'power',
        label: 'Power phase',
        icon: 'flash-outline',
        accent: 'rgba(15, 118, 110, 0.18)',
        iconColor: '#0F766E',
      },
      operator: {
        key: 'operator',
        label: 'Operator',
        icon: 'people-outline',
        accent: 'rgba(15, 118, 110, 0.18)',
        iconColor: '#0F766E',
      },
      'operator included': {
        key: 'operator',
        label: 'Operator',
        icon: 'people-outline',
        accent: 'rgba(15, 118, 110, 0.18)',
        iconColor: '#0F766E',
      },
      'preferred time': {
        key: 'preferred-time',
        label: 'Preferred time',
        icon: 'alarm-outline',
        accent: 'rgba(15, 118, 110, 0.18)',
        iconColor: '#0F766E',
      },
      time: {
        key: 'preferred-time',
        label: 'Preferred time',
        icon: 'alarm-outline',
        accent: 'rgba(15, 118, 110, 0.18)',
        iconColor: '#0F766E',
      },
    };

    const cards: Record<string, DetailCard> = {};

    const addCard = (configKey: string, value: string | null | undefined) => {
      if (!value) return;
      const normalizedKey = configKey.toLowerCase();
      const config = iconConfig[normalizedKey];
      if (!config) return;
      cards[config.key] = {
        key: config.key,
        label: config.label,
        value: value,
        icon: config.icon,
        accent: config.accent,
        iconColor: config.iconColor,
      };
    };

    addCard('duration', durationLabel);
    addCard('power phase', powerLabel);
    addCard('operator', operatorIncluded !== undefined ? (operatorIncluded ? 'Included' : 'Not included') : null);
    addCard('preferred time', preferredTime);

    const remainingLines: string[] = [];

    if (description) {
      const lines = description.split('\n').map((line) => line.trim()).filter(Boolean);
      lines.forEach((line) => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (!match) {
          remainingLines.push(line);
          return;
        }
        const rawKey = match[1].trim();
        const rawValue = match[2].trim();
        const normalizedKey = rawKey.toLowerCase();
        const config =
          iconConfig[normalizedKey] ??
          iconConfig[normalizedKey.replace(/\s+included$/, '')] ??
          iconConfig[normalizedKey.replace(/\s+phase$/, '')];

        if (config) {
          cards[config.key] = {
            key: config.key,
            label: config.label,
            value: rawValue,
            icon: config.icon,
            accent: config.accent,
            iconColor: config.iconColor,
          };
        } else {
          remainingLines.push(`${rawKey}: ${rawValue}`);
        }
      });
    }

    const detailCards = Object.values(cards);
    return {
      detailItems: detailCards,
      remainingDescription: remainingLines.join('\n').trim(),
    };
  }, [description, durationLabel, operatorIncluded, powerLabel, preferredTime]);

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
            <View style={styles.appBarRight}>
              {showSearchMenu && (
                <TouchableOpacity
                  onPress={handleOpenSearchMenu}
                  style={styles.menuButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#0F172A" />
                </TouchableOpacity>
              )}
              <View style={[styles.statusBadgeNew, { backgroundColor: statusBadge.backgroundColor }]}>
                <Text style={[styles.statusTextNew, { color: statusBadge.textColor }]}>
                  {statusBadge.text}
                </Text>
              </View>
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
                  {isSearching && mapCenter && waveRadiusValue && !Number.isNaN(waveRadiusValue) && (
                    <Circle
                      center={mapCenter}
                      radius={waveRadiusValue}
                      strokeColor="rgba(79, 70, 229, 0.35)"
                      fillColor="rgba(79, 70, 229, 0.12)"
                      strokeWidth={2}
                    />
                  )}
                  <Marker coordinate={mapCenter} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={[styles.rippleMarker, rippleDimensionsStyle]}>
                      {isSearching && (
                        <View style={[styles.rippleAnimationWrapper, rippleDimensionsStyle]}>
                          <RippleAnimation
                            size={rippleSize}
                            duration={2400}
                            color="rgba(79, 70, 229, 0.28)"
                          />
                        </View>
                      )}
                      <View style={[styles.mapMarkerIconWrapper, markerIconWrapperStyle]}>
                        <Ionicons
                          name="location-sharp"
                          size={MARKER_ICON_SIZE}
                          color="#0F172A"
                          style={styles.mapMarkerIcon}
                        />
                      </View>
                    </View>
                  </Marker>
                </MapView>
              </View>

              {/* Finding Provider Section - Figma Design */}
              {(isSearching || requestStatus === 'no_providers_available') && (
                <View style={styles.findingProviderSection}>
                  <Text style={styles.findingProviderTitle}>
                    {requestStatus === 'no_providers_available' ? 'No Providers Found' : 'Finding Provider'}
                  </Text>
                  <Text
                    style={[
                      styles.findingProviderTime,
                      !(isSearching && (nextWaveCopy || waveRadiusLabel)) &&
                        styles.findingProviderTimeSpaced,
                    ]}
                  >
                    {requestStatus === 'no_providers_available'
                      ? 'Search completed with no matches'
                      : elapsedTime
                      ? `${elapsedTime} min elapsed`
                      : 'Tracking search...'}
                  </Text>
                  {isSearching && nextWaveCopy && (
                    <Text style={styles.nextWaveText}>
                      {nextWaveCopy === 'Processing...'
                        ? 'Next wave processing'
                        : `Next wave in ${nextWaveCopy}`}
                    </Text>
                  )}
                  {isSearching && waveRadiusLabel && (
                    <Text style={styles.waveRadiusText}>{waveRadiusLabel}</Text>
                  )}

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

                    {(remainingDescription || detailItems.length > 0) ? (
                      <>
                        <View style={styles.orderDetailsDivider} />
                        <View style={styles.detailSection}>
                          <Text style={styles.orderBlockLabel}>Details</Text>
                          {remainingDescription ? (
                            <Text style={styles.orderBlockValue}>{remainingDescription}</Text>
                          ) : null}
                          {detailItems.length > 0 ? (
                            <View
                              style={[
                                styles.detailCardGrid,
                                remainingDescription ? styles.detailGridSpacing : null,
                              ]}
                            >
                              {detailItems.map((item) => (
                                <View key={item.key} style={styles.detailCard}>
                                  <View
                                    style={[
                                      styles.detailIconWrap,
                                      { backgroundColor: item.accent },
                                    ]}
                                  >
                                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                                  </View>
                                  <Text style={styles.detailCardLabel}>{item.label}</Text>
                                  <Text style={styles.detailCardValue} numberOfLines={2}>
                                    {item.value}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
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
              {showFooterCancelButton && (
                <Button
                  title="Cancel Request"
                  variant="danger"
                  onPress={handleCancelRequest}
                  fullWidth
                  style={styles.cancelButton}
                />
              )}
              {!canAccept && !showFooterCancelButton && !showSearchMenu && !currentRequest.orderId && (
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
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 8,
  },
  waveRadiusText: {
    fontSize: 13,
    color: '#1E3A8A',
    fontWeight: '500',
    marginBottom: 16,
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
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginRight: 8,
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
  rippleAnimationWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapMarkerIconWrapper: {
    position: 'absolute',
    alignItems: 'center',
  },
  mapMarkerIcon: {
    shadowColor: '#00000055',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
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
    marginBottom: 4,
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  findingProviderTimeSpaced: {
    marginBottom: 20,
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
  detailSection: {
    paddingBottom: 4,
  },
  detailCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  detailGridSpacing: {
    marginTop: 14,
  },
  detailCard: {
    flexBasis: '48%',
    minWidth: '48%',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: 'rgba(15, 23, 42, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    overflow: 'hidden',
  },
  detailIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailCardLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    color: '#475569',
    marginBottom: 6,
  },
  detailCardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 21,
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
