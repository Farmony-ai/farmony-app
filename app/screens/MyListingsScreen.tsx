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

      if (!providerId) {
        throw new Error('User ID not found');
      }

      const response = await ListingService.getProviderListings(providerId);
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
        <Text style={styles.headerTitle}>My Listings</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Ionicons name="add" size={24} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Compact Stats Bar */}
      {listings.length > 0 && !loading && (
        <View style={styles.compactStatsContainer}>
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: COLORS.PRIMARY.MAIN }]} />
            <Text style={styles.statNumber}>{listings.length}</Text>
            <Text style={styles.statText}>Total</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: COLORS.SUCCESS.MAIN }]} />
            <Text style={styles.statNumber}>{listings.filter(l => l.isActive).length}</Text>
            <Text style={styles.statText}>Active</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.statNumber}>
              {listings.reduce((sum, l) => sum + l.bookingCount, 0)}
            </Text>
            <Text style={styles.statText}>Bookings</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <View style={[styles.statDot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.statNumber}>
              {listings.reduce((sum, l) => sum + l.viewCount, 0)}
            </Text>
            <Text style={styles.statText}>Views</Text>
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
              <ListingCard 
                listing={listing} 
                onStatusChange={(listingId, newStatus) => {
                  // Update local state to reflect status change
                  setListings(prevListings => 
                    prevListings.map(l => 
                      l._id === listingId ? { ...l, isActive: newStatus } : l
                    )
                  );
                }}
                onEdit={(listingId) => {
                  navigation.navigate('CreateListing', { listingId });
                }}
              />
            </View>
          ))}
        </ScrollView>
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
  headerTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  backButton: {
    padding: SPACING.XS,
  },
  addButton: {
    padding: SPACING.XS,
  },
  // Compact stats bar styles
  compactStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.SM,
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statNumber: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  statText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: COLORS.BORDER.PRIMARY,
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