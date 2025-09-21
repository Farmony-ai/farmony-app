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
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils';
import { FONTS, typography, spacing, scaleFontSize, scaleSize } from '../utils/fonts';
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
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

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
const tractorIcon = require('../assets/Icons/Categories/tractor.png');
const harvesterIcon = require('../assets/Icons/Categories/harvester.png');
const seedIcon = require('../assets/Icons/Categories/seed.png');
const dripIcon = require('../assets/Icons/Categories/drip.png');
const ploughIcon = require('../assets/Icons/Categories/plough.png');
const sprayerIcon = require('../assets/Icons/Categories/sprayer.png');
const pumpIcon = require('../assets/Icons/Categories/pump.png');
const mechanicalIcon = require('../assets/mechanical.png');

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [searchText, setSearchText] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  
  const { latitude, longitude, city } = useSelector((state: RootState) => state.location);
  const { startDate, endDate } = useSelector((state: RootState) => state.date);

  const [mapRegion, setMapRegion] = useState({
    latitude: latitude || 17.385044,  // Default coordinates (Hyderabad)
    longitude: longitude || 78.486671,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  // Add a ref for the MapView
  const mapRef = useRef<MapView>(null);


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

  // Mock data for "Book again" section
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

  // Initialize selectedDate from Redux if available
  useEffect(() => {
    if (startDate) {
      setSelectedDate(new Date(startDate));
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
        console.error('Error fetching weather data:', error);
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

  useEffect(() => {
    if (latitude && longitude) {
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      setMapRegion(newRegion);
      
      // Animate to the new location
      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 500); // 500ms animation
      }
    }
  }, [latitude, longitude]);

  // Fetch categories
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

  // Fetch default address
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

  const getAddressDisplay = () => {
    if (currentAddress) {
      return currentAddress.district || currentAddress.state || city;
    }
    return city || 'Add location';
  };

  const handleServicePress = (serviceName: string) => {
    navigation.navigate('SearchResults', {
      searchQuery: serviceName.toLowerCase(),
      dateRange: { startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() },
    });
  };

  const handleBookAgain = (booking: any) => {
    navigation.navigate('SearchResults', {
      searchQuery: booking.service.toLowerCase(),
      dateRange: { startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() },
    });
  };

  const renderService = ({ item }: { item: any }) => {
    // Special rendering for View More card
    if (item.isViewMore) {
      return (
        <TouchableOpacity 
          style={styles.serviceCard}
          onPress={() => navigation.navigate('CategoryBrowser')}
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
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => navigation.navigate('SearchResults', {
            searchQuery: searchText,
            dateRange: { startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() },
          })}
          activeOpacity={0.9}
        >
          <Ionicons name="search-outline" size={scaleSize(20)} color={COLORS_NEW.text.muted} />
          <Text style={styles.searchPlaceholder}>Search For Services</Text>
        </TouchableOpacity>

        {/* Date Selection */}
        <View style={styles.dateSection}>
          <Text style={styles.dateLabel}>When do you need it ?</Text>
          <View style={styles.dateButtons}>
            <TouchableOpacity 
              style={[styles.dateButton, 
                selectedDate.toDateString() === new Date().toDateString() && styles.dateButtonActive]}
              onPress={() => {
                const today = new Date();
                setSelectedDate(today);
                const dateString = today.toISOString().split('T')[0];
                dispatch(setDateRange({ startDate: dateString, endDate: dateString }));
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

         {/* Map View */}
        <View style={styles.mapSection}>
          <TouchableOpacity 
            style={styles.mapContainer} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('MapView', {
              latitude: latitude ,
              longitude: longitude ,
            })}
          >
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              region={mapRegion}  // Changed from initialRegion to region
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {latitude && longitude && (
                <Marker
                  coordinate={{ latitude, longitude }}
                  title="Your Location"
                />
              )}
            </MapView>
            {/* Grey overlay */}
            <View style={styles.mapGreyOverlay} />
            {/* Centered View map button */}
            <View style={styles.mapCenterOverlay}>
              <View style={styles.mapTextContainer}>
                <Text style={styles.mapText}>View map</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Book Again Section */}
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

        {/* Urgent Help CTA */}
        <View style={styles.ctaContainer}>
          <View style={styles.ctaCard}>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaTitle}>Need Urgent Help ?</Text>
              <Text style={styles.ctaSubtext}>
                Request a custom service from{'\n'}one of our provider
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.ctaButton}
              onPress={() => navigation.navigate('SearchResults', { 
                urgent: true,
                dateRange: { startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() },
              })}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Request now</Text>
            </TouchableOpacity>
          </View>
        </View>

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
    paddingVertical: scaleSize(14),
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchPlaceholder: {
    ...typography.searchPlaceholder,
    flex: 1,
    marginLeft: scaleSize(10),
    color: COLORS_NEW.text.muted,
  },
  dateSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  dateLabel: {
    ...typography.ctaTitle,
    color: COLORS_NEW.text.primary,
    marginBottom: scaleSize(12),
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
  mapSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  mapContainer: {
    height: scaleSize(150),
    borderRadius: scaleSize(12),
    overflow: 'hidden',
    backgroundColor: COLORS_NEW.surface,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: scaleSize(12),
    alignSelf: 'center',
    backgroundColor: COLORS_NEW.background,
    paddingHorizontal: scaleSize(20),
    paddingVertical: scaleSize(8),
    borderRadius: scaleSize(20),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  ctaContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  ctaCard: {
    backgroundColor: '#F3F0FF',
    borderRadius: scaleSize(12),
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    ...typography.ctaTitle,
    color: COLORS_NEW.text.primary,
    marginBottom: scaleSize(6),
  },
  ctaSubtext: {
    ...typography.ctaSubtext,
    color: COLORS_NEW.text.secondary,
    lineHeight: scaleSize(18),
  },
  ctaButton: {
    backgroundColor: COLORS_NEW.accent,
    paddingHorizontal: scaleSize(18),
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(8),
  },
  ctaButtonText: {
    ...typography.ctaButtonText,
    color: 'white',
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
   mapGreyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)', // Semi-transparent grey overlay
  },
  mapCenterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapTextContainer: {
    backgroundColor: COLORS_NEW.background,
    paddingHorizontal: scaleSize(24),
    paddingVertical: scaleSize(10),
    borderRadius: scaleSize(20),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  mapText: {
    ...typography.ctaButtonText,
    color: COLORS_NEW.text.primary,
  },
});