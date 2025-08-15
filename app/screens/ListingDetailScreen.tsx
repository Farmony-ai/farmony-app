/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ListingService, { PopulatedListing } from '../services/ListingService';

const ListingDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { listingId } = route.params;
  const { token } = useSelector((state: RootState) => state.auth);

  const [listing, setListing] = useState<PopulatedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isToggling, setIsToggling] = useState(false);

  const fetchListingDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ListingService.getListingById(listingId, token || undefined);
      console.log("This is the response", response);
      setListing(response);
    } catch (error) {
      console.error('Error fetching listing detail:', error);
      Alert.alert('Error', 'Failed to load listing details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [listingId, token, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchListingDetail();
    }, [fetchListingDetail])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              if (!token) throw new Error('Authentication token not found');
              await ListingService.deleteListing(listingId, token);
              Alert.alert('Success', 'Listing deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('Error deleting listing:', error);
              Alert.alert('Error', 'Failed to delete listing. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    setShowMenu(false);
    navigation.navigate('CreateListing', { listingId: listing?._id });
  };

  const handleToggleStatus = async () => {
    if (!listing || !token || isToggling) return;
    
    try {
      setIsToggling(true);
      setShowMenu(false);
      
      const newStatus = !listing.isActive;
      await ListingService.toggleListingStatus(listing._id, newStatus, token);
      
      // Update the local state
      setListing(prevListing => 
        prevListing ? { ...prevListing, isActive: newStatus } : null
      );
      
      Alert.alert(
        'Success', 
        `Listing has been ${newStatus ? 'activated' : 'deactivated'} successfully.`
      );
    } catch (error) {
      console.error('Error toggling listing status:', error);
      Alert.alert('Error', 'Failed to update listing status. Please try again.');
    } finally {
      setIsToggling(false);
    }
  };

  const getUnitLabel = (unit: string) => {
    const unitLabels: { [key: string]: string } = {
        per_hour: '/hr',
        per_day: '/day',
        per_hectare: '/ha',
        per_kg: '/kg',
        per_unit: '/unit',
        per_piece: '/piece',
    };
    return unitLabels[unit] || unit;
  };

  if (loading) {
    return (
      <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!listing) return null;

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
        <Text variant="h4" weight="semibold" style={styles.headerTitle}>
          Listing Details
        </Text>
        <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(!showMenu)}>
          <Ionicons name="ellipsis-vertical" size={24} color={COLORS.TEXT.PRIMARY} />
        </TouchableOpacity>
        {showMenu && (
          <View style={styles.menuDropdown}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
              <Ionicons name="create-outline" size={18} color={COLORS.TEXT.PRIMARY} />
              <Text style={styles.menuText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, isToggling && styles.menuItemDisabled]} 
              onPress={handleToggleStatus}
              disabled={isToggling}
            >
              <Ionicons 
                name={listing?.isActive ? "pause-outline" : "play-outline"} 
                size={18} 
                color={listing?.isActive ? "#F59E0B" : COLORS.SUCCESS.MAIN} 
              />
              <Text style={[styles.menuText, { 
                color: listing?.isActive ? "#F59E0B" : COLORS.SUCCESS.MAIN 
              }]}>
                {isToggling 
                  ? 'Processing...' 
                  : (listing?.isActive ? 'Deactivate' : 'Activate')
                }
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.menuText, { color: "#EF4444" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {listing.photoUrls && listing.photoUrls.length > 0 ? (
          <View style={styles.imageGalleryContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.imageGallery}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / 400);
                setCurrentImageIndex(index);
              }}
            >
              {listing.photoUrls.map((photo, index) => (
                <Image 
                  key={index} 
                  source={{ uri: typeof photo === 'string' ? photo : photo.uri }} 
                  style={styles.listingImage} 
                />
              ))}
            </ScrollView>
            {listing.photoUrls.length > 1 && (
              <View style={styles.paginationContainer}>
                {listing.photoUrls.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Ionicons name="image-outline" size={64} color={COLORS.TEXT.SECONDARY} />
            <Text style={styles.noImageText}>No images available</Text>
          </View>
        )}
       

        <View style={styles.section}>
          <Text variant="h4" weight="bold" style={styles.title}>
            {listing.subCategoryId.name}
          </Text>
          <View style={styles.metaContainer}>
            <View style={styles.categoryBadge}>
              <Ionicons name="pricetag-outline" size={16} color={COLORS.PRIMARY.MAIN} />
              <Text variant="caption" color={COLORS.PRIMARY.MAIN} style={{ marginLeft: 4 }}>
                {listing.categoryId.name}
              </Text>
            </View>
            <View style={[styles.statusBadge, !listing.isActive && styles.statusBadgeInactive]}>
              <Text variant="caption" weight="medium" color={listing.isActive ? COLORS.PRIMARY.MAIN : '#6B7280'}>
                {listing.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text variant="body" color={COLORS.TEXT.SECONDARY} style={styles.description}>
            {listing.description}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Pricing Details
          </Text>
          <View style={styles.pricingContainer}>
            <View style={styles.priceItem}>
              <Text variant="body" color={COLORS.TEXT.SECONDARY}>Price</Text>
              <Text variant="h4" weight="bold" color={COLORS.PRIMARY.MAIN}>
                ₹{listing.price}{getUnitLabel(listing.unitOfMeasure)}
              </Text>
            </View>
            <View style={styles.priceItem}>
              <Text variant="body" color={COLORS.TEXT.SECONDARY}>Minimum Order</Text>
              <Text variant="h4" weight="semibold">
                {listing.minimumOrder} {listing.unitOfMeasure.replace('per_', '')}(s)
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="h4" weight="semibold" style={styles.sectionTitle}>
            Statistics
          </Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="eye-outline" size={24} color={COLORS.PRIMARY.MAIN} />
              <Text variant="h3" weight="bold" style={styles.statValue}>
                {listing.viewCount}
              </Text>
              <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                Views
              </Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar-check-outline" size={24} color={COLORS.PRIMARY.MAIN} />
              <Text variant="h3" weight="bold" style={styles.statValue}>
                {listing.bookingCount}
              </Text>
              <Text variant="caption" color={COLORS.TEXT.SECONDARY}>
                Bookings
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.MD,
        paddingVertical: SPACING.MD,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.BORDER.PRIMARY,
        position: 'relative',
      },
      backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
      },
      headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.TEXT.PRIMARY,
      },
      menuButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
      },
      menuDropdown: {
        position: 'absolute',
        top: 60,
        right: SPACING.MD,
        backgroundColor: COLORS.BACKGROUND.CARD,
        borderRadius: BORDER_RADIUS.MD,
        padding: SPACING.XS,
        ...SHADOWS.MD,
        zIndex: 1000,
        width: 120,
      },
      menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.SM,
      },
      menuText: {
        marginLeft: SPACING.SM,
        fontSize: 14,
        fontFamily: FONTS.POPPINS.MEDIUM,
      },
      menuItemDisabled: {
        opacity: 0.5,
      },
      scrollContent: {
        paddingBottom: 100,
      },
      imageGallery: {
        height: 250,
        backgroundColor: COLORS.BACKGROUND.CARD,
      },
      listingImage: {
        width: 400,
        height: 250,
        resizeMode: 'cover',
      },
      section: {
        padding: SPACING.MD,
        backgroundColor: '#fff',
        marginBottom: SPACING.SM,
      },
      title: {
        marginBottom: SPACING.SM,
        fontSize: 20,
      },
      metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.MD,
      },
      categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.PRIMARY.LIGHT,
        paddingHorizontal: SPACING.SM,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.SM,
      },
      statusBadge: {
        backgroundColor: COLORS.PRIMARY.LIGHT,
        paddingHorizontal: SPACING.SM,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.SM,
      },
      statusBadgeInactive: {
        backgroundColor: COLORS.BACKGROUND.CARD,
      },
      description: {
        lineHeight: 22,
        fontSize: 14,
        color: COLORS.TEXT.SECONDARY,
      },
      sectionTitle: {
        marginBottom: SPACING.MD,
        fontSize: 16,
      },
      pricingContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
      priceItem: {
        flex: 1,
      },
      statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
      },
      statCard: {
        alignItems: 'center',
        flex: 1,
      },
      statValue: {
        marginVertical: SPACING.XS,
      },
      noImageContainer: {
        height: 250,
        backgroundColor: COLORS.BACKGROUND.CARD,
        justifyContent: 'center',
        alignItems: 'center',
      },
      noImageText: {
        marginTop: SPACING.SM,
        fontSize: 16,
        fontFamily: FONTS.POPPINS.MEDIUM,
        color: COLORS.TEXT.SECONDARY,
      },
      imageGalleryContainer: {
        position: 'relative',
      },
      paginationContainer: {
        position: 'absolute',
        bottom: SPACING.MD,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      },
      paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        marginHorizontal: 4,
      },
      paginationDotActive: {
        backgroundColor: COLORS.PRIMARY.MAIN,
      },
});

export default ListingDetailScreen;
