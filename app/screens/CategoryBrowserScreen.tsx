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
  Platform,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import CatalogueService from '../services/CatalogueService';
import categoryIcons from '../utils/icons';

const { width: screenWidth } = Dimensions.get('window');

// Minimal color palette
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
};

interface Category {
  _id: string;
  name: string;
  description: string;
  icon: string;
  // ... other fields
}

interface SubCategory {
  _id: string;
  categoryId: string;
  name: string;
  icon?: string;
  // ... other fields
}

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

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
    
    Animated.timing(searchBarAnim, {
      toValue: newValue ? 1 : 0,
      duration: 200,
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
      const fetchedSubCategories = await CatalogueService.getSubCategories(categoryId);
      setSubCategories(fetchedSubCategories);
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
    setSelectedCategory(category);
  };

  const handleSubCategoryPress = (subCategory: SubCategory) => {
    // Navigate to search results with subcategory name as search query
    navigation.navigate('SearchResults', {
      searchQuery: subCategory.name.toLowerCase(),
      categoryId: selectedCategory?._id,
      dateRange: { startDate, endDate },
      latitude: latitude,
      longitude: longitude,
      radius: radius,
    });
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory?._id === item._id;
    
    return (
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
    );
  };

  const renderSubCategoryItem = ({ item }: { item: SubCategory }) => {
    return (
      <TouchableOpacity
        style={styles.subCategoryTile}
        onPress={() => handleSubCategoryPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.subCategoryIconContainer}>
          <Image
            source={categoryIcons[item.icon] || categoryIcons['tools']}
            style={styles.subCategoryIcon}
          />
        </View>
        <Text style={styles.subCategoryText} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.subCategorySubtext}>
          Tap to search
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={48} color={COLORS_MINIMAL.text.muted} />
      <Text style={styles.emptyTitle}>No items found</Text>
      <Text style={styles.emptyText}>Select a category to see options</Text>
    </View>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS_MINIMAL.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Categories</Text>
          <TouchableOpacity onPress={toggleSearch} style={styles.searchButton}>
            <Ionicons name="search-outline" size={24} color={COLORS_MINIMAL.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <Animated.View
            style={[
              styles.searchContainer,
              {
                opacity: searchBarAnim,
                transform: [{
                  translateY: searchBarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={COLORS_MINIMAL.text.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search categories..."
                placeholderTextColor={COLORS_MINIMAL.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={COLORS_MINIMAL.text.muted} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        <View style={styles.content}>
          {/* Left Pane: Categories */}
          <View style={styles.leftPane}>
            {loading ? (
              <ActivityIndicator size="small" color={COLORS_MINIMAL.accent} style={styles.loader} />
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
                    tintColor={COLORS_MINIMAL.accent}
                  />
                }
              />
            )}
          </View>

          {/* Right Pane: Subcategories */}
          <View style={styles.rightPane}>
            {subCategoriesLoading ? (
              <View style={styles.subCategoryLoadingContainer}>
                <ActivityIndicator size="large" color={COLORS_MINIMAL.accent} />
              </View>
            ) : subCategories.length > 0 ? (
              <FlatList
                data={subCategories}
                renderItem={renderSubCategoryItem}
                keyExtractor={(item) => item._id}
                numColumns={2}
                contentContainerStyle={styles.subCategoryGrid}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.columnWrapper}
              />
            ) : (
              renderEmptyState()
            )}
          </View>
        </View>
      </Animated.View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS_MINIMAL.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_MINIMAL.divider,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  searchButton: {
    padding: 8,
  },
  searchContainer: {
    backgroundColor: COLORS_MINIMAL.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_MINIMAL.divider,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.primary,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPane: {
    width: screenWidth * 0.28,
    backgroundColor: COLORS_MINIMAL.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS_MINIMAL.divider,
  },
  loader: {
    marginTop: 20,
  },
  categoryList: {
    paddingVertical: 8,
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    position: 'relative',
  },
  categoryItemActive: {
    backgroundColor: COLORS_MINIMAL.background,
  },
  categoryIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: COLORS_MINIMAL.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryIconWrapperActive: {
    backgroundColor: COLORS_MINIMAL.surface,
  },
  categoryIcon: {
    width: 58,
    height: 58,
    resizeMode: 'contain',
  },
  categoryText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  categoryTextActive: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.primary,
  },
  selectedIndicator: {
    position: 'absolute',
    left: 0,
    top: '30%',
    bottom: '30%',
    width: 3,
    backgroundColor: COLORS_MINIMAL.accent,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  rightPane: {
    flex: 1,
    backgroundColor: COLORS_MINIMAL.background,
  },
  subCategoryGrid: {
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  subCategoryTile: {
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    width: (screenWidth - (screenWidth * 0.28) - 36) / 2,
  },
  subCategoryIconContainer: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.background,
    borderRadius: 12,
    marginBottom: 10,
  },
  subCategoryIcon: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  },
  subCategoryText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subCategorySubtext: {
    fontSize: 10,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
  },
  subCategoryLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
  },
});

export default CategoryBrowserScreen;