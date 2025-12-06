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
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import BookingService, { Booking, BookingsResponse } from '../../services/BookingService';
import ServiceRequestService, { ServiceRequest } from '../../services/ServiceRequestService';
import ListingService from '../../services/ListingService';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { canTransition, setOrderStatus } from '../../services/orderStatus';

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
    const statusConfig = getStatusBadgeConfig(booking.status);

    return (
      <TouchableOpacity
        key={booking._id}
        style={styles.bookingCard}
        onPress={() => navigation.navigate('OrderDetail', { bookingId: booking._id })}
        activeOpacity={0.7}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingIconWrap}>
            <Ionicons name="briefcase-outline" size={20} color="#1E293B" />
          </View>
          <View style={styles.bookingInfo}>
            <Text style={styles.bookingTitle} numberOfLines={1}>
              {listing?.title || 'Service Booking'}
            </Text>
            <Text style={styles.bookingCustomer}>
              {seeker?.name || 'Customer'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.backgroundColor }]}>
            <Text style={[styles.statusBadgeText, { color: statusConfig.textColor }]}>
              {statusConfig.text}
            </Text>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailItem}>
            <View style={styles.detailIconWrap}>
              <Ionicons name="wallet-outline" size={16} color="#64748B" />
            </View>
            <Text style={styles.detailAmount}>₹{booking.totalAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.detailItem}>
            <View style={styles.detailIconWrap}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
            </View>
            <Text style={styles.detailDate}>{formatDate(booking.createdAt)}</Text>
          </View>
        </View>

        {showActions && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.declineBtn}
              disabled={processingId === booking._id && processingAction === 'cancel'}
              onPress={(e) => {
                e.stopPropagation();
                handleRejectBooking(booking._id);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              disabled={processingId === booking._id && processingAction === 'accept'}
              onPress={(e) => {
                e.stopPropagation();
                handleAcceptBooking(booking._id);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.cardChevron}>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusBadgeConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'Pending', backgroundColor: '#FEF3C7', textColor: '#F59E0B' };
      case 'accepted':
        return { text: 'Accepted', backgroundColor: '#DCFCE7', textColor: '#16A34A' };
      case 'paid':
        return { text: 'Paid', backgroundColor: '#DBEAFE', textColor: '#2563EB' };
      case 'completed':
        return { text: 'Completed', backgroundColor: '#F1F5F9', textColor: '#64748B' };
      case 'canceled':
        return { text: 'Cancelled', backgroundColor: '#FEE2E2', textColor: '#DC2626' };
      default:
        return { text: status, backgroundColor: '#F1F5F9', textColor: '#64748B' };
    }
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
        style={styles.opportunityCard}
        onPress={() => navigation.navigate('ServiceRequestDetail', { booking: bookingData })}
        activeOpacity={0.7}
      >
        {/* Distance Badge */}
        <View style={styles.opportunityDistanceBadge}>
          <Ionicons name="location" size={14} color="#10B981" />
          <Text style={styles.opportunityDistanceText}>{distanceKm} km away</Text>
        </View>

        <View style={styles.opportunityHeader}>
          <View style={styles.opportunityIconWrap}>
            <Ionicons name="flash" size={20} color="#F59E0B" />
          </View>
          <View style={styles.opportunityInfo}>
            <Text style={styles.opportunityTitle} numberOfLines={1}>
              {request.title}
            </Text>
            <Text style={styles.opportunityCustomer}>
              {seeker?.name || 'Customer'} {category?.name ? `• ${category.name}` : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.opportunityDescription} numberOfLines={2}>
          {request.description}
        </Text>

        <View style={styles.opportunityDetails}>
          {request.budget && (
            <View style={styles.opportunityDetailItem}>
              <Ionicons name="wallet-outline" size={16} color="#64748B" />
              <Text style={styles.opportunityBudget}>
                ₹{request.budget.min.toLocaleString()} - ₹{request.budget.max.toLocaleString()}
              </Text>
            </View>
          )}
          <View style={styles.opportunityDetailItem}>
            <Ionicons name="calendar-outline" size={16} color="#64748B" />
            <Text style={styles.opportunityDate}>{formatServiceDate(request.serviceStartDate)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.acceptJobBtn}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate('ServiceRequestDetail', { booking: bookingData });
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.acceptJobBtnText}>Accept Job</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: string) => {
    const isOpportunities = type === 'opportunities';
    const iconName = isOpportunities ? 'briefcase-outline' : type === 'accepted' || type === 'paid' ? 'hourglass-outline' : type === 'completed' ? 'checkmark-done-outline' : 'close-circle-outline';

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={iconName} size={48} color="#94A3B8" />
        </View>
        <Text style={styles.emptyTitle}>
          {isOpportunities ? 'No Open Opportunities' : `No ${type.charAt(0).toUpperCase() + type.slice(1)} Bookings`}
        </Text>
        <Text style={styles.emptyText}>
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
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSubtitle}>Manage your service requests</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs: opportunities | accepted | paid | completed | canceled */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'opportunities' && styles.activeTab]}
            onPress={() => setActiveTab('opportunities')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'opportunities' && styles.activeTabText]}>
              Opportunities
            </Text>
            {openOpportunities.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'opportunities' && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, activeTab === 'opportunities' && styles.activeTabBadgeText]}>
                  {openOpportunities.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'accepted' && styles.activeTab]}
            onPress={() => setActiveTab('accepted')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'accepted' && styles.activeTabText]}>
              Accepted
            </Text>
            {bookings.active.filter(b => b.status === 'accepted').length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'accepted' && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, activeTab === 'accepted' && styles.activeTabBadgeText]}>
                  {bookings.active.filter(b => b.status === 'accepted').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'paid' && styles.activeTab]}
            onPress={() => setActiveTab('paid')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'paid' && styles.activeTabText]}>
              Paid
            </Text>
            {bookings.active.filter(b => b.status === 'paid').length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'paid' && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, activeTab === 'paid' && styles.activeTabBadgeText]}>
                  {bookings.active.filter(b => b.status === 'paid').length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
            onPress={() => setActiveTab('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
              Completed
            </Text>
            {bookings.completed.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'completed' && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, activeTab === 'completed' && styles.activeTabBadgeText]}>
                  {bookings.completed.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'canceled' && styles.activeTab]}
            onPress={() => setActiveTab('canceled')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'canceled' && styles.activeTabText]}>
              Canceled
            </Text>
            {bookings.canceled.length > 0 && (
              <View style={[styles.tabBadge, activeTab === 'canceled' && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, activeTab === 'canceled' && styles.activeTabBadgeText]}>
                  {bookings.canceled.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

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
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.SM,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },

  // Tab styles - Pill design
  tabContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tabContent: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  activeTab: {
    backgroundColor: '#1E293B',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  activeTabBadgeText: {
    color: '#FFFFFF',
  },

  // Content styles
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Booking card styles
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    position: 'relative',
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookingIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginBottom: 2,
  },
  bookingCustomer: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  bookingDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconWrap: {
    marginRight: 6,
  },
  detailAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  detailDate: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  cardChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },

  // Opportunity card styles
  opportunityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECEFF4',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  opportunityDistanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  opportunityDistanceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
    fontFamily: FONTS.POPPINS.MEDIUM,
    marginLeft: 4,
  },
  opportunityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  opportunityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  opportunityInfo: {
    flex: 1,
  },
  opportunityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginBottom: 2,
  },
  opportunityCustomer: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  opportunityDescription: {
    fontSize: 14,
    color: '#475569',
    fontFamily: FONTS.POPPINS.REGULAR,
    lineHeight: 20,
    marginBottom: 12,
  },
  opportunityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  opportunityDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  opportunityBudget: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    marginLeft: 6,
  },
  opportunityDate: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: FONTS.POPPINS.REGULAR,
    marginLeft: 6,
  },
  acceptJobBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptJobBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
});

export default ProviderBookingsScreen;
