import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import Text from './Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { Listing, PopulatedListing } from '../services/ListingService';

const { width: screenWidth } = Dimensions.get('window');

interface SearchListingCardProps {
  listing: Listing | PopulatedListing;
}

const SearchListingCard = ({ listing }: SearchListingCardProps) => {
  const navigation = useNavigation<any>();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

    // Use photoUrls if available, otherwise fallback to photos, otherwise placeholder
    const images =
      (listing as any)?.photoUrls && Array.isArray((listing as any).photoUrls) && (listing as any).photoUrls.length > 0
        ? (listing as any).photoUrls
        : listing?.photos && listing.photos.length > 0
        ? listing.photos
        : ['https://via.placeholder.com/400x200'];
  // Auto-scroll images
  useEffect(() => {
    if (images.length > 1) {
      autoScrollTimer.current = setInterval(() => {
        setCurrentImageIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % images.length;
          scrollViewRef.current?.scrollTo({
            x: (screenWidth - SPACING.MD * 2) * nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, 3000); // Change image every 3 seconds

      return () => {
        if (autoScrollTimer.current) {
          clearInterval(autoScrollTimer.current);
        }
      };
    }
  }, [images.length]);

  if (!listing) {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.skeleton} />
      </View>
    );
  }

  // Helper functions
  const getSubCategoryName = () => {
    if (typeof listing.subCategoryId === 'object' && listing.subCategoryId?.name) {
      return listing.subCategoryId.name;
    }
    return 'Service';
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

  const getDistance = () => {
    // This would typically come from a location service calculation
    return '2.5 km';
  };

  const getRating = () => {
    // This would come from listing data if available
    return listing.rating || 4.2;
  };

  const getReviewCount = () => {
    return listing.reviewCount || Math.floor(Math.random() * 100) + 10;
  };

  const handleScroll = (event: any) => {
    const slideSize = screenWidth - SPACING.MD * 2;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setCurrentImageIndex(index);
  };

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={() => navigation.navigate('ListingDetail', { listingId: listing._id })}
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
                    x: (screenWidth - SPACING.MD * 2) * nextIndex,
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
              source={{ uri: image }}
              style={styles.cardImage}
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

        {/* Discount Badge (if applicable) */}
        {listing.discount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>FLAT {listing.discount}% OFF</Text>
          </View>
        )}

        {/* Ad Badge (if sponsored) */}
        {listing.isSponsored && (
          <View style={styles.adBadge}>
            <Text style={styles.adText}>Ad</Text>
          </View>
        )}
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
            <Ionicons name="location-outline" size={14} color={COLORS.TEXT.SECONDARY} />
            <Text style={styles.infoText}>{getDistance()}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.TEXT.SECONDARY} />
            <Text style={styles.infoText}>Available now</Text>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.XL,
    marginBottom: SPACING.MD,
    overflow: 'hidden',
    ...SHADOWS.LG,
    width: screenWidth - SPACING.MD * 2,
    alignSelf: 'center',
  },
  skeleton: {
    height: 300,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  cardImage: {
    width: screenWidth - SPACING.MD * 2,
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
    transform: [{ translateX: -30 }], // Approximate centering
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
  discountBadge: {
    position: 'absolute',
    top: SPACING.MD,
    left: SPACING.MD,
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
  },
  discountText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: 10,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  adBadge: {
    position: 'absolute',
    top: SPACING.MD,
    right: SPACING.MD,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: SPACING.SM,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.SM,
  },
  adText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: 10,
    fontFamily: FONTS.POPPINS.MEDIUM,
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
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
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
    fontFamily: FONTS.POPPINS.SEMIBOLD,
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
    fontFamily: FONTS.POPPINS.REGULAR,
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
    marginBottom: SPACING.SM,
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  priceText: {
    fontSize: 19,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  priceUnit: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
});

export default SearchListingCard;