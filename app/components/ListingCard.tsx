import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native';
import Text from './Text';
import { SPACING, BORDER_RADIUS, SHADOWS } from '../utils/spacing';
import { COLORS, getColorWithOpacity } from '../utils/colors';
import { FONTS, FONT_SIZES, getFontFamily } from '../utils/fonts';
import categoryHierarchy from '../../docs/category hierarchy.json';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { Listing, PopulatedListing } from '../services/ListingService';
import ListingService from '../services/ListingService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface ListingCardProps {
  listing: Listing | PopulatedListing;
  onPress?: (listingId: string) => void;
  onEdit?: (listingId: string) => void;
  onActivate?: (listingId: string) => void;
  onDeactivate?: (listingId: string) => void;
  onStatusChange?: (listingId: string, newStatus: boolean) => void;
  style?: object;
}

type ListingCardNavigationProp = StackNavigationProp<RootStackParamList, 'ListingDetail'>;

const { width: screenWidth } = Dimensions.get('window');

const ListingCard = ({ listing, onPress, onEdit, onActivate, onDeactivate, onStatusChange, style }: ListingCardProps) => {
  const navigation = useNavigation<ListingCardNavigationProp>();
  const [showMenu, setShowMenu] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  const { token } = useSelector((state: RootState) => state.auth);

  // Get images array
  const images = listing.photoUrls && listing.photoUrls.length > 0 
    ? listing.photoUrls 
    : ['https://via.placeholder.com/400x200'];

  // Auto-scroll images
  useEffect(() => {
    if (images.length > 1) {
      autoScrollTimer.current = setInterval(() => {
        setCurrentImageIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % images.length;
          scrollViewRef.current?.scrollTo({
            x: (screenWidth - SPACING.LG * 2) * nextIndex,
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
  }, [images.length]);

  const getSubCategoryName = () => {
    if (typeof listing.subCategoryId === 'object' && listing.subCategoryId?.name) {
      return listing.subCategoryId.name;
    }
    for (const category of categoryHierarchy) {
      const subcategory = category.subcategories?.find(sub => sub._id === listing.subCategoryId);
      if (subcategory) {
        return subcategory.name;
      }
    }
    return 'Service';
  };

  const getProviderName = () => {
    if (typeof listing.providerId === 'object' && listing.providerId?.name) {
      return listing.providerId.name;
    }
    return 'Service Provider';
  };

  const isProviderVerified = () => {
    if (typeof listing.providerId === 'object' && listing.providerId?.isVerified !== undefined) {
      return listing.providerId.isVerified;
    }
    return false;
  };

  const getRating = () => {
    return listing.rating || 4.5;
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress(listing._id);
    } else {
      navigation.navigate('ListingDetail', { listingId: listing._id });
    }
  };

  const handleMenuPress = (event: any) => {
    event.stopPropagation();
    setShowMenu(true);
  };

  const handleMenuItemPress = async (action: 'edit' | 'activate' | 'deactivate') => {
    setShowMenu(false);
    
    if (action === 'edit') {
      if (onEdit) {
        onEdit(listing._id);
      } else {
        (navigation as any).navigate('CreateListing', { listingId: listing._id });
      }
    } else if (action === 'activate' || action === 'deactivate') {
      if (isToggling || !token) return;
      
      try {
        setIsToggling(true);
        const newStatus = action === 'activate';
        
        if (action === 'activate' && onActivate) {
          onActivate(listing._id);
        } else if (action === 'deactivate' && onDeactivate) {
          onDeactivate(listing._id);
        } else {
          await ListingService.toggleListingStatus(listing._id, newStatus);
          
          if (onStatusChange) {
            onStatusChange(listing._id, newStatus);
          }
        }
      } catch (error) {
        console.error('Error toggling listing status:', error);
      } finally {
        setIsToggling(false);
      }
    }
  };

  const handleScroll = (event: any) => {
    const slideSize = screenWidth - SPACING.LG * 2;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
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

  return (
    <TouchableOpacity 
      style={[styles.card, style]} 
      onPress={handleCardPress}
      activeOpacity={0.95}
    >
      {/* Image Carousel */}
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
            if (images.length > 1) {
              autoScrollTimer.current = setInterval(() => {
                setCurrentImageIndex((prevIndex) => {
                  const nextIndex = (prevIndex + 1) % images.length;
                  scrollViewRef.current?.scrollTo({
                    x: (screenWidth - SPACING.LG * 2) * nextIndex,
                    animated: true,
                  });
                  return nextIndex;
                });
              }, 3000);
            }
          }}
        >
          {images.map((image, index) => (
            <Image
              key={index}
              source={{ uri: typeof image === 'string' ? image : 'https://via.placeholder.com/400x200' }}
              style={styles.image}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Image Dots Indicator */}
        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
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

        {/* Status Badge */}
        {listing.isActive !== undefined && (
          <View style={[
            styles.statusBadge,
            { backgroundColor: listing.isActive ? COLORS.SUCCESS.MAIN : COLORS.NEUTRAL.GRAY[700] }
          ]}>
            <Text style={styles.statusText}>
              {listing.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        )}

        {/* Menu Button */}
        <TouchableOpacity 
          onPress={handleMenuPress} 
          style={styles.menuButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.menuIconContainer}>
            <Ionicons name="ellipsis-vertical" size={16} color={COLORS.NEUTRAL.GRAY[700]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Title and Rating Row */}
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {listing.title || getSubCategoryName()}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {getProviderName()}
            </Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{getRating()}</Text>
            <Ionicons name="star" size={12} color={COLORS.NEUTRAL.WHITE} />
          </View>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="eye-outline" size={14} color={COLORS.TEXT.SECONDARY} />
            <Text style={styles.infoText}>{listing.viewCount || 0} views</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.TEXT.SECONDARY} />
            <Text style={styles.infoText}>{listing.bookingCount || 0} bookings</Text>
          </View>
          {isProviderVerified() && (
            <>
              <View style={styles.separator} />
              <View style={styles.infoItem}>
                <MaterialIcons name="verified" size={14} color={COLORS.SUCCESS.MAIN} />
                <Text style={[styles.infoText, { color: COLORS.SUCCESS.MAIN }]}>Verified</Text>
              </View>
            </>
          )}
        </View>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Starting from</Text>
          <Text style={styles.priceText}>
            ₹{listing.price}
            <Text style={styles.priceUnit}>{getUnitLabel(listing.unitOfMeasure)}</Text>
          </Text>
        </View>
      </View>

      {/* Menu Modal */}
      <Modal
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItemPress('edit')}>
              <Ionicons name="create-outline" size={18} color={COLORS.TEXT.PRIMARY} />
              <Text style={styles.menuItemText}>Edit Listing</Text>
            </TouchableOpacity>
            {listing.isActive ? (
              <TouchableOpacity 
                style={[styles.menuItem, isToggling && styles.menuItemDisabled]} 
                onPress={() => handleMenuItemPress('deactivate')}
                disabled={isToggling}
              >
                <Ionicons name="pause-circle-outline" size={18} color={COLORS.TEXT.PRIMARY} />
                <Text style={styles.menuItemText}>
                  {isToggling ? 'Processing...' : 'Deactivate'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.menuItem, isToggling && styles.menuItemDisabled]} 
                onPress={() => handleMenuItemPress('activate')}
                disabled={isToggling}
              >
                <Ionicons name="play-circle-outline" size={18} color={COLORS.TEXT.PRIMARY} />
                <Text style={styles.menuItemText}>
                  {isToggling ? 'Processing...' : 'Activate'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.XL,
    overflow: 'hidden',
    marginBottom: SPACING.MD,
    ...SHADOWS.LG,
    width: screenWidth - SPACING.LG * 2,
    alignSelf: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  image: {
    width: screenWidth - SPACING.LG * 2,
    height: 200,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: SPACING.SM,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.LG,
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
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: SPACING.MD,
    left: SPACING.MD,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  statusText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: 10,
    fontFamily: getFontFamily('SEMIBOLD'),
  },
  menuButton: {
    position: 'absolute',
    top: SPACING.MD,
    right: SPACING.MD,
  },
  menuIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: BORDER_RADIUS.FULL,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: SPACING.MD,
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
    fontSize: 17,
    fontFamily: getFontFamily('SEMIBOLD'),
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: getFontFamily('REGULAR'),
    color: COLORS.TEXT.SECONDARY,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS.MAIN,
    paddingHorizontal: SPACING.SM,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.SM,
    gap: 2,
  },
  ratingText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: 12,
    fontFamily: getFontFamily('SEMIBOLD'),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.MD,
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: getFontFamily('REGULAR'),
    color: COLORS.TEXT.SECONDARY,
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.BORDER.PRIMARY,
    marginHorizontal: SPACING.SM,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.NEUTRAL.GRAY[200],
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: getFontFamily('REGULAR'),
    color: COLORS.TEXT.SECONDARY,
  },
  priceText: {
    fontSize: 19,
    fontFamily: getFontFamily('SEMIBOLD'),
    color: COLORS.PRIMARY.MAIN,
  },
  priceUnit: {
    fontSize: 14,
    fontFamily: getFontFamily('REGULAR'),
    color: COLORS.TEXT.SECONDARY,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.SM,
    minWidth: 200,
    ...SHADOWS.LG,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    gap: SPACING.SM,
  },
  menuItemText: {
    fontSize: FONT_SIZES.BASE,
    color: COLORS.TEXT.PRIMARY,
    fontFamily: getFontFamily('MEDIUM'),
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
});

export default ListingCard;