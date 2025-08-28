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
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
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
const GOOGLE_API_KEY = GOOGLE_MAPS_API_KEY as string;

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
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Pin animation
  const pinScale = useRef(new Animated.Value(1)).current;
  const bouncePin = useCallback(() => {
    Animated.sequence([
      Animated.timing(pinScale, { toValue: 0.9, duration: 100, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(pinScale, { toValue: 1, duration: 150, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
    ]).start();
  }, [pinScale]);

  // Map state
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: editAddress?.coordinates[1] || currentLat || 17.385044,
    longitude: editAddress?.coordinates[0] || currentLng || 78.486671,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
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
  const [addressTag, setAddressTag] = useState<TagType | string>((editAddress?.tag as any) || '');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const requestPermission = async () => {
      const permission = await LocationService.requestLocationPermission();
      setHasLocationPermission(permission);
      if (permission && !editAddress) {
        getCurrentLocation();
      } else if (!permission) {
        Alert.alert('Location Permission Required', 'Please grant location permission to use this feature.');
      }
    };
    requestPermission();
  }, [editAddress]);

  const getCurrentLocation = async () => {
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
        setMapRegion(newRegion);
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

  // --- Parsing helpers (robust to Indian address formats) ---
  const firstLongName = (components: any[], typesWanted: string[]) => {
    const c = components.find((x) => (x.types || []).some((t: string) => typesWanted.includes(t)));
    return c?.long_name || '';
  };

  const applyAddressComponentsFromPlace = (components: any[] = [], formatted?: string, name?: string) => {
    // Reset before populate
    setAddressLine1('');
    setAddressLine2('');
    setVillage('');
    setTehsil('');
    setDistrict('');
    setState('');
    setPincode('');

    // Title
    if (name) setAddressName(name);
    else if (formatted) setAddressName(formatted.split(',').slice(0, 2).join(', ').trim());

    // Lines
    const premise = firstLongName(components, ['premise', 'subpremise', 'street_number']);
    const route = firstLongName(components, ['route']);
    if (premise) setAddressLine1((prev) => (prev ? `${prev} ${premise}` : premise));
    if (route) setAddressLine2((prev) => (prev ? `${prev}, ${route}` : route));

    // Village / locality (multiple fallbacks)
    const vill =
      firstLongName(components, ['sublocality_level_2', 'neighborhood', 'administrative_area_level_3']) ||
      firstLongName(components, ['sublocality', 'sublocality_level_1', 'political']) ||
      firstLongName(components, ['locality']); // last resort
    if (vill) setVillage(vill);

    // Tehsil / sub-district
    const teh = firstLongName(components, ['sublocality', 'sublocality_level_1']);
    if (teh) setTehsil(teh);

    // District / city
    const dist =
      firstLongName(components, ['administrative_area_level_2']) ||
      firstLongName(components, ['locality']);
    if (dist) setDistrict(dist);

    // State
    const st = firstLongName(components, ['administrative_area_level_1']);
    if (st) setState(st);

    // Pincode
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
        if (best.formatted_address) {
          setAddressName(best.formatted_address.split(',').slice(0, 2).join(', ').trim());
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const debouncedReverseGeocode = useCallback(
    debounce((region: Region) => {
      reverseGeocodeLocation(region.latitude, region.longitude);
    }, 800),
    []
  );

  const handleRegionChangeComplete = (region: Region) => {
    setMapRegion(region);
    debouncedReverseGeocode(region);
    bouncePin();
  };

  const handlePlaceSelected = (data: any, details: any) => {
    const lat = details?.geometry?.location?.lat;
    const lng = details?.geometry?.location?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert('Location not available', 'Could not fetch location details for the selected place.');
      return;
    }
    const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.005, longitudeDelta: 0.005 };
    setMapRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 800);

    if (details?.address_components) {
      applyAddressComponentsFromPlace(details.address_components, details.formatted_address, details.name || data?.structured_formatting?.main_text);
    } else {
      reverseGeocodeLocation(lat, lng);
    }
  };

  // --- Validation & save ---
  const sanitizeTag = (t: string): TagType => {
    const v = (t || '').trim().toLowerCase();
    if ((TAGS as readonly string[]).includes(v)) return v as TagType;
    if (['office', 'site', 'workplace'].includes(v)) return 'work';
    if (['house', 'homeaddress', 'flat'].includes(v)) return 'home';
    if (['personal', 'mine', 'me'].includes(v)) return 'personal';
    return 'other';
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!addressLine1.trim()) newErrors.addressLine1 = 'House/Plot/Building is required';
    if (!village.trim()) newErrors.village = 'Village/Locality is required';
    if (!district.trim()) newErrors.district = 'City/District is required';
    if (!state.trim()) newErrors.state = 'State is required';
    if (!pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(pincode)) newErrors.pincode = 'Enter a valid 6-digit pincode';

    const normalized = sanitizeTag(String(addressTag));
    if (!normalized) newErrors.addressTag = 'Please choose a tag';
    setAddressTag(normalized);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const addressData: CreateAddressDto = {
        userId: user?.id,
        tag: sanitizeTag(String(addressTag)),
        addressLine1,
        addressLine2,
        village,
        tehsil,
        district,
        state,
        pincode,
        coordinates: [mapRegion.longitude, mapRegion.latitude],
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
      console.error('Error saving address:', JSON.stringify(error, null, 2));
      const msg = error?.response?.data?.message;
      Alert.alert('Error', Array.isArray(msg) ? msg.join('\n') : (msg || error.message || 'Failed to save location.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        {/* Header with search */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <GooglePlacesAutocomplete
              ref={placesRef}
              placeholder="Search service location (e.g., Sector 75)"
              minLength={2}
              onPress={(data, details = null) => handlePlaceSelected(data, details)}
              query={{ key: GOOGLE_API_KEY, language: 'en', components: 'country:in' }}
              keyboardShouldPersistTaps="handled" // FIX: Prevents tap interception by ScrollView
              fetchDetails
              timeout={20000} // IMPORTANT: Prevents a native crash on network failure
              GooglePlacesDetailsQuery={{
                // IMPORTANT: request address_components (plural)
                fields: 'geometry,address_components,formatted_address,name,place_id,types',
              }}
              enablePoweredByContainer={false}
              predefinedPlaces={[]}
              filterReverseGeocodingByTypes={[]}
              debounce={200}
              onFail={(e) => console.error('GPlaces API Error:', e)}
              onNotFound={() => console.log('GPlaces: No results')}
              textInputProps={{
                placeholderTextColor: COLORS.TEXT.PLACEHOLDER,
                returnKeyType: 'search',
                autoCorrect: false,
                autoCapitalize: 'none',
                style: styles.searchInput,
                clearButtonMode: 'while-editing',
              }}
              styles={{
                container: { flex: 1, backgroundColor: 'transparent' },
                textInputContainer: { backgroundColor: 'transparent', padding: 0, margin: 0 },
                textInput: styles.searchInput,
                listView: styles.listView,
                row: styles.resultRow,
                separator: styles.resultSeparator,
                description: styles.resultText,
              }}
              renderLeftButton={() => (
                <View style={styles.inputLeftIcon}>
                  <Ionicons name="search" size={18} color={COLORS.TEXT.SECONDARY} />
                </View>
              )}
              renderRightButton={() => (
                <TouchableOpacity onPress={() => placesRef.current?.clear()} style={styles.inputRightIcon} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color={COLORS.TEXT.SECONDARY} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={mapRegion}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
          />

          {/* Elegant center pin */}
          <View pointerEvents="none" style={styles.centerPinWrapper}>
            <Animated.View style={[styles.pinContainer, { transform: [{ translateX: -12 }, { translateY: -24 }, { scale: pinScale }] }]}>
              <View style={styles.pinDot} />
              <View style={styles.pinStem} />
            </Animated.View>
            <View style={styles.pinShadow} />
          </View>

          {/* Instruction chip */}
          <View style={styles.mapChip}>
            <Ionicons name="briefcase-outline" size={14} color={COLORS.NEUTRAL.WHITE} />
            <Text style={styles.mapChipText}>Set where the service will be provided</Text>
          </View>

          {/* Current Location */}
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
            disabled={fetchingLocation}
            accessibilityLabel="Use my current location"
          >
            {fetchingLocation ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
            ) : (
              <MaterialIcons name="my-location" size={20} color={COLORS.PRIMARY.MAIN} />
            )}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.locationInfo}>
            <Ionicons name="location-sharp" size={24} color={COLORS.PRIMARY.MAIN} />
            <View style={styles.locationTextContainer}>
              <View style={styles.locationTitleContainer}>
                <Text style={styles.locationTitle}>{addressName || 'Set service location'}</Text>
                {reverseGeocoding && <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />}
              </View>
              <Text style={styles.locationSubtitle} numberOfLines={2}>
                {[addressLine1, addressLine2, village, district, state, pincode].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>

          {/* Tag chips (required enum) */}
          <Text style={styles.formLabel}>Save this location as</Text>
          <View style={styles.tagRow}>
            {TAGS.map((t) => {
              const selected = String(addressTag).toLowerCase() === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tagChip, selected && styles.tagChipSelected]}
                  onPress={() => setAddressTag(t)}
                >
                  <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>{t.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {errors.addressTag ? <Text style={styles.errorText}>{errors.addressTag}</Text> : null}

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon, errors.addressLine1 && styles.inputError, focusedInput === 'addressLine1' && styles.inputFocused]}
                value={addressLine1}
                onChangeText={setAddressLine1}
                placeholder="House/Plot/Building"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                onFocus={() => setFocusedInput('addressLine1')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
            {errors.addressLine1 && <Text style={styles.errorText}>{errors.addressLine1}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="map-outline" size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon, focusedInput === 'addressLine2' && styles.inputFocused]}
                value={addressLine2}
                onChangeText={setAddressLine2}
                placeholder="Area / Landmark"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                onFocus={() => setFocusedInput('addressLine2')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>
          </View>

          {/* NEW: editable administrative fields so backend requirements are always met */}
          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="navigate-circle-outline" size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon, errors.village && styles.inputError, focusedInput === 'village' && styles.inputFocused]}
                value={village}
                onChangeText={setVillage}
                placeholder="Village / Locality / Ward"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                onFocus={() => setFocusedInput('village')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="words"
              />
            </View>
            {errors.village && <Text style={styles.errorText}>{errors.village}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="grid-outline" size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon, errors.district && styles.inputError, focusedInput === 'district' && styles.inputFocused]}
                value={district}
                onChangeText={setDistrict}
                placeholder="District / City"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                onFocus={() => setFocusedInput('district')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="words"
              />
            </View>
            {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="earth-outline" size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon, errors.state && styles.inputError, focusedInput === 'state' && styles.inputFocused]}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                onFocus={() => setFocusedInput('state')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="words"
              />
            </View>
            {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputContainer}>
              <Ionicons name="document-text-outline" size={18} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithIcon, errors.pincode && styles.inputError, focusedInput === 'pincode' && styles.inputFocused]}
                value={pincode}
                onChangeText={(v) => setPincode(v.replace(/[^\d]/g, '').slice(0, 6))}
                placeholder="Pincode"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                onFocus={() => setFocusedInput('pincode')}
                onBlur={() => setFocusedInput(null)}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
          </View>

          <Text style={styles.infoText}>This will be your default service location for bookings.</Text>
        </ScrollView>

        <View style={styles.footer}>
          <Button title="SAVE LOCATION" onPress={handleSaveAddress} loading={loading} fullWidth style={styles.saveButton} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BACKGROUND.PRIMARY },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    // REMOVED elevation to fix dropdown visibility issue on Android
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
    zIndex: 10,
  },
  backButton: { padding: SPACING.XS, marginRight: SPACING.XS, backgroundColor: '#f1f1f1', borderRadius: 20 },
  searchContainer: { flex: 1, marginLeft: SPACING.SM, overflow: 'visible', zIndex: 10 },
  searchInput: {
    height: 40,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.LG,
    paddingLeft: 36,
    paddingRight: 32,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  inputLeftIcon: { position: 'absolute', left: 10, height: 40, justifyContent: 'center' },
  inputRightIcon: { position: 'absolute', right: 8, height: 40, justifyContent: 'center', padding: 6 },
  listView: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.MD,
    zIndex: 1000,
    maxHeight: 300,
  },
  resultRow: { paddingVertical: 10, paddingHorizontal: 12 },
  resultSeparator: { height: 1, backgroundColor: COLORS.BORDER.PRIMARY },
  resultText: { fontFamily: FONTS.POPPINS.REGULAR, color: COLORS.TEXT.PRIMARY, fontSize: FONT_SIZES.BASE },
  mapContainer: { height: screenHeight * 0.4, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  centerPinWrapper: { position: 'absolute', left: '50%', top: '50%', alignItems: 'center' },
  pinContainer: { alignItems: 'center' },
  pinDot: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.PRIMARY.MAIN, borderWidth: 2, borderColor: COLORS.NEUTRAL.WHITE, ...SHADOWS.MD,
  },
  pinStem: { width: 2, height: 12, backgroundColor: COLORS.PRIMARY.MAIN, marginTop: 2, borderRadius: 1 },
  pinShadow: { width: 24, height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 4, transform: [{ translateX: -12 }] },
  mapChip: {
    position: 'absolute', top: SPACING.SM, alignSelf: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN, paddingHorizontal: SPACING.MD, paddingVertical: SPACING.XS,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, ...SHADOWS.MD,
  },
  mapChipText: { color: COLORS.NEUTRAL.WHITE, fontSize: FONT_SIZES.SM, fontFamily: FONTS.POPPINS.MEDIUM },
  currentLocationButton: { position: 'absolute', bottom: SPACING.LG, right: SPACING.LG, backgroundColor: COLORS.NEUTRAL.WHITE, borderRadius: 50, padding: SPACING.SM, ...SHADOWS.MD },
  formContainer: { flex: 1, backgroundColor: COLORS.NEUTRAL.WHITE, paddingHorizontal: SPACING.MD, paddingTop: SPACING.MD },
  locationInfo: {
    flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.LG, paddingBottom: SPACING.MD,
    borderBottomWidth: 1, borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  locationTextContainer: { marginLeft: SPACING.MD, flex: 1 },
  locationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationTitle: { fontSize: FONT_SIZES.LG, fontFamily: FONTS.POPPINS.SEMIBOLD, color: COLORS.TEXT.PRIMARY, marginRight: SPACING.SM },
  locationSubtitle: { fontSize: FONT_SIZES.SM, fontFamily: FONTS.POPPINS.REGULAR, color: COLORS.TEXT.SECONDARY, marginTop: SPACING.XS },
  
  // New styles for UI improvements
  formLabel: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
    marginTop: SPACING.XS,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    color: COLORS.TEXT.SECONDARY,
  },

  tagRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.MD, flexWrap: 'wrap' },
  tagChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.BORDER.PRIMARY, backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  tagChipSelected: { backgroundColor: COLORS.PRIMARY.MAIN },
  tagChipText: { fontFamily: FONTS.POPPINS.MEDIUM, color: COLORS.TEXT.PRIMARY, fontSize: FONT_SIZES.SM },
  tagChipTextSelected: { color: COLORS.NEUTRAL.WHITE },
  inputGroup: { marginBottom: SPACING.MD },
  input: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: Platform.OS === 'ios' ? SPACING.MD : SPACING.SM,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    height: 50,
  },
  inputWithIcon: {
    paddingLeft: 40, // Make space for the icon
  },
  inputFocused: { borderColor: COLORS.PRIMARY.MAIN, borderWidth: 1.5 },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: FONT_SIZES.XS, fontFamily: FONTS.POPPINS.REGULAR, color: '#EF4444', marginTop: SPACING.XS },
  infoText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING.LG,
    marginTop: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  footer: { padding: SPACING.MD, borderTopWidth: 1, borderTopColor: COLORS.BORDER.PRIMARY, backgroundColor: COLORS.NEUTRAL.WHITE },
  saveButton: { backgroundColor: COLORS.PRIMARY.MAIN, borderRadius: BORDER_RADIUS.MD },
});

export default AddAddressScreen;
