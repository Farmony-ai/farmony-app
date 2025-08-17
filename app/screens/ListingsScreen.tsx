import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, FONTS, FONT_SIZES, BORDER_RADIUS } from '../utils';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ListingService from '../services/ListingService';
import ListingCard from '../components/ListingCard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Listing } from '../services/ListingService';

const ListingsScreen = () => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const authToken = token || undefined;
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchListings();
    }
  }, [user?.id]);

  const fetchListings = async () => {
    try {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      
      setLoading(true);
      const fetchedListings = await ListingService.getProviderListings(user.id, authToken);
      setListings(fetchedListings);
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      let errorMessage = 'Failed to load listings. Please try again.';
      
      if (error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view these listings.';
      } else if (error.response?.status === 404) {
        errorMessage = 'No listings found.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const handleListingUpdate = () => {
    fetchListings();
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      {/* Clean Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>MY LISTINGS</Text>
          <View style={styles.headerLine} />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
          <Text style={styles.loadingText}>Loading your listings...</Text>
        </View>
      ) : (
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
          {listings.length > 0 ? (
            <>
              {/* Stats Summary */}
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="list-outline" size={18} color={COLORS.PRIMARY.MAIN} />
                  </View>
                  <Text style={styles.statValue}>{listings.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: COLORS.SUCCESS.LIGHT }]}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.SUCCESS.MAIN} />
                  </View>
                  <Text style={styles.statValue}>
                    {listings.filter(l => l.isActive).length}
                  </Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="pause-circle-outline" size={18} color="#F59E0B" />
                  </View>
                  <Text style={styles.statValue}>
                    {listings.filter(l => !l.isActive).length}
                  </Text>
                  <Text style={styles.statLabel}>Inactive</Text>
                </View>
              </View>

              {/* Listings */}
              <View style={styles.listingsContainer}>
                {listings.map((listing) => (
                  <View key={listing._id} style={styles.cardWrapper}>
                    <ListingCard 
                      listing={listing}
                      onListingUpdate={handleListingUpdate}
                    />
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="document-text-outline" size={48} color={COLORS.TEXT.SECONDARY} />
              </View>
              <Text style={styles.noListingsText}>
                You haven't created any listings yet
              </Text>
              <Text style={styles.noListingsSubtext}>
                Start by creating your first listing to offer services
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.SECONDARY,
    letterSpacing: 1.5,
    marginRight: SPACING.MD,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.BORDER.PRIMARY,
  },
  container: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['4XL'],
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    gap: SPACING.SM,
    marginBottom: SPACING.XS,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  statValue: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  listingsContainer: {
    padding: SPACING.MD,
    paddingBottom: SPACING['4XL'],
  },
  cardWrapper: {
    marginBottom: SPACING.MD,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['4XL'],
    paddingHorizontal: SPACING.LG,
  },
  emptyIconContainer: {
    marginBottom: SPACING.MD,
    padding: SPACING.LG,
    borderRadius: BORDER_RADIUS.XL,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  noListingsText: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.SM,
  },
  noListingsSubtext: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ListingsScreen;