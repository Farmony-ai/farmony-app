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
  RefreshControl
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils';
// Import the new responsive font utilities
import { FONTS, typography, spacing } from '../utils/fonts';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LocationService from '../services/locationService';
import CatalogueService, { Category } from '../services/CatalogueService';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setLocation } from '../store/slices/locationSlice';
import { setDateRange } from '../store/slices/dateRangeSlice';
import AddressService, { Address } from '../services/AddressService';
import DateRangeCalendar from '../components/DateRangeCalendar';
import ClimateService, { WeatherData } from '../services/ClimateService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Ultra-minimal color scheme
const COLORS_MINIMAL = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: {
    primary: '#000000',
    secondary: '#4A5568',
    muted: '#A0AEC0',
  },
  accent: '#10B981', // Emerald green for CTAs
  border: '#E2E8F0',
  divider: '#F1F5F9',
};

const tractorIcon = require('../assets/Icons/Categories/tractor.png');
const harvesterIcon = require('../assets/Icons/Categories/harvester.png');
const seedIcon = require('../assets/Icons/Categories/seed.png');
const dripIcon = require('../assets/Icons/Categories/drip.png');
const ploughIcon = require('../assets/Icons/Categories/plough.png');
const mechanicalIcon = require('../assets/mechanical.png');

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const { latitude, longitude, city } = useSelector((state: RootState) => state.location);
  const { startDate, endDate } = useSelector((state: RootState) => state.date);

  const services = [
    { id: 'tractor', name: 'Tractor', subtitle: 'Rental', icon: tractorIcon },
    { id: 'harvester', name: 'Harvester', subtitle: 'Rental', icon: harvesterIcon },
    { id: 'ploughing', name: 'Ploughing', subtitle: 'Service', icon: ploughIcon },
    { id: 'seed-sowing', name: 'Seed Sowing', subtitle: 'Service', icon: seedIcon },
    { id: 'irrigation', name: 'Irrigation', subtitle: 'Systems', icon: dripIcon },
  ];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

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

  const fetchCategories = async () => {
    try {
      const fetchedCategories = await CatalogueService.getCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchWeatherData = async () => {
    if (latitude && longitude) {
      setWeatherLoading(true);
      try {
        const data = await ClimateService.getWeatherData(latitude, longitude);
        setWeatherData(data);
      } catch (error) {
        console.error('Error fetching weather data:', error);
      } finally {
        setWeatherLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchWeatherData();
  }, [latitude, longitude]);

  const fetchDefaultAddress = async () => {
    if (user?.id) {
      try {
        const addresses = await AddressService.getUserAddresses(user.id);
        const defaultAddr = addresses.find(addr => addr.isDefault);
        if (defaultAddr) {
          setCurrentAddress(defaultAddr);
          dispatch(setLocation({
            latitude: defaultAddr.coordinates[1],
            longitude: defaultAddr.coordinates[0],
            city: defaultAddr.district || defaultAddr.state,
          }));
        }
      } catch (error) {
        console.error('Error fetching default address:', error);
      }
    }
  };

  // Initial load
  useEffect(() => {
    if (user?.id) {
      fetchDefaultAddress();
    }
  }, [user]);

  // Refresh address when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchDefaultAddress();
      }
    }, [user])
  );

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh all data
      await Promise.all([
        fetchCategories(),
        fetchWeatherData(),
        fetchDefaultAddress()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getDayLabel = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (compareDate.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Set both start and end date to the same day for single-day selection
    const dateString = date.toISOString().split('T')[0];
    dispatch(setDateRange({ 
      startDate: dateString, 
      endDate: dateString 
    }));
  };

  const handleDateRangeConfirm = (start: string, end: string) => {
    dispatch(setDateRange({ startDate: start, endDate: end }));
    
    // Update selectedDate to the start date
    const newSelectedDate = new Date(start);
    setSelectedDate(newSelectedDate);
    
    setShowCalendarModal(false);
  };

  const handleServicePress = (serviceName: string) => {
    // Navigate to search results with the service query
    navigation.navigate('SearchResults', {
      searchQuery: serviceName.toLowerCase(),
      dateRange: { startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() },
    });
  };

  const handleSearchPress = () => {
    navigation.navigate('SearchResults', {
      searchQuery: searchText,
      dateRange: { startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() },
    });
  };

  const handleCategoryPress = (categoryId: string) => {
    navigation.navigate('CategoryBrowser', { 
      selectedCategoryId: categoryId 
    });
  };

  // Format address display
  const getAddressDisplay = () => {
    if (currentAddress) {
      const tag = currentAddress.tag.charAt(0).toUpperCase() + currentAddress.tag.slice(1);
      const location = currentAddress.district || currentAddress.state || city;
      return `${tag} • ${location}`;
    }
    return city || 'Add location';
  };

  // Generate dates for picker
  const dates = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS_MINIMAL.accent]}
            tintColor={COLORS_MINIMAL.accent}
            progressBackgroundColor={COLORS_MINIMAL.surface}
          />
        }
      >
        {/* Minimal Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.locationContainer}
              onPress={() => navigation.navigate('AddressSelection')}
              activeOpacity={0.7}
            >
              <Text style={styles.locationSubtext}>Current Location</Text>
              <View style={styles.locationMain}>
                <Text style={styles.locationText} numberOfLines={1}>
                  {getAddressDisplay()}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS_MINIMAL.text.primary} />
              </View>
            </TouchableOpacity>

            {/* Weather Indicator */}
            {weatherData ? (
              <View style={styles.weatherContainer}>
                <Ionicons 
                  name={ClimateService.getWeatherIcon(weatherData.icon)} 
                  size={20} 
                  color={COLORS_MINIMAL.text.secondary} 
                />
                <Text style={styles.weatherTemp}>{Math.round(weatherData.temperature)}°</Text>
              </View>
            ) : weatherLoading ? (
              <View style={styles.weatherContainer}>
                <Ionicons 
                  name="cloudy-outline" 
                  size={20} 
                  color={COLORS_MINIMAL.text.muted} 
                />
              </View>
            ) : (
              <View style={styles.weatherContainer}>
                <Ionicons 
                  name="partly-sunny-outline" 
                  size={20} 
                  color={COLORS_MINIMAL.text.muted} 
                />
                <Text style={styles.weatherTemp}>--°</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Date Selection Section */}
        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>When do you need service?</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateScrollContent}
          >
            {dates.map((date, index) => {
              const isSelected = selectedDate.toDateString() === date.toDateString();
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dateButton,
                    isSelected && styles.selectedDateButton,
                  ]}
                  onPress={() => handleDateSelect(date)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dayText, 
                    isSelected && styles.selectedDayText
                  ]}>
                    {getDayLabel(date)}
                  </Text>
                  <Text style={[
                    styles.dateText, 
                    isSelected && styles.selectedDateText
                  ]}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity 
              style={styles.moreDatesButton} 
              onPress={() => setShowCalendarModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={16} color={COLORS_MINIMAL.text.secondary} />
              <Text style={styles.moreDatesText}>More</Text>
            </TouchableOpacity>
          </ScrollView>
          <Text style={styles.selectedFullDate}>
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>

        {/* Search Bar */}
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={handleSearchPress}
          activeOpacity={0.9}
        >
          <Ionicons name="search" size={22} color={COLORS_MINIMAL.text.muted} />
          <Text style={styles.searchPlaceholder}>
            What service are you looking for?
          </Text>
        </TouchableOpacity>

        {/* Popular Services - Single Row Scrollable */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Popular Services</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.servicesScroll}
          >
            {services.map((service) => (
              <TouchableOpacity 
                key={service.id}
                style={styles.serviceItem}
                onPress={() => handleServicePress(service.name)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceIconContainer}>
                  <Image source={service.icon} style={styles.serviceIcon} />
                </View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDesc}>{service.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Primary CTA */}
        <View style={styles.ctaContainer}>
          <View style={styles.ctaCard}>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaTitle}>Need urgent help?</Text>
              <Text style={styles.ctaSubtext}>Find available services near you right now</Text>
            </View>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => navigation.navigate('SearchResults', { urgent: true })}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Find Now</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories List */}
        <View style={styles.categoriesSection}>
          <View style={styles.categoriesHeader}>
            <Text style={styles.sectionTitle}>All categories</Text>
            <TouchableOpacity onPress={() => navigation.navigate('CategoryBrowser')}>
              <Text style={styles.viewAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {categories.slice(0, 8).map((category) => (
              <TouchableOpacity
                key={category._id}
                style={styles.categoryPill}
                onPress={() => handleCategoryPress(category._id)}
                activeOpacity={0.7}
              >
                <Text style={styles.categoryPillText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Ionicons name="close" size={24} color={COLORS_MINIMAL.text.primary} />
              </TouchableOpacity>
            </View>
            <DateRangeCalendar
              onConfirm={handleDateRangeConfirm}
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
    backgroundColor: COLORS_MINIMAL.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flex: 1,
  },
  locationSubtext: {
    ...typography.locationSubtext,
    color: COLORS_MINIMAL.text.muted,
    marginBottom: 2,
  },
  locationMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    ...typography.locationText,
    color: COLORS_MINIMAL.text.primary,
    maxWidth: 250,
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: 6,
  },
  weatherTemp: {
    ...typography.weatherTemp,
    color: COLORS_MINIMAL.text.primary,
  },
  menuButton: {
    padding: 4,
  },
  dateSection: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  dateLabel: {
    ...typography.dateLabel,
    color: COLORS_MINIMAL.text.secondary,
    marginBottom: 10,
    paddingHorizontal: spacing.md,
  },
  dateScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dateButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS_MINIMAL.surface,
    alignItems: 'center',
    minWidth: 72,
  },
  selectedDateButton: {
    backgroundColor: COLORS_MINIMAL.text.primary,
  },
  dayText: {
    ...typography.dayText,
    color: COLORS_MINIMAL.text.secondary,
  },
  selectedDayText: {
    color: COLORS_MINIMAL.background,
  },
  dateText: {
    ...typography.dateText,
    color: COLORS_MINIMAL.text.muted,
    marginTop: 1,
  },
  selectedDateText: {
    color: COLORS_MINIMAL.background,
  },
  moreDatesButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: COLORS_MINIMAL.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    flexDirection: 'row',
    gap: 3,
  },
  moreDatesText: {
    ...typography.moreDatesText,
    color: COLORS_MINIMAL.text.secondary,
  },
  selectedFullDate: {
    ...typography.selectedFullDate,
    color: COLORS_MINIMAL.text.muted,
    marginTop: 6,
    paddingHorizontal: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchPlaceholder: {
    ...typography.searchPlaceholder,
    flex: 1,
    marginLeft: 10,
    color: COLORS_MINIMAL.text.muted,
  },
  servicesSection: {

  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 12,
    paddingHorizontal: spacing.md,
  },
  servicesScroll: {
    paddingHorizontal: spacing.md,
    gap: 12,
  },
  serviceItem: {
    alignItems: 'center',
    marginRight: 12,
  },
  serviceIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: COLORS_MINIMAL.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  serviceIcon: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  },
  serviceName: {
    ...typography.serviceName,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 2,
    textAlign: 'center',
  },
  serviceDesc: {
    ...typography.serviceDesc,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
  },
  ctaContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: 20,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 16,
    padding: spacing.md,
  },
  ctaContent: {
    flex: 1,
    marginRight: 12,
  },
  ctaTitle: {
    ...typography.ctaTitle,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 4,
  },
  ctaSubtext: {
    ...typography.ctaSubtext,
    color: COLORS_MINIMAL.text.secondary,
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: COLORS_MINIMAL.accent,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  ctaButtonText: {
    ...typography.ctaButtonText,
    color: 'white',
  },
  categoriesSection: {
    paddingLeft: spacing.md,
    paddingBottom: 20,
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: spacing.md,
    marginBottom: 12,
  },
  viewAllText: {
    ...typography.viewAllText,
    color: COLORS_MINIMAL.text.muted,
  },
  categoriesScroll: {
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  categoryPill: {
    backgroundColor: COLORS_MINIMAL.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  categoryPillText: {
    ...typography.categoryPillText,
    color: COLORS_MINIMAL.text.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS_MINIMAL.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_MINIMAL.border,
  },
  modalTitle: {
    ...typography.modalTitle,
    color: COLORS_MINIMAL.text.primary,
  },
});