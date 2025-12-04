import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import BookingService, { Booking, BookingsResponse } from '../services/BookingService';
import ServiceRequestService, { ServiceRequest } from '../services/ServiceRequestService';
import ListingService from '../services/ListingService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { canTransition, setOrderStatus } from '../services/orderStatus';

const { width: screenWidth } = Dimensions.get('window');
const TAB_WIDTH = (screenWidth - 40) / 3;

type TabType = 'opportunities' | 'accepted' | 'paid' | 'completed' | 'canceled';

const ProviderBookingsScreen = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabType>('opportunities');
  const [bookings, setBookings] = useState<BookingsResponse>({
    active: [],
    completed: [],
    canceled: [],
    toReview: [],
  });
  const [openOpportunities, setOpenOpportunities] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [opportunitiesLoading, setOpportunitiesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'accept' | 'cancel' | null>(null);
  const [providerListings, setProviderListings] = useState<any[]>([]);

  // Accept modal state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [accepting, setAccepting] = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchBookings();
    fetchOpportunities();
    fetchProviderListings();
  }, [user?.id]);

  const fetchProviderListings = async () => {
    if (!user?.id) return;
    try {
      const listings = await ListingService.getProviderListings(user.id);
      setProviderListings(listings);
    } catch (error) {
      console.error('Error fetching provider listings:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        setBookings({ active: [], completed: [], canceled: [], toReview: [] });
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const data = await BookingService.getProviderBookings(user.id);
      try {
        const pretty = JSON.stringify(data, null, 2);
        console.log('[ProviderBookingsScreen] Loaded provider bookings (grouped):\n', pretty);
      } catch {}
      setBookings(data);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchOpportunities = async () => {
    try {
      setOpportunitiesLoading(true);
      const response = await ServiceRequestService.getAvailableRequests();
      console.log('[ProviderBookingsScreen] Loaded opportunities:', response.requests?.length || 0);
      setOpenOpportunities(response.requests || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setOpenOpportunities([]);
    } finally {
      setOpportunitiesLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchBookings(), fetchOpportunities()]).finally(() => {
      setRefreshing(false);
    });
  };

  const handleAcceptBooking = async (bookingId: string) => {
    Alert.alert(
      'Accept Booking',
      'Are you sure you want to accept this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setProcessingId(bookingId);
              setProcessingAction('accept');
              const current = bookings.active.find(b => b._id === bookingId)?.status || 'pending';
              if (!canTransition(current as any, 'accepted')) {
                Alert.alert('Not allowed', 'This booking cannot be accepted.');
                return;
              }
              const updated: any = await setOrderStatus({ orderId: bookingId, status: 'accepted' });
              setBookings(prev => {
                const original = prev.active.find(b => b._id === bookingId);
                const nextOrder: Booking = {
                  ...(original || ({} as any)),
                  ...(updated || {}),
                  _id: (updated && (updated as any)._id) || bookingId,
                  status: ((updated && (updated as any).status) || 'accepted') as any,
                };
                return {
                  ...prev,
                  active: prev.active.map(b => b._id === bookingId ? nextOrder : b),
                };
              });
              Alert.alert('Success', 'Booking accepted successfully');
            } catch (error: any) {
              console.error('Error accepting booking:', error);
              Alert.alert('Error', error?.message || 'Failed to accept booking. Please try again.');
            } finally {
              setProcessingId(null);
              setProcessingAction(null);
            }
          },
        },
      ],
    );
  };

  const handleRejectBooking = async (bookingId: string) => {
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
              setProcessingId(bookingId);
              setProcessingAction('cancel');
              const current = bookings.active.find(b => b._id === bookingId)?.status || 'pending';
              if (!canTransition(current as any, 'canceled')) {
                Alert.alert('Not allowed', 'This booking cannot be rejected.');
                return;
              }
              const updated: any = await setOrderStatus({ orderId: bookingId, status: 'canceled' });
              setBookings(prev => ({
                ...prev,
                active: prev.active.filter(b => b._id !== bookingId),
                canceled: [
                  ...prev.canceled,
                  {
                    ...(prev.active.find(b => b._id === bookingId) as any),
                    ...(updated || {}),
                    _id: (updated && (updated as any)._id) || bookingId,
                    status: 'canceled' as any,
                  },
                ],
              }));
              Alert.alert('Success', 'Booking rejected');
            } catch (error: any) {
              console.error('Error rejecting booking:', error);
              Alert.alert('Error', error?.message || 'Failed to reject booking. Please try again.');
            } finally {
              setProcessingId(null);
              setProcessingAction(null);
            }
          },
        },
      ],
    );
  };

  // Opportunity acceptance handlers
  const handleAcceptOpportunity = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setQuotePrice('');
    setQuoteMessage('');
    setShowAcceptModal(true);
  };

  const submitAcceptance = async () => {
    if (!selectedRequest) return;

    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    try {
      setAccepting(true);
      const result = await ServiceRequestService.acceptRequest(selectedRequest._id, {
        price: parseFloat(quotePrice),
        message: quoteMessage,
      });

      Alert.alert('Success!', 'You have successfully accepted the service request.', [
        {
          text: 'View Order',
          onPress: () => {
            setShowAcceptModal(false);
            setSelectedRequest(null);
            navigation.navigate('OrderDetail', { bookingId: result.orderId });
          },
        },
        {
          text: 'OK',
          onPress: () => {
            setShowAcceptModal(false);
            setSelectedRequest(null);
          },
        },
      ]);

      // Refresh opportunities list to remove the accepted one
      fetchOpportunities();
      fetchBookings(); // Also refresh bookings to show new order
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request. It may have been accepted by another provider.');
    } finally {
      setAccepting(false);
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

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatServiceDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderBookingCard = (booking: Booking, showActions: boolean = false) => {
    const listing = typeof booking.listingId === 'object' ? booking.listingId : null;
    const seeker = typeof booking.seekerId === 'object' ? booking.seekerId : null;

    return (
      <TouchableOpacity
        key={booking._id}
        style={styles.bookingCard}
        onPress={() => navigation.navigate('OrderDetail', { bookingId: booking._id })}
        activeOpacity={0.8}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text variant="body" weight="semibold" numberOfLines={1} style={styles.bookingTitle}>
              {listing?.title || 'Service Booking'}
            </Text>
            <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
              {seeker?.name || 'Customer'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}20` }]}>
            <Text
              variant="caption"
              weight="medium"
              style={{ color: getStatusColor(booking.status) }}
            >
              {booking.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={COLORS.TEXT.SECONDARY} />
            <Text variant="body" weight="semibold" color={COLORS.PRIMARY.MAIN}>
              ₹{booking.totalAmount}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.TEXT.SECONDARY} />
            <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
              {formatDate(booking.createdAt)}
            </Text>
          </View>
        </View>

        {showActions && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              disabled={processingId === booking._id && processingAction === 'cancel'}
              onPress={(e) => {
                e.stopPropagation();
                handleRejectBooking(booking._id);
              }}
            >
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              <Text variant="body" weight="medium" color="#EF4444" style={{ marginLeft: 6 }}>
                Decline
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              disabled={processingId === booking._id && processingAction === 'accept'}
              onPress={(e) => {
                e.stopPropagation();
                handleAcceptBooking(booking._id);
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.PRIMARY.MAIN} />
              <Text variant="body" weight="medium" color={COLORS.PRIMARY.MAIN} style={{ marginLeft: 6 }}>
                Accept
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderOpportunityCard = (request: ServiceRequest) => {
    const distanceKm = (request as any).distanceMeters
      ? ((request as any).distanceMeters / 1000).toFixed(1)
      : '?';
    const seeker = typeof request.seekerId === 'object' ? request.seekerId : null;
    const category = typeof request.categoryId === 'object' ? request.categoryId : null;

    const matchingListing = providerListings.find((listing: any) => {
      const listingCategoryId = typeof listing.categoryId === 'object' 
        ? listing.categoryId._id 
        : listing.categoryId;
      const listingSubCategoryId = typeof listing.subCategoryId === 'object'
        ? listing.subCategoryId._id
        : listing.subCategoryId;
      const reqCategoryId = typeof request.categoryId === 'object'
        ? request.categoryId._id
        : request.categoryId;
      const reqSubCategoryId = typeof request.subCategoryId === 'object'
        ? request.subCategoryId._id
        : request.subCategoryId;

      return listingCategoryId === reqCategoryId && 
             listingSubCategoryId === reqSubCategoryId;
    });

    let preferredTime = (request.metadata as any)?.preferredTime || '';
    if (!preferredTime && request.description) {
      const timeMatch = request.description.match(/Preferred time:\s*([^\n]+)/i);
      if (timeMatch && timeMatch[1]) {
        preferredTime = timeMatch[1].trim();
      }
    }

    const bookingData = {
      _id: request._id,
      status: 'pending',
      orderType: 'service_request',
      createdAt: request.createdAt,
      requestExpiresAt: request.expiresAt,
      serviceStartDate: request.serviceStartDate,
      serviceTime: preferredTime,
      totalAmount: 0,
      distance: (request as any).distance || ((request as any).distanceMeters ? (request as any).distanceMeters / 1000 : null),
      seeker: {
        _id: seeker?._id || (typeof request.seekerId === 'string' ? request.seekerId : ''),
        name: seeker?.name || 'Customer',
        phone: undefined,
        location: 'Location',
        coordinates: request.location?.coordinates ? [request.location.coordinates[1], request.location.coordinates[0]] : null,
      },
      serviceLocation: {
        coordinates: request.location?.coordinates,
        address: request.address || '',
      },
      listing: {
        _id: matchingListing?._id || request._id,
        title: matchingListing?.title || request.title || 'Service Request',
        description: matchingListing?.description || request.description,
        price: matchingListing?.price || request.budget?.min || request.budget?.max || 0,
        thumbnailUrl: matchingListing?.photoUrls?.[0] || matchingListing?.thumbnailUrl,
      },
      isServiceRequest: true,
      originalRequest: request,
    };

    return (
      <TouchableOpacity
        key={request._id}
        style={styles.bookingCard}
        onPress={() => navigation.navigate('ServiceRequestDetail', { booking: bookingData })}
        activeOpacity={0.8}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingInfo}>
            <Text variant="body" weight="semibold" numberOfLines={1} style={styles.bookingTitle}>
              {request.title}
            </Text>
            <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
              {seeker?.name || 'Customer'} {category?.name ? `• ${category.name}` : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="location-outline" size={12} color="#4CAF50" style={{ marginRight: 2 }} />
            <Text variant="caption" weight="medium" style={{ color: '#4CAF50' }}>
              {distanceKm} km
            </Text>
          </View>
        </View>

        <Text
          variant="caption"
          color={COLORS.TEXT.SECONDARY}
          numberOfLines={2}
          style={styles.opportunityDescription}
        >
          {request.description}
        </Text>

        <View style={styles.bookingDetails}>
          {request.budget && (
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color={COLORS.TEXT.SECONDARY} />
              <Text variant="body" weight="semibold" color={COLORS.PRIMARY.MAIN}>
                ₹{request.budget.min} - ₹{request.budget.max}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.TEXT.SECONDARY} />
            <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
              {formatServiceDate(request.serviceStartDate)}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton, { flex: 1 }]}
            onPress={(e) => {
              e.stopPropagation();
              handleAcceptOpportunity(request);
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.PRIMARY.MAIN} />
            <Text variant="body" weight="medium" color={COLORS.PRIMARY.MAIN} style={{ marginLeft: 6 }}>
              Accept Job
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: string) => {
    const isOpportunities = type === 'opportunities';
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name={isOpportunities ? 'briefcase-outline' : type === 'accepted' || type === 'paid' ? 'hourglass-outline' : type === 'completed' ? 'checkmark-done-outline' : 'close-circle-outline'}
          size={64}
          color={COLORS.TEXT.SECONDARY}
        />
        <Text variant="h4" weight="semibold" style={styles.emptyTitle}>
          {isOpportunities ? 'No Open Opportunities' : `No ${type.charAt(0).toUpperCase() + type.slice(1)} Bookings`}
        </Text>
        <Text variant="body" color={COLORS.TEXT.SECONDARY} align="center" style={styles.emptyText}>
          {isOpportunities
            ? 'Service requests matching your skills will appear here'
            : type === 'accepted' || type === 'paid'
            ? 'Your ongoing bookings will appear here'
            : type === 'completed'
            ? 'Your completed bookings will appear here'
            : 'Canceled bookings will appear here'}
        </Text>
      </View>
    );
  };

  const getTabData = () => {
    switch (activeTab) {
      case 'opportunities':
        return null; // Handled separately
      case 'accepted':
        return bookings.active.filter(b => b.status === 'accepted');
      case 'paid':
        return bookings.active.filter(b => b.status === 'paid');
      case 'completed':
        return bookings.completed;
      case 'canceled':
        return bookings.canceled;
      default:
        return [];
    }
  };

  const tabData = getTabData();

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
        <Text variant="h3" weight="semibold" style={styles.headerTitle}>
          My Bookings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs: opportunities | accepted | paid | completed | canceled */}
      <ScrollView style={styles.tabContainer} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <TouchableOpacity style={[styles.tab, activeTab === 'opportunities' && styles.activeTab]} onPress={() => setActiveTab('opportunities')}>
          <Text variant="body" weight={activeTab === 'opportunities' ? 'semibold' : 'regular'} color={activeTab === 'opportunities' ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY} numberOfLines={1}>
            Opportunities
          </Text>
          {openOpportunities.length > 0 && (
            <View style={styles.tabBadge}>
              <Text variant="caption" weight="semibold" color="#fff">{openOpportunities.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'accepted' && styles.activeTab]} onPress={() => setActiveTab('accepted')}>
          <Text variant="body" weight={activeTab === 'accepted' ? 'semibold' : 'regular'} color={activeTab === 'accepted' ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY} numberOfLines={1}>
            Accepted
          </Text>
          {bookings.active.filter(b => b.status === 'accepted').length > 0 && (
            <View style={styles.tabBadge}>
              <Text variant="caption" weight="semibold" color="#fff">{bookings.active.filter(b => b.status === 'accepted').length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'paid' && styles.activeTab]} onPress={() => setActiveTab('paid')}>
          <Text variant="body" weight={activeTab === 'paid' ? 'semibold' : 'regular'} color={activeTab === 'paid' ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY} numberOfLines={1}>
            Paid
          </Text>
          {bookings.active.filter(b => b.status === 'paid').length > 0 && (
            <View style={styles.tabBadge}>
              <Text variant="caption" weight="semibold" color="#fff">{bookings.active.filter(b => b.status === 'paid').length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'completed' && styles.activeTab]} onPress={() => setActiveTab('completed')}>
          <Text variant="body" weight={activeTab === 'completed' ? 'semibold' : 'regular'} color={activeTab === 'completed' ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY} numberOfLines={1}>
            Completed
          </Text>
          {bookings.completed.length > 0 && (
            <View style={styles.tabBadge}>
              <Text variant="caption" weight="semibold" color="#fff">{bookings.completed.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.tab, activeTab === 'canceled' && styles.activeTab]} onPress={() => setActiveTab('canceled')}>
          <Text variant="body" weight={activeTab === 'canceled' ? 'semibold' : 'regular'} color={activeTab === 'canceled' ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY} numberOfLines={1}>
            Canceled
          </Text>
          {bookings.canceled.length > 0 && (
            <View style={styles.tabBadge}>
              <Text variant="caption" weight="semibold" color="#fff">{bookings.canceled.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'opportunities' ? (
          // Opportunities tab content
          opportunitiesLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
            </View>
          ) : openOpportunities.length === 0 ? (
            renderEmptyState('opportunities')
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[COLORS.PRIMARY.MAIN]}
                />
              }
            >
              {openOpportunities.map(renderOpportunityCard)}
            </ScrollView>
          )
        ) : (
          // Bookings tab content
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
            </View>
          ) : tabData && tabData.length === 0 ? (
            renderEmptyState(activeTab)
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[COLORS.PRIMARY.MAIN]}
                />
              }
            >
              {tabData?.map((booking) => renderBookingCard(booking, false))}
            </ScrollView>
          )
        )}
      </View>

      {/* Accept Request Modal */}
      <Modal
        visible={showAcceptModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAcceptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="h4" weight="semibold" color={COLORS.TEXT.PRIMARY}>
                Accept Service Request
              </Text>
              <TouchableOpacity onPress={() => setShowAcceptModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.TEXT.PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text variant="body" weight="semibold" color={COLORS.TEXT.PRIMARY} style={{ marginBottom: SPACING.MD }}>
                {selectedRequest?.title}
              </Text>

              <View style={styles.modalSection}>
                <Text variant="caption" weight="semibold" color={COLORS.TEXT.PRIMARY} style={{ marginBottom: SPACING.XS }}>
                  Your Quote Price *
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={quotePrice}
                  onChangeText={setQuotePrice}
                  placeholder="Enter your price in ₹"
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.TEXT.SECONDARY}
                />
              </View>

              <View style={styles.modalSection}>
                <Text variant="caption" weight="semibold" color={COLORS.TEXT.PRIMARY} style={{ marginBottom: SPACING.XS }}>
                  Message to Customer (Optional)
                </Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  value={quoteMessage}
                  onChangeText={setQuoteMessage}
                  placeholder="Add any notes or details about your service..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={COLORS.TEXT.SECONDARY}
                />
              </View>

              <View style={styles.modalNote}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.TEXT.SECONDARY} />
                <Text variant="caption" color={COLORS.TEXT.SECONDARY} style={{ marginLeft: SPACING.XS, flex: 1 }}>
                  Once accepted, an order will be created and the customer will be notified.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutline]}
                onPress={() => setShowAcceptModal(false)}
              >
                <Text variant="body" weight="medium" color={COLORS.TEXT.SECONDARY}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={submitAcceptance}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text variant="body" weight="medium" color="#fff">
                    Submit
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
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
  tabContainer: {
    flexGrow: 0,
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: SPACING.MD,
    minWidth: 110,
    marginRight: SPACING.SM,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    position: 'relative',
  },
  activeTab: {
    borderBottomColor: COLORS.PRIMARY.MAIN,
  },
  tabBadge: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING['4XL'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },
  emptyTitle: {
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptyText: {
    marginBottom: SPACING.LG,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.LG,
    marginBottom: SPACING.MD,
    ...SHADOWS.SM,
    overflow: 'hidden',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.MD,
    paddingBottom: SPACING.SM,
  },
  bookingInfo: {
    flex: 1,
    marginRight: SPACING.SM,
  },
  bookingTitle: {
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.SM,
  },
  opportunityDescription: {
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
    lineHeight: 18,
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    paddingBottom: SPACING.MD,
    gap: SPACING.SM,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1.5,
  },
  acceptButton: {
    backgroundColor: `${COLORS.PRIMARY.MAIN}10`,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  rejectButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: BORDER_RADIUS.LG,
    borderTopRightRadius: BORDER_RADIUS.LG,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  modalBody: {
    padding: SPACING.MD,
  },
  modalSection: {
    marginBottom: SPACING.MD,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.SM,
    fontSize: 16,
    color: COLORS.TEXT.PRIMARY,
    backgroundColor: '#fff',
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalNote: {
    flexDirection: 'row',
    backgroundColor: COLORS.BACKGROUND.SECONDARY,
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING.SM,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    gap: SPACING.SM,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
});

export default ProviderBookingsScreen;
