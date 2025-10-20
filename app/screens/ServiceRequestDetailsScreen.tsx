import React, { useEffect, useState } from 'react';
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
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchRequestById,
  cancelServiceRequest,
  acceptServiceRequest,
} from '../store/slices/serviceRequestsSlice';
import ServiceRequestService from '../services/ServiceRequestService';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import RippleAnimation from '../components/RippleAnimation';

const ServiceRequestDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch<AppDispatch>();

  const { requestId } = route.params;
  const { currentRequest, loading, accepting } = useSelector(
    (state: RootState) => state.serviceRequests
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  const isSeeker = currentRequest?.seekerId === user?.id ||
                   (typeof currentRequest?.seekerId === 'object' &&
                    currentRequest?.seekerId._id === user?.id);
  const isProvider = currentRequest?.matchedProviderIds?.includes(user?.id);

  useEffect(() => {
    loadRequestDetails();
  }, [requestId]);

  const loadRequestDetails = async () => {
    dispatch(fetchRequestById(requestId));
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

  const statusColor = ServiceRequestService.getStatusColor(currentRequest.status || 'unknown');
  const urgencyColor = ServiceRequestService.getUrgencyColor(currentRequest.urgency || 'normal');
  const isExpired = currentRequest.expiresAt ? new Date(currentRequest.expiresAt) < new Date() : false;
  const isSearching = currentRequest.status === 'open' || currentRequest.status === 'matched';
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
    return `${Math.floor(elapsedMinutes / 60)}:${String(elapsedMinutes % 60).padStart(2, '0')}`;
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
    if (currentRequest.address) {
      const locationPart = currentRequest.address.split(',')[0].trim();
      parts.push(locationPart);
    }

    // Format date
    if (currentRequest.serviceStartDate) {
      const date = new Date(currentRequest.serviceStartDate);
      const formatted = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      parts.push(formatted);
    }

    // Add duration from metadata
    if (currentRequest.metadata?.durationHours) {
      parts.push(`${currentRequest.metadata.durationHours} hrs`);
    } else if (currentRequest.metadata?.durationLabel) {
      parts.push(currentRequest.metadata.durationLabel);
    }

    return parts.join(' • ');
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
    switch (currentRequest.status) {
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
      default:
        return {
          text: currentRequest.status?.toUpperCase() || 'UNKNOWN',
          backgroundColor: '#FFF3E0',
          textColor: '#FF9800',
        };
    }
  };

  const statusBadge = getStatusBadgeConfig();

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* Header - Figma Design */}
        <View style={styles.headerNew}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={[styles.statusBadgeNew, { backgroundColor: statusBadge.backgroundColor }]}>
              <Text style={[styles.statusTextNew, { color: statusBadge.textColor }]}>
                {statusBadge.text}
              </Text>
            </View>
          </View>
          <Text style={styles.headerTitleNew}>{currentRequest.title}</Text>
          <Text style={styles.headerSubtitle}>{formatHeaderSubtitle()}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>

          {/* Service Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>

            <View style={styles.detailRow}>
              <MaterialIcons name="calendar-today" size={20} color={COLORS.TEXT.SECONDARY} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Service Period</Text>
                <Text style={styles.detailValue}>
                  {ServiceRequestService.formatRequestDate(currentRequest.serviceStartDate)} - {' '}
                  {ServiceRequestService.formatRequestDate(currentRequest.serviceEndDate)}
                </Text>
              </View>
            </View>

            {currentRequest.budget && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="currency-inr"
                  size={20}
                  color={COLORS.TEXT.SECONDARY}
                />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Budget Range</Text>
                  <Text style={styles.detailValue}>
                    ₹{currentRequest.budget.min} - ₹{currentRequest.budget.max}
                  </Text>
                </View>
              </View>
            )}

            {currentRequest.metadata?.quantity && (
              <View style={styles.detailRow}>
                <MaterialIcons name="straighten" size={20} color={COLORS.TEXT.SECONDARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Quantity</Text>
                  <Text style={styles.detailValue}>
                    {currentRequest.metadata.quantity} {currentRequest.metadata.unitOfMeasure}
                  </Text>
                </View>
              </View>
            )}

            {currentRequest.categoryId && typeof currentRequest.categoryId === 'object' && (
              <View style={styles.detailRow}>
                <MaterialIcons name="category" size={20} color={COLORS.TEXT.SECONDARY} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{currentRequest.categoryId.name}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Map - Figma Design */}
          {currentRequest.location && (
            <View style={styles.mapSection}>
              <View style={styles.mapContainerNew}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.mapNew}
                  initialRegion={{
                    latitude: currentRequest.location.coordinates[1],
                    longitude: currentRequest.location.coordinates[0],
                    latitudeDelta: isSearching ? 0.02 : 0.01,
                    longitudeDelta: isSearching ? 0.02 : 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  {isSearching ? (
                    <>
                      {/* Animated truck marker for searching */}
                      <Marker
                        coordinate={{
                          latitude: currentRequest.location.coordinates[1],
                          longitude: currentRequest.location.coordinates[0],
                        }}
                      >
                        <View style={styles.truckMarker}>
                          <MaterialCommunityIcons name="truck-delivery" size={32} color="#000" />
                        </View>
                      </Marker>

                      {/* Show wave radius circles */}
                      {currentRequest.waves?.map((wave: any, index: number) => (
                        <Circle
                          key={index}
                          center={{
                            latitude: currentRequest.location.coordinates[1],
                            longitude: currentRequest.location.coordinates[0],
                          }}
                          radius={wave.radius || (index + 1) * 5000}
                          strokeColor="rgba(59, 130, 246, 0.5)"
                          fillColor="rgba(59, 130, 246, 0.1)"
                          strokeWidth={2}
                        />
                      ))}
                    </>
                  ) : (
                    /* Regular marker for non-searching states */
                    <Marker
                      coordinate={{
                        latitude: currentRequest.location.coordinates[1],
                        longitude: currentRequest.location.coordinates[0],
                      }}
                      title="Service Location"
                    />
                  )}
                </MapView>
              </View>

              {/* Finding Provider Section - Figma Design */}
              {isSearching && (
                <View style={styles.findingProviderSection}>
                  <Text style={styles.findingProviderTitle}>Finding Provider</Text>
                  <Text style={styles.findingProviderTime}>{getElapsedTime()} min elapsed</Text>

                  {/* Progress Timeline */}
                  <View style={styles.progressTimeline}>
                    {/* Step 1 - Request Placed */}
                    <View style={styles.timelineStep}>
                      <View style={[styles.timelineIcon, styles.timelineIconCompleted]}>
                        <Ionicons name="receipt-outline" size={20} color="#FFF" />
                      </View>
                      <View style={styles.timelineLine} />
                    </View>

                    {/* Step 2 - Finding Provider */}
                    <View style={styles.timelineStep}>
                      <View style={[styles.timelineIcon, styles.timelineIconActive]}>
                        <Ionicons name="search-outline" size={20} color="#FFF" />
                      </View>
                      <View style={styles.timelineLine} />
                    </View>

                    {/* Step 3 - Provider Matched */}
                    <View style={styles.timelineStep}>
                      <View style={styles.timelineIcon}>
                        <MaterialCommunityIcons name="truck-delivery-outline" size={20} color="#9E9E9E" />
                      </View>
                      <View style={styles.timelineLine} />
                    </View>

                    {/* Step 4 - Service Complete */}
                    <View style={styles.timelineStepLast}>
                      <View style={styles.timelineIcon}>
                        <Ionicons name="home-outline" size={20} color="#9E9E9E" />
                      </View>
                    </View>
                  </View>

                  <Text style={styles.notificationText}>
                    We will notify you if you match with a provider
                  </Text>
                </View>
              )}

              {/* Order Details Button - Figma Design */}
              <TouchableOpacity
                style={styles.orderDetailsButton}
                onPress={() => setShowOrderDetails(!showOrderDetails)}
                activeOpacity={0.7}
              >
                <Text style={styles.orderDetailsButtonText}>Order details</Text>
              </TouchableOpacity>

              {/* Expandable Order Details */}
              {showOrderDetails && (
                <View style={styles.orderDetailsContent}>
                  {currentRequest.description && (
                    <View style={styles.detailRowExpanded}>
                      <Text style={styles.detailLabelExpanded}>Description</Text>
                      <Text style={styles.detailValueExpanded}>{currentRequest.description}</Text>
                    </View>
                  )}

                  {currentRequest.serviceStartDate && (
                    <View style={styles.detailRowExpanded}>
                      <Text style={styles.detailLabelExpanded}>Service Date</Text>
                      <Text style={styles.detailValueExpanded}>
                        {new Date(currentRequest.serviceStartDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                  )}

                  {currentRequest.metadata?.preferredTime && (
                    <View style={styles.detailRowExpanded}>
                      <Text style={styles.detailLabelExpanded}>Preferred Time</Text>
                      <Text style={styles.detailValueExpanded}>{currentRequest.metadata.preferredTime}</Text>
                    </View>
                  )}

                  {currentRequest.metadata?.durationLabel && (
                    <View style={styles.detailRowExpanded}>
                      <Text style={styles.detailLabelExpanded}>Duration</Text>
                      <Text style={styles.detailValueExpanded}>{currentRequest.metadata.durationLabel}</Text>
                    </View>
                  )}

                  {currentRequest.metadata?.powerLabel && (
                    <View style={styles.detailRowExpanded}>
                      <Text style={styles.detailLabelExpanded}>Power Phase</Text>
                      <Text style={styles.detailValueExpanded}>{currentRequest.metadata.powerLabel}</Text>
                    </View>
                  )}

                  {currentRequest.metadata?.operatorIncluded !== undefined && (
                    <View style={styles.detailRowExpanded}>
                      <Text style={styles.detailLabelExpanded}>Operator Included</Text>
                      <Text style={styles.detailValueExpanded}>
                        {currentRequest.metadata.operatorIncluded ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  )}

                  {currentRequest.address && (
                    <View style={styles.detailRowExpanded}>
                      <Text style={styles.detailLabelExpanded}>Service Location</Text>
                      <Text style={styles.detailValueExpanded}>{currentRequest.address}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Seeker/Provider Info - Keep for reference but hidden in Figma design */}
          <View style={[styles.section, { display: 'none' }]}>
            <Text style={styles.sectionTitle}>
              {isSeeker ? 'Request Information' : 'Seeker Information'}
            </Text>

            {isSeeker ? (
              <>
                {currentRequest.matchedProviderIds && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="group" size={20} color={COLORS.PRIMARY.MAIN} />
                    <Text style={styles.infoText}>
                      {currentRequest.matchedProviderIds.length} providers matched
                    </Text>
                  </View>
                )}
                {currentRequest.viewCount > 0 && (
                  <View style={styles.infoRow}>
                    <Ionicons name="eye-outline" size={20} color={COLORS.TEXT.SECONDARY} />
                    <Text style={styles.infoText}>
                      Viewed by {currentRequest.viewCount} providers
                    </Text>
                  </View>
                )}
                {currentRequest.acceptedProviderId && (
                  <View style={styles.infoRow}>
                    <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                    <Text style={styles.infoText}>
                      Accepted by provider
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {typeof currentRequest.seekerId === 'object' && (
                  <>
                    <View style={styles.infoRow}>
                      <Ionicons name="person-outline" size={20} color={COLORS.TEXT.SECONDARY} />
                      <Text style={styles.infoText}>{currentRequest.seekerId.name}</Text>
                    </View>
                    {currentRequest.seekerId.phone && (
                      <TouchableOpacity style={styles.infoRow} onPress={handleContactSeeker}>
                        <Ionicons name="call-outline" size={20} color={COLORS.PRIMARY.MAIN} />
                        <Text style={[styles.infoText, { color: COLORS.PRIMARY.MAIN }]}>
                          {currentRequest.seekerId.phone}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </>
            )}
          </View>

          {/* Expiry Info */}
          <View style={styles.section}>
            <View style={styles.expiryInfo}>
              <MaterialIcons name="timer" size={20} color={COLORS.TEXT.SECONDARY} />
              <Text style={styles.expiryText}>
                {isExpired
                  ? 'This request has expired'
                  : `Expires on ${new Date(currentRequest.expiresAt).toLocaleString()}`}
              </Text>
            </View>
          </View>
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
                <Text style={styles.footerInfo}>
                  {isExpired
                    ? 'This request has expired'
                    : currentRequest.status === 'accepted'
                    ? 'This request has been accepted'
                    : 'No actions available'}
                </Text>
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
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  statusBadge: {
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.NEUTRAL.WHITE,
  },
  section: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.xs,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.xs,
    marginRight: SPACING.xs,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.NEUTRAL.WHITE,
    marginLeft: 4,
  },
  expiredBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.xs,
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
    marginBottom: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  detailContent: {
    marginLeft: SPACING.sm,
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
    marginBottom: SPACING.sm,
  },
  mapContainer: {
    height: 200,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  map: {
    flex: 1,
  },
  searchingOverlay: {
    backgroundColor: '#F0F8FF',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  searchingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  searchingAnimation: {
    width: 30,
    height: 30,
    marginRight: SPACING.sm,
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
    marginTop: SPACING.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.sm,
  },
  expiryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  expiryText: {
    fontSize: 13,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  acceptButton: {
    marginBottom: SPACING.xs,
  },
  cancelButton: {
    marginTop: SPACING.xs,
  },
  footerInfo: {
    textAlign: 'center',
    color: COLORS.TEXT.SECONDARY,
    fontSize: 14,
  },
  // New Figma-based styles
  headerNew: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  backButton: {
    padding: 4,
  },
  statusBadgeNew: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextNew: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerTitleNew: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
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
  },
  mapContainerNew: {
    height: 400,
    backgroundColor: '#F5F5F5',
  },
  mapNew: {
    flex: 1,
  },
  truckMarker: {
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  findingProviderSection: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
    backgroundColor: '#FFF',
  },
  findingProviderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  findingProviderTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: SPACING.lg,
  },
  progressTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: '#000',
  },
  timelineIconActive: {
    backgroundColor: '#000',
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  notificationText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  orderDetailsButton: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  orderDetailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  orderDetailsContent: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
  },
  detailRowExpanded: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailLabelExpanded: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  detailValueExpanded: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
});

export default ServiceRequestDetailsScreen;