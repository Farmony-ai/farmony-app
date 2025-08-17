/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ListingService, { PopulatedListing } from '../services/ListingService';

const { width: screenWidth } = Dimensions.get('window');

const ListingDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { listingId, fromSearch } = route.params; // Added fromSearch param
  const { token, user } = useSelector((state: RootState) => state.auth);

  const [listing, setListing] = useState<PopulatedListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isToggling, setIsToggling] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchListingDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ListingService.getListingById(listingId, token || undefined);
      setListing(response);
      
      // Check if current user is the owner
      if (user && response.providerId) {
        const providerId = typeof response.providerId === 'object' 
          ? response.providerId._id 
          : response.providerId;
        setIsOwner(user.id === providerId);
      }
      
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      console.error('Error fetching listing detail:', error);
      Alert.alert('Error', 'Failed to load listing details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [listingId, token, navigation, user, fadeAnim]);

  useFocusEffect(
    useCallback(() => {
      fetchListingDetail();
    }, [fetchListingDetail])
  );

  // Auto-scroll images
  useEffect(() => {
    if (listing?.photoUrls && listing.photoUrls.length > 1) {
      autoScrollTimer.current = setInterval(() => {
        setCurrentImageIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % listing.photoUrls.length;
          scrollViewRef.current?.scrollTo({
            x: screenWidth * nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, 3000);

      return () => {
        if (autoScrollTimer.current) {
          clearInterval(autoScrollTimer.current);
        }
      };
    }
  }, [listing?.photoUrls]);

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

  const handleProceedToCheckout = () => {
    if (!listing) return;
    
    const bookingData = {
      listing: listing,
      listingId: listing._id,
    };
    
    navigation.navigate('Checkout', bookingData);
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
    return unitLabels[unit] || '';
  };

  const handleScroll = (event: any) => {
    const slideSize = screenWidth;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
  };

  if (loading) {
    return (
      <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!listing) return null;

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Clean Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          
          {isOwner && (
            <>
              <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(!showMenu)}>
                <Ionicons name="ellipsis-vertical" size={20} color={COLORS.TEXT.PRIMARY} />
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
                      {isToggling ? 'Processing...' : (listing?.isActive ? 'Deactivate' : 'Activate')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={[styles.menuText, { color: "#EF4444" }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            !isOwner && { paddingBottom: 100 } // Extra padding for bottom button
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Carousel */}
          {listing.photoUrls && listing.photoUrls.length > 0 ? (
            <View style={styles.imageContainer}>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onTouchStart={() => {
                  if (autoScrollTimer.current) {
                    clearInterval(autoScrollTimer.current);
                  }
                }}
                onTouchEnd={() => {
                  if (listing.photoUrls && listing.photoUrls.length > 1) {
                    autoScrollTimer.current = setInterval(() => {
                      setCurrentImageIndex((prevIndex) => {
                        const nextIndex = (prevIndex + 1) % listing.photoUrls.length;
                        scrollViewRef.current?.scrollTo({
                          x: screenWidth * nextIndex,
                          animated: true,
                        });
                        return nextIndex;
                      });
                    }, 3000);
                  }
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
                <View style={styles.dotsContainer}>
                  {listing.photoUrls.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === currentImageIndex && styles.activeDot
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image-outline" size={48} color={COLORS.TEXT.SECONDARY} />
              <Text style={styles.noImageText}>No images available</Text>
            </View>
          )}

          {/* Main Info Card */}
          <View style={styles.mainCard}>
            {/* Title Section */}
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{listing.subCategoryId.name}</Text>
                  <Text style={styles.category}>{listing.categoryId.name}</Text>
                </View>
                <View style={[styles.statusBadge, !listing.isActive && styles.inactiveBadge]}>
                  <Text style={[styles.statusText, !listing.isActive && styles.inactiveText]}>
                    {listing.isActive ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>
              
              {/* Description */}
              <Text style={styles.description}>{listing.description}</Text>
            </View>

            {/* Price Section */}
            <View style={styles.priceSection}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Price</Text>
                <View style={styles.minOrderContainer}>
                  <Text style={styles.minOrderLabel}>Min. Order</Text>
                  <Text style={styles.minOrderValue}>
                    {listing.minimumOrder} {listing.unitOfMeasure.replace('per_', '')}
                  </Text>
                </View>
              </View>
              <Text style={styles.price}>
                ₹{listing.price}
                <Text style={styles.priceUnit}>{getUnitLabel(listing.unitOfMeasure)}</Text>
              </Text>
            </View>

            {/* Stats Cards - Only for Owners */}
            {isOwner && (
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="eye-outline" size={20} color={COLORS.PRIMARY.MAIN} />
                  </View>
                  <Text style={styles.statValue}>{listing.viewCount}</Text>
                  <Text style={styles.statLabel}>Views</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <MaterialIcons name="event-available" size={20} color={COLORS.SUCCESS.MAIN} />
                  </View>
                  <Text style={styles.statValue}>{listing.bookingCount}</Text>
                  <Text style={styles.statLabel}>Bookings</Text>
                </View>
              </View>
            )}

            {/* Provider Info for Non-Owners */}
            {!isOwner && (
              <View style={styles.providerSection}>
                <View style={styles.providerHeader}>
                  <View style={styles.providerAvatar}>
                    <Ionicons name="person" size={24} color={COLORS.PRIMARY.MAIN} />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>
                      {typeof listing.providerId === 'object' ? listing.providerId.name : 'Service Provider'}
                    </Text>
                    {typeof listing.providerId === 'object' && listing.providerId.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <MaterialIcons name="verified" size={14} color={COLORS.SUCCESS.MAIN} />
                        <Text style={styles.verifiedText}>Verified Provider</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Button for Non-Owners - Simplified */}
        {!isOwner && listing.isActive && (
          <View style={styles.bottomButtonContainer}>
            <View style={styles.bottomButtonContent}>
              <View style={styles.bottomPriceInfo}>
                <Text style={styles.bottomPriceLabel}>Starting from</Text>
                <Text style={styles.bottomPriceValue}>
                  ₹{listing.price}
                  <Text style={styles.bottomPriceUnit}>{getUnitLabel(listing.unitOfMeasure)}</Text>
                </Text>
              </View>
              <TouchableOpacity style={styles.proceedButton} onPress={handleProceedToCheckout}>
                <Text style={styles.proceedButtonText}>Proceed</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.NEUTRAL.WHITE} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    position: 'relative',
  },
  backButton: {
    padding: SPACING.XS,
  },
  menuButton: {
    padding: SPACING.XS,
  },
  menuDropdown: {
    position: 'absolute',
    top: 50,
    right: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.XS,
    ...SHADOWS.LG,
    zIndex: 1000,
    minWidth: 140,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.SM,
  },
  menuText: {
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  scrollContent: {
    paddingBottom: SPACING['4XL'],
  },
  imageContainer: {
    width: screenWidth,
    height: 280,
    position: 'relative',
  },
  listingImage: {
    width: screenWidth,
    height: 280,
    resizeMode: 'cover',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: SPACING.MD,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.LG,
    left: '50%',
    transform: [{ translateX: -40 }],
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  noImageContainer: {
    height: 280,
    backgroundColor: COLORS.BACKGROUND.CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: SPACING.SM,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  mainCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginTop: -SPACING.LG,
    marginHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.XL,
    padding: SPACING.LG,
    ...SHADOWS.LG,
  },
  titleSection: {
    marginBottom: SPACING.LG,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.SM,
  },
  titleContainer: {
    flex: 1,
    marginRight: SPACING.SM,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  category: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  statusBadge: {
    backgroundColor: COLORS.SUCCESS.LIGHT,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.LG,
  },
  inactiveBadge: {
    backgroundColor: COLORS.BACKGROUND.CARD,
  },
  statusText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.SUCCESS.MAIN,
  },
  inactiveText: {
    color: COLORS.TEXT.SECONDARY,
  },
  description: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    lineHeight: 20,
  },
  priceSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    paddingTop: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  priceLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  minOrderContainer: {
    alignItems: 'flex-end',
  },
  minOrderLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  minOrderValue: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  price: {
    fontSize: 24,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  priceUnit: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  statValue: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  providerSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    paddingTop: SPACING.MD,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.BACKGROUND.CARD,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.SUCCESS.MAIN,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: -28,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  bottomButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPriceInfo: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  bottomPriceValue: {
    fontSize: FONT_SIZES.XL,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  bottomPriceUnit: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    gap: SPACING.SM,
    ...SHADOWS.MD,
  },
  proceedButtonText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
});

export default ListingDetailScreen;