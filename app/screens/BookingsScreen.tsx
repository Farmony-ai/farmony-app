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
import SeekerService, { UnifiedBooking } from '../services/SeekerService';
import RippleAnimation from '../components/RippleAnimation';
import UnifiedBookingSocketHandler from '../services/UnifiedBookingSocketHandler';

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
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
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
      const data = await SeekerService.getUnifiedBookings(user.id);
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

  // Socket connection for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    // Connect socket for real-time updates
    UnifiedBookingSocketHandler.connect(user.id, (updatedBooking) => {
      console.log('Real-time booking update:', updatedBooking);

      setBookings(prevBookings => {
        // Find and update existing booking
        const index = prevBookings.findIndex(b => b.id === updatedBooking.id);

        if (index >= 0) {
          // Update existing booking
          const updated = [...prevBookings];
          updated[index] = {
            ...updated[index],
            ...updatedBooking,
          } as UnifiedBooking;
          return updated;
        } else if (updatedBooking.type && updatedBooking.title) {
          // Add new booking if it's complete enough
          return [...prevBookings, updatedBooking as UnifiedBooking].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        return prevBookings;
      });
    });

    // Cleanup on unmount
    return () => {
      UnifiedBookingSocketHandler.disconnect();
    };
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(true);
  };

  const getStatusDisplay = (booking: UnifiedBooking) => {
    switch (booking.displayStatus) {
      case 'searching':
        const minutes = booking.searchElapsedMinutes || 0;
        const formattedTime = `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
        return {
          label: 'Searching',
          sublabel: `Finding provider... ${formattedTime} elapsed`,
          color: COLORS_MINIMAL.info,
          icon: 'search-outline',
          showAnimation: true,
        };
      case 'matched':
        return {
          label: 'Matched',
          sublabel: booking.providerName ? `${booking.providerName} • ETA 23m` : 'Provider assigned',
          color: COLORS_MINIMAL.accent,
          icon: 'checkmark-circle-outline',
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          sublabel: 'On job • 2h 10m',
          color: COLORS_MINIMAL.accent,
          icon: 'time-outline',
        };
      case 'no_accept':
        return {
          label: 'No Accept',
          sublabel: 'No provider accepted',
          color: COLORS_MINIMAL.warning,
          icon: 'alert-circle-outline',
        };
      case 'completed':
        return {
          label: 'Completed',
          sublabel: booking.totalAmount ? `₹${booking.totalAmount.toLocaleString()}` : 'Completed',
          color: COLORS_MINIMAL.text.muted,
          icon: 'checkmark-done-outline',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          sublabel: 'Cancelled',
          color: COLORS_MINIMAL.text.muted,
          icon: 'close-circle-outline',
        };
      case 'pending':
        return {
          label: 'Pending',
          sublabel: 'Awaiting confirmation',
          color: COLORS_MINIMAL.warning,
          icon: 'time-outline',
        };
      default:
        return {
          label: booking.displayStatus,
          sublabel: '',
          color: COLORS_MINIMAL.text.secondary,
          icon: 'ellipse-outline',
        };
    }
  };

  const getStatusIcon = (status: string) => {
    const display = getStatusDisplay({ displayStatus: status } as UnifiedBooking);
    return display.icon || 'ellipse-outline';
  };

  const getStatusColor = (status: string) => {
    const display = getStatusDisplay({ displayStatus: status } as UnifiedBooking);
    return display.color || COLORS_MINIMAL.text.muted;
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

  // Helper function to get display title and subtitle from booking
  const getBookingDisplayInfo = (booking: UnifiedBooking) => {
    let title = booking.title || 'Service';
    let subtitle = '';

    // For service requests, show category/subcategory
    if (booking.type === 'service_request') {
      if (booking.subcategory?.name) {
        subtitle = booking.subcategory.name;
      } else if (booking.category?.name) {
        subtitle = booking.category.name;
      }
    } else {
      // For orders, show category
      if (booking.subcategory?.name) {
        subtitle = booking.category?.name || '';
      } else if (booking.category?.name) {
        subtitle = booking.category.name;
      }
    }

    return { title, subtitle };
  };

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.serviceStartDate || booking.createdAt);
    const now = new Date();

    // Reset time to start of day for proper date comparison
    const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (activeTab === 'upcoming') {
      // Upcoming: searching, matched, in_progress, pending statuses OR future/today dates
      const isFutureOrToday = bookingDateOnly >= todayOnly;
      const isActiveStatus = ['searching', 'matched', 'in_progress', 'pending'].includes(booking.displayStatus);
      return isActiveStatus && isFutureOrToday;
    } else {
      // Past: completed, cancelled, no_accept statuses OR past dates
      const isPastDate = bookingDateOnly < todayOnly;
      const isCompletedStatus = ['completed', 'cancelled', 'no_accept'].includes(booking.displayStatus);
      return isCompletedStatus || isPastDate;
    }
  });

  const renderBookingCard = (booking: UnifiedBooking) => {
    // Map API fields to expected fields
    const bookingDate = booking.serviceStartDate || booking.createdAt;
    const { title, subtitle } = getBookingDisplayInfo(booking);
    const statusDisplay = getStatusDisplay(booking);

    // Navigate to appropriate detail screen
    const handlePress = () => {
      if (booking.type === 'service_request') {
        navigation.navigate('ServiceRequestDetails', { requestId: booking.id });
      } else {
        navigation.navigate('SeekerOrderDetail', { orderId: booking.id });
      }
    };

    return (
      <TouchableOpacity
        key={booking.id}
        style={styles.bookingCard}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingTitleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.bookingTitle}>
                {title}
              </Text>
              {subtitle && (
                <Text style={styles.bookingSubtitle}>
                  {subtitle}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusDisplay.color}15` }]}>
              {statusDisplay.showAnimation ? (
                <RippleAnimation color={statusDisplay.color} size={12} duration={1500} />
              ) : (
                <Ionicons
                  name={statusDisplay.icon}
                  size={12}
                  color={statusDisplay.color}
                />
              )}
              <Text style={[styles.statusText, { color: statusDisplay.color, marginLeft: statusDisplay.showAnimation ? 8 : 4 }]}>
                {statusDisplay.label}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bookingDetails}>
          {/* Show status sublabel if available */}
          {statusDisplay.sublabel && (
            <View style={styles.detailRow}>
              <Text style={styles.statusSublabel}>{statusDisplay.sublabel}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS_MINIMAL.text.muted} />
            <Text style={styles.detailText}>{formatDate(bookingDate)}</Text>
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

          {/* Show budget range for service requests without a price */}
          {booking.type === 'service_request' && !booking.totalAmount && booking.budget && (
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={14} color={COLORS_MINIMAL.text.muted} />
              <Text style={styles.detailText}>
                Budget: ₹{booking.budget.min.toLocaleString()} - ₹{booking.budget.max.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bookingFooter}>
          {/* Only show price if available (hide for unmatched service requests) */}
          {booking.totalAmount && (
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Total</Text>
              <Text style={styles.priceValue}>₹{booking.totalAmount.toLocaleString()}</Text>
            </View>
          )}
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
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  bookingTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  bookingSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
    marginTop: 2,
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
  statusSublabel: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
    fontStyle: 'italic',
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