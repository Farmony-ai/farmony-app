import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Platform,
  Dimensions,
  StatusBar,
  Modal,
  RefreshControl,
  FlatList
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, fuzzyMatch } from '../../utils';
import { FONTS, typography, spacing, scaleFontSize, scaleSize } from '../../utils/fonts';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LocationService from '../../services/locationService';
import CatalogueService, { Category, SubCategory } from '../../services/CatalogueService';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setLocation } from '../../store/slices/locationSlice';
import { setDateRange } from '../../store/slices/dateRangeSlice';
import AddressService, { Address } from '../../services/AddressService';
import DateRangeCalendar from '../../components/DateRangeCalendar';
import ClimateService, { WeatherData } from '../../services/ClimateService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Color scheme matching the new design
const COLORS_NEW = {
  background: '#FFFFFF',
  surface: '#F5F5F5',
  cardBg: '#F8F8F8',
  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    muted: '#999999',
  },
  accent: '#4CAF50', // Green accent for CTAs
  border: '#E5E5E5',
  divider: '#F0F0F0',
};

// Import icons
const tractorIcon = require('../../assets/Icons/Categories/tractor.png');
const harvesterIcon = require('../../assets/Icons/Categories/harvester.png');
const seedIcon = require('../../assets/Icons/Categories/seed.png');
const dripIcon = require('../../assets/Icons/Categories/drip.png');
const ploughIcon = require('../../assets/Icons/Categories/plough.png');
const sprayerIcon = require('../../assets/Icons/Categories/sprayer.png');
const pumpIcon = require('../../assets/Icons/Categories/pump.png');
const mechanicalIcon = require('../../assets/mechanical.png');

