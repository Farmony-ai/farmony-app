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
import { COLORS, SPACING, FONTS } from '../utils';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ListingService from '../services/ListingService';
import ListingCard from '../components/ListingCard';

import { Listing } from '../services/ListingService';

const ListingsScreen = () => {
  const { user, token } = useSelector((state: RootState) => state.auth);
  const authToken = token || undefined; // Convert null to undefined for type safety
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log('🔄 ListingsScreen mounted/updated');
    console.log('👤 User:', user);
    console.log('🔑 Token:', token ? 'Present' : 'Missing');
    console.log('🆔 User ID from user.id:', user?.id);
    console.log('🆔 User ID from user._id:', (user as any)?._id);
    
    if (user?.id) {
      console.log('✅ User ID found, fetching listings');
      fetchListings();
    } else {
      console.log('❌ No user ID available');
    }
  }, [user?.id]);

  const fetchListings = async () => {
    try {
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      console.log('🔄 Starting to fetch listings');
      console.log('👤 Using provider ID:', user.id);
      console.log('🔑 Using auth token:', authToken ? 'Yes' : 'No');
      console.log('🔑 Token value:', authToken);
      
      setLoading(true);
      const fetchedListings = await ListingService.getProviderListings(user.id, authToken);
      
      console.log('✅ Fetched listings:', fetchedListings);
      console.log('📊 Number of listings:', fetchedListings.length);
      
      setListings(fetchedListings);
    } catch (error: any) {
      console.error('❌ Error fetching listings:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      let errorMessage = 'Failed to load listings. Please try again.';
      
      if (error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view these listings.';
      } else if (error.response?.status === 404) {
        errorMessage = 'No listings found for this provider.';
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
    <SafeAreaWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Listings</Text>
      </View>
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.PRIMARY.MAIN]}
            />
          }
        >
          {listings.length > 0 ? (
            listings.map((listing) => (
              <ListingCard 
                key={listing._id} 
                listing={listing}
                onListingUpdate={handleListingUpdate}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.noListingsText}>
                You haven't created any listings yet.
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
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.BACKGROUND.CARD,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  container: {
    padding: SPACING.LG,
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
    paddingVertical: SPACING['4XL'],
  },
  noListingsText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
  },
});

export default ListingsScreen;
