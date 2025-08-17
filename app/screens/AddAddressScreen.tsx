import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import Button from '../components/Button';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import AddressService, { Address, CreateAddressDto } from '../services/AddressService';
import LocationService from '../services/locationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface RouteParams {
  editAddress?: Address;
}

const AddAddressScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { editAddress } = route.params as RouteParams || {};
  const { userId } = useSelector((state: RootState) => state.auth);
  const { latitude: currentLat, longitude: currentLng } = useSelector(
    (state: RootState) => state.location
  );

  const mapRef = useRef<MapView>(null);
  const [isEditMode] = useState(!!editAddress);
  
  // Map state
  const [mapRegion, setMapRegion] = useState({
    latitude: editAddress?.coordinates[1] || currentLat || 17.385044,
    longitude: editAddress?.coordinates[0] || currentLng || 78.486671,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: editAddress?.coordinates[1] || currentLat || 17.385044,
    longitude: editAddress?.coordinates[0] || currentLng || 78.486671,
  });

  // Form state
  const [addressLine1, setAddressLine1] = useState(editAddress?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(editAddress?.addressLine2 || '');
  const [village, setVillage] = useState(editAddress?.village || '');
  const [tehsil, setTehsil] = useState(editAddress?.tehsil || '');
  const [district, setDistrict] = useState(editAddress?.district || '');
  const [state, setState] = useState(editAddress?.state || '');
  const [pincode, setPincode] = useState(editAddress?.pincode || '');
  const [selectedTag, setSelectedTag] = useState<'home' | 'work' | 'personal' | 'other'>(
    editAddress?.tag || 'home'
  );

  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!editAddress) {
      getCurrentLocation();
    }
  }, []);

  const getCurrentLocation = async () => {
    setFetchingLocation(true);
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        const newCoordinate = {
          latitude: location.latitude,
          longitude: location.longitude,
        };
        setMarkerCoordinate(newCoordinate);
        setMapRegion({
          ...newCoordinate,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
        mapRef.current?.animateToRegion({
          ...newCoordinate,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
        
        // Reverse geocode to get address details
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
        
        // Parse address components
        addressComponents.forEach((component: any) => {
          const types = component.types;
          if (types.includes('route')) {
            setAddressLine1(component.long_name);
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

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setMarkerCoordinate(coordinate);
    reverseGeocodeLocation(coordinate.latitude, coordinate.longitude);
  };

  const handleMarkerDragEnd = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setMarkerCoordinate(coordinate);
    reverseGeocodeLocation(coordinate.latitude, coordinate.longitude);
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const addressData: CreateAddressDto = {
        userId,
        tag: selectedTag,
        addressLine1,
        addressLine2,
        village,
        tehsil,
        district,
        state,
        pincode,
        coordinates: [markerCoordinate.longitude, markerCoordinate.latitude],
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
      Alert.alert('Error', error.message || 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const TagButton = ({ tag, label }: { tag: 'home' | 'work' | 'personal' | 'other'; label: string }) => (
    <TouchableOpacity
      style={[styles.tagButton, selectedTag === tag && styles.tagButtonActive]}
      onPress={() => setSelectedTag(tag)}
    >
      <MaterialIcons
        name={tag === 'home' ? 'home' : tag === 'work' ? 'business' : tag === 'personal' ? 'person' : 'location-on'}
        size={18}
        color={selectedTag === tag ? COLORS.NEUTRAL.WHITE : COLORS.TEXT.SECONDARY}
      />
      <Text style={[styles.tagButtonText, selectedTag === tag && styles.tagButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Address' : 'Add New Address'}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Map View */}
          <View style={styles.mapContainer}>
            <MapView
              ref={mapRef}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
              style={styles.map}
              initialRegion={mapRegion}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={false}
            >
              <Marker
                coordinate={markerCoordinate}
                draggable
                onDragEnd={handleMarkerDragEnd}
              />
            </MapView>
            
            {/* Map Overlay Message */}
            <View style={styles.mapOverlay}>
              <View style={styles.mapMessage}>
                <Ionicons name="location" size={16} color={COLORS.PRIMARY.MAIN} />
                <Text style={styles.mapMessageText}>Order will be delivered here</Text>
              </View>
              <Text style={styles.mapInstruction}>Move the pin to change location</Text>
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
              <Text style={styles.currentLocationText}>Use Current Location</Text>
            </TouchableOpacity>
          </View>

          {/* Address Details Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formHint}>
              A detailed address will help our Delivery Partner reach your doorstep easily
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>HOUSE / FLAT / FLOOR NO.</Text>
              <TextInput
                style={[styles.input, errors.addressLine1 && styles.inputError]}
                value={addressLine1}
                onChangeText={setAddressLine1}
                placeholder="e.g., Flat 302, Tower B"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              />
              {errors.addressLine1 && (
                <Text style={styles.errorText}>{errors.addressLine1}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>APARTMENT / ROAD / AREA (RECOMMENDED)</Text>
              <TextInput
                style={styles.input}
                value={addressLine2}
                onChangeText={setAddressLine2}
                placeholder="e.g., Green Valley Apartments"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.inputLabel}>VILLAGE/LOCALITY</Text>
                <TextInput
                  style={styles.input}
                  value={village}
                  onChangeText={setVillage}
                  placeholder="e.g., Kondapur"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                />
              </View>

              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.inputLabel}>TEHSIL/TALUK</Text>
                <TextInput
                  style={styles.input}
                  value={tehsil}
                  onChangeText={setTehsil}
                  placeholder="e.g., Serilingampally"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.inputLabel}>DISTRICT *</Text>
                <TextInput
                  style={[styles.input, errors.district && styles.inputError]}
                  value={district}
                  onChangeText={setDistrict}
                  placeholder="e.g., Hyderabad"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                />
                {errors.district && (
                  <Text style={styles.errorText}>{errors.district}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, styles.inputHalf]}>
                <Text style={styles.inputLabel}>STATE *</Text>
                <TextInput
                  style={[styles.input, errors.state && styles.inputError]}
                  value={state}
                  onChangeText={setState}
                  placeholder="e.g., Telangana"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                />
                {errors.state && (
                  <Text style={styles.errorText}>{errors.state}</Text>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PINCODE *</Text>
              <TextInput
                style={[styles.input, errors.pincode && styles.inputError]}
                value={pincode}
                onChangeText={setPincode}
                placeholder="e.g., 500032"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                keyboardType="numeric"
                maxLength={6}
              />
              {errors.pincode && (
                <Text style={styles.errorText}>{errors.pincode}</Text>
              )}
            </View>

            {/* Save As Tags */}
            <View style={styles.tagSection}>
              <Text style={styles.tagSectionTitle}>SAVE AS</Text>
              <View style={styles.tagContainer}>
                <TagButton tag="home" label="Home" />
                <TagButton tag="work" label="Work" />
                <TagButton tag="personal" label="Personal" />
                <TagButton tag="other" label="Other" />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Button
            title={isEditMode ? 'UPDATE ADDRESS DETAILS' : 'SAVE ADDRESS DETAILS'}
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
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  backButton: {
    padding: SPACING.XS,
    marginRight: SPACING.MD,
  },
  headerTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  mapContainer: {
    height: 250,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: SPACING.LG,
    alignSelf: 'center',
    alignItems: 'center',
  },
  mapMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.TEXT.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.MD,
  },
  mapMessageText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    marginLeft: SPACING.XS,
  },
  mapInstruction: {
    color: COLORS.TEXT.SECONDARY,
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    marginTop: SPACING.XS,
  },
  currentLocationButton: {
    position: 'absolute',
    bottom: SPACING.MD,
    left: SPACING.MD,
    right: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY.MAIN,
    ...SHADOWS.SM,
  },
  currentLocationText: {
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  formContainer: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    padding: SPACING.MD,
  },
  formHint: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.PRIMARY.MAIN,
    backgroundColor: '#FFF9E6',
    padding: SPACING.SM,
    borderRadius: BORDER_RADIUS.SM,
    marginBottom: SPACING.MD,
  },
  inputGroup: {
    marginBottom: SPACING.MD,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  inputHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.XS,
    letterSpacing: 0.5,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  inputError: {
    borderBottomColor: '#EF4444',
  },
  errorText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#EF4444',
    marginTop: SPACING.XS,
  },
  tagSection: {
    marginTop: SPACING.LG,
  },
  tagSectionTitle: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.SM,
    letterSpacing: 0.5,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  tagButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  tagButtonActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  tagButtonText: {
    marginLeft: SPACING.XS,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  tagButtonTextActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    ...SHADOWS.MD,
  },
  saveButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
});

export default AddAddressScreen;