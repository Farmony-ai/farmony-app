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
  const { listingId, fromSearch } = route.params;
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
      
      if (user && response.providerId) {
        const providerId = typeof response.providerId === 'object' 
          ? response.providerId._id 
          : response.providerId;
        setIsOwner(user.id === providerId);
      }
      
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
      <SafeAreaWrapper backgroundColor="#FAFAFA">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!listing) return null;

  return (
    <SafeAreaWrapper backgroundColor="#FAFAFA">
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {/* Clean Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          
          {isOwner && (
            <>
              <TouchableOpacity style={styles.headerButton} onPress={() => setShowMenu(!showMenu)}>
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            !isOwner && { paddingBottom: 100 }
          ]}
        >
          {/* Main Card Container */}
          <View style={styles.mainCard}>
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
                
                {/* Image Dots */}
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
                <Ionicons name="image-outline" size={40} color={COLORS.TEXT.SECONDARY} />
                <Text style={styles.noImageText}>No images available</Text>
              </View>
            )}

            {/* Content Section */}
            <View style={styles.contentSection}>
              {/* Title and Price Row */}
              <View style={styles.titlePriceRow}>
                <View style={styles.titleContainer}>
                  <Text style={styles.title}>{listing.subCategoryId.name}</Text>
                  <Text style={styles.category}>{listing.categoryId.name}</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceLabel}>Service price</Text>
                  <Text style={styles.price}>
                    ₹{listing.price.toLocaleString()}
                    <Text style={styles.priceUnit}>{getUnitLabel(listing.unitOfMeasure)}</Text>
                  </Text>
                </View>
              </View>

              {/* Info Grid */}
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Ionicons name="cube-outline" size={20} color="#666" />
                  <Text style={styles.infoValue}>{listing.minimumOrder}</Text>
                  <Text style={styles.infoLabel}>Min Order</Text>
                </View>
                
                {isOwner ? (
                  <>
                    <View style={styles.infoItem}>
                      <Ionicons name="eye-outline" size={20} color="#666" />
                      <Text style={styles.infoValue}>{listing.viewCount}</Text>
                      <Text style={styles.infoLabel}>Views</Text>
                    </View>
                    <View style={styles.infoItem}>
                      <MaterialIcons name="event-available" size={20} color="#666" />
                      <Text style={styles.infoValue}>{listing.bookingCount}</Text>
                      <Text style={styles.infoLabel}>Bookings</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.infoItem}>
                      <View style={styles.statusIndicator}>
                        <View style={[styles.statusDot, !listing.isActive && styles.inactiveDot]} />
                      </View>
                      <Text style={styles.infoValue}>
                        {listing.isActive ? 'Available' : 'Inactive'}
                      </Text>
                      <Text style={styles.infoLabel}>Status</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Description */}
               {listing.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionTitle}>About this service</Text>
                <Text style={styles.description}>{listing.description}</Text>
              </View>
               )}
              {/* Provider Info for Non-Owners */}
              {!isOwner && typeof listing.providerId === 'object' && (
                <View style={styles.providerSection}>
                  <View style={styles.providerInfo}>
                    <View style={styles.providerAvatar}>
                      <Ionicons name="person" size={20} color={COLORS.PRIMARY.MAIN} />
                    </View>
                    <View style={styles.providerDetails}>
                      <Text style={styles.providerLabel}>Service Provider</Text>
                      <Text style={styles.providerName}>{listing.providerId.name}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Owner Metrics */}
              {isOwner && (
                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Conversion</Text>
                    <Text style={styles.metricValue}>
                      {listing.bookingCount && listing.viewCount 
                        ? `${((listing.bookingCount / listing.viewCount) * 100).toFixed(1)}%`
                        : '0%'}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Avg Response</Text>
                    <Text style={styles.metricValue}>2 hrs</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Rating</Text>
                    <Text style={styles.metricValue}>4.8</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA for Non-Owners */}
        {!isOwner && listing.isActive && (
          <View style={styles.bottomCTA}>
            <View style={styles.ctaContent}>
              <View>
                <Text style={styles.ctaPriceLabel}>Starting from</Text>
                <Text style={styles.ctaPrice}>
                  ₹{listing.price.toLocaleString()}
                  <Text style={styles.ctaPriceUnit}>{getUnitLabel(listing.unitOfMeasure)}</Text>
                </Text>
              </View>
              <TouchableOpacity style={styles.proceedButton} onPress={handleProceedToCheckout}>
                <Text style={styles.proceedButtonText}>Book Now</Text>
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
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.SM,
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.XS,
    ...SHADOWS.LG,
    zIndex: 1000,
    minWidth: 150,
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
    paddingBottom: SPACING.XL,
  },
  mainCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginHorizontal: SPACING.MD,

    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden',
    ...SHADOWS.MD,
  },
  imageContainer: {
    width: screenWidth - (SPACING.MD * 2),
    height: 240,
    position: 'relative',
  },
  listingImage: {
    width: screenWidth - (SPACING.MD * 2),
    height: 240,
    resizeMode: 'cover',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: SPACING.MD,
    alignSelf: 'center',
    flexDirection: 'row',
    left: '50%',
    transform: [{ translateX: -30 }],
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
    width: 16,
  },
  noImageContainer: {
    height: 240,
    backgroundColor: COLORS.BACKGROUND.CARD,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    marginTop: SPACING.SM,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  contentSection: {
    padding: SPACING.MD,
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  titleContainer: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  title: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  category: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },
  price: {
    fontSize: FONT_SIZES['XL'],
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.SUCCESS.MAIN,
  },
  priceUnit: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  infoGrid: {
    flexDirection: 'row',
    paddingVertical: SPACING.MD,
    gap: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusIndicator: {
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.SUCCESS.MAIN,
  },
  inactiveDot: {
    backgroundColor: COLORS.TEXT.SECONDARY,
  },
  infoValue: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginTop: 4,
  },
  infoLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 2,
  },
  descriptionSection: {
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  description: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    lineHeight: 20,
  },
  providerSection: {
    paddingTop: SPACING.MD,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND.CARD,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  providerDetails: {
    flex: 1,
  },
  providerLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  providerName: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingTop: SPACING.MD,
    gap: SPACING.MD,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    ...SHADOWS.MD,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaPriceLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  ctaPrice: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  ctaPriceUnit: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  proceedButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.SM,
  },
  proceedButtonText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
});

export default ListingDetailScreen;