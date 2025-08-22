import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  NativeSyntheticEvent,
  TextInputSubmitEditingEventData,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setLocation } from '../store/slices/locationSlice';
import AddressService, { Address } from '../services/AddressService';
import LocationService from '../services/locationService';

const AddressSelectionScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { latitude, longitude, city } = useSelector((state: RootState) => state.location);

  const [searchQuery, setSearchQuery] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [fetchingCurrentLocation, setFetchingCurrentLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [user])
  );

  const fetchAddresses = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userAddresses = await AddressService.getUserAddresses(user?.id);
      setAddresses(userAddresses);
      
      // Set the default address as selected
      const defaultAddress = userAddresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress._id);
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAddresses();
    setRefreshing(false);
  };

  const handleCurrentLocation = async () => {
    setFetchingCurrentLocation(true);
    try {
      const location = await LocationService.getCurrentLocation();
      if (location) {
        dispatch(setLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.city || 'Current Location',
        }));
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Could not fetch current location. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location. Please check your location settings.');
    } finally {
      setFetchingCurrentLocation(false);
    }
  };

  const handleSelectAddress = async (address: Address) => {
    setSelectedAddressId(address._id);
    
    // Update Redux store with selected address coordinates
    dispatch(setLocation({
      latitude: address.coordinates[1],
      longitude: address.coordinates[0],
      city: address.district || address.state,
    }));

    // Set as default if not already
    if (!address.isDefault) {
      try {
        await AddressService.setDefaultAddress(address._id);
      } catch (error) {
        console.error('Error setting default address:', error);
      }
    }

    navigation.goBack();
  };

  const handleAddNewAddress = () => {
    navigation.navigate('AddAddress');
  };

  const handleEditAddress = (address: Address) => {
    navigation.navigate('AddAddress', { editAddress: address });
  };

  const handleDeleteAddress = (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AddressService.deleteAddress(addressId);
              await fetchAddresses();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            }
          },
        },
      ]
    );
  };

  const onSearchSubmit = (e: NativeSyntheticEvent<TextInputSubmitEditingEventData>) => {
    const query = e.nativeEvent.text?.trim();
    if (query?.length) {
      navigation.navigate('AddAddress', { initialQuery: query });
    }
  };

  const getTagIcon = (tag: string) => {
    switch (tag) {
      case 'home':
        return 'home';
      case 'work':
        return 'business';
      case 'personal':
        return 'person';
      default:
        return 'location-on';
    }
  };

  const getDistanceText = (coords: [number, number]) => {
    if (!latitude || !longitude) return '';
    
    // Simple distance calculation (you might want to use a proper formula)
    const distance = Math.sqrt(
      Math.pow(coords[1] - latitude, 2) + 
      Math.pow(coords[0] - longitude, 2)
    ) * 111; // Rough conversion to km
    
    return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select delivery location</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={COLORS.TEXT.SECONDARY} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a building, street name or area"
              placeholderTextColor={COLORS.TEXT.SECONDARY}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={onSearchSubmit}
              returnKeyType="search"
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Current Location Option */}
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={handleCurrentLocation}
            disabled={fetchingCurrentLocation}
          >
            <MaterialIcons 
              name="my-location" 
              size={20} 
              color={COLORS.PRIMARY.MAIN} 
            />
            <Text style={styles.currentLocationText}>
              {fetchingCurrentLocation ? 'Getting location...' : 'Use my current location'}
            </Text>
            {fetchingCurrentLocation && (
              <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
            )}
            <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT.SECONDARY} />
          </TouchableOpacity>

          {/* Add New Address */}
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={handleAddNewAddress}
          >
            <Ionicons name="add" size={24} color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.addNewText}>Add new address</Text>
          </TouchableOpacity>

          {/* Saved Addresses Section */}
          {addresses.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>SAVED ADDRESSES</Text>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
                </View>
              ) : (
                addresses.map((address) => (
                  <TouchableOpacity
                    key={address._id}
                    style={[
                      styles.addressCard,
                      selectedAddressId === address._id && styles.selectedAddressCard
                    ]}
                    onPress={() => handleSelectAddress(address)}
                  >
                    <View style={styles.addressHeader}>
                      <View style={styles.addressTagContainer}>
                        <MaterialIcons
                          name={getTagIcon(address.tag)}
                          size={20}
                          color={COLORS.TEXT.PRIMARY}
                        />
                        <Text style={styles.addressTag}>
                          {address.tag.charAt(0).toUpperCase() + address.tag.slice(1)}
                        </Text>
                        {address.coordinates && (
                          <Text style={styles.addressDistance}>
                            • {getDistanceText(address.coordinates)}
                          </Text>
                        )}
                        {selectedAddressId === address._id && (
                          <View style={styles.selectedBadge}>
                            <Text style={styles.selectedText}>CURRENTLY SELECTED</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => {
                          Alert.alert(
                            'Address Options',
                            '',
                            [
                              { text: 'Edit', onPress: () => handleEditAddress(address) },
                              { 
                                text: 'Delete', 
                                onPress: () => handleDeleteAddress(address._id),
                                style: 'destructive'
                              },
                              { text: 'Cancel', style: 'cancel' }
                            ]
                          );
                        }}
                      >
                        <Ionicons name="ellipsis-vertical" size={20} color={COLORS.TEXT.SECONDARY} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.addressLine1}>{address.addressLine1}</Text>
                    {address.addressLine2 && (
                      <Text style={styles.addressLine2}>{address.addressLine2}</Text>
                    )}
                    <Text style={styles.addressDetails}>
                      {[
                        address.village,
                        address.tehsil,
                        address.district,
                        address.state,
                        address.pincode,
                        'India'
                      ].filter(Boolean).join(', ')}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </ScrollView>
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
  searchContainer: {
    padding: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.LG,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  scrollContent: {
    paddingBottom: SPACING['4XL'],
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  currentLocationText: {
    flex: 1,
    marginLeft: SPACING.MD,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingVertical: SPACING.LG,
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  addNewText: {
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.SECONDARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    paddingVertical: SPACING['2XL'],
    alignItems: 'center',
  },
  addressCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  selectedAddressCard: {
    backgroundColor: '#F0FDF4',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.SM,
  },
  addressTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressTag: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginLeft: SPACING.SM,
  },
  addressDistance: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.SM,
  },
  selectedBadge: {
    backgroundColor: COLORS.SUCCESS.MAIN,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.SM,
    marginLeft: SPACING.SM,
  },
  selectedText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  menuButton: {
    padding: SPACING.XS,
  },
  addressLine1: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  addressLine2: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 2,
  },
  addressDetails: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    lineHeight: 18,
  },
});

export default AddressSelectionScreen;