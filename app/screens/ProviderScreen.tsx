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
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SHADOWS, FONTS } from '../utils';
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
        onPress: () => {},
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
    try {
      const current = dashboard?.pendingBookings?.find(b => b._id === bookingId)?.status || 'pending';
      if (!canTransition(current as any, 'accepted')) return;
      await setOrderStatus({ orderId: bookingId, status: 'accepted' });
      fetchDashboard();
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      const current = dashboard?.pendingBookings?.find(b => b._id === bookingId)?.status || 'pending';
      if (!canTransition(current as any, 'canceled')) return;
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

  const pendingBookings = dashboard?.pendingBookings || [];

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
            booking={booking}
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
            <Ionicons name="add" size={20} color={COLORS.TEXT.PRIMARY} />
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
                  <Ionicons name="arrow-back" size={12} color="#9CA3AF" /> Swipe to browse{' '}
                  <Ionicons name="arrow-forward" size={12} color="#9CA3AF" />
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
                <Ionicons name="time-outline" size={32} color="#9CA3AF" />
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
    bottom: 75,
    left: 0,
    right: 0,
    width: '100%',
    height: 400,
// Lightest green background
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
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 25,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    marginBottom: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stackedCardsSection: {
    paddingHorizontal: 20,
    marginBottom: 24, // INCREASED from 10 to 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  cardCounterContainer: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardCounter: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#3B82F6',
  },
  stackedCardsContainer: {
    height: 300, // REDUCED from 340 to 300
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 8, // REDUCED from 10 to 8
  },
  stackedCard: {
    position: 'absolute',
    width: '100%',
    ...SHADOWS.MD,
  },
  swipeHintContainer: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 20, // REDUCED from 50 to 20
    marginBottom: 10, // ADDED bottom margin
  },
  swipeHint: { 
    fontSize: 11, 
    color: '#9CA3AF', 
    textAlign: 'center' 
  },
  // Empty state styles
  emptyRequestsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32, // INCREASED from 20 to 32
  },
  emptyRequestsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
    marginVertical: 20, // INCREASED from 15 to 20
  },
  summarySection: { 
    paddingHorizontal: 20, 
    paddingTop: 8, // INCREASED from 4 to 8
    paddingBottom: 16, // INCREASED from 12 to 16
    marginTop: 45
  },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Grey background like HomeScreen popular services
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  summaryIconBox: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  summaryIcon: {
    width: 54,
    height: 54,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#9CA3AF',
  },
  bottomPadding: { height: 80 },
});

export default ProviderScreen;