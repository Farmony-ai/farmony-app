import React, { useRef, useEffect, useState } from 'react';
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
  AppState
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import LocationService from '../services/locationService';
import ClimateService, { WeatherData } from '../services/ClimateService';

import SmartDatePicker from '../components/SmartDatePicker';
import ExpandableSearchFilter from '../components/ExpandableSearchFilter';
import CatalogueService from '../services/CatalogueService';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setDate } from '../store/slices/dateRangeSlice';
import { setLocation } from '../store/slices/locationSlice'; // Import setLocation action

import categoryIcons from '../utils/icons';

const { width: screenWidth } = Dimensions.get('window');

const tractorIcon = require('../assets/tractor.png');
const ploughingIcon = require('../assets/plough.png');
const seedSowingIcon = require('../assets/seed.png');
const dripIrrigationIcon = require('../assets/drip.png');
const mechanicalIcon = require('../assets/mechanical.png');
const farmerIcon = require('../assets/farmer.png');
const backgroundImg = require('../assets/provider-bg.png');

interface Category {
  _id: string;
  name: string;
  description: string;
  category: string;
  transactionType: string;
  parentId: string | null;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

const iconMapping: { [key: string]: string } = {
  'farm_machinery': 'construct-outline',
  'specialist': 'person-outline',
  'tools': 'hammer-outline',
  'storage': 'cube-outline',
  'event': 'calendar-outline',
  'produce': 'leaf-outline',
  'transport': 'car-outline',
  'default': 'ellipse-outline'
};

const animatedPlaceholders = [
  'tractor',
  'seed sowing',
  'ploughing',
  'drip irrigation',
];

const INITIAL_HEADER_HEIGHT = 140;
const SEARCH_BAR_HEIGHT = 56;

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [searchText, setSearchText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const placeholderAnim = useRef(new Animated.Value(1)).current;
  const headerHeightAnim = useRef(new Animated.Value(INITIAL_HEADER_HEIGHT)).current;
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDatePickerExpanded, setIsDatePickerExpanded] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [isWeatherExpanded, setIsWeatherExpanded] = useState(false);
  const [weeklyForecast, setWeeklyForecast] = useState<any[]>([]);
  
  // Weather animations
  const weatherIconAnim = useRef(new Animated.Value(1)).current;
  const cardGlowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  
  const dispatch = useDispatch();
  
  // Get date range and location from Redux
  const { date, startDate, endDate } = useSelector((state: RootState) => state.date);
  const { latitude, longitude, city, radius } = useSelector((state: RootState) => state.location);

