import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SHADOWS, FONTS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ProviderService, { ProviderDashboardResponse } from '../services/ProviderService';
import Button from '../components/Button';
import BookingService from '../services/BookingService';

const backgroundImg = require('../assets/provider-bg.png');

const ProviderScreen = () => {
  const navigation = useNavigation<any>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [dashboard, setDashboard] = useState<ProviderDashboardResponse | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = useMemo(() => {
    const summary = dashboard?.summary;
    return [
      {
        label: 'Bookings',
        value: String(summary?.totalBookings ?? 0),
        icon: 'calendar',
        bgColor: '#fff3e0',
        iconColor: '#f57c00',
        onPress: () => navigation.navigate('ProviderBookings'),
      },
      {
        label: 'Listings',
        value: String(summary?.activeListings ?? 0),
        icon: 'list',
        bgColor: '#fff3e0',
        iconColor: '#f57c00',
        onPress: () => navigation.navigate('MyListings'),
      },
      
      {
        label: 'Rating',
        value: String(summary?.averageRating ?? 0),
        icon: 'star',
        bgColor: '#fff3e0',
        iconColor: '#f57c00',
        onPress: () => {}, // No action for rating
      },
      {
        label: 'Listing',
        value: 'Add',
        icon: 'add-circle',
        bgColor: '#fff3e0',
        iconColor: '#f57c00',
        onPress: () => navigation.navigate('CreateListing'),
      },
      
    ];
  }, [dashboard, navigation]);

  // quickActions placeholder removed (inline JSX is used)

  const handleAcceptBooking = async (bookingId: string) => {
  try {
    await BookingService.acceptBooking(bookingId);
    fetchDashboard(); // Refresh the dashboard
  } catch (error) {
    console.error('Error accepting booking:', error);
  }
};

const handleRejectBooking = async (bookingId: string) => {
  try {
    await BookingService.rejectBooking(bookingId);
    fetchDashboard(); // Refresh the dashboard
  } catch (error) {
    console.error('Error rejecting booking:', error);
  }
};


  const fetchDashboard = async (isRefresh = false) => {
    if (!user?.id) {
      if (isRefresh) setRefreshing(false);
      return;
    }
    try {
      if (isRefresh) setRefreshing(true);
      const data = await ProviderService.getDashboard(user.id, token || undefined);
      console.log('Provider Dashboard Data:', data);
      setDashboard(data);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, token]);

  const onRefresh = () => fetchDashboard(true);

  // Refresh when returning from Create Listing or any navigation back
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchDashboard());
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, user?.id, token]);

  return (
    <SafeAreaWrapper backgroundColor="#f5f5f5" style={styles.flex}>
      {/* Background Image */}
      <Image 
        source={backgroundImg} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        bounces={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY.MAIN]}
          />
        }
      >
        {/* Header with Gradient Background */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View>
                <View style={styles.greetingContainer}>
                  <Text style={styles.greetingText}>
                    {getGreeting()}
                  </Text>
                  <Text style={styles.waveEmoji}> 👋</Text>
                </View>
                <Text style={styles.providerName}>
                  Service Provider
                </Text>
              </View>
              <TouchableOpacity style={styles.notificationButton}>
                <Ionicons name="notifications-outline" size={18} color={COLORS.NEUTRAL.WHITE} />
                <View style={styles.notificationDot} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.headerCircle} />
        </View>

        {/* Stats Cards - Horizontal ScrollView */}
        <View style={styles.statsContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContent}
          >
            {stats.map((stat, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.statCard}
                onPress={stat.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.statIconContainer, { backgroundColor: stat.bgColor }]}>
                  <Ionicons name={stat.icon as any} size={18} color={stat.iconColor} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Create First Listing Card - Shows when user has 0 listings */}
        {(dashboard?.summary?.activeListings || 0) === 0 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.createListingCard}
              onPress={() => navigation.navigate('CreateListing')}
              activeOpacity={0.7}
            >
              <View style={styles.createListingContent}>
                <View style={styles.createListingIconBadge}>
                  <Ionicons name="add-circle-outline" size={28} color={COLORS.PRIMARY.MAIN} />
                </View>
                <View style={styles.createListingText}>
                  <Text style={styles.createListingTitle}>Create Your First Listing</Text>
                  <Text style={styles.createListingSubtitle}>Start earning by offering your services to customers</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Bookings - To Be Reviewed */}
        {(dashboard?.pendingBookings || []).map((booking, index) => (
          <View key={index} style={styles.bookingCard}>
            {/* Listing Image */}
            {booking.listing?.thumbnailUrl && (
              <Image 
                source={{ uri: booking.listing.thumbnailUrl }}
                style={styles.bookingImage}
              />
            )}
            
            <View style={styles.bookingContent}>
              <View style={styles.bookingHeader}>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingTitle}>
                    {booking.listing?.title || 'Service'}
                  </Text>
                  <Text style={styles.customerName}>
                    {booking.seeker?.name || 'Customer'}
                  </Text>
                  <View style={styles.bookingMeta}>
                    <Ionicons name="location-outline" size={12} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {booking.seeker?.location || 'Location'}
                      {booking.distance && ` • ${booking.distance} km`}
                    </Text>
                  </View>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceAmount}>₹{booking.totalAmount}</Text>
                  <Text style={styles.priceUnit}>
                    {booking.quantity && `${booking.quantity} ${booking.unitOfMeasure}`}
                  </Text>
                </View>
              </View>
              
              <View style={styles.bookingTime}>
                <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                <Text style={styles.timeText}>
                  Service: {new Date(booking.serviceStartDate).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleAcceptBooking(booking._id)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.rejectButton}
                  onPress={() => handleRejectBooking(booking._id)}
                >
                  <Text style={styles.rejectButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        {/* Upcoming Bookings - Accepted Requests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            {(dashboard?.upcomingBookings?.length || 0) > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('ProviderBookings', { tab: 'upcoming' })}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {(dashboard?.upcomingBookings || []).length === 0 ? (
            <View style={styles.emptyBookingsCard}>
              <View style={styles.emptyIconBadge}>
                <Ionicons name="calendar-clear-outline" size={24} color={COLORS.PRIMARY.MAIN} />
              </View>
              <Text style={styles.emptyTitle}>No upcoming bookings</Text>
              <Text style={styles.emptySubtitle}>Accepted bookings will appear here.</Text>
              <Button
                title="Go to Bookings"
                variant="outline"
                size="small"
                onPress={() => navigation.navigate('ProviderBookings')}
                style={styles.emptyCta}
              />
            </View>
          ) : (
            dashboard?.upcomingBookings.map((booking, index) => (
              <View key={index} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingTitle}>
                      {booking.service || booking.listingTitle || 'Service'}
                    </Text>
                    <Text style={styles.customerName}>
                      {booking.customer || booking.customerName || ''}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, styles.acceptedBadge]}>
                    <Text style={[styles.statusText, styles.acceptedText]}>
                      {booking.status === 'paid' ? 'Paid' : 'Accepted'}
                    </Text>
                  </View>
                </View>
                <View style={styles.bookingTime}>
                  <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                  <Text style={styles.timeText}>
                    {booking.scheduledAt || booking.serviceDate || 
                    `Scheduled: ${new Date(booking.createdAt).toLocaleDateString()}`}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
        {/* Bottom Padding */}
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
    bookingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  bookingContent: {
    flex: 1,
  },
  bookingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: FONT_SIZES.XS,
    color: '#6B7280',
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.PRIMARY.MAIN,
  },
  priceUnit: {
    fontSize: FONT_SIZES.XS,
    color: '#6B7280',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  pendingText: {
    color: '#92400e',
  },
  acceptedBadge: {
    backgroundColor: '#d4edda',
  },
  acceptedText: {
    color: '#155724',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rejectButtonText: {
    color: '#6B7280',
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    backgroundColor: 'transparent', // Changed to transparent
  },
  backgroundImage: {
    position: 'absolute',
    bottom: 75,
    left: 0,
    right: 0,
    width: '100%',
    height: 400, // Increased height
    opacity: 0.5, // Reduced opacity for subtlety
  },
  headerContainer: {
    height: 190,
    backgroundColor: COLORS.PRIMARY.MAIN,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greetingText: {
    fontSize: FONT_SIZES.SM,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  waveEmoji: {
    fontSize: FONT_SIZES.SM,
  },
  providerName: {
    fontSize: FONT_SIZES.LG,
    color: COLORS.NEUTRAL.WHITE,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  notificationButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    backgroundColor: '#ff4757',
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: COLORS.NEUTRAL.WHITE,
  },
  headerCircle: {
    position: 'absolute',
    right: -80,
    top: -20,
    width: 250,
    height: 250,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 125,
  },
  statsContainer: {
    marginTop: -90,
    zIndex: 10,
  },
  statsScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: 100,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 15,
    paddingVertical: 17,
    paddingHorizontal: 16,
    alignItems: 'center',
    ...SHADOWS.MD,
    elevation: 5,
  },
  statIconContainer: {
    width: 40,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    lineHeight: 24,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  viewAllText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.PRIMARY.MAIN,
  },
  bookingCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    ...SHADOWS.SM,
  },
  emptyBookingsCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.SM,
  },
  emptyIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyCta: {
    paddingHorizontal: 10,
  },
  createListingCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    ...SHADOWS.MD,
  },
  createListingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  createListingIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  createListingText: {
    flex: 1,
  },
  createListingTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  createListingSubtitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    lineHeight: 18,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  customerName: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
  },
  statusBadge: {
    backgroundColor: '#d4edda',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#155724',
  },
  bookingTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    marginLeft: 6,
  },
  bottomPad: {
    height: 100,
  },
});

export default ProviderScreen;