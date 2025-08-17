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
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  
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

      // Apply selected filter chips
      if (selectedFilters.includes('under350')) {
        params.priceMax = 350;
      }
      if (selectedFilters.includes('verified')) {
        params.verifiedOnly = true;
      }
      if (selectedFilters.includes('discount')) {
        params.hasDiscount = true;
      }

      const fetchedListings = await ListingService.searchListings(params);
      setResults(fetchedListings);
    } catch (error: any) {
      console.error('Error performing search:', error);
      Alert.alert('Error', 'Failed to perform search. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, subCategoryId, latitude, longitude, radius, city, activeDateRange, priceMin, priceMax, showActiveOnly, selectedFilters]);

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
    
    // Perform initial search
    performSearch();
  }, [fadeAnim, slideAnim, performSearch]);

  const handleFilterPress = () => {
    setShowFilterModal(true);
  };

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
        distance: radius || 5,
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

  const renderListingItem = ({ item }: { item: Listing }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <SearchListingCard listing={item} />
    </Animated.View>
  );

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Filter Button */}
      <View style={styles.filterButtonContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={handleFilterPress}
        >
          <Ionicons name="options-outline" size={18} color={COLORS.TEXT.PRIMARY} />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Results Header with line */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>ALL SERVICES</Text>
        <View style={styles.headerLine} />
        {!loading && (
          <Text style={styles.resultsCount}>{results.length}</Text>
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
            <TextInput
              style={styles.searchInput}
              placeholder="Search for services & listings"
              placeholderTextColor={COLORS.TEXT.SECONDARY}
              value={search}
              onChangeText={setSearch}
              autoFocus={false}
              onSubmitEditing={performSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close" size={20} color={COLORS.TEXT.SECONDARY} />
              </TouchableOpacity>
            )}
          </View>
          

        </View>
        
        {/* Results */}
        {loading && results.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.loadingText}>Finding best services for you...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            renderItem={renderListingItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            ListHeaderComponent={renderHeader}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={!loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  Couldn't find any relevant matches for '{search}' in Services
                </Text>
                <TouchableOpacity
                  style={styles.searchAnywayButton}
                  onPress={performSearch}
                >
                  <Text style={styles.searchAnywayText}>Search anyway</Text>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.PRIMARY.MAIN} />
                </TouchableOpacity>
              </View>
            ) : null}
          />
        )}
        
        {/* Location Modal */}
        <LocationModal />
        
        {/* Enhanced Filter Modal */}
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
                <Text style={styles.modalTitle}>Filters</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.TEXT.PRIMARY} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.filterContent}>
                {/* Price Range */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Price Range</Text>
                  <View style={styles.priceInputContainer}>
                    <TextInput
                      style={styles.priceInputField}
                      placeholder="Min"
                      placeholderTextColor={COLORS.TEXT.SECONDARY}
                      value={priceMin}
                      onChangeText={setPriceMin}
                      keyboardType="numeric"
                    />
                    <View style={styles.priceSeparator} />
                    <TextInput
                      style={styles.priceInputField}
                      placeholder="Max"
                      placeholderTextColor={COLORS.TEXT.SECONDARY}
                      value={priceMax}
                      onChangeText={setPriceMax}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Quick Price Options */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Quick Select</Text>
                  <View style={styles.quickPriceOptions}>
                    {['Under ₹100', 'Under ₹250', 'Under ₹500', 'Under ₹1000'].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={styles.quickPriceChip}
                        onPress={() => {
                          const max = option.match(/\d+/)?.[0];
                          if (max) setPriceMax(max);
                        }}
                      >
                        <Text style={styles.quickPriceText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Active Only Toggle */}
                <View style={styles.filterSection}>
                  <View style={styles.toggleContainer}>
                    <View>
                      <Text style={styles.filterSectionTitle}>Active Listings Only</Text>
                      <Text style={styles.filterDescription}>Show only currently available services</Text>
                    </View>
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
              </ScrollView>

              {/* Apply Filters Button */}
              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setPriceMin('');
                    setPriceMax('');
                    setShowActiveOnly(true);
                    setSelectedFilters([]);
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
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: SPACING.XS,
    marginRight: SPACING.SM,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  headerContent: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingBottom: SPACING.SM,
  },
  filterButtonContainer: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 1.5,
    borderColor: COLORS.TEXT.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    gap: SPACING.XS,
    alignSelf: 'flex-start',
  },
  filterButtonText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.SM,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  resultsTitle: {
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
  resultsCount: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.MD,
  },
  listContainer: {
    paddingTop: SPACING.SM,
    paddingBottom: SPACING.XL,
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
    paddingVertical: SPACING['4XL'],
    paddingHorizontal: SPACING.LG,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  searchAnywayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  searchAnywayText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
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
    maxHeight: '80%',
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
  filterContent: {
    padding: SPACING.LG,
  },
  filterSection: {
    marginBottom: SPACING.LG,
  },
  filterSectionTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  filterDescription: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 2,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
  },
  priceInputField: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  priceSeparator: {
    width: 20,
    height: 1,
    backgroundColor: COLORS.BORDER.PRIMARY,
  },
  quickPriceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  quickPriceChip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.LG,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  quickPriceText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 22 }],
  },
  filterActions: {
    flexDirection: 'row',
    gap: SPACING.MD,
    padding: SPACING.LG,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
  },
  clearButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.MD,
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
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
  },
  applyButtonText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
});

export default SearchResultsScreen;