  useEffect(() => {
    const fetchLocation = async () => {
      const locationData = await LocationService.getCurrentLocation();
      if (locationData) {
        dispatch(setLocation({ latitude: locationData.latitude, longitude: locationData.longitude, city: locationData.city }));
      }
    };
    fetchLocation();
  }, [dispatch]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await CatalogueService.getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Weather animation functions
  const startWeatherAnimation = (weatherCondition: string) => {
    const condition = weatherCondition.toLowerCase();
    
    // Reset animations
    weatherIconAnim.setValue(1);
    cardGlowAnim.setValue(0);
    pulseAnim.setValue(1);
    backgroundAnim.setValue(0);
    gradientAnim.setValue(0);
    
    if (condition.includes('rain') || condition.includes('drizzle')) {
      // Rain animation - gentle pulsing with blue tint
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundAnim, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: false,
            }),
          ]),
        ])
      ).start();
    } else if (condition.includes('storm') || condition.includes('thunder')) {
      // Storm animation - intense pulsing with dark glow
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.2,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(cardGlowAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: false,
            }),
            Animated.timing(backgroundAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(cardGlowAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: false,
            }),
            Animated.timing(backgroundAnim, {
              toValue: 0,
              duration: 800,
              useNativeDriver: false,
            }),
          ]),
        ])
      ).start();
    } else if (condition.includes('clear') || condition.includes('sunny')) {
      // Sunny animation - gentle rotation with warm gradient
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(weatherIconAnim, {
              toValue: 1.1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(gradientAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(weatherIconAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(gradientAnim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: false,
            }),
          ]),
        ])
      ).start();
    } else if (condition.includes('cloudy') || condition.includes('overcast')) {
      // Cloudy animation - slow fade with gray tint
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(weatherIconAnim, {
              toValue: 0.8,
              duration: 4000,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundAnim, {
              toValue: 0.5,
              duration: 4000,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(weatherIconAnim, {
              toValue: 1,
              duration: 4000,
              useNativeDriver: true,
            }),
            Animated.timing(backgroundAnim, {
              toValue: 0,
              duration: 4000,
              useNativeDriver: false,
            }),
          ]),
        ])
      ).start();
    } else if (condition.includes('snow')) {
      // Snow animation - gentle floating with white shimmer
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(gradientAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: false,
            }),
          ]),
          Animated.parallel([
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(gradientAnim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: false,
            }),
          ]),
        ])
      ).start();
    }
  };

  useEffect(() => {
    const fetchWeatherData = async () => {
      if (latitude && longitude) {
        setWeatherLoading(true);
        try {
          const data = await ClimateService.getWeatherData(latitude, longitude);
          setWeatherData(data);
          // Start weather-specific animation
          startWeatherAnimation(data.condition);
        } catch (error) {
          console.error('Error fetching weather data:', error);
        } finally {
          setWeatherLoading(false);
        }
      }
    };
    fetchWeatherData();
  }, [latitude, longitude]);

  const handleFilterToggle = (expanded: boolean, filterContentHeight: number) => {
    const targetHeaderHeight = expanded
      ? INITIAL_HEADER_HEIGHT + filterContentHeight
      : INITIAL_HEADER_HEIGHT;

    Animated.timing(headerHeightAnim, {
      toValue: targetHeaderHeight,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };



  

  const searchBarTop = headerHeightAnim.interpolate({
    inputRange: [INITIAL_HEADER_HEIGHT, 1000],
    outputRange: [INITIAL_HEADER_HEIGHT - SEARCH_BAR_HEIGHT / 2, 1000 - SEARCH_BAR_HEIGHT / 2],
    extrapolate: 'clamp',
  });

  // Handle search submission
  const handleSearch = () => {
    navigation.navigate('SearchResults', {
      searchQuery: searchText,
      dateRange: { startDate, endDate },
    });
  };

  // Handle category selection
  const handleCategoryPress = (category: Category) => {
    navigation.navigate('SearchResults', {
      categoryId: category._id,
      dateRange: { startDate, endDate },
    });
  };

  // Handle search bar tap
  const handleSearchBarPress = () => {
    navigation.navigate('SearchResults', {
      searchQuery: searchText,
      dateRange: { startDate, endDate },
    });
  };

  const handleWeatherCardPress = () => {
    if (!isWeatherExpanded) {
      // Generate mock weekly forecast data
      const mockForecast = [
        { day: 'Mon', temp: 28, condition: 'Clear', icon: '01d' },
        { day: 'Tue', temp: 26, condition: 'Cloudy', icon: '03d' },
        { day: 'Wed', temp: 24, condition: 'Rain', icon: '10d' },
        { day: 'Thu', temp: 27, condition: 'Clear', icon: '01d' },
        { day: 'Fri', temp: 29, condition: 'Sunny', icon: '01d' },
        { day: 'Sat', temp: 25, condition: 'Cloudy', icon: '03d' },
        { day: 'Sun', temp: 30, condition: 'Clear', icon: '01d' },
      ];
      setWeeklyForecast(mockForecast);
    }
    
    setIsWeatherExpanded(!isWeatherExpanded);
    
    Animated.timing(expandAnim, {
      toValue: isWeatherExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <SafeAreaWrapper backgroundColor="#f5f5f5" style={{ flex: 1 }}>
      <Image source={backgroundImg} style={styles.backgroundImage} resizeMode="cover" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View style={[styles.headerContainer, { height: headerHeightAnim }]}>
          <View style={styles.headerBackground} />
          
          {/* Light Green Circles Pattern */}
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />
          <View style={styles.headerCircle3} />
          
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.locationWrapper}>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationText}>{city?.toUpperCase() || 'LOCATION UNAVAILABLE'}</Text>
                  <Ionicons name="location" size={16} color="white" style={styles.locationIcon} />
                </View>
              </View>
            </View>
            
          </View>
          <ExpandableSearchFilter onToggleExpand={(expanded, height) => handleFilterToggle(expanded, height)} />
        </Animated.View>

        <Animated.View style={[styles.searchContainer, { top: searchBarTop }]}>
          <TouchableOpacity 
            style={styles.searchBar}
            onPress={handleSearchBarPress}
            activeOpacity={0.95}
          >
            <Ionicons name="search" size={20} color="#94a3b8" />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder=" "
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {!searchText && (
              <View style={styles.animatedPlaceholderContainer}>
                <Text style={styles.animatedPlaceholder}>Search for </Text>
                <Animated.Text style={[styles.animatedPlaceholder, { opacity: placeholderAnim }]}>
                  {animatedPlaceholders[placeholderIndex]}
                </Animated.Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={[styles.servicesSection, { marginTop: 40 }]}>
          <Text style={styles.sectionTitle}>Browse by Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesScrollContent}>
            {categories.slice(0, 4).map(category => (
              <TouchableOpacity
                key={category._id}
                style={styles.serviceCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CategoryBrowser', { selectedCategoryId: category._id })}
              >
                <View style={styles.serviceIconWrapper}>
                  <Image source={categoryIcons[category.icon]} style={styles.serviceIcon} />
                </View>
                <Text style={styles.serviceLabel} numberOfLines={2}>{category.name}</Text>
              </TouchableOpacity>
            ))}
            {categories.length > 4 && (
              <TouchableOpacity 
                style={styles.serviceCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('CategoryBrowser')}
              >
                <View style={styles.serviceIconWrapper}>
                  <Ionicons name="ellipsis-horizontal-circle-outline" size={32} color={COLORS.PRIMARY.MAIN} />
                </View>
                <Text style={styles.serviceLabel} numberOfLines={2}>More</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Climate Card */}
        <View style={styles.climateSection}>
          <Text style={styles.sectionTitle}>Weather & Climate</Text>
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={handleWeatherCardPress}
            style={styles.climateCardWrapper}
          >
            <Animated.View 
              style={[
                styles.climateCard,
                {
                  transform: [{ scale: pulseAnim }],
                  shadowOpacity: cardGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.1, 0.3],
                  }),
                  shadowRadius: cardGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 12],
                  }),
                  backgroundColor: backgroundAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ['white', '#f0f0f0', '#e3f2fd'],
                  }),
                  borderColor: gradientAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['transparent', COLORS.PRIMARY.LIGHT],
                  }),
                  borderWidth: gradientAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                }
              ]}
            >
              {weatherLoading ? (
                <View style={styles.climateLoading}>
                  <Text style={styles.climateLoadingText}>Loading weather data...</Text>
                </View>
              ) : weatherData ? (
                <View style={styles.climateContent}>
                  <View style={styles.climateHeader}>
                    <Animated.View 
                      style={[
                        styles.weatherIconContainer,
                        {
                          transform: [
                            { scale: weatherIconAnim },
                            { rotate: weatherIconAnim.interpolate({
                              inputRange: [0.8, 1.1],
                              outputRange: ['0deg', '360deg'],
                            })}
                          ],
                        }
                      ]}
                    >
                    <Ionicons 
                      name={ClimateService.getWeatherIcon(weatherData.icon)} 
                      size={32} 
                      color={COLORS.PRIMARY.MAIN} 
                    />
                    </Animated.View>
                    <View style={styles.mainWeatherInfo}>
                      <Text style={styles.temperatureText}>{weatherData.temperature}°</Text>
                      <Text style={styles.conditionText}>{weatherData.condition}</Text>
                    </View>
                    <View style={styles.weatherMetrics}>
                      <View style={styles.metricItem}>
                        <Ionicons name="water-outline" size={14} color={COLORS.TEXT.SECONDARY} />
                        <Text style={styles.metricText}>{weatherData.humidity}%</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Ionicons name="speedometer-outline" size={14} color={COLORS.TEXT.SECONDARY} />
                        <Text style={styles.metricText}>{weatherData.windSpeed}</Text>
                      </View>
                    </View>
                    <Ionicons 
                      name={isWeatherExpanded ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color={COLORS.TEXT.SECONDARY} 
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.climateError}>
                  <Ionicons name="cloud-offline-outline" size={24} color={COLORS.TEXT.SECONDARY} />
                  <Text style={styles.climateErrorText}>Weather data unavailable</Text>
                </View>
              )}
            </Animated.View>
            
            {/* Weekly Forecast */}
            <Animated.View 
              style={[
                styles.weeklyForecastContainer,
                {
                  maxHeight: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 140],
                  }),
                  opacity: expandAnim,
                  transform: [{
                    translateY: expandAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 0],
                    })
                  }],
                }
              ]}
            >
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.forecastScrollContent}
              >
                {weeklyForecast.map((day, index) => (
                  <View key={index} style={styles.forecastDay}>
                    <Text style={styles.forecastDayText}>{day.day}</Text>
                    <Ionicons 
                      name={ClimateService.getWeatherIcon(day.icon)} 
                      size={24} 
                      color={COLORS.PRIMARY.MAIN} 
                    />
                    <Text style={styles.forecastTempText}>{day.temp}°</Text>
                    <Text style={styles.forecastConditionText}>{day.condition}</Text>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          </TouchableOpacity>
        </View>

       <View style={styles.ctaSection}>
        <Text style={styles.quickServicesTitle}>Quick Services</Text>
        <View style={styles.ctaCardsRow}>
          <TouchableOpacity style={styles.ctaCard} activeOpacity={0.8}>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaTitle}>Need mechanical {
}help?</Text>
              <Text style={styles.ctaSubtitle}>Find nearby {
}tractor</Text>
              <TouchableOpacity style={styles.ctaButton} activeOpacity={0.7}>
                <Text style={styles.ctaButtonText}>Explore</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.PRIMARY.MAIN} />
              </TouchableOpacity>
            </View>
            <Image source={mechanicalIcon} style={styles.ctaImage} resizeMode="contain" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.ctaCard} activeOpacity={0.8}>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaTitle}>Need workers?</Text>
              <Text style={styles.ctaSubtitle}>Hire farm labor</Text>
              <TouchableOpacity style={styles.ctaButton} activeOpacity={0.7}>
                <Text style={styles.ctaButtonText}>Explore</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.PRIMARY.MAIN} />
              </TouchableOpacity>
            </View>
            <Image source={farmerIcon} style={styles.ctaImage} resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaWrapper>
  );
}


