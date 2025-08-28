import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
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

  const getTagIcon = (tag: string) => {
    switch (tag) {
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

  const getDistanceText = (coords: [number, number]) => {
    if (!coords) return '';
    
    // Simple placeholder for distance
    const distance = Math.random() * 5 + 0.5; // Random distance for demo
    return distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`;
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select address</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Add New Address Button */}
          <TouchableOpacity
            style={styles.addNewButton}
            onPress={handleAddNewAddress}
          >
            <View style={styles.addIconWrapper}>
              <Ionicons name="add" size={20} color={COLORS.PRIMARY.MAIN} />
            </View>
            <Text style={styles.addNewText}>Add new address</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.TEXT.SECONDARY} />
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
                    <View style={styles.addressContent}>
                      <View style={styles.addressIconContainer}>
                        <Ionicons
                          name={getTagIcon(address.tag)}
                          size={20}
                          color={selectedAddressId === address._id ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY}
                        />
                      </View>
                      
                      <View style={styles.addressDetails}>
                        <View style={styles.addressHeaderRow}>
                          <Text style={styles.addressTag}>
                            {address.tag.charAt(0).toUpperCase() + address.tag.slice(1)}
                          </Text>
                          {selectedAddressId === address._id && (
                            <View style={styles.selectedBadge}>
                              <Text style={styles.selectedText}>SELECTED</Text>
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
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color={COLORS.TEXT.SECONDARY} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </>
          )}

          {/* Empty State */}
          {!loading && addresses.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color={COLORS.TEXT.PLACEHOLDER} />
              <Text style={styles.emptyStateTitle}>No addresses saved</Text>
              <Text style={styles.emptyStateText}>
                Add your first address to get started
              </Text>
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
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  scrollContent: {
    paddingBottom: SPACING['4XL'],
  },
  addNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    marginTop: SPACING.SM,
    marginBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  addIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  addNewText: {
    flex: 1,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
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
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  selectedAddressCard: {
    borderColor: COLORS.PRIMARY.MAIN,
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  addressContent: {
    flexDirection: 'row',
    padding: SPACING.MD,
  },
  addressIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  addressDetails: {
    flex: 1,
    marginRight: SPACING.SM,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  addressTag: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginRight: SPACING.SM,
  },
  selectedBadge: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  selectedText: {
    fontSize: 10,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.NEUTRAL.WHITE,
    letterSpacing: 0.3,
  },
  addressLine1: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  addressLine2: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 2,
  },
  addressFullDetails: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    lineHeight: 16,
    marginTop: 2,
  },
  menuButton: {
    padding: SPACING.XS,
    marginTop: -4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['4XL'],
  },
  emptyStateTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptyStateText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    paddingHorizontal: SPACING['2XL'],
  },
});

export default AddressSelectionScreen;