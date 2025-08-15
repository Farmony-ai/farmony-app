

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  ImageSourcePropType,
  Dimensions,
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
import { LinearGradient } from 'react-native-linear-gradient';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

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

const ListingCard = ({ listing, onPress, onEdit, onActivate, onDeactivate, onStatusChange, style }: ListingCardProps) => {
  const navigation = useNavigation<ListingCardNavigationProp>();
  const [showMenu, setShowMenu] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { token } = useSelector((state: RootState) => state.auth);

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

  const handleCardPress = () => {
    if (onPress) {
      onPress(listing._id);
    } else {
      navigation.navigate('ListingDetail', { listingId: listing._id });
    }
  };

  const handleMenuPress = (event: any) => {
    event.stopPropagation(); // Prevent card press from triggering
    setShowMenu(true);
  };

  const handleMenuItemPress = async (action: 'edit' | 'activate' | 'deactivate') => {
    setShowMenu(false);
    
    if (action === 'edit') {
      if (onEdit) {
        onEdit(listing._id);
      } else {
        // Navigate to edit screen
        (navigation as any).navigate('CreateListing', { listingId: listing._id });
      }
    } else if (action === 'activate' || action === 'deactivate') {
      if (isToggling || !token) return;
      
      try {
        setIsToggling(true);
        const newStatus = action === 'activate';
        
        // Call the appropriate callback if provided
        if (action === 'activate' && onActivate) {
          onActivate(listing._id);
        } else if (action === 'deactivate' && onDeactivate) {
          onDeactivate(listing._id);
        } else {
          // Default behavior: toggle status directly
          await ListingService.toggleListingStatus(listing._id, newStatus, token);
          
          // Notify parent component of status change
          if (onStatusChange) {
            onStatusChange(listing._id, newStatus);
          }
        }
      } catch (error) {
        console.error('Error toggling listing status:', error);
        // You might want to show an error toast here
      } finally {
        setIsToggling(false);
      }
    }
  };

  const getStatusBadge = (isActive: boolean | undefined) => {
    if (isActive === undefined) {
      return null;
    }
    const statusText = isActive ? 'Active' : 'Inactive';
    const backgroundColor = isActive ? COLORS.SUCCESS.LIGHT : COLORS.NEUTRAL.GRAY[200];
    const textColor = isActive ? COLORS.SUCCESS.DARK : COLORS.NEUTRAL.GRAY[700];
    const iconText = isActive ? '●' : '○';
    const iconColor = isActive ? COLORS.SUCCESS.MAIN : COLORS.NEUTRAL.GRAY[400];

    return (
      <View style={[styles.statusBadge, { backgroundColor }]}>
        <Text style={[styles.statusIcon, { color: iconColor }]}>{iconText}</Text>
        <Text style={[styles.statusText, { color: textColor }]}>{statusText}</Text>
      </View>
    );
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

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={handleCardPress}>
      <View style={styles.imageContainer}>
        <Image 
          source={{ uri: typeof listing.photoUrls[0] === 'string' ? listing.photoUrls[0] : 'https://via.placeholder.com/100' }} 
          style={styles.image} 
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.imageOverlay}
        />
        <View style={styles.badgesContainer}>
          {getStatusBadge(listing.isActive)}
        </View>
      </View>
      <View style={styles.infoContainer}>
        <Text style={styles.title}>{getSubCategoryName()}</Text>
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>👁️</Text>
            <Text style={styles.metricText}>{listing.viewCount || 0} Views</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricIcon}>🗓️</Text>
            <Text style={styles.metricText}>{listing.bookingCount || 0} Bookings</Text>
          </View>
        </View>
        <View style={styles.actionBar}>
          <Text style={styles.price}>₹{listing.price} {getUnitLabel(listing.unitOfMeasure)}</Text>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <View style={styles.menuIconContainer}>
              <Text style={styles.menuIcon}>•••</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        transparent={true}
        visible={showMenu}
        onRequestClose={() => setShowMenu(false)}
        animationType="fade"
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleMenuItemPress('edit')}>
              <Text style={styles.menuItemText}>✏️ Edit Listing</Text>
            </TouchableOpacity>
            {listing.isActive ? (
              <TouchableOpacity 
                style={[styles.menuItem, isToggling && styles.menuItemDisabled]} 
                onPress={() => handleMenuItemPress('deactivate')}
                disabled={isToggling}
              >
                <Text style={styles.menuItemText}>
                  {isToggling ? '⏳ Processing...' : '⏸️ Deactivate'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.menuItem, isToggling && styles.menuItemDisabled]} 
                onPress={() => handleMenuItemPress('activate')}
                disabled={isToggling}
              >
                <Text style={styles.menuItemText}>
                  {isToggling ? '⏳ Processing...' : '▶️ Activate'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Pressable>
      </Modal>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden',
    marginBottom: SPACING.MD,
    ...SHADOWS.MD,
    width: width - SPACING.LG * 2,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: COLORS.NEUTRAL.GRAY[200],
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  badgesContainer: {
    position: 'absolute',
    top: SPACING.SM,
    right: SPACING.SM,
    flexDirection: 'row',
  },
  infoContainer: {
    padding: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  title: {
    fontSize: FONT_SIZES.LG,
    fontFamily: getFontFamily('BOLD'),
    marginBottom: SPACING.SM,
    color: COLORS.TEXT.PRIMARY,
  },
  statusBadge: {
    paddingVertical: SPACING.XS,
    paddingHorizontal: SPACING.SM,
    borderRadius: BORDER_RADIUS.FULL,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.XS,
  },
  statusIcon: {
    fontSize: FONT_SIZES.SM,
    marginRight: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: getFontFamily('MEDIUM'),
  },
  metricsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.MD,
    marginTop: SPACING.XS,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  metricIcon: {
    fontSize: FONT_SIZES.SM,
    marginRight: 4,
  },
  metricText: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.NEUTRAL.GRAY[600],
    fontFamily: getFontFamily('REGULAR'),
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.NEUTRAL.GRAY[200],
  },
  price: {
    fontSize: FONT_SIZES.XL,
    fontFamily: getFontFamily('BOLD'),
    color: COLORS.PRIMARY.MAIN,
  },
  menuButton: {
    padding: SPACING.XS,
  },
  menuIconContainer: {
    backgroundColor: COLORS.NEUTRAL.GRAY[100],
    borderRadius: BORDER_RADIUS.FULL,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: FONT_SIZES.SM,
    fontWeight: 'bold',
    color: COLORS.NEUTRAL.GRAY[700],
    letterSpacing: -1,
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
    minWidth: 180,
    ...SHADOWS.LG,
  },
  menuItem: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
  },
  menuItemText: {
    fontSize: FONT_SIZES.BASE,
    color: COLORS.NEUTRAL.GRAY[800],
    fontFamily: getFontFamily('MEDIUM'),
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
});

export default ListingCard;