const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: 'transparent',
  },
  backgroundImage: {
    position: 'absolute',
    bottom: 75,
    left: 0,
    right: 0,
    width: '100%',
    height: 400,
    opacity: 0.5,
  },
  headerContainer: {
    position: 'relative',
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    overflow: 'hidden',
  },
  // Light Green Circle Patterns
  headerCircle1: {
    position: 'absolute',
    right: -80,
    top: -40,
    width: 250,
    height: 250,
    backgroundColor: 'rgba(144, 238, 144, 0.15)', // Light green with transparency
    borderRadius: 125,
  },
  headerCircle2: {
    position: 'absolute',
    left: -100,
    top: 50,
    width: 200,
    height: 200,
    backgroundColor: 'rgba(152, 251, 152, 0.1)', // Another shade of light green
    borderRadius: 100,
  },
  headerCircle3: {
    position: 'absolute',
    right: 40,
    bottom: -60,
    width: 150,
    height: 150,
    backgroundColor: 'rgba(144, 238, 144, 0.12)', // Light green
    borderRadius: 75,
  },
  headerContent: {
    paddingHorizontal: SPACING.MD,
    paddingTop: Platform.OS === 'ios' ? SPACING.MD : SPACING.LG,
    position: 'relative',
    zIndex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationWrapper: {
    flex: 1,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    color: 'white',
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  locationIcon: {
    marginLeft: 6,
  },
  searchContainer: {
    position: 'absolute',
    left: SPACING.MD,
    right: SPACING.MD,
    zIndex: 10,
  },
  searchBar: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.LG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    gap: SPACING.SM,
    ...SHADOWS.LG,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    padding: 0,
  },
  animatedPlaceholderContainer: {
    position: 'absolute',
    left: 52,
    top: Platform.OS === 'ios' ? 16 : 15,
    flexDirection: 'row',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  animatedPlaceholder: {
    color: COLORS.TEXT.PLACEHOLDER,
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 12,
  },
  servicesSection: {
    paddingLeft: SPACING.SM,
    paddingRight: SPACING.SM,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.MD,
  },
  servicesScrollContent: {
    paddingRight: SPACING.SM,
    gap: SPACING.SM,
  },
  serviceCard: {
    alignItems: 'center',
    marginRight: SPACING.SM,
    minWidth: 90,
    maxWidth: 90,
  },
  serviceIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.LG,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.XS,
    ...SHADOWS.SM,
  },
  serviceIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  serviceLabel: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    lineHeight: 14,
    flexWrap: 'wrap',
    width: '100%',
    paddingHorizontal: 4,
  },
  ctaSection: {
    paddingHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
  },
  quickServicesTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.MD,
  },
  ctaCardsRow: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  ctaCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.XL,
    padding: SPACING.LG,
    minHeight: 160,
    position: 'relative',
    overflow: 'hidden',
    ...SHADOWS.MD,
  },
  ctaContent: {
    flex: 1,
    zIndex: 1,
  },
  ctaTitle: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.XS,
    lineHeight: 22,
  },
  ctaSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.MD,
    lineHeight: 18,
  },
  ctaButton: {
    backgroundColor: COLORS.SECONDARY.LIGHT,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.XS,
  },
  ctaButtonText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.PRIMARY.MAIN,
  },
  ctaImage: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 90,
    height: 90,
    opacity: 0.9,
  },
  ctaIconWrapper: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.SECONDARY.LIGHT,
    borderRadius: BORDER_RADIUS.LG,
  },
  // Climate Card Styles
  climateSection: {
    paddingHorizontal: SPACING.MD,
    marginTop: SPACING.LG,
  },
  climateCard: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.XL,
    padding: SPACING.SM,
    ...SHADOWS.MD,
  },
  climateLoading: {
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  climateLoadingText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  climateContent: {
    gap: SPACING.SM,
  },
  climateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weatherIconContainer: {
    width: 56,
    height: 46,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.SM,
  },
  mainWeatherInfo: {
    flex: 1,
    marginLeft: SPACING.MD,
    flexShrink: 1,
  },
  temperatureText: {
    fontSize: 28,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.TEXT.PRIMARY,
    lineHeight: 32,
  },
  conditionText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  weatherMetrics: {
    alignItems: 'flex-end',
    gap: SPACING.SM,
    flexShrink: 0,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    backgroundColor: COLORS.BACKGROUND.CARD,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.SM,
  },
  metricText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  
  climateError: {
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  climateErrorText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: SPACING.XS,
  },
  // Weekly Forecast Styles
  climateCardWrapper: {
    overflow: 'hidden',
    borderRadius: BORDER_RADIUS.XL,
    ...SHADOWS.MD,
  },
  weeklyForecastContainer: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.BORDER.PRIMARY,
    overflow: 'hidden',
    minHeight: 0,
  },
  forecastScrollContent: {
    paddingVertical: SPACING.SM,
    gap: SPACING.SM,
  },
  forecastDay: {
    alignItems: 'center',
    minWidth: 67,
    paddingVertical: SPACING.SM,
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.SM,
    ...SHADOWS.SM,
  },
  forecastDayText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  forecastTempText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.TEXT.PRIMARY,
    marginTop: SPACING.SM,
  },
  forecastConditionText: {
    fontSize: 10,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginTop: 4,
  },
});