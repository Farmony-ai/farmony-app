import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, Marker } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Text from '../components/Text';
import Button from '../components/Button';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { GOOGLE_MAPS_API_KEY } from '../config/api';
import AddressService, { Address, CreateAddressDto } from '../services/AddressService';
import LocationService from '../services/locationService';
import debounce from 'lodash.debounce';

const { height: screenHeight } = Dimensions.get('window');
const GOOGLE_API_KEY = (GOOGLE_MAPS_API_KEY || '') as string;

// Log for debugging
console.log('Google Maps API Key configured:', !!GOOGLE_API_KEY);

if (!GOOGLE_API_KEY) {
  console.warn('Google Maps API key is not configured. Map features will not work.');
}

interface RouteParams {
  editAddress?: Address;
}

const TAGS = ['home', 'work', 'personal', 'other'] as const;
type TagType = typeof TAGS[number];

const AddAddressScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { editAddress } = (route.params as RouteParams) || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const { latitude: currentLat, longitude: currentLng } = useSelector(
    (state: RootState) => state.location
  );

  const mapRef = useRef<MapView>(null);
  const placesRef = useRef<any>(null);

  const [isEditMode] = useState(!!editAddress);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // Bottom sheet animation
  const SHEET_MIN = 0.45;
  const SHEET_MAX = 0.85;
  const sheetProgress = useRef(new Animated.Value(0)).current;
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  
  const SHEET_MIN_HEIGHT = screenHeight * SHEET_MIN;
  const SHEET_MAX_HEIGHT = screenHeight * SHEET_MAX;

  const sheetHeight = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT],
  });

  // Opacity animations for overlay elements
  const overlayOpacity = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const pinTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -((SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT) / 2)],
  });

  // Pin animation
  const pinScale = useRef(new Animated.Value(1)).current;
  const bouncePin = useCallback(() => {
    // Only bounce if sheet is not expanded
    if (!isSheetExpanded) {
      Animated.sequence([
        Animated.timing(pinScale, { toValue: 0.9, duration: 100, useNativeDriver: true }),
        Animated.timing(pinScale, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [pinScale, isSheetExpanded]);

  // Map state - ensure valid initial coordinates
  const [mapRegion, setMapRegion] = useState<Region>(() => {
    // Default to a known location in India if no coordinates available
    let lat = 17.385044; // Default Hyderabad
    let lng = 78.486671;
    
    if (editAddress?.coordinates && Array.isArray(editAddress.coordinates)) {
      // GeoJSON format: [longitude, latitude]
      lng = editAddress.coordinates[0];
      lat = editAddress.coordinates[1];
    } else if (currentLat && currentLng) {
      lat = currentLat;
      lng = currentLng;
    }
    
    // Validate coordinates
    if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
      lat = 17.385044;
      lng = 78.486671;
    }
    
    const initialRegion = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    console.log('Initial map coordinates - lat:', lat, 'lng:', lng);
    return initialRegion;
  });

  // Form state
  const [addressName, setAddressName] = useState('');
  const [addressLine1, setAddressLine1] = useState(editAddress?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(editAddress?.addressLine2 || '');
  const [village, setVillage] = useState(editAddress?.village || '');
  const [tehsil, setTehsil] = useState(editAddress?.tehsil || '');
  const [district, setDistrict] = useState(editAddress?.district || '');
  const [state, setState] = useState(editAddress?.state || '');
  const [pincode, setPincode] = useState(editAddress?.pincode || '');
  const [addressTag, setAddressTag] = useState<TagType>((editAddress?.tag as TagType) || 'home');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
 
  const regionRef = useRef<Region>(mapRegion);

  const toggleSheet = useCallback(() => {
    const toValue = isSheetExpanded ? 0 : 1;
    Animated.timing(sheetProgress, {
      toValue,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.inOut(Easing.ease),
    }).start();
    setIsSheetExpanded(!isSheetExpanded);
  }, [isSheetExpanded, sheetProgress]);

  useEffect(() => {
    const requestPermission = async () => {
      const permission = await LocationService.requestLocationPermission();
      setHasLocationPermission(permission);
      if (permission && !editAddress) {
        getCurrentLocation();
      }
    };
    requestPermission();
  }, [editAddress]);

  const getCurrentLocation = async () => {
    // Don't fetch location if sheet is expanded
    if (isSheetExpanded) return;
    
    setFetchingLocation(true);
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        const newRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        regionRef.current = newRegion; // Keep ref in sync
        mapRef.current?.animateToRegion(newRegion, 800);
        await reverseGeocodeLocation(location.latitude, location.longitude);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not fetch current location. Please try again.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const firstLongName = (components: any[], typesWanted: string[]) => {
    const c = components.find((x) => (x.types || []).some((t: string) => typesWanted.includes(t)));
    return c?.long_name || '';
  };

  const applyAddressComponentsFromPlace = (components: any[] = [], formatted?: string, name?: string) => {
    setAddressLine1('');
    setAddressLine2('');
    setVillage('');
    setTehsil('');
    setDistrict('');
    setState('');
    setPincode('');

    if (name) setAddressName(name);
    else if (formatted) setAddressName(formatted.split(',').slice(0, 2).join(', ').trim());

    const premise = firstLongName(components, ['premise', 'subpremise', 'street_number']);
    const route = firstLongName(components, ['route']);
    if (premise) setAddressLine1(premise);
    if (route) setAddressLine2(route);

    const vill =
      firstLongName(components, ['sublocality_level_2', 'neighborhood', 'administrative_area_level_3']) ||
      firstLongName(components, ['sublocality', 'sublocality_level_1', 'political']) ||
      firstLongName(components, ['locality']);
    if (vill) setVillage(vill);

    const teh = firstLongName(components, ['sublocality', 'sublocality_level_1']);
    if (teh) setTehsil(teh);

    const dist =
      firstLongName(components, ['administrative_area_level_2']) ||
      firstLongName(components, ['locality']);
    if (dist) setDistrict(dist);

    const st = firstLongName(components, ['administrative_area_level_1']);
    if (st) setState(st);

    const pin = firstLongName(components, ['postal_code']);
    if (pin) setPincode(pin);
  };

  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    setReverseGeocoding(true);
    try {
      const result = await AddressService.reverseGeocode(latitude, longitude);
      const best = result?.results?.[0];
      if (best) {
        applyAddressComponentsFromPlace(best.address_components, best.formatted_address);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const debouncedReverseGeocode = useCallback(
    debounce((region: Region) => {
      // Only reverse geocode if sheet is not expanded
      if (!isSheetExpanded) {
        reverseGeocodeLocation(region.latitude, region.longitude);
      }
    }, 800),
    [isSheetExpanded]
  );

  const handleRegionChangeComplete = (region: Region) => {
    // Only handle region changes if sheet is not expanded
    if (!isSheetExpanded) {
      console.log('Region changed to:', region);
      regionRef.current = region; // Update ref instead of state
      debouncedReverseGeocode(region);
      bouncePin();
    }
  };

  const handlePlaceSelected = (data: any, details: any) => {
    console.log('Place selected:', data, details);
    
    if (!details || !details.geometry || !details.geometry.location) {
      Alert.alert('Error', 'Could not fetch location details. Please try again.');
      return;
    }
    
    const lat = details.geometry.location.lat;
    const lng = details.geometry.location.lng;
    
    console.log('Coordinates:', lat, lng);
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert('Location not available', 'Could not fetch location details for the selected place.');
      return;
    }
    const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
    regionRef.current = newRegion; // Keep ref in sync
    mapRef.current?.animateToRegion(newRegion, 800);

    if (details.address_components) {
      applyAddressComponentsFromPlace(details.address_components, details.formatted_address, details.name || data?.structured_formatting?.main_text);
    } else {
      reverseGeocodeLocation(lat, lng);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!addressLine1.trim()) newErrors.addressLine1 = 'House/Building is required';
    if (!village.trim()) newErrors.village = 'Locality is required';
    if (!district.trim()) newErrors.district = 'District is required';
    if (!state.trim()) newErrors.state = 'State is required';
    if (!pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(pincode)) newErrors.pincode = 'Enter a valid 6-digit pincode';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const addressData: CreateAddressDto = {
        userId: user?.id,
        tag: addressTag,
        addressLine1,
        addressLine2,
        village,
        tehsil,
        district,
        state,
        pincode,
        coordinates: [regionRef.current.longitude, regionRef.current.latitude],
        isDefault: false,
      };

      if (isEditMode && editAddress) {
        await AddressService.updateAddress(editAddress._id, addressData);
        Alert.alert('Success', 'Location updated successfully');
      } else {
        await AddressService.createAddress(addressData);
        Alert.alert('Success', 'Location saved successfully');
      }
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Full-screen Map */}
      {GOOGLE_API_KEY ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          // initialRegion={mapRegion}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation={hasLocationPermission}
          showsMyLocationButton={false}
          scrollEnabled={!isSheetExpanded}
          zoomEnabled={!isSheetExpanded}
          rotateEnabled={!isSheetExpanded}
          pitchEnabled={!isSheetExpanded}
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.mapFallback]}>
          <MaterialIcons name="location-off" size={48} color={COLORS.TEXT.PLACEHOLDER} />
          <Text style={styles.mapFallbackText}>Map not available</Text>
        </View>
      )}

      {/* Center Pin - Hidden when sheet is expanded */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.mapPinContainer,
          { 
            transform: [{ translateY: pinTranslateY }],
            opacity: overlayOpacity,
          }
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pinScale }] }}>
          <Ionicons name="location-sharp" size={32} color={COLORS.PRIMARY.MAIN} />
        </Animated.View>
        <View style={styles.pinShadow} />
        {reverseGeocoding && !isSheetExpanded && (
          <View style={styles.locatingBadge}>
            <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.locatingText}>Locating...</Text>
          </View>
        )}
      </Animated.View>

      {/* Top Section with Back Button and Search - Hidden when sheet is expanded */}
      <Animated.View 
        style={[
          styles.topSection,
          { opacity: overlayOpacity }
        ]}
        pointerEvents={isSheetExpanded ? 'none' : 'auto'}
      >
        <View>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={COLORS.TEXT.PRIMARY} />
            </TouchableOpacity>

            <View style={styles.searchWrapper}>
              {GOOGLE_API_KEY ? (
                <GooglePlacesAutocomplete
                  ref={placesRef}
                  placeholder="Search for area, street name..."
                  fetchDetails={true}
                  predefinedPlaces={[]}
                  predefinedPlacesAlwaysVisible={false}
                  textInputProps={{ 
                    placeholderTextColor: COLORS.TEXT.PLACEHOLDER,
                    returnKeyType: 'search',
                    autoCorrect: false,
                    autoCapitalize: 'none',
                    style: styles.searchInputWithIcon,
                    editable: !isSheetExpanded,
                  }}
                  minLength={2}
                  debounce={150}
                  enablePoweredByContainer={false}
                  keyboardShouldPersistTaps="handled"
                  listViewDisplayed="auto"
                  keepResultsAfterBlur={false}
                  nearbyPlacesAPI="GooglePlacesSearch"
                  GooglePlacesSearchQuery={{ rankby: 'distance' }}
                  GooglePlacesDetailsQuery={{ 
                    fields: 'geometry,address_components,formatted_address,name' 
                  }}
                  GoogleReverseGeocodingQuery={{}}
                  timeout={20000}
                  onPress={(data, details = null) => handlePlaceSelected(data, details)}
                  query={{
                    key: GOOGLE_API_KEY,
                    language: 'en',
                    components: 'country:in',
                  }}
                  styles={{
                    container: { flex: 1 },
                    textInput: styles.searchInputWithIcon,
                    listView: styles.listView,
                    row: styles.resultRow,
                    separator: styles.resultSeparator,
                    description: styles.resultText,
                  }}
                  renderLeftButton={() => (
                    <View style={styles.searchIconButton}>
                      <Ionicons name="search" size={18} color={COLORS.TEXT.SECONDARY} />
                    </View>
                  )}
                />
              ) : (
                <View style={styles.searchInputContainer}>
                  <View style={styles.searchIcon}>
                    <Ionicons name="search" size={18} color={COLORS.TEXT.PLACEHOLDER} />
                  </View>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Enter location manually"
                    placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                    editable={false}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Map Instruction Chip */}
          <View style={styles.mapChip}>
            <Ionicons name="hand-left-outline" size={14} color={COLORS.NEUTRAL.WHITE} />
            <Text style={styles.mapChipText}>Move pin to set exact location</Text>
          </View>
        </View>
      </Animated.View>

      {/* Current Location FAB - Hidden when sheet is expanded */}
      <Animated.View 
        style={[
          styles.locationFAB,
          { opacity: overlayOpacity }
        ]}
        pointerEvents={isSheetExpanded ? 'none' : 'auto'}
      >
        <TouchableOpacity
          onPress={getCurrentLocation}
          disabled={fetchingLocation || isSheetExpanded}
        >
          {fetchingLocation ? (
            <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
          ) : (
            <MaterialIcons name="my-location" size={20} color={COLORS.PRIMARY.MAIN} />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        <TouchableOpacity style={styles.sheetHandle} onPress={toggleSheet} activeOpacity={0.9}>
          <View style={styles.handleBar} />
        </TouchableOpacity>

        {/* Address Header */}
        <TouchableOpacity style={styles.addressHeader} onPress={toggleSheet} activeOpacity={0.9}>
          <View style={styles.addressIconWrapper}>
            <Ionicons name="location" size={20} color={COLORS.PRIMARY.MAIN} />
          </View>
          <View style={styles.addressHeaderText}>
            <Text style={styles.addressLabel}>Service Location</Text>
            {(village || district) ? (
              <Text style={styles.addressPreview} numberOfLines={1}>
                {[addressLine1, village, district].filter(Boolean).join(', ')}
              </Text>
            ) : (
              <Text style={styles.addressPlaceholder}>
                {isSheetExpanded ? 'Fill in your address details' : 'Move pin to your exact location'}
              </Text>
            )}
          </View>
          <Ionicons name={isSheetExpanded ? 'chevron-down' : 'chevron-up'} size={20} color={COLORS.TEXT.SECONDARY} />
        </TouchableOpacity>

        {/* Form Content */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Tag Selection */}
            <View style={styles.tagSection}>
              <Text style={styles.sectionTitle}>Save address as</Text>
              <View style={styles.tagRow}>
                {TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, addressTag === tag && styles.tagActive]}
                    onPress={() => setAddressTag(tag)}
                  >
                    <Ionicons
                      name={
                        tag === 'home' ? 'home' : 
                        tag === 'work' ? 'briefcase' : 
                        tag === 'personal' ? 'person' : 'bookmark'
                      }
                      size={16}
                      color={addressTag === tag ? COLORS.NEUTRAL.WHITE : COLORS.TEXT.SECONDARY}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.tagText, addressTag === tag && styles.tagTextActive]}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Address Fields */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>House/Flat/Building <Text style={styles.required}>*</Text></Text>
              <View style={[styles.fieldInputWrapper, errors.addressLine1 && styles.fieldInputError]}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Flat 301, Green Apartments"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={addressLine1}
                  onChangeText={(text) => {
                    setAddressLine1(text);
                    if (errors.addressLine1) setErrors({ ...errors, addressLine1: '' });
                  }}
                />
              </View>
              {errors.addressLine1 && <Text style={styles.errorText}>{errors.addressLine1}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Landmark / Area</Text>
              <View style={styles.fieldInputWrapper}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Near City Mall"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={addressLine2}
                  onChangeText={setAddressLine2}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Village/Locality <Text style={styles.required}>*</Text></Text>
              <View style={[styles.fieldInputWrapper, errors.village && styles.fieldInputError]}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="e.g., Madhapur"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={village}
                  onChangeText={(text) => {
                    setVillage(text);
                    if (errors.village) setErrors({ ...errors, village: '' });
                  }}
                />
              </View>
              {errors.village && <Text style={styles.errorText}>{errors.village}</Text>}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tehsil/Sub-district</Text>
              <View style={styles.fieldInputWrapper}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Optional"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={tehsil}
                  onChangeText={setTehsil}
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.fieldLabel}>District <Text style={styles.required}>*</Text></Text>
                <View style={[styles.fieldInputWrapper, errors.district && styles.fieldInputError]}>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g., Hyderabad"
                    placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                    value={district}
                    onChangeText={(text) => {
                      setDistrict(text);
                      if (errors.district) setErrors({ ...errors, district: '' });
                    }}
                  />
                </View>
                {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}
              </View>

              <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.fieldLabel}>State <Text style={styles.required}>*</Text></Text>
                <View style={[styles.fieldInputWrapper, errors.state && styles.fieldInputError]}>
                  <TextInput
                    style={styles.fieldInput}
                    placeholder="e.g., Telangana"
                    placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                    value={state}
                    onChangeText={(text) => {
                      setState(text);
                      if (errors.state) setErrors({ ...errors, state: '' });
                    }}
                  />
                </View>
                {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Pincode <Text style={styles.required}>*</Text></Text>
              <View style={[styles.fieldInputWrapper, errors.pincode && styles.fieldInputError]}>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="6-digit pincode"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={pincode}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^\d]/g, '').slice(0, 6);
                    setPincode(cleaned);
                    if (errors.pincode && cleaned.length === 6) setErrors({ ...errors, pincode: '' });
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
            </View>

            <View style={styles.infoNote}>
              <Ionicons name="information-circle" size={16} color={COLORS.PRIMARY.MAIN} />
              <Text style={styles.infoText}>
                This will be your default service location for bookings
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSaveAddress}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.NEUTRAL.WHITE} />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save Location</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.NEUTRAL.WHITE} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.BACKGROUND.PRIMARY 
  },
  
  // Top Section
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
  },
  
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  
  searchWrapper: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  
  searchIconButton: {
    position: 'absolute',
    left: 12,
    height: 42,
    justifyContent: 'center',
    zIndex: 1,
  },
  
  searchInput: {
    height: 42,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    paddingLeft: 36,
    paddingRight: SPACING.MD,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  
  searchInputWithIcon: {
    height: 42,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    paddingLeft: 36,
    paddingRight: SPACING.MD,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -9,
    zIndex: 1,
  },
  
  searchInputContainer: {
    flex: 1,
    position: 'relative',
  },
  
  clearButton: {
    position: 'absolute',
    right: 8,
    height: 42,
    justifyContent: 'center',
    padding: 6,
  },
  
  listView: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginTop: 8,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.MD,
    maxHeight: 200,
  },
  
  resultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  
  resultSeparator: {
    height: 1,
    backgroundColor: COLORS.BORDER.PRIMARY,
  },
  
  resultText: {
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    fontSize: FONT_SIZES.SM,
  },
  
  mapChip: {
    alignSelf: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingHorizontal: SPACING.MD,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...SHADOWS.SM,
  },
  
  mapChipText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  
  // Map Pin
  mapPinContainer: {
    position: 'absolute',
    left: '50%',
    top: '40%',
    marginLeft: -16,
    marginTop: -32,
    alignItems: 'center',
    zIndex: 5,
  },
  
  pinShadow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: -4,
  },
  
  locatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
    ...SHADOWS.SM,
  },
  
  locatingText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginLeft: 4,
  },
  
  // Location FAB
  locationFAB: {
    position: 'absolute',
    right: SPACING.MD,
    bottom: '48%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.MD,
    zIndex: 5,
  },
  
  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...SHADOWS.XL,
    minHeight: '45%',
  },
  
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.BORDER.PRIMARY,
  },
  
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  
  addressIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  
  addressHeaderText: {
    flex: 1,
  },
  
  addressLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 2,
  },
  
  addressPreview: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  
  addressPlaceholder: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PLACEHOLDER,
  },
  
  // Form
  formScrollView: {
    flex: 1,
  },
  
  formContent: {
    padding: SPACING.MD,
    paddingBottom: 100,
  },
  
  tagSection: {
    marginBottom: SPACING.LG,
  },
  
  sectionTitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  
  tagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  
  tag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  
  tagActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  
  tagText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  
  tagTextActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  
  fieldGroup: {
    marginBottom: SPACING.MD,
  },
  
  fieldRow: {
    flexDirection: 'row',
    marginBottom: SPACING.MD,
  },
  
  fieldLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 6,
  },
  
  required: {
    color: COLORS.PRIMARY.MAIN,
  },
  
  fieldInputWrapper: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    overflow: 'hidden',
  },
  
  fieldInput: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  
  fieldInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  
  errorText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.LIGHT,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING.MD,
  },
  
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.PRIMARY.MAIN,
    marginLeft: SPACING.SM,
  },
  
  // Bottom Actions
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
  },
  
  saveButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  
  saveButtonDisabled: {
    opacity: 0.7,
  },
  
  saveButtonText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  
  mapFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  
  mapFallbackText: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginTop: SPACING.MD,
  },
});

export default AddAddressScreen;