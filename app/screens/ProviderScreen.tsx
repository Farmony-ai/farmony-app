import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  RefreshControl,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SHADOWS, FONTS } from '../utils';
import { scaleFontSize, scaleSize } from '../utils/fonts';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ProviderService, { ProviderDashboardResponse } from '../services/ProviderService';
import BookingService from '../services/BookingService';
import { canTransition, setOrderStatus } from '../services/orderStatus';
import PendingRequestCard from '../components/PendingRequestCard';

const { width: screenWidth } = Dimensions.get('window');
const backgroundImg = require('../assets/provider-bg.png');

// Import custom icons
const bookingsIcon = require('../assets/bookings.png');
const listingsIcon = require('../assets/listings.png');
const ratingsIcon = require('../assets/ratings.png');

// Animation constants
const HORIZONTAL_SWIPE_THRESHOLD = 80;
const SWIPE_OUT_DURATION = 300;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const MAX_VISIBLE_CARDS = 3;

const ProviderScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useSelector((state: RootState) => state.auth);
  const [dashboard, setDashboard] = useState<ProviderDashboardResponse | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Merge pending bookings with available service requests
  const pendingBookings = useMemo(() => {
    const bookings = dashboard?.pendingBookings || [];
    const requests = dashboard?.availableServiceRequests || [];

    const mappedRequests = requests.map((req: any) => ({
      _id: req._id,
      status: 'pending',
      orderType: 'service_request',
      createdAt: req.createdAt,
      requestExpiresAt: req.expiresAt,
      serviceStartDate: req.serviceStartDate,
      totalAmount: 0,
      distance: req.distance,
      seeker: {
        _id: req.seekerId?._id,
        name: req.seekerId?.name || 'Seeker',
        phone: undefined, // Hide phone until accepted
        location: 'Location',
      },
      serviceLocation: {
        coordinates: req.location?.coordinates,
        address: 'View on Map',
      },
      listing: {
        _id: req._id,
        title: req.title || 'Service Request',
        description: req.description,
        price: 0,
        thumbnailUrl: undefined,
      },
      isServiceRequest: true,
    }));

    return [...mappedRequests, ...bookings];
  }, [dashboard]);

  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

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
        icon: bookingsIcon,
        onPress: () => navigation.navigate('ProviderBookings'),
      },
      {
        label: 'Listings',
        value: String(summary?.activeListings ?? 0),
        icon: listingsIcon,
        onPress: () => navigation.navigate('MyListings'),
      },
      {
        label: 'Rating',
        value: String(summary?.averageRating ?? 0),
        icon: ratingsIcon,
        onPress: () => { },
      },
    ];
  }, [dashboard, navigation]);

  // PanResponder for swiping
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 5,
      onPanResponderMove: (_, g) => {
        translateX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        const { dx, vx } = g;
        const shouldSwipe =
          Math.abs(dx) > HORIZONTAL_SWIPE_THRESHOLD ||
          Math.abs(vx) > SWIPE_VELOCITY_THRESHOLD;

        if (shouldSwipe) {
          const direction = dx > 0 ? 1 : -1;

          Animated.timing(translateX, {
            toValue: direction * screenWidth,
            duration: SWIPE_OUT_DURATION,
            useNativeDriver: true,
          }).start(() => {
            setActiveIndex((prev) => {
              let next = prev + (direction === 1 ? -1 : 1);
              if (next < 0) next = (dashboard?.pendingBookings?.length || 1) - 1;
              if (next >= (dashboard?.pendingBookings?.length || 1)) next = 0;
              return next;
            });
            translateX.setValue(0);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            friction: 5,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleAcceptBooking = async (bookingId: string) => {
    const booking = pendingBookings.find(b => b._id === bookingId);
    if (!booking) return;

    if ((booking as any).isServiceRequest) {
      console.log('Accepting service request:', bookingId);
      // TODO: Implement service request acceptance
      Alert.alert('Coming Soon', 'Accepting service request feature coming soon!');
      return;
    }

    try {
      if (!canTransition(booking.status as any, 'accepted')) return;
      await setOrderStatus({ orderId: bookingId, status: 'accepted' });
      fetchDashboard();
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    const booking = pendingBookings.find(b => b._id === bookingId);
    if (!booking) return;

    if ((booking as any).isServiceRequest) {
      console.log('Rejecting service request:', bookingId);
      // TODO: Implement service request rejection
      return;
    }

    try {
      if (!canTransition(booking.status as any, 'canceled')) return;
      await setOrderStatus({ orderId: bookingId, status: 'canceled' });
      fetchDashboard();
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
      const data = await ProviderService.getDashboard(user.id);
      console.log('Provider Dashboard Data:', data);
      setDashboard(data);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user?.id]);

  const onRefresh = () => fetchDashboard(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchDashboard());
    return unsubscribe;
  }, [navigation, user?.id]);



  // Render stacked cards
  const renderCards = () => {
    if (pendingBookings.length === 0) return null;

    const cards = [];
    for (let i = 0; i < Math.min(MAX_VISIBLE_CARDS, pendingBookings.length); i++) {
      const cardIndex = (activeIndex + i) % pendingBookings.length;
      const booking = pendingBookings[cardIndex];
      const isTop = i === 0;

      const cardStyle = isTop
        ? {
          transform: [
            { translateX },
            {
              rotate: translateX.interpolate({
                inputRange: [-screenWidth / 2, 0, screenWidth / 2],
                outputRange: ['-15deg', '0deg', '15deg'],
                extrapolate: 'clamp',
              }),
            },
          ],
          opacity: translateX.interpolate({
            inputRange: [-screenWidth / 2, 0, screenWidth / 2],
            outputRange: [0.7, 1, 0.7],
            extrapolate: 'clamp',
          }),
        }
        : {
          transform: [{ scale: 1 - i * 0.05 }],
          top: i * 10,
          opacity: 1 - i * 0.1,
        };

      cards.push(
        <Animated.View
          key={`${booking._id}-${cardIndex}`}
          style={[styles.stackedCard, cardStyle]}
          {...(isTop ? panResponder.panHandlers : {})}
        >
          <PendingRequestCard
            booking={booking as any}
            onAccept={handleAcceptBooking}
            onDecline={handleRejectBooking}
          />
        </Animated.View>
      );
    }

    return cards.reverse();
  };

  return (
    <SafeAreaWrapper backgroundColor="#FFFFFF" style={styles.flex}>
      <View style={styles.backgroundImageContainer}>
        <Image source={backgroundImg} style={styles.backgroundImage} resizeMode="cover" />
      </View>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY.MAIN]}
            tintColor={COLORS.PRIMARY.MAIN}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>Service Provider</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateListing')}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={scaleSize(20)} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        {pendingBookings.length > 0 && (
          <View style={styles.stackedCardsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
              <View style={styles.cardCounterContainer}>
                <Text style={styles.cardCounter}>
                  {pendingBookings.length} {pendingBookings.length === 1 ? 'Request' : 'Requests'}
                </Text>
              </View>
            </View>

            <View style={styles.stackedCardsContainer}>{renderCards()}</View>

            {/* Swipe hint with better spacing */}
            {pendingBookings.length > 1 && (
              <View style={styles.swipeHintContainer}>
                <Text style={styles.swipeHint}>
                  <Ionicons name="arrow-back" size={scaleFontSize(12)} color="#9CA3AF" /> Swipe to browse{' '}
                  <Ionicons name="arrow-forward" size={scaleFontSize(12)} color="#9CA3AF" />
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Empty state for no pending requests */}
        {pendingBookings.length === 0 && (
          <View style={styles.emptyRequestsContainer}>
            <View style={styles.emptyRequestsCard}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="time-outline" size={scaleSize(32)} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptySubtitle}>
                You're all caught up! New requests will appear here
              </Text>
            </View>
          </View>
        )}

        {(pendingBookings.length > 0 || (dashboard?.summary?.activeListings || 0) > 0) && (
          <View style={styles.sectionDivider} />
        )}

        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            {stats.map((stat, index) => (
              <TouchableOpacity
                key={index}
                style={styles.summaryCard}
                onPress={stat.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.summaryIconBox}>
                  <Image source={stat.icon} style={styles.summaryIcon} resizeMode="contain" />
                </View>
                <Text style={styles.summaryValue}>{stat.value}</Text>
                <Text style={styles.summaryLabel}>{stat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaWrapper>
  );
};

// Styles
const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, backgroundColor: 'transparent' },
  backgroundImageContainer: {
    position: 'absolute',
    bottom: scaleSize(75),
    left: 0,
    right: 0,
    width: '100%',
    height: scaleSize(400),
    opacity: 0.7,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scaleSize(20),
    paddingTop: Platform.OS === 'ios' ? scaleSize(10) : scaleSize(25),
    paddingBottom: scaleSize(16),
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    fontSize: scaleFontSize(12),
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    marginBottom: scaleSize(1),
  },
  userName: {
    fontSize: scaleFontSize(16),
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  addButton: {
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: scaleSize(18),
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedCardsSection: {
    paddingHorizontal: scaleSize(20),
    marginBottom: scaleSize(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleSize(16),
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  cardCounterContainer: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: scaleSize(10),
    paddingVertical: scaleSize(4),
    borderRadius: scaleSize(12),
  },
  cardCounter: {
    fontSize: scaleFontSize(11),
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#3B82F6',
  },
  stackedCardsContainer: {
    height: scaleSize(300),
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: scaleSize(8),
  },
  stackedCard: {
    position: 'absolute',
    width: '100%',
    ...SHADOWS.MD,
  },
  swipeHintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleSize(20),
    marginBottom: scaleSize(10),
  },
  swipeHint: {
    fontSize: scaleFontSize(11),
    color: '#9CA3AF',
    textAlign: 'center'
  },
  // Empty state styles
  emptyRequestsContainer: {
    paddingHorizontal: scaleSize(20),
    marginBottom: scaleSize(32),
  },
  emptyRequestsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: scaleSize(12),
    padding: scaleSize(32),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: scaleSize(64),
    height: scaleSize(64),
    borderRadius: scaleSize(32),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleSize(16),
  },
  emptyTitle: {
    fontSize: scaleFontSize(16),
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: scaleSize(8),
  },
  emptySubtitle: {
    fontSize: scaleFontSize(14),
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: scaleSize(20),
    marginVertical: scaleSize(20),
  },
  summarySection: {
    paddingHorizontal: scaleSize(20),
    paddingTop: scaleSize(8),
    paddingBottom: scaleSize(16),
    marginTop: scaleSize(45)
  },
  summaryRow: { flexDirection: 'row', gap: scaleSize(10) },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: scaleSize(10),
    padding: scaleSize(12),
    alignItems: 'center',
  },
  summaryIconBox: {
    width: scaleSize(64),
    height: scaleSize(64),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaleSize(2),
  },
  summaryIcon: {
    width: scaleSize(54),
    height: scaleSize(54),
  },
  summaryValue: {
    fontSize: scaleFontSize(14),
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: scaleSize(1),
  },
  summaryLabel: {
    fontSize: scaleFontSize(10),
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#9CA3AF',
  },
  bottomPadding: { height: scaleSize(80) },
});

export default ProviderScreen;