import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl, 
  StatusBar,
  ActivityIndicator 
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { SPACING, FONTS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import SeekerService, { SeekerBooking } from '../services/SeekerService';

// Ultra-minimal color scheme
const COLORS_MINIMAL = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: {
    primary: '#000000',
    secondary: '#4A5568',
    muted: '#A0AEC0',
  },
  accent: '#10B981',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

const BookingsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [bookings, setBookings] = useState<SeekerBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const fetchBookings = async (isRefresh = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      const data = await SeekerService.getBookings(user.id, token || undefined);
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [user?.id, token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(true);
  };

  const getStatusColor = (status: string) => {
    // Normalize status to handle both 'canceled' and 'cancelled'
    const normalizedStatus = status === 'canceled' ? 'cancelled' : status;
    
    switch (normalizedStatus) {
      case 'pending':
        return COLORS_MINIMAL.warning;
      case 'accepted':
        return COLORS_MINIMAL.accent;
      case 'completed':
        return COLORS_MINIMAL.info;
      case 'cancelled':
      case 'rejected':
        return COLORS_MINIMAL.danger;
      default:
        return COLORS_MINIMAL.text.muted;
    }
  };

  const getStatusIcon = (status: string) => {
    // Normalize status to handle both 'canceled' and 'cancelled'
    const normalizedStatus = status === 'canceled' ? 'cancelled' : status;
    
    switch (normalizedStatus) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'checkmark-done-outline';
      case 'cancelled':
      case 'rejected':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter bookings based on active tab - FIXED to handle 'canceled' status
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.serviceStartDate || booking.scheduledDate || booking.createdAt);
    const now = new Date();
    
    // Normalize status to handle both 'canceled' and 'cancelled'
    const normalizedStatus = booking.status === 'canceled' ? 'cancelled' : booking.status;
    
    if (activeTab === 'upcoming') {
      // Show only pending or accepted bookings with future dates
      // Explicitly exclude cancelled bookings from upcoming
      return (normalizedStatus === 'pending' || normalizedStatus === 'accepted') && 
             normalizedStatus !== 'cancelled' && 
             normalizedStatus !== 'rejected' &&
             bookingDate >= now;
    } else {
      // Past tab shows:
      // 1. All completed bookings
      // 2. All cancelled/rejected bookings (regardless of date)
      // 3. Any booking with a past date
      return normalizedStatus === 'completed' || 
             normalizedStatus === 'cancelled' || 
             normalizedStatus === 'rejected' ||
             bookingDate < now;
    }
  });

  const renderBookingCard = (booking: SeekerBooking) => {
    // Map API fields to expected fields
    const bookingDate = booking.scheduledDate || booking.serviceStartDate || booking.createdAt;
    const bookingCost = booking.totalCost ?? booking.totalAmount ?? 0;
    const displayStatus = booking.status === 'canceled' ? 'cancelled' : booking.status;
    
    return (
      <TouchableOpacity
        key={booking._id}
        style={styles.bookingCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('BookingDetails', { bookingId: booking._id })}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingTitleRow}>
            <Text style={styles.bookingTitle}>
              {booking.listingTitle || booking.serviceType || booking.orderType || 'Service Booking'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(booking.status)}15` }]}>
              <Ionicons 
                name={getStatusIcon(booking.status)} 
                size={12} 
                color={getStatusColor(booking.status)} 
              />
              <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS_MINIMAL.text.muted} />
            <Text style={styles.detailText}>{formatDate(bookingDate)}</Text>
            {booking.scheduledTime && (
              <>
                <Text style={styles.detailSeparator}>•</Text>
                <Text style={styles.detailText}>{booking.scheduledTime}</Text>
              </>
            )}
          </View>

          {booking.providerName && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={14} color={COLORS_MINIMAL.text.muted} />
              <Text style={styles.detailText}>{booking.providerName}</Text>
            </View>
          )}

          {booking.location?.address && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={COLORS_MINIMAL.text.muted} />
              <Text style={styles.detailText} numberOfLines={1}>
                {booking.location.address}
              </Text>
            </View>
          )}

          {booking.serviceEndDate && booking.serviceEndDate !== booking.serviceStartDate && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={COLORS_MINIMAL.text.muted} />
              <Text style={styles.detailText}>
                Until {formatDate(booking.serviceEndDate)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bookingFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total</Text>
            <Text style={styles.priceValue}>₹{bookingCost.toLocaleString()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS_MINIMAL.text.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity 
          style={styles.headerIcon} 
          onPress={() => navigation.navigate('Provider')}
          activeOpacity={0.7}
        > 
          <Ionicons name="briefcase-outline" size={20} color={COLORS_MINIMAL.accent} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[COLORS_MINIMAL.accent]}
            tintColor={COLORS_MINIMAL.accent}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS_MINIMAL.accent} />
          </View>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map(renderBookingCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name={activeTab === 'upcoming' ? 'calendar-outline' : 'time-outline'} 
                size={48} 
                color={COLORS_MINIMAL.text.muted} 
              />
            </View>
            <Text style={styles.emptyTitle}>
              No {activeTab} bookings
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'upcoming' 
                ? 'Your upcoming bookings will appear here'
                : 'Your completed and past bookings will appear here'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreButtonText}>Explore Services</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS_MINIMAL.background,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS_MINIMAL.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: COLORS_MINIMAL.text.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.secondary,
  },
  activeTabText: {
    color: COLORS_MINIMAL.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  bookingCard: {
    backgroundColor: COLORS_MINIMAL.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS_MINIMAL.border,
  },
  bookingHeader: {
    marginBottom: 12,
  },
  bookingTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
    flex: 1,
  },
  detailSeparator: {
    fontSize: 13,
    color: COLORS_MINIMAL.text.muted,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS_MINIMAL.divider,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
  },
  priceValue: {
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS_MINIMAL.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: COLORS_MINIMAL.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exploreButtonText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.background,
  },
});

export default BookingsScreen;