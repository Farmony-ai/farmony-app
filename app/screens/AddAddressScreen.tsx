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
} from 'react-native';
import MapView, { PROVIDER_DEFAULT, PROVIDER_GOOGLE, Region } from 'react-native-maps';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Use the app's configured Google Maps API key for Places queries
const GOOGLE_API_KEY = GOOGLE_MAPS_API_KEY;

interface RouteParams {
  editAddress?: Address;
}

const AddAddressScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { editAddress } = route.params as RouteParams || {};
  const { user } = useSelector((state: RootState) => state.auth);
  const { latitude: currentLat, longitude: currentLng } = useSelector(
    (state: RootState) => state.location
  );

  const mapRef = useRef<MapView>(null);
  const [isEditMode] = useState(!!editAddress);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

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
  const [addressTag, setAddressTag] = useState(editAddress?.tag || '');


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
        Alert.alert(
          'Location Permission Required',
          'Please grant location permission to use this feature.'
        );
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
        mapRef.current?.animateToRegion(newRegion, 1000);
        await reverseGeocodeLocation(location.latitude, location.longitude);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not fetch current location. Please try again.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    setReverseGeocoding(true);
    try {
      const result = await AddressService.reverseGeocode(latitude, longitude);
      if (result.results && result.results.length > 0) {
        const addressComponents = result.results[0].address_components;
        const formattedAddress = result.results[0].formatted_address;
        
        setAddressName(formattedAddress.split(',').slice(0, 2).join(', '));
        
        // Reset fields before populating
        setAddressLine1('');
        setAddressLine2('');
        setVillage('');
        setTehsil('');
        setDistrict('');
        setState('');
        setPincode('');

        addressComponents.forEach((component: any) => {
          const types = component.types;
          if (types.includes('premise') || types.includes('street_number')) {
            setAddressLine1(prev => prev ? `${prev} ${component.long_name}` : component.long_name);
          } else if (types.includes('route')) {
            setAddressLine2(component.long_name);
          } else if (types.includes('sublocality_level_2')) {
            setVillage(component.long_name);
          } else if (types.includes('sublocality_level_1')) {
            setTehsil(component.long_name);
          } else if (types.includes('locality')) {
            setDistrict(component.long_name);
          } else if (types.includes('administrative_area_level_1')) {
            setState(component.long_name);
          } else if (types.includes('postal_code')) {
            setPincode(component.long_name);
          }
        });
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
    }, 1000),
    [],
  );

  const handleRegionChangeComplete = (region: Region) => {
    setMapRegion(region);
    debouncedReverseGeocode(region);
  };

  const handlePlaceSelected = (data: any, details: any) => {
    // Gracefully handle cases where details might not be provided
    const lat = details?.geometry?.location?.lat;
    const lng = details?.geometry?.location?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert('Location not available', 'Could not fetch location details for the selected place. Please try another search.');
      return;
    }
    const newRegion = { 
      latitude: lat, 
      longitude: lng, 
      latitudeDelta: 0.005, 
      longitudeDelta: 0.005 
    };
    setMapRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 1000);
    reverseGeocodeLocation(lat, lng);
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    if (!addressLine1.trim()) {
      newErrors.addressLine1 = 'House/Flat/Floor number is required';
    }
    if (!district.trim()) {
      newErrors.district = 'District is required';
    }
    if (!state.trim()) {
      newErrors.state = 'State is required';
    }
    if (!pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^\d{6}$/.test(pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit pincode';
    }
    if (!addressTag.trim()) {
      newErrors.addressTag = 'An address name is required (e.g., Home, Work)';
    }
    
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
        coordinates: [mapRegion.longitude, mapRegion.latitude],
        isDefault: false,
      };

      if (isEditMode && editAddress) {
        await AddressService.updateAddress(editAddress._id, addressData);
        Alert.alert('Success', 'Address updated successfully');
      } else {
        await AddressService.createAddress(addressData);
        Alert.alert('Success', 'Address saved successfully');
      }
      
      navigation.goBack();
    } catch (error: any) {
      console.error('Error saving address:', JSON.stringify(error, null, 2));
      Alert.alert('Error', error.message || 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <GooglePlacesAutocomplete
              placeholder="Try Sector 75 etc..."
              onPress={(data, details = null) => handlePlaceSelected(data, details)}
              query={{
                key: GOOGLE_API_KEY,
                language: 'en',
                components: 'country:in',
              }}
              fetchDetails={true}
              // React 19 removed defaultProps for function components; pass safe defaults explicitly
              predefinedPlaces={[]}
              filterReverseGeocodingByTypes={[]}
              styles={{
                container: {
                  flex: 1,
                  backgroundColor: 'transparent',
                },
                textInput: styles.searchInput,
                listView: styles.listView,
              }}
              debounce={200}
              onFail={(error) => console.error('GPlaces DEBUG: API Error:', error)}
              onNotFound={() => console.log('GPlaces DEBUG: No results found for query.')}
              onPress={(data, details = null) => {
                console.log('GPlaces DEBUG: Place selected:', data.description);
                handlePlaceSelected(data, details);
              }}
            />
          </View>
        </View>

        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={mapRegion}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation={hasLocationPermission}
            showsMyLocationButton={false}
          >
          </MapView>
          
          <View style={styles.centerMarkerContainer}>
            <View style={styles.mapMessage}>
              <Text style={styles.mapMessageText}>Your order will be delivered here</Text>
              <Text style={styles.mapInstruction}>Move the map to set your location</Text>
            </View>
            <View style={styles.mapMessagePointer} />
          </View>

          {/* Current Location Button */}
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
            disabled={fetchingLocation}
          >
            {fetchingLocation ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
            ) : (
              <MaterialIcons name="my-location" size={20} color={COLORS.PRIMARY.MAIN} />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Form Section */}
        <ScrollView 
          style={styles.formContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.locationInfo}>
            <Ionicons name="location-sharp" size={24} color={COLORS.PRIMARY.MAIN} />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationTitle}>{addressName || 'Fetching...'}</Text>
              <Text style={styles.locationSubtitle} numberOfLines={2}>
                {`${addressLine1}, ${addressLine2}, ${village}, ${district}, ${state}, ${pincode}`}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[
                styles.input, 
                errors.addressLine1 && styles.inputError,
                focusedInput === 'addressLine1' && styles.inputFocused
              ]}
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="Flat, House No, Apartment"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              onFocus={() => setFocusedInput('addressLine1')}
              onBlur={() => setFocusedInput(null)}
            />
            {errors.addressLine1 && (
              <Text style={styles.errorText}>{errors.addressLine1}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[
                styles.input, 
                errors.addressLine2 && styles.inputError,
                focusedInput === 'addressLine2' && styles.inputFocused
              ]}
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="Locality/Area/Landmark"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              onFocus={() => setFocusedInput('addressLine2')}
              onBlur={() => setFocusedInput(null)}
            />
          </View>

          <View style={styles.inputGroup}>
            <TextInput
              style={[
                styles.input, 
                errors.addressTag && styles.inputError,
                focusedInput === 'addressTag' && styles.inputFocused
              ]}
              value={addressTag}
              onChangeText={setAddressTag}
              placeholder="Save address as (e.g., Home, Work)"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              onFocus={() => setFocusedInput('addressTag')}
              onBlur={() => setFocusedInput(null)}
            />
            {errors.addressTag && (
              <Text style={styles.errorText}>{errors.addressTag}</Text>
            )}
          </View>

          <Text style={styles.infoText}>
            This will be your address for all morning and instant deliveries.
          </Text>
        </ScrollView>
          <View style={styles.footer}>
            <Button
              title="SAVE ADDRESS"
              onPress={handleSaveAddress}
              loading={loading}
              fullWidth
              style={styles.saveButton}
            />
          </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 4,
      },
    }),
    zIndex: 10, // Ensure header is above other content
  },
  backButton: {
    padding: SPACING.XS,
    marginRight: SPACING.XS,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
  },
  searchContainer: {
    flex: 1,
    marginLeft: SPACING.SM,
    // Allow dropdown to render outside of this container
    overflow: 'visible',
  },
  searchInput: {
    height: 40,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  listView: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.MD,
    zIndex: 1000,
  },
  mapContainer: {
    height: screenHeight * 0.4,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centerMarkerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -70 }],
    width: 200,
    alignItems: 'center',
  },
  mapMessage: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.MD,
    alignItems: 'center',
  },
  mapMessagePointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.PRIMARY.MAIN,
  },
  mapMessageText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  mapInstruction: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    marginTop: SPACING.XS,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: SPACING.LG,
    right: SPACING.LG,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 50,
    padding: SPACING.SM,
    ...SHADOWS.MD,
  },
  formContainer: {
    flex: 1,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.LG,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  locationTextContainer: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  locationTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  locationSubtitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: SPACING.XS,
  },
  inputGroup: {
    marginBottom: SPACING.MD,
  },
  inputLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.XS,
  },
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
  inputFocused: {
    borderColor: COLORS.PRIMARY.MAIN,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#EF4444',
    marginTop: SPACING.XS,
  },
  infoText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING.LG,
    marginTop: SPACING.MD,
    paddingBottom: SPACING.LG,
  },
  footer: {
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
  },
});

export default AddAddressScreen;