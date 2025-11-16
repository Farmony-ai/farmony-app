import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { SPACING, FONTS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setLocation } from '../store/slices/locationSlice';
import AddressService, { Address } from '../services/AddressService';

// Ultra-minimal color scheme
const COLORS_MINIMAL = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: {
    primary: '#000000',
    secondary: '#4A5568',
    muted: '#A0AEC0',
  },
  accent: '#10B981',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  danger: '#EF4444',
};

const AddressSelectionScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [user])
  );

  const fetchAddresses = async () => {
    if (!user?.id) {
      setAddresses([]);
      setSelectedAddressId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userAddresses = await AddressService.getUserAddresses(user.id);
      setAddresses(userAddresses);

      // Set the default address as selected
      const defaultAddress = userAddresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress._id);

        if (Array.isArray(defaultAddress.coordinates) && defaultAddress.coordinates.length === 2) {
          dispatch(setLocation({
            latitude: defaultAddress.coordinates[1],
            longitude: defaultAddress.coordinates[0],
            city: defaultAddress.district || defaultAddress.state,
          }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching addresses:', error);

      // Show error message to user
      Alert.alert(
        'Error',
        error?.message || 'Failed to load addresses. Please check your connection and try again.',
        [
          {
            text: 'Retry',
            onPress: () => fetchAddresses()
          },
          {
            text: 'OK',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAddresses();
    setRefreshing(false);
  };

  const handleSelectAddress = async (address: Address) => {
    setSelectedAddressId(address._id);

    // Update Redux store with selected address coordinates
    if (Array.isArray(address.coordinates) && address.coordinates.length === 2) {
      dispatch(setLocation({
        latitude: address.coordinates[1],
        longitude: address.coordinates[0],
        city: address.district || address.state || undefined,
      }));
    }

    // Set as default if not already
    if (!address.isDefault && user?.id) {
      try {
        // Backend endpoint doesn't exist yet, so this will fail
        // TODO: Remove this alert once backend implements PATCH /users/:userId/default-address
        await AddressService.setDefaultAddress(user.id, address._id);

        // Update local state to reflect the change
        setAddresses(prevAddresses =>
          prevAddresses.map(addr => ({
            ...addr,
            isDefault: addr._id === address._id
          }))
        );

        // Show success feedback
        Alert.alert('Success', 'Default address updated successfully');
      } catch (error: any) {
        console.error('Error setting default address:', error);

        // Since the endpoint doesn't exist, just update local state and continue
        console.log('⚠️ Backend endpoint not available, updating local state only');
        setAddresses(prevAddresses =>
          prevAddresses.map(addr => ({
            ...addr,
            isDefault: addr._id === address._id
          }))
        );
        // Don't show error to user, just navigate back
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
            if (!user?.id) {
              Alert.alert('Error', 'User not found. Please try again.');
              return;
            }

            try {
              await AddressService.deleteAddress(user.id, addressId);
              await fetchAddresses();
              Alert.alert('Success', 'Address deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getTagIcon = (tag?: string) => {
    const normalizedTag = tag?.toLowerCase();
    switch (normalizedTag) {
      case 'home':
        return 'home-outline';
      case 'work':
        return 'business-outline';
      case 'personal':
        return 'person-outline';
      default:
        return 'location-outline';
    }
  };

  const getTagLabel = (tag?: string) => {
    if (!tag || !tag.trim()) {
      return 'Other';
    }
    const normalized = tag.trim();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const getDistanceText = (coords: [number, number]) => {
    if (!coords) return '';
    
    // Simple placeholder for distance
    const distance = Math.random() * 5 + 0.5; // Random distance for demo
    return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={COLORS_MINIMAL.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Address</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={[COLORS_MINIMAL.accent]}
              tintColor={COLORS_MINIMAL.accent}
            />
          }
        >
          {/* Add New Address Button */}
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={handleAddNewAddress}
            activeOpacity={0.7}
          >
            <View style={styles.addIconWrapper}>
              <Ionicons name="add" size={20} color={COLORS_MINIMAL.accent} />
            </View>
            <Text style={styles.addNewText}>Add new address</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS_MINIMAL.text.muted} />
          </TouchableOpacity>

          {/* Saved Addresses Section */}
          {addresses.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Saved Addresses</Text>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS_MINIMAL.accent} />
                </View>
              ) : (
                <View style={styles.addressList}>
                  {addresses.map((address, index) => (
                    <TouchableOpacity
                      key={address._id}
                      style={[
                        styles.addressCard,
                        selectedAddressId === address._id && styles.selectedAddressCard
                      ]}
                      onPress={() => handleSelectAddress(address)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.addressContent}>
                        <View style={[
                          styles.addressIconContainer,
                          selectedAddressId === address._id && styles.selectedIconContainer
                        ]}>
                          <Ionicons
                            name={getTagIcon(address.tag)}
                            size={20}
                            color={selectedAddressId === address._id ? COLORS_MINIMAL.accent : COLORS_MINIMAL.text.secondary}
                          />
                        </View>
                        
                        <View style={styles.addressDetails}>
                          <View style={styles.addressHeaderRow}>
                            <Text style={styles.addressTag}>
                              {getTagLabel(address.tag)}
                            </Text>
                            {selectedAddressId === address._id && (
                              <View style={styles.selectedBadge}>
                                <Ionicons name="checkmark-circle" size={14} color={COLORS_MINIMAL.accent} />
                              </View>
                            )}
                          </View>
                          
                          <Text style={styles.addressLine1}>{address.addressLine1}</Text>
                          {address.addressLine2 && (
                            <Text style={styles.addressLine2}>{address.addressLine2}</Text>
                          )}
                          <Text style={styles.addressFullDetails}>
                            {[
                              address.village,
                              address.district,
                              address.state,
                              address.pincode
                            ].filter(Boolean).join(', ')}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.menuButton}
                          onPress={(e) => {
                            e.stopPropagation();
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
                          activeOpacity={0.7}
                        >
                          <Ionicons name="ellipsis-vertical" size={18} color={COLORS_MINIMAL.text.muted} />
                        </TouchableOpacity>
                      </View>
                      {index < addresses.length - 1 && <View style={styles.divider} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && addresses.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="location-outline" size={48} color={COLORS_MINIMAL.text.muted} />
              </View>
              <Text style={styles.emptyStateTitle}>No addresses saved</Text>
              <Text style={styles.emptyStateText}>
                Add your first address to get started. You can save addresses for home, work, farm, or any other location.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={handleAddNewAddress}
                activeOpacity={0.8}
              >
                <Text style={styles.emptyAddButtonText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS_MINIMAL.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS_MINIMAL.background,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
  },
  addIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS_MINIMAL.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addNewText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.primary,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.muted,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  addressList: {
    marginHorizontal: 20,
    backgroundColor: COLORS_MINIMAL.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addressCard: {
    backgroundColor: COLORS_MINIMAL.background,
  },
  selectedAddressCard: {
    backgroundColor: `${COLORS_MINIMAL.accent}08`,
  },
  addressContent: {
    flexDirection: 'row',
    padding: 16,
  },
  addressIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS_MINIMAL.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  selectedIconContainer: {
    backgroundColor: `${COLORS_MINIMAL.accent}15`,
  },
  addressDetails: {
    flex: 1,
    marginRight: 8,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressTag: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
    marginRight: 8,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressLine1: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 2,
  },
  addressLine2: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
    marginBottom: 2,
  },
  addressFullDetails: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
    lineHeight: 16,
    marginTop: 4,
  },
  menuButton: {
    padding: 4,
    marginTop: -4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS_MINIMAL.divider,
    marginLeft: 68,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS_MINIMAL.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddButton: {
    backgroundColor: COLORS_MINIMAL.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.background,
  },
});

export default AddressSelectionScreen;
