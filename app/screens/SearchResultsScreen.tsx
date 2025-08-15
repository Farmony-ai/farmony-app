import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ListingService, { Listing } from '../services/ListingService';
import SearchListingCard from '../components/SearchListingCard';

const { width: screenWidth } = Dimensions.get('window');

interface RouteParams {
  searchQuery?: string;
  dateRange?: {
    startDate: string | null;
    endDate: string | null;
  };
  categoryId?: string;
  subCategoryId?: string;
}

const SearchResultsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { searchQuery, dateRange, categoryId, subCategoryId } = route.params as RouteParams;
  
  const [search, setSearch] = useState(searchQuery || '');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Get date range and location from Redux
  const reduxDateRange = useSelector((state: RootState) => state.date);
  const activeDateRange = dateRange || reduxDateRange;
  const { latitude, longitude, city, radius } = useSelector((state: RootState) => state.location);

  const performSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      // Basic search parameters
      if (search) params.text = search;
      if (categoryId) params.categoryId = categoryId;
      if (subCategoryId) params.subCategoryId = subCategoryId;
      
      // Location-based search
      if (latitude && longitude && radius) {
        params.latitude = latitude;
        params.longitude = longitude;
        params.radius = radius;
      } else if (city && city !== 'Loading...') {
        params.location = city;
      }

      // Date filtering
      if (activeDateRange?.startDate) params.date = activeDateRange.startDate;

      // Advanced search parameters from filter modal
      if (priceMin) params.priceMin = Number(priceMin);
      if (priceMax) params.priceMax = Number(priceMax);
      if (showActiveOnly !== undefined) params.isActive = showActiveOnly;

      console.log('SearchResultsScreen: Calling searchListings with params:', params);
      const fetchedListings = await ListingService.searchListings(params);
      setResults(fetchedListings);
      console.log('SearchResultsScreen: Results state updated with:', fetchedListings);
    } catch (error: any) {
      console.error('Error performing search:', error);
      Alert.alert('Error', 'Failed to perform search. Please try again.');
      setResults([]); // Clear results on error
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, subCategoryId, latitude, longitude, radius, city, activeDateRange, priceMin, priceMax, showActiveOnly]);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
    
    console.log('SearchResultsScreen: route.params:', route.params);
    // Perform initial search
    performSearch();
  }, [fadeAnim, slideAnim, performSearch, route.params]);

  // Add function for nearby search
  const performNearbySearch = async () => {
    if (!latitude || !longitude) {
      Alert.alert('Location Required', 'Please enable location services to search nearby listings.');
      return;
    }

    setLoading(true);
    try {
      const nearbyListings = await ListingService.getNearbyListings({
        lat: latitude,
        lng: longitude,
        distance: radius || 5, // Default 5km radius
      });
      setResults(nearbyListings);
    } catch (error: any) {
      console.error('Error performing nearby search:', error);
      Alert.alert('Error', 'Failed to search nearby listings. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationPress = () => {
    setShowLocationModal(true);
  };

  const handleLocationSelect = (_newLocation: string) => {
    setShowLocationModal(false);
  };

  const formatDateRange = () => {
    if (!activeDateRange?.startDate || !activeDateRange?.endDate) {
      return 'Immediate';
    }
    const start = new Date(activeDateRange.startDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    const end = new Date(activeDateRange.endDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    return `${start} - ${end}`;
  };

  const renderListingItem = ({ item }: { item: Listing }) => ( // Change render item to Listing
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
        width: (screenWidth - SPACING.MD * 3) / 2, // Calculate width for two columns
        marginBottom: SPACING.MD, // Add margin bottom for spacing between rows
        marginHorizontal: SPACING.XS, // Add horizontal margin for spacing between columns
      }}
    >
      <SearchListingCard 
        listing={item} 
      />
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Recent Searches - Keep if still relevant, otherwise remove */}
      {search.length < 3 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Searches</Text>
          <View style={styles.recentTags}>
            {/* You might want to store and display actual recent searches */}
            {/* For now, keeping mock data or removing if not needed */}
            {['Tractor rental near me', 'Harvest workers'].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentTag}
                onPress={() => setSearch(item)}
              >
                <Ionicons name="time-outline" size={14} color={COLORS.TEXT.SECONDARY} />
                <Text style={styles.recentTagText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      
      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {search.length >= 3 || categoryId || (latitude && longitude) ? 'Search Results' : 'Popular Listings'}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
        ) : (
          <Text style={styles.resultCount}>
            {results.length} results found
          </Text>
        )}
      </View>
    </View>
  );

  const LocationModal = () => (
    <Modal
      visible={showLocationModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowLocationModal(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowLocationModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <TouchableOpacity onPress={() => setShowLocationModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.TEXT.PRIMARY} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.locationSearchBar}>
            <Ionicons name="search" size={20} color={COLORS.TEXT.SECONDARY} />
            <TextInput
              style={styles.locationSearchInput}
              placeholder="Search for area, city..."
              placeholderTextColor={COLORS.TEXT.SECONDARY}
              value={locationSearch}
              onChangeText={setLocationSearch}
            />
          </View>
          
          <ScrollView style={styles.locationList}>
            <TouchableOpacity
              style={styles.locationItem}
              onPress={() => handleLocationSelect('Current Location')}
            >
              <MaterialIcons name="my-location" size={20} color={COLORS.PRIMARY.MAIN} />
              <Text style={styles.locationItemText}>Use Current Location</Text>
            </TouchableOpacity>
            
            {['Hyderabad', 'Bangalore', 'Chennai', 'Mumbai', 'Delhi', 'Pune', 'Kolkata'].map((locCity) => (
              <TouchableOpacity
                key={locCity}
                style={styles.locationItem}
                onPress={() => handleLocationSelect(locCity)}
              >
                <Ionicons name="location-outline" size={20} color={COLORS.TEXT.SECONDARY} />
                <Text style={styles.locationItemText}>{locCity}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Search Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          
          <View style={styles.searchBarContainer}>
            <Ionicons name="search" size={20} color={COLORS.PRIMARY.MAIN} />
            <TextInput
              style={styles.searchInput}
              placeholder="Find Services or Listings"
              placeholderTextColor={COLORS.TEXT.SECONDARY}
              value={search}
              onChangeText={setSearch}
              autoFocus={false}
              onSubmitEditing={performSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={COLORS.TEXT.SECONDARY} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="filter" size={20} color={COLORS.PRIMARY.MAIN} />
          </TouchableOpacity>
        </View>
        
        {/* Enhanced Location Bar */}
        <TouchableOpacity
          style={styles.locationBar}
          onPress={handleLocationPress}
          activeOpacity={0.7}
        >
          <View style={styles.locationIconContainer}>
            <Ionicons name="location" size={18} color={COLORS.PRIMARY.MAIN} />
          </View>
          <Text style={styles.locationText}>{city?.toUpperCase() || 'LOCATION UNAVAILABLE'}</Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.TEXT.SECONDARY} />
        </TouchableOpacity>
        
        {/* Enhanced Date Range Info */}
        {activeDateRange && (
          <View style={styles.dateRangeBar}>
            <View style={styles.dateIconContainer}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.PRIMARY.MAIN} />
            </View>
            <Text style={styles.dateRangeText}>
              Available: {formatDateRange()}
            </Text>
          </View>
        )}
        
        {/* Results */}
        {loading && results.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            renderItem={renderListingItem}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContainer}
            ListHeaderComponent={renderHeader}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={!loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="search-outline" size={48} color={COLORS.TEXT.SECONDARY} />
                </View>
                <Text style={styles.emptyTitle}>No listings found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search criteria or filters</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={performSearch}
                >
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          />
        )}
        
        {/* Location Modal */}
        <LocationModal />
        
        {/* Filter Modal */}
        <Modal
          visible={showFilterModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Search Filters</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.TEXT.PRIMARY} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.filterContent}>
                {/* Price Range */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Price Range</Text>
                  <View style={styles.priceInputContainer}>
                    <View style={styles.priceInput}>
                      <Text style={styles.priceLabel}>Min</Text>
                      <TextInput
                        style={styles.priceInputField}
                        placeholder="0"
                        value={priceMin}
                        onChangeText={setPriceMin}
                        keyboardType="numeric"
                      />
                    </View>
                    <Text style={styles.priceSeparator}>-</Text>
                    <View style={styles.priceInput}>
                      <Text style={styles.priceLabel}>Max</Text>
                      <TextInput
                        style={styles.priceInputField}
                        placeholder="1000"
                        value={priceMax}
                        onChangeText={setPriceMax}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>



                {/* Active Only Toggle */}
                <View style={styles.filterSection}>
                  <View style={styles.toggleContainer}>
                    <Text style={styles.filterSectionTitle}>Show Active Listings Only</Text>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        showActiveOnly && styles.toggleButtonActive
                      ]}
                      onPress={() => setShowActiveOnly(!showActiveOnly)}
                    >
                      <View style={[
                        styles.toggleThumb,
                        showActiveOnly && styles.toggleThumbActive
                      ]} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Nearby Search Button */}
                <View style={styles.filterSection}>
                  <TouchableOpacity
                    style={styles.nearbyButton}
                    onPress={() => {
                      setShowFilterModal(false);
                      performNearbySearch();
                    }}
                  >
                    <Ionicons name="location" size={20} color={COLORS.NEUTRAL.WHITE} />
                    <Text style={styles.nearbyButtonText}>Search Nearby</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Apply Filters Button */}
              <View style={styles.filterActions}>
                                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setPriceMin('');
                      setPriceMax('');
                      setShowActiveOnly(true);
                    }}
                  >
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => {
                    setShowFilterModal(false);
                    performSearch();
                  }}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: SPACING.SM,
    marginRight: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY.LIGHT,
    shadowColor: COLORS.PRIMARY.MAIN,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  filterButton: {
    padding: SPACING.SM,
    marginLeft: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  locationIconContainer: {
    marginRight: SPACING.SM,
    padding: SPACING.SM,
    borderRadius: SPACING.MD,
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  locationText: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  dateRangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  dateIconContainer: {
    marginRight: SPACING.SM,
    padding: SPACING.SM,
    borderRadius: SPACING.MD,
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  dateRangeText: {
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  headerSection: {
    paddingHorizontal: SPACING.MD,
  },
  recentSection: {
    marginTop: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  recentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.SM,
  },
  recentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.CARD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.LG,
    marginRight: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  recentTagText: {
    marginLeft: SPACING.XS,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  resultCount: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  gridContainer: {
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.XL,
    paddingTop: SPACING.SM,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  // Removed categoryCard, categoryIconWrapper, categoryIcon, categoryName, categoryCount
  // as they are now handled by ListingCard
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
  emptyTitle: {
    fontSize: FONT_SIZES.XL,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.LG,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: BORDER_RADIUS.MD,
    shadowColor: COLORS.PRIMARY.MAIN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  retryButtonText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopLeftRadius: BORDER_RADIUS.XL,
    borderTopRightRadius: BORDER_RADIUS.XL,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  modalTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  locationSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.MD,
    padding: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  locationSearchInput: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  locationList: {
    maxHeight: 400,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  locationItemText: {
    marginLeft: SPACING.MD,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  // New styles for filter modal
  filterContent: {
    padding: SPACING.MD,
  },
  filterSection: {
    marginBottom: SPACING.MD,
  },
  filterSectionTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginRight: SPACING.XS,
  },
  priceInputField: {
    flex: 1,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
  },
  priceSeparator: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginHorizontal: SPACING.SM,
  },

  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.SM,
  },
  toggleButton: {
    width: 40,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    padding: SPACING.XS,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  toggleThumbActive: {
    transform: [{ translateX: 18 }], // Move thumb to the right
  },
  nearbyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING.MD,
  },
  nearbyButtonText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    marginLeft: SPACING.SM,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
  },
  clearButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  clearButtonText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  applyButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
  },
  applyButtonText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
});

export default SearchResultsScreen;
