/* eslint-disable react/no-unstable-nested-components */
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import ListingService, { Listing } from '../services/ListingService';
import ListingCard from '../components/ListingCard';

const MyListingsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchListings();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  // Refresh listings whenever returning to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.id) {
        fetchListings();
      }
    });
    return unsubscribe;
  }, [navigation, user?.id]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const providerId = user?.id;
      const authToken = token || undefined;

      if (!providerId) {
        throw new Error('User ID not found');
      }

      const response = await ListingService.getProviderListings(providerId, authToken);
      setListings(response);
    } catch (error) {
      console.error('Error fetching listings:', error);
      Alert.alert('Error', 'Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={48} color={COLORS.TEXT.SECONDARY} />
      </View>
      <Text style={styles.emptyTitle}>No listings yet</Text>
      <Text style={styles.emptyText}>
        Start by creating your first listing to offer services to others
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateListing')}
      >
        <Ionicons name="add-circle-outline" size={20} color={COLORS.NEUTRAL.WHITE} />
        <Text style={styles.createButtonText}>Create Listing</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      {/* Clean Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Ionicons name="add" size={24} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Stats Summary Cards */}
      {listings.length > 0 && !loading && (
        <View style={styles.statsContainer}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>OVERVIEW</Text>
            <View style={styles.headerLine} />
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="list-outline" size={20} color={COLORS.PRIMARY.MAIN} />
              </View>
              <Text style={styles.statValue}>{listings.length}</Text>
              <Text style={styles.statLabel}>Total Listings</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: COLORS.SUCCESS.LIGHT }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.SUCCESS.MAIN} />
              </View>
              <Text style={styles.statValue}>{listings.filter(l => l.isActive).length}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="calendar-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>
                {listings.reduce((sum, l) => sum + l.bookingCount, 0)}
              </Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
          </View>
        </View>
      )}

      {/* Listings Section */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
          <Text style={styles.loadingText}>Loading your listings...</Text>
        </View>
      ) : listings.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Listings Header */}
          <View style={styles.listingsHeader}>
            <Text style={styles.listingsTitle}>MY LISTINGS</Text>
            <View style={styles.headerLine} />
            <Text style={styles.listingsCount}>{listings.length}</Text>
          </View>
          
          <ScrollView
            contentContainerStyle={styles.scrollContent}
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
            {listings.map((listing) => (
              <View key={listing._id} style={styles.cardWrapper}>
                <ListingCard listing={listing} onListingUpdate={onRefresh} />
              </View>
            ))}
          </ScrollView>
        </>
      )}
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
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  backButton: {
    padding: SPACING.XS,
  },
  addButton: {
    padding: SPACING.XS,
  },
  statsContainer: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingTop: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  statsTitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.SECONDARY,
    letterSpacing: 1.2,
    marginRight: SPACING.MD,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.BORDER.PRIMARY,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    gap: SPACING.SM,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  statValue: {
    fontSize: FONT_SIZES.XL,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  listingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginTop: SPACING.XS,
  },
  listingsTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.SECONDARY,
    letterSpacing: 1.5,
    marginRight: SPACING.MD,
  },
  listingsCount: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.MD,
  },
  scrollContent: {
    padding: SPACING.MD,
    paddingBottom: SPACING['4XL'],
  },
  cardWrapper: {
    marginBottom: SPACING.MD,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },
  emptyIconContainer: {
    marginBottom: SPACING.MD,
    padding: SPACING.LG,
    borderRadius: BORDER_RADIUS.XL,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.XL,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  emptyText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
    lineHeight: 22,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    gap: SPACING.SM,
    ...SHADOWS.MD,
  },
  createButtonText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
});

export default MyListingsScreen;