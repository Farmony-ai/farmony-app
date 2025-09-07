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
import PendingRequestCard from '../components/PendingRequestCard';

const { width: screenWidth } = Dimensions.get('window');
const backgroundImg = require('../assets/provider-bg.png');

// Animation constants
const HORIZONTAL_SWIPE_THRESHOLD = 80;
const SWIPE_OUT_DURATION = 300;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const MAX_VISIBLE_CARDS = 3;

const ProviderScreen = () => {
  const navigation = useNavigation<any>();
  const { user, token } = useSelector((state: RootState) => state.auth);
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
        icon: 'calendar-outline',
        onPress: () => navigation.navigate('ProviderBookings'),
      },
      {
        label: 'Listings',
        value: String(summary?.activeListings ?? 0),
        icon: 'list-outline',
        onPress: () => navigation.navigate('MyListings'),
      },
      {
        label: 'Rating',
        value: String(summary?.averageRating ?? 0),
        icon: 'star-outline',
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
      await BookingService.acceptBooking(bookingId);
      fetchDashboard();
    } catch (error) {
      console.error('Error accepting booking:', error);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      await BookingService.rejectBooking(bookingId);
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
      const data = await ProviderService.getDashboard(user.id, token || undefined);
      console.log('Provider Dashboard Data:', data);
      setDashboard(data);
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user?.id, token]);

  const onRefresh = () => fetchDashboard(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchDashboard());
    return unsubscribe;
  }, [navigation, user?.id, token]);

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
    <SafeAreaWrapper backgroundColor="#FAFAFA" style={styles.flex}>
      <Image source={backgroundImg} style={styles.backgroundImage} resizeMode="cover" />
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

            {/* ADDED swipe hint back below the card stack */}
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
                  <Ionicons name={stat.icon as any} size={16} color={COLORS.PRIMARY.MAIN} />
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
  backgroundImage: {
    position: 'absolute',
    bottom: 75,
    left: 0,
    right: 0,
    width: '100%',
    height: 400,
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 25,
    paddingBottom: 16,
    backgroundColor: '#FAFAFA',
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
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    // UPDATED: Made title more prominent
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  cardCounterContainer: {
    backgroundColor: '#EBF4FF', // Lighter blue
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardCounter: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#3B82F6', // Blue
  },
  stackedCardsContainer: {
    height: 340,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  stackedCard: {
    position: 'absolute',
    width: '100%',
    ...SHADOWS.MD,
  },
  // ADDED swipe hint styles back
  swipeHintContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  swipeHint: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
    marginVertical: 5,
  },
  summarySection: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    ...SHADOWS.SM,
  },
  summaryIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 16,
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