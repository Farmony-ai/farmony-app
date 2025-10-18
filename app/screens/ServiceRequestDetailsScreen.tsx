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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

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

  const statusColor = ServiceRequestService.getStatusColor(currentRequest.status);
  const urgencyColor = ServiceRequestService.getUrgencyColor(currentRequest.urgency);
  const isExpired = new Date(currentRequest.expiresAt) < new Date();
  const canAccept =
    isProvider &&
    (currentRequest.status === 'open' || currentRequest.status === 'matched') &&
    !isExpired;
  const canCancel =
    isSeeker &&
    (currentRequest.status === 'open' || currentRequest.status === 'matched');

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Details</Text>
          <View style={styles.statusBadge} backgroundColor={statusColor}>
            <Text style={styles.statusText}>
              {currentRequest.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Title and Description */}
          <View style={styles.section}>
            <Text style={styles.title}>{currentRequest.title}</Text>
            <View style={styles.urgencyRow}>
              <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
                <MaterialIcons
                  name={
                    currentRequest.urgency === 'immediate'
                      ? 'flash-on'
                      : currentRequest.urgency === 'scheduled'
                      ? 'schedule'
                      : 'date-range'
                  }
                  size={14}
                  color={COLORS.NEUTRAL.WHITE}
                />
                <Text style={styles.urgencyText}>
                  {currentRequest.urgency.toUpperCase()}
                </Text>
              </View>
              {isExpired && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredText}>EXPIRED</Text>
                </View>
              )}
            </View>
            <Text style={styles.description}>{currentRequest.description}</Text>
          </View>

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

          {/* Location */}
          {currentRequest.location && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service Location</Text>
              {currentRequest.address && (
                <Text style={styles.address}>{currentRequest.address}</Text>
              )}
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: currentRequest.location.coordinates[1],
                    longitude: currentRequest.location.coordinates[0],
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: currentRequest.location.coordinates[1],
                      longitude: currentRequest.location.coordinates[0],
                    }}
                    title="Service Location"
                  />
                </MapView>
              </View>
            </View>
          )}

          {/* Seeker/Provider Info */}
          <View style={styles.section}>
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
});

export default ServiceRequestDetailsScreen;