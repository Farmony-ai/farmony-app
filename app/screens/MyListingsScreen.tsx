/* eslint-disable react/no-unstable-nested-components */
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from '../utils';
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
      console.log('response', response);
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

  const getUnitLabel = (unit: string) => {
    const unitLabels: { [key: string]: string } = {
      'per_hour': '/hr',
      'per_day': '/day',
      'per_hectare': '/ha',
      'per_kg': '/kg',
      'per_unit': '/unit',
    };
    return unitLabels[unit] || unit;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={COLORS.TEXT.SECONDARY} />
      <Text variant="h4" weight="semibold" style={styles.emptyTitle}>
        No listings yet
      </Text>
      <Text variant="body" color={COLORS.TEXT.SECONDARY} align="center" style={styles.emptyText}>
        Start by creating your first listing to offer services to others
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateListing')}
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text variant="body" weight="semibold" color="#fff" style={{ marginLeft: 8 }}>
          Create Listing
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
        <Text variant="h3" weight="semibold" style={styles.headerTitle}>
          My Listings
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateListing')}
        >
          <Ionicons name="add" size={24} color={COLORS.PRIMARY.MAIN} />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      {listings.length > 0 && (
        <View style={styles.statsBar}>
          <View style={styles.statCard}>
            <Text variant="h3" weight="bold" color={COLORS.PRIMARY.MAIN}>
              {listings.length}
            </Text>
            <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
              Total Listings
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="h3" weight="bold" color={COLORS.PRIMARY.MAIN}>
              {listings.filter(l => l.isActive).length}
            </Text>
            <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
              Active
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="h3" weight="bold" color={COLORS.PRIMARY.MAIN}>
              {listings.reduce((sum, l) => sum + l.bookingCount, 0)}
            </Text>
            <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
              Bookings
            </Text>
          </View>
        </View>
      )}

      {/* Listings */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
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
            />
          }
        >
          {listings.map((listing) => (
            <ListingCard key={listing._id} listing={listing} onListingUpdate={onRefresh} />
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: '#fff',
    gap: SPACING.SM,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  scrollContent: {
    padding: SPACING.MD,
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
    paddingHorizontal: SPACING.XL,
  },
  emptyTitle: {
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptyText: {
    marginBottom: SPACING.LG,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.MD,
  },
});

export default MyListingsScreen;
