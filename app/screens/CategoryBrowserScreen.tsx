import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
  FlatList,
  Animated,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Vibration,
  Platform,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import CatalogueService from '../services/CatalogueService';
import { setCategory, setSubCategory } from '../store/slices/listingSlice';

interface Category {
  _id: string;
  name: string;
  description: string;
  category: string;
  transactionType: string;
  parentId: string | null;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface SubCategory {
  _id: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

import categoryIcons from '../utils/icons';

const { width: screenWidth } = Dimensions.get('window');

// Shimmer loading component
const ShimmerPlaceholder: React.FC<{ style?: any }> = ({ style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          backgroundColor: COLORS.NEUTRAL.GRAY[300],
          opacity,
        },
        style,
      ]}
    />
  );
};

const CategoryBrowserScreen = ({ route }: { route: any }) => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { selectedCategoryId } = route.params || {};

  // Get location and date range from Redux
  const { latitude, longitude, radius } = useSelector((state: RootState) => state.location);
  const { startDate, endDate } = useSelector((state: RootState) => state.date);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const categoryScaleAnims = useRef<{ [key: string]: Animated.Value }>({}).current;
  const subCategoryAnims = useRef<Animated.Value[]>([]).current;

  // Get or create animation value for category
  const getCategoryScaleAnim = (categoryId: string) => {
    if (!categoryScaleAnims[categoryId]) {
      categoryScaleAnims[categoryId] = new Animated.Value(1);
    }
    return categoryScaleAnims[categoryId];
  };

  useEffect(() => {
    fetchAndSetCategories();
  }, [selectedCategoryId]);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubCategories(selectedCategory._id);
    }
  }, [selectedCategory]);

  useEffect(() => {
    // Filter categories based on search
    if (searchQuery) {
      const filtered = categories.filter(cat => 
        cat.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCategories(filtered);
    } else {
      setFilteredCategories(categories);
    }
  }, [searchQuery, categories]);

  const toggleSearch = () => {
    const newValue = !showSearch;
    setShowSearch(newValue);
    
    Animated.spring(searchBarAnim, {
      toValue: newValue ? 1 : 0,
      tension: 20,
      friction: 7,
      useNativeDriver: true,
    }).start();
    
    if (!newValue) {
      setSearchQuery('');
    }
  };

  const fetchAndSetCategories = async () => {
    try {
      setLoading(true);
      const fetchedCategories = await CatalogueService.getCategories();
      setCategories(fetchedCategories);
      setFilteredCategories(fetchedCategories);

      if (fetchedCategories.length > 0) {
        if (selectedCategoryId) {
          const categoryToSelect = fetchedCategories.find(cat => cat._id === selectedCategoryId);
          setSelectedCategory(categoryToSelect || fetchedCategories[0]);
        } else {
          setSelectedCategory(fetchedCategories[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategories = async (categoryId: string) => {
    try {
      setSubCategoriesLoading(true);
      // Reset animations
      subCategoryAnims.forEach(anim => anim.setValue(0));
      
      const fetchedSubCategories = await CatalogueService.getSubCategories(categoryId);
      setSubCategories(fetchedSubCategories);
      
      // Initialize animations
      while (subCategoryAnims.length < fetchedSubCategories.length) {
        subCategoryAnims.push(new Animated.Value(0));
      }
      
      // Staggered animation
      const animations = fetchedSubCategories.map((_, index) => {
        return Animated.spring(subCategoryAnims[index], {
          toValue: 1,
          tension: 20,
          friction: 7,
          delay: index * 50,
          useNativeDriver: true,
        });
      });
      
      Animated.parallel(animations).start();
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      Alert.alert('Error', 'Failed to load subcategories. Please try again.');
    } finally {
      setSubCategoriesLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAndSetCategories();
    setRefreshing(false);
  }, []);

  const handleCategoryPress = (category: Category) => {
    // Haptic feedback
    if (Platform.OS === 'ios') {
      Vibration.vibrate(10);
    }
    
    const scaleAnim = getCategoryScaleAnim(category._id);
    
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setSelectedCategory(category);
  };

  const handleSubCategoryPress = (subCategory: SubCategory, index: number) => {
    if (selectedCategory) {
      // Haptic feedback
      if (Platform.OS === 'ios') {
        Vibration.vibrate(10);
      }
      
      Animated.sequence([
        Animated.timing(subCategoryAnims[index], {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(subCategoryAnims[index], {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        dispatch(setCategory(selectedCategory._id));
        dispatch(setSubCategory(subCategory._id));
        navigation.navigate('SearchResults', {
          categoryId: selectedCategory._id,
          subCategoryId: subCategory._id,
          searchQuery: searchQuery, // Pass existing search query if any
          dateRange: { startDate, endDate }, // Pass existing date range if any
          latitude: latitude, // Pass latitude from Redux
          longitude: longitude, // Pass longitude from Redux
          radius: radius, // Pass radius from Redux
        });
      });
    }
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const scaleAnim = getCategoryScaleAnim(item._id);
    const isSelected = selectedCategory?._id === item._id;
    
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[
            styles.categoryItem,
            isSelected && styles.categoryItemActive,
          ]}
          onPress={() => handleCategoryPress(item)}
          activeOpacity={0.7}
        >
          <View style={[
            styles.categoryIconWrapper,
            isSelected && styles.categoryIconWrapperActive
          ]}>
            <Image
              source={categoryIcons[item.icon] || categoryIcons['tools']}
              style={styles.categoryIcon}
            />
          </View>
          <Text
            style={[
              styles.categoryText,
              isSelected && styles.categoryTextActive,
            ]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {isSelected && (
            <View style={styles.selectedIndicator} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSubCategoryItem = ({ item, index }: { item: SubCategory; index: number }) => {
    const animValue = subCategoryAnims[index] || new Animated.Value(1);
    
    return (
      <Animated.View
        style={[
          styles.subCategoryTileWrapper,
          {
            opacity: animValue,
            transform: [
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              { scale: animValue },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.subCategoryTile}
          onPress={() => handleSubCategoryPress(item, index)}
          activeOpacity={0.7}
        >
          <View style={styles.subCategoryContent}>
            <View style={styles.subCategoryIconContainer}>
              <Image
                source={categoryIcons[item.icon] || categoryIcons['tools']}
                style={styles.subCategoryIcon}
              />
            </View>
            <Text style={styles.subCategoryText} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderShimmerLoading = () => (
    <View style={styles.shimmerContainer}>
      {[1, 2, 3, 4, 5].map((num) => (
        <View key={num} style={styles.shimmerItem}>
          <ShimmerPlaceholder style={styles.shimmerIcon} />
          <ShimmerPlaceholder style={styles.shimmerText} />
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="folder-open-outline" size={64} color={COLORS.TEXT.SECONDARY} />
      <Text style={styles.emptyTitle}>No subcategories yet</Text>
      <Text style={styles.emptyText}>Check back later for more options</Text>
    </View>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={styles.backButtonCircle}>
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Browse Categories</Text>
          <TouchableOpacity onPress={toggleSearch} style={styles.searchButton}>
            <Ionicons name="search" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Animated Search Bar */}
        {showSearch && (
          <Animated.View
            style={[
              styles.searchContainer,
              {
                opacity: searchBarAnim,
                transform: [{
                  translateY: searchBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={COLORS.TEXT.SECONDARY} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories..."
                placeholderTextColor={COLORS.TEXT.SECONDARY}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={COLORS.TEXT.SECONDARY} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        <View style={styles.content}>
          {/* Left Pane: Categories */}
          <View style={styles.leftPane}>
            {loading ? (
              renderShimmerLoading()
            ) : (
              <FlatList
                data={filteredCategories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={COLORS.PRIMARY.MAIN}
                  />
                }
              />
            )}
          </View>

          {/* Right Pane: Subcategories */}
          <View style={styles.rightPane}>
            {subCategoriesLoading ? (
              <View style={styles.subCategoryLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
              </View>
            ) : subCategories.length > 0 ? (
              <FlatList
                data={subCategories}
                renderItem={renderSubCategoryItem}
                keyExtractor={(item) => item._id}
                numColumns={2}
                contentContainerStyle={styles.subCategoryGrid}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              renderEmptyState()
            )}
          </View>
        </View>
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
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
    ...SHADOWS.SM,
  },
  backButton: {
    padding: SPACING.XS,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  searchButton: {
    padding: SPACING.SM,
  },
  searchContainer: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.XS,
    paddingBottom: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.SM,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    width: screenWidth * 0.3,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER.PRIMARY,
  },
  categoryList: {
    paddingVertical: SPACING.XS,
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    marginHorizontal: SPACING.XS,
    marginVertical: 2,
    borderRadius: BORDER_RADIUS.MD,
    position: 'relative',
  },
  categoryItemActive: {
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  categoryIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.BACKGROUND.CARD,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  categoryIconWrapperActive: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    ...SHADOWS.SM,
  },
  categoryIcon: {
    width: 26,
    height: 26,
    resizeMode: 'contain',
  },
  categoryText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  categoryTextActive: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.PRIMARY.DARK,
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    bottom: '25%',
    width: 3,
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  rightPane: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  subCategoryGrid: {
    padding: SPACING.SM,
    paddingTop: SPACING.MD,
  },
  subCategoryTileWrapper: {
    flex: 1,
    margin: SPACING.XS,
  },
  subCategoryTile: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    overflow: 'hidden',
    ...SHADOWS.SM,
    elevation: 2,
  },
  subCategoryContent: {
    alignItems: 'center',
    padding: SPACING.MD,
  },
  subCategoryIconContainer: {
    width: 75,
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.SECONDARY.LIGHT,
    borderRadius: BORDER_RADIUS.FULL,
    marginBottom: SPACING.SM,
  },
  subCategoryIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  subCategoryText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
  },
  // Shimmer loading styles
  shimmerContainer: {
    padding: SPACING.SM,
  },
  shimmerItem: {
    alignItems: 'center',
    marginVertical: SPACING.SM,
  },
  shimmerIcon: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.MD,
    marginBottom: SPACING.XS,
  },
  shimmerText: {
    width: 55,
    height: 11,
    borderRadius: BORDER_RADIUS.SM,
  },
  // Loading and empty states
  subCategoryLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginTop: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  emptyText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
  },
});

export default CategoryBrowserScreen;