type CategoryHierarchyEntry = {
  category: Category;
  subCategories?: SubCategory[];
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryHierarchy, setCategoryHierarchy] = useState<CategoryHierarchyEntry[]>([]);
  const [catalogueLoaded, setCatalogueLoaded] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const { latitude, longitude, city } = useSelector((state: RootState) => state.location);
  const { startDate, endDate } = useSelector((state: RootState) => state.date);

  // Popular services data - updated to match exact mockup
  const popularServices = [
    { id: 'tractor', name: 'Tractor', subtitle: 'Rental', icon: tractorIcon },
    { id: 'ploughing', name: 'Ploughing', subtitle: 'Rental', icon: ploughIcon },
    { id: 'harvester', name: 'Harvester', subtitle: 'Service', icon: harvesterIcon },
    { id: 'sprayer', name: 'Sprayer', subtitle: 'Rental', icon: sprayerIcon },
    { id: 'irrigation', name: 'Irrigation', subtitle: 'Rental', icon: dripIcon },
    { id: 'water-pump', name: 'Waterpump', subtitle: 'Rental', icon: pumpIcon },
    { id: 'seed-drill', name: 'Seed drill', subtitle: 'Rental', icon: seedIcon },
    { id: 'view-more', name: 'View More', subtitle: '', icon: null, isViewMore: true },
  ];

  // TODO: Re-enable Book Again mock data once the API integration is ready.
  /*
  const previousBookings = [
    {
      id: '1',
      service: 'Sprayer',
      location: 'North Plot • Medchal',
      provider: 'Ravi , Kiran K',
      time: '2 hrs ago',
      price: '₹ 300/hr/worker',
      icon: sprayerIcon
    },
    {
      id: '2',
      service: 'Tractor Rental',
      location: 'North Plot • Medchal',
      provider: 'Shoban Babu',
      time: '1 Week ago',
      price: '₹ 800/hr',
      icon: tractorIcon
    }
  ];
  */

  // Initialize selectedDate from Redux if available
  useEffect(() => {
    if (startDate) {
      const initialSelected = new Date(startDate);
      setSelectedDate(initialSelected);
      if (endDate && endDate === startDate) {
        setCustomDate(startDate);
      }
    }
  }, [startDate]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Fetch weather data
  const fetchWeatherData = async () => {
    if (latitude && longitude) {
      setWeatherLoading(true);
      try {
        const data = await ClimateService.getWeatherData(latitude, longitude);
        setWeatherData(data);
      } catch (error) {
        // Silently handle weather fetch errors
      } finally {
        setWeatherLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, [latitude, longitude]);

  // Fetch location
  useEffect(() => {
    const fetchLocation = async () => {
      const locationData = await LocationService.getCurrentLocation();
      if (locationData) {
        dispatch(setLocation({ 
          latitude: locationData.latitude, 
          longitude: locationData.longitude, 
          city: locationData.city 
        }));
      }
    };
    fetchLocation();
  }, [dispatch]);

  // Fetch categories
  const fetchCatalogueData = async () => {
    try {
      const fetchedCategories = await CatalogueService.getCategories();
      let fetchedHierarchy: CategoryHierarchyEntry[] = [];

      try {
        fetchedHierarchy = await CatalogueService.getCategoryHierarchy();
      } catch (hierarchyError) {
        // Silently handle hierarchy fetch errors
      }

      setCategories(fetchedCategories);
      setCategoryHierarchy(fetchedHierarchy);
      setCatalogueLoaded(fetchedCategories.length > 0);
    } catch (error) {
      setCatalogueLoaded(false);
    }
  };

  useEffect(() => {
    fetchCatalogueData();
  }, []);

  // Fetch default address
  const fetchDefaultAddress = async () => {
    if (user?.id) {
      try {
        const addresses = await AddressService.getUserAddresses(user.id);

        // Handle case where user has no addresses yet
        if (!addresses || addresses.length === 0) {
          setCurrentAddress(null);
          return;
        }

        const defaultAddr = addresses.find(addr => addr.isDefault);
        if (defaultAddr && defaultAddr.coordinates && defaultAddr.coordinates.length === 2) {
          setCurrentAddress(defaultAddr);
          dispatch(setLocation({
            latitude: defaultAddr.coordinates[1],
            longitude: defaultAddr.coordinates[0],
            city: defaultAddr.district || defaultAddr.state || city || undefined,
          }));
        } else if (addresses.length > 0) {
          // If no default address, use the first one with valid coordinates
          const firstAddrWithCoords = addresses.find(addr =>
            addr.coordinates &&
            addr.coordinates.length === 2 &&
            addr.coordinates[0] !== 0 &&
            addr.coordinates[1] !== 0
          );

          if (firstAddrWithCoords) {
            setCurrentAddress(firstAddrWithCoords);
            dispatch(setLocation({
              latitude: firstAddrWithCoords.coordinates[1],
              longitude: firstAddrWithCoords.coordinates[0],
              city: firstAddrWithCoords.district || firstAddrWithCoords.state || city || undefined,
            }));
          } else {
            setCurrentAddress(null);
          }
        }
      } catch (error: any) {
        // Silently fall back to location-based detection
        setCurrentAddress(null);
      }
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchDefaultAddress();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchDefaultAddress();
      }
    }, [user])
  );

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCatalogueData(),
        fetchWeatherData(),
        fetchDefaultAddress()
      ]);
    } catch (error) {
      // Silently handle refresh errors
    } finally {
      setRefreshing(false);
    }
  };

  const getAddressDisplay = () => {
    if (currentAddress) {
      return currentAddress.district || currentAddress.state || city;
    }
    return city || 'Add location';
  };

  const findCatalogueMatch = (query: string) => {
    if (!query || !Array.isArray(categoryHierarchy) || categoryHierarchy.length === 0) {
      return null;
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return null;
    }

    let bestMatch: { categoryId: string | null; subCategoryId: string | null; score: number } | null = null;

    for (const entry of categoryHierarchy) {
      if (!entry) continue;

      const categoryName = entry.category?.name || '';

      // Check subcategories first (higher priority)
      if (Array.isArray(entry.subCategories)) {
        for (const sub of entry.subCategories) {
          const subName = sub?.name || '';
          if (fuzzyMatch(trimmedQuery, subName)) {
            const match = {
              categoryId: entry.category?._id || null,
              subCategoryId: sub._id || null,
              score: 1.0, // Subcategory matches have higher priority
            };

            // Return immediately for subcategory match
            return match;
          }
        }
      }

      // Check category name if no subcategory matched
      if (!bestMatch && fuzzyMatch(trimmedQuery, categoryName)) {
        bestMatch = {
          categoryId: entry.category?._id || null,
          subCategoryId: null,
          score: 0.5, // Category matches have lower priority
        };
      }
    }

    return bestMatch ? { categoryId: bestMatch.categoryId, subCategoryId: bestMatch.subCategoryId } : null;
  };

  const buildCatalogueParams = (overrides: Record<string, any> = {}) => {
    const params: Record<string, any> = {
      selectedDate: selectedDate.toISOString(),
      ...overrides,
    };

    if (catalogueLoaded && categories.length > 0) {
      params.prefetchedCategories = categories;
    }
    if (catalogueLoaded && categoryHierarchy.length > 0) {
      params.prefetchedHierarchy = categoryHierarchy;
    }

    return params;
  };

  const handleServicePress = (serviceName: string) => {
    const match = findCatalogueMatch(serviceName);

    navigation.navigate('CategoryBrowser', buildCatalogueParams({
      initialSearchQuery: serviceName,
      ...(match?.categoryId ? { selectedCategoryId: match.categoryId } : {}),
      ...(match?.subCategoryId ? { initialSubCategoryId: match.subCategoryId } : {}),
      ...(match?.categoryId ? { preselectCategoryName: serviceName } : {}),
    }));
  };

  const handleSearchSubmit = () => {
    const query = searchText.trim();
    const match = findCatalogueMatch(query);

    navigation.navigate('CategoryBrowser', buildCatalogueParams({
      initialSearchQuery: query,
      ...(match?.categoryId ? { selectedCategoryId: match.categoryId } : {}),
      ...(match?.subCategoryId ? { initialSubCategoryId: match.subCategoryId } : {}),
    }));
  };

  // const handleBookAgain = (booking: any) => {
  //   navigation.navigate('SearchResults', {
  //     searchQuery: booking.service.toLowerCase(),
  //     dateRange: { startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() },
  //   });
  // };

  const renderService = ({ item }: { item: any }) => {
    // Special rendering for View More card
    if (item.isViewMore) {
      return (
        <TouchableOpacity 
          style={styles.serviceCard}
          onPress={() => navigation.navigate('CategoryBrowser', buildCatalogueParams())}
          activeOpacity={0.7}
        >
          <View style={styles.serviceCardContainer}>
            <View style={styles.viewMoreContent}>
              <Text style={styles.viewMoreText}>View{'\n'}More</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.serviceCard}
        onPress={() => handleServicePress(item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.serviceCardContainer}>
          <View style={styles.serviceIconWrapper}>
            <Image source={item.icon} style={styles.serviceIcon} />
          </View>
          <Text style={styles.serviceName}>{item.name}</Text>
          <Text style={styles.serviceSubtitle}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS_NEW.background} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_NEW.background} />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.locationContainer}
          onPress={() => navigation.navigate('AddressSelection')}
          activeOpacity={0.7}
        >
          <Text style={styles.locationLabel}>Current location</Text>
          <View style={styles.locationRow}>
            <Text style={styles.locationText}>{getAddressDisplay()}</Text>
            <Ionicons name="chevron-down" size={scaleSize(18)} color={COLORS_NEW.text.primary} />
          </View>
        </TouchableOpacity>

        {/* Weather Indicator */}
        {weatherData ? (
          <TouchableOpacity style={styles.weatherButton} activeOpacity={0.7}>
            <Ionicons 
              name={ClimateService.getWeatherIcon(weatherData.icon)} 
              size={scaleSize(20)} 
              color={COLORS_NEW.text.primary} 
            />
            <Text style={styles.weatherTemp}>{Math.round(weatherData.temperature)}°</Text>
          </TouchableOpacity>
        ) : weatherLoading ? (
          <View style={styles.weatherButton}>
            <Ionicons 
              name="cloudy-outline" 
              size={scaleSize(20)} 
              color={COLORS_NEW.text.muted} 
            />
          </View>
        ) : (
          <TouchableOpacity style={styles.weatherButton} activeOpacity={0.7}>
            <Ionicons 
              name="partly-sunny-outline" 
              size={scaleSize(20)} 
              color={COLORS_NEW.text.muted} 
            />
            <Text style={styles.weatherTemp}>--°</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS_NEW.accent]}
            tintColor={COLORS_NEW.accent}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={scaleSize(20)} color={COLORS_NEW.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={COLORS_NEW.text.muted}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit}
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={scaleSize(18)} color={COLORS_NEW.text.muted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSearchSubmit} activeOpacity={0.7}>
            <Ionicons name="arrow-forward" size={scaleSize(18)} color={COLORS_NEW.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Date Selection */}
        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>When do you need it ?</Text>
          <View style={styles.dateButtons}>
            {customDate && (() => {
              // Check if customDate is NOT today or tomorrow
              const today = new Date();
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const customDateObj = new Date(customDate);

              const isTodayOrTomorrow =
                customDateObj.toDateString() === today.toDateString() ||
                customDateObj.toDateString() === tomorrow.toDateString();

              // Only show custom date pill if it's not today or tomorrow
              if (isTodayOrTomorrow) {
                return null;
              }

              const isSelected = selectedDate.toISOString().split('T')[0] === customDate;
              return (
                <TouchableOpacity
                  style={[styles.dateButton, isSelected && styles.dateButtonActive]}
                  onPress={() => {
                    const selected = new Date(customDate);
                    setSelectedDate(selected);
                    dispatch(setDateRange({ startDate: customDate, endDate: customDate }));
                  }}
                >
                  <Text style={[styles.dateButtonText, isSelected && styles.dateButtonTextActive]}>
                    {new Date(customDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </TouchableOpacity>
              );
            })()}
            <TouchableOpacity
              style={[styles.dateButton,
                selectedDate.toDateString() === new Date().toDateString() && styles.dateButtonActive]}
              onPress={() => {
                const today = new Date();
                setSelectedDate(today);
                const dateString = today.toISOString().split('T')[0];
                dispatch(setDateRange({ startDate: dateString, endDate: dateString }));
                setCustomDate(null);
              }}
            >
              <Text style={[styles.dateButtonText,
                selectedDate.toDateString() === new Date().toDateString() && styles.dateButtonTextActive]}>
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dateButton,
                (() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return selectedDate.toDateString() === tomorrow.toDateString();
                })() && styles.dateButtonActive]}
              onPress={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow);
                const dateString = tomorrow.toISOString().split('T')[0];
                dispatch(setDateRange({ startDate: dateString, endDate: dateString }));
                setCustomDate(null);
              }}
            >
              <Text style={[styles.dateButtonText,
                (() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return selectedDate.toDateString() === tomorrow.toDateString();
                })() && styles.dateButtonTextActive]}>
                Tomorrow
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePickerText}>Pick date</Text>
              <Ionicons name="chevron-down" size={scaleSize(16)} color={COLORS_NEW.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Popular Services */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Popular Services</Text>
          
          <FlatList
            data={popularServices}
            renderItem={renderService}
            keyExtractor={(item) => item.id}
            numColumns={4}
            scrollEnabled={false}
            columnWrapperStyle={styles.serviceRow}
            contentContainerStyle={styles.servicesGrid}
          />
        </View>

        {/* Book Again Section - temporarily removed until API integration */}
        {/*
        <View style={styles.bookAgainSection}>
          <Text style={styles.sectionTitle}>Book again</Text>
          {previousBookings.map((booking) => (
            <TouchableOpacity 
              key={booking.id}
              style={styles.bookingCard}
              onPress={() => handleBookAgain(booking)}
              activeOpacity={0.7}
            >
              <Image source={booking.icon} style={styles.bookingIcon} />
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingService}>{booking.service}</Text>
                <Text style={styles.bookingLocation}>{booking.location}</Text>
                <Text style={styles.bookingProvider}>{booking.provider}</Text>
                <Text style={styles.bookingTime}>{booking.time}</Text>
              </View>
              <View style={styles.bookingPriceContainer}>
                <Text style={styles.bookingPrice}>{booking.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        */}

        <View style={{ height: scaleSize(100) }} />
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={scaleSize(24)} color={COLORS_NEW.text.primary} />
              </TouchableOpacity>
            </View>
            <DateRangeCalendar
              onConfirm={(start, end) => {
                dispatch(setDateRange({ startDate: start, endDate: end }));
                setCustomDate(start === end ? start : null);
                setSelectedDate(new Date(start));
                setShowDatePicker(false);
              }}
              initialStartDate={startDate ?? undefined}
              initialEndDate={endDate ?? undefined}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: COLORS_NEW.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? scaleSize(10) : scaleSize(20),
    paddingBottom: spacing.sm,
    backgroundColor: COLORS_NEW.background,
  },
  locationContainer: {
    flex: 1,
  },
  locationLabel: {
    ...typography.locationSubtext,
    color: COLORS_NEW.text.muted,
    marginBottom: scaleSize(4),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(4),
  },
  locationText: {
    ...typography.locationText,
    color: COLORS_NEW.text.primary,
  },
  weatherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSize(12),
    paddingVertical: scaleSize(8),
    gap: scaleSize(4),
  },
  weatherTemp: {
    ...typography.weatherTemp,
    color: COLORS_NEW.text.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_NEW.surface,
    borderRadius: scaleSize(12),
    paddingHorizontal: spacing.md,
    paddingVertical: scaleSize(10),
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    gap: scaleSize(8),
  },
  searchInput: {
    flex: 1,
    ...typography.searchPlaceholder,
    color: COLORS_NEW.text.primary,
  },
  dateSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    marginTop: scaleSize(8),
  },
  dateLabel: {
    ...typography.ctaTitle,
    fontSize: scaleFontSize(14),
    color: COLORS_NEW.text.primary,
    marginBottom: scaleSize(10),
  },
  dateButtons: {
    flexDirection: 'row',
    gap: scaleSize(8),
  },
  dateButton: {
    paddingHorizontal: scaleSize(15),
    paddingVertical: scaleSize(8),
    borderRadius: scaleSize(8),
    borderWidth: 1,
    borderColor: COLORS_NEW.border,
    backgroundColor: COLORS_NEW.background,
  },
  dateButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: COLORS_NEW.accent,
  },
  dateButtonText: {
    ...typography.ctaButtonText,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_NEW.text.secondary,
  },
  dateButtonTextActive: {
    color: COLORS_NEW.accent,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSize(20),
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(8),
    borderWidth: 1,
    borderColor: COLORS_NEW.border,
    gap: scaleSize(6),
  },
  datePickerText: {
    ...typography.ctaButtonText,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_NEW.text.secondary,
  },
  servicesSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: COLORS_NEW.text.primary,
    marginBottom: scaleSize(15),
  },
  servicesGrid: {
    paddingBottom: scaleSize(4),
  },
  serviceRow: {
    justifyContent: 'space-between',
    marginBottom: scaleSize(16),
  },
  serviceCard: {
    width: (screenWidth - 2 * spacing.md - scaleSize(30)) / 4,
  },
  serviceCardContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: scaleSize(8),
    paddingVertical: scaleSize(12),
    paddingHorizontal: scaleSize(4),
    alignItems: 'center',
    height: scaleSize(110), // Fixed height instead of minHeight
    justifyContent: 'center',
  },
  serviceIconWrapper: {
    width: scaleSize(64),
    height: scaleSize(64),
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceIcon: {
    width: scaleSize(58),
    height: scaleSize(58),
    resizeMode: 'contain',
  },
  serviceName: {
    ...typography.serviceName,
    color: COLORS_NEW.text.primary,
    textAlign: 'center',
    marginBottom: scaleSize(2),
  },
  serviceSubtitle: {
    ...typography.serviceDesc,
    fontSize: scaleFontSize(10),
    color: '#999999',
    textAlign: 'center',
  },
  viewMoreContent: {
    width: scaleSize(48),
    height: scaleSize(48),
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMoreText: {
    ...typography.categoryPillText,
    color: COLORS_NEW.text.primary,
    textAlign: 'center',
    lineHeight: scaleSize(20),
  },
  bookAgainSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_NEW.background,
    paddingVertical: scaleSize(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS_NEW.divider,
  },
  bookingIcon: {
    width: scaleSize(64),
    height: scaleSize(64),
    borderRadius: scaleSize(8),
    marginRight: scaleSize(12),
  },
  bookingInfo: {
    flex: 1,
  },
  bookingService: {
    ...typography.searchPlaceholder,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_NEW.text.primary,
    marginBottom: scaleSize(2),
  },
  bookingLocation: {
    ...typography.categoryPillText,
    color: COLORS_NEW.text.secondary,
    marginBottom: scaleSize(2),
  },
  bookingProvider: {
    ...typography.ctaButtonText,
    color: COLORS_NEW.text.primary,
    marginBottom: scaleSize(2),
  },
  bookingTime: {
    ...typography.serviceName,
    color: COLORS_NEW.text.muted,
  },
  bookingPriceContainer: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: scaleSize(10),
    paddingVertical: scaleSize(6),
    borderRadius: scaleSize(12),
  },
  bookingPrice: {
    ...typography.serviceName,
    color: COLORS_NEW.accent,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS_NEW.background,
    borderTopLeftRadius: scaleSize(20),
    borderTopRightRadius: scaleSize(20),
    paddingBottom: scaleSize(30),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scaleSize(20),
    borderBottomWidth: 1,
    borderBottomColor: COLORS_NEW.border,
  },
  modalTitle: {
    ...typography.modalTitle,
    color: COLORS_NEW.text.primary,
  },
});
