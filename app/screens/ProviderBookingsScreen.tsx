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
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import BookingService, { Booking, BookingsResponse } from '../services/BookingService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { canTransition, setOrderStatus } from '../services/orderStatus';

const { width: screenWidth } = Dimensions.get('window');
const TAB_WIDTH = (screenWidth - 40) / 3;

type TabType = 'pending' | 'accepted' | 'paid' | 'completed' | 'canceled';

const ProviderBookingsScreen = () => {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [bookings, setBookings] = useState<BookingsResponse>({
    active: [],
    completed: [],
    canceled: [],
    toReview: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'accept' | 'cancel' | null>(null);

  const { user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    fetchBookings();
  }, [user?.id]);

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
      console.error('Error loading dummy data:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const renderEmptyState = (type: string) => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name={type === 'pending' ? 'time-outline' : type === 'accepted' || type === 'paid' ? 'hourglass-outline' : type === 'completed' ? 'checkmark-done-outline' : 'close-circle-outline'} 
        size={64} 
        color={COLORS.TEXT.SECONDARY} 
      />
      <Text variant="h4" weight="semibold" style={styles.emptyTitle}>
        No {type.charAt(0).toUpperCase() + type.slice(1)} Bookings
      </Text>
      <Text variant="body" color={COLORS.TEXT.SECONDARY} align="center" style={styles.emptyText}>
        {type === 'pending' 
          ? 'New booking requests will appear here'
          : type === 'accepted' || type === 'paid'
          ? 'Your ongoing bookings will appear here'
          : type === 'completed'
          ? 'Your completed bookings will appear here'
          : 'Canceled bookings will appear here'}
      </Text>
    </View>
  );

  const getTabData = () => {
    // Split according to the five visible statuses
    // Note: Backend puts pending orders in 'active' array, not 'toReview'
    switch (activeTab) {
      case 'pending':
        // Fix: Get pending bookings from active array, not toReview
        return bookings.active.filter(b => b.status === 'pending');
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

      {/* Tabs: pending | accepted | paid | completed | canceled */}
      <ScrollView style={styles.tabContainer} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        <TouchableOpacity style={[styles.tab, activeTab === 'pending' && styles.activeTab]} onPress={() => setActiveTab('pending')}>
          <Text variant="body" weight={activeTab === 'pending' ? 'semibold' : 'regular'} color={activeTab === 'pending' ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY} numberOfLines={1}>
            Pending
          </Text>
          {bookings.active.filter(b => b.status === 'pending').length > 0 && (
            <View style={styles.tabBadge}>
              <Text variant="caption" weight="semibold" color="#fff">{bookings.active.filter(b => b.status === 'pending').length}</Text>
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
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
          </View>
        ) : tabData.length === 0 ? (
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
            {tabData.map((booking) => renderBookingCard(booking, activeTab === 'pending'))}
          </ScrollView>
        )}
      </View>
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
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.SM,
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
});

export default ProviderBookingsScreen;