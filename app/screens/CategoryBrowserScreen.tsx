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
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS, fuzzyMatch } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import CatalogueService, { Category, SubCategory } from '../services/CatalogueService';
import categoryIcons from '../utils/icons';
import HighlightedText from '../components/HighlightedText';

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

interface CategoryHierarchy {
  category: Category;
  subCategories: SubCategory[];
}

const CategoryBrowserScreen = ({ route }: { route: any }) => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [filteredSubCategories, setFilteredSubCategories] = useState<SubCategory[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);
  const [subCategoriesLoading, setSubCategoriesLoading] = useState(false);
  const [categoryHierarchy, setCategoryHierarchy] = useState<CategoryHierarchy[]>([]);
  const [categoryMatches, setCategoryMatches] = useState<Map<string, boolean>>(new Map());
  const [subCategoryMatches, setSubCategoryMatches] = useState<Map<string, boolean>>(new Map());

  const {
    selectedCategoryId,
    initialSearchQuery: initialSearchParam,
    selectedDate: selectedDateFromHome,
    prefetchedCategories,
    prefetchedHierarchy,
    initialSubCategoryId,
    preselectCategoryName,
  } = route.params || {};

  const initialSearchValue =
    typeof initialSearchParam === 'string' ? initialSearchParam.trim() : '';

  const [searchQuery, setSearchQuery] = useState(initialSearchValue);
  const [showSearch, setShowSearch] = useState(Boolean(initialSearchValue));

  const hasPrefetchedCategories =
    Array.isArray(prefetchedCategories) && prefetchedCategories.length > 0;
  const hasPrefetchedHierarchy =
    Array.isArray(prefetchedHierarchy) && prefetchedHierarchy.length > 0;

  // Get location and date range from Redux
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const [initialCategoryResolved, setInitialCategoryResolved] = useState(false);
  const [initialSubCategoryResolved, setInitialSubCategoryResolved] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (hasPrefetchedCategories) {
      setCategories(prefetchedCategories);
      setFilteredCategories(prefetchedCategories);
      setInitialCategoryResolved(false);
      setInitialSubCategoryResolved(false);
      setSelectedSubCategory(null);
    }
  }, [hasPrefetchedCategories, prefetchedCategories]);

  useEffect(() => {
    if (hasPrefetchedHierarchy) {
      setCategoryHierarchy(prefetchedHierarchy);
    }
  }, [hasPrefetchedHierarchy, prefetchedHierarchy]);

  useEffect(() => {
    if (!hasPrefetchedCategories) {
      fetchAndSetCategories();
    }
  }, [hasPrefetchedCategories]);

  useEffect(() => {
    setInitialCategoryResolved(false);
    setInitialSubCategoryResolved(false);
  }, [selectedCategoryId, initialSearchValue]);

  useEffect(() => {
    if (selectedCategory) {
      loadSubCategories(selectedCategory._id);
    }
  }, [selectedCategory, categoryHierarchy]);

  useEffect(() => {
    if (searchQuery) {
      const matches = new Map<string, boolean>();

      categories.forEach(cat => {
        const nameMatches = fuzzyMatch(searchQuery, cat.name);
        const hierarchyEntry = categoryHierarchy.find(entry => entry.category._id === cat._id);
        const subMatches = hierarchyEntry?.subCategories?.some(sub =>
          fuzzyMatch(searchQuery, sub?.name || '')
        ) ?? false;

        matches.set(cat._id, nameMatches || subMatches);
      });

      setCategoryMatches(matches);

      // Auto-select first matching category if current is not matching
      const matchingCategories = categories.filter(cat => matches.get(cat._id));
      if (matchingCategories.length > 0) {
        const isCurrentSelectedValid = matches.get(selectedCategory?._id || '');
        if (!isCurrentSelectedValid) {
          setSelectedSubCategory(null);
          setInitialSubCategoryResolved(false);
          setSelectedCategory(matchingCategories[0]);
        }
      }
    } else {
      // Clear matches when no search
      setCategoryMatches(new Map());
    }

    // Always show all categories
    setFilteredCategories(categories);
  }, [searchQuery, categories, categoryHierarchy, selectedCategory]);

  useEffect(() => {
    if (initialCategoryResolved) {
      return;
    }
    if (!categories.length) {
      return;
    }

    let initialCategory: Category | null = null;

    if (selectedCategoryId) {
      initialCategory = categories.find(cat => cat._id === selectedCategoryId) || null;
    }

    if (!initialCategory && (initialSearchValue || preselectCategoryName)) {
      const searchFallback = initialSearchValue || preselectCategoryName;
      const hierarchyMatch = categoryHierarchy.find(entry => {
        const categoryName = entry?.category?.name || '';
        if (fuzzyMatch(searchFallback, categoryName)) {
          return true;
        }
        if (Array.isArray(entry?.subCategories)) {
          return entry.subCategories.some(sub => fuzzyMatch(searchFallback, sub?.name || ''));
        }
        return false;
      });

      if (hierarchyMatch) {
        const matchedCategoryId = hierarchyMatch?.category?._id;
        initialCategory =
          categories.find(cat => cat._id === matchedCategoryId) ||
          hierarchyMatch?.category ||
          null;
      }
    }

    if (!initialCategory) {
      initialCategory = categories[0];
    }

    if (initialCategory) {
      if (!selectedCategory || selectedCategory._id !== initialCategory._id) {
        setSelectedSubCategory(null);
        setInitialSubCategoryResolved(false);
        setSelectedCategory(initialCategory);
      }
      setInitialCategoryResolved(true);
    }
  }, [
    categories,
    categoryHierarchy,
    selectedCategoryId,
    initialSearchValue,
    initialCategoryResolved,
    selectedCategory,
    preselectCategoryName,
  ]);

  useEffect(() => {
    if (searchQuery) {
      const matches = new Map<string, boolean>();

      subCategories.forEach(sub => {
        matches.set(sub._id, fuzzyMatch(searchQuery, sub?.name || ''));
      });

      setSubCategoryMatches(matches);
    } else {
      setSubCategoryMatches(new Map());
    }

    // Always show all subcategories
    setFilteredSubCategories(subCategories);
  }, [searchQuery, subCategories]);

  useEffect(() => {
    if (initialSubCategoryResolved) {
      return;
    }
    if (!initialSubCategoryId) {
      setInitialSubCategoryResolved(true);
      return;
    }
    if (!subCategories.length) {
      return;
    }

    const matchedSub = subCategories.find(sub => sub._id === initialSubCategoryId);
    if (matchedSub) {
      setSelectedSubCategory(matchedSub);
    }
    setInitialSubCategoryResolved(true);
  }, [initialSubCategoryId, subCategories, initialSubCategoryResolved]);

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

      let fetchedHierarchy: CategoryHierarchy[] = [];
      try {
        fetchedHierarchy = await CatalogueService.getCategoryHierarchy();
      } catch (hierarchyError) {
        console.warn('Failed to fetch category hierarchy, proceeding with categories only.', hierarchyError);
      }

      setCategories(fetchedCategories);
      setCategoryHierarchy(fetchedHierarchy);
      setFilteredCategories(fetchedCategories);
      setInitialCategoryResolved(false);
      setInitialSubCategoryResolved(false);

      if (fetchedCategories.length === 0) {
        setSelectedCategory(null);
        setSubCategories([]);
        setFilteredSubCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadSubCategories = async (categoryId: string) => {
    const hierarchyEntry = categoryHierarchy.find(
      entry => entry?.category?._id === categoryId
    );

    if (hierarchyEntry && Array.isArray(hierarchyEntry.subCategories)) {
      setSubCategories(hierarchyEntry.subCategories);
      return;
    }

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
    setSelectedSubCategory(null);
    setInitialSubCategoryResolved(false);
  };

  const handleSubCategoryPress = (subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    navigation.navigate('CreateServiceRequest', {
      preselectedCategoryId: selectedCategory?._id,
      preselectedCategoryName: selectedCategory?.name,
      preselectedSubCategoryId: subCategory._id,
      preselectedSubCategoryName: subCategory.name,
      requestDate: selectedDateFromHome || null,
      prefetchedCategories: categories,
      prefetchedHierarchy: categoryHierarchy,
    });
  };

  const renderCategoryItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory?._id === item._id;
    const isMatching = !searchQuery || categoryMatches.get(item._id) !== false;

    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemActive,
          !isMatching && styles.categoryItemDimmed,
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
        <HighlightedText
          text={item.name}
          searchQuery={searchQuery}
          style={[
            styles.categoryText,
            ...(isSelected ? [styles.categoryTextActive] : []),
          ]}
          highlightStyle={{
            fontWeight: '700',
          }}
          numberOfLines={2}
        />
        {isSelected && (
          <View style={styles.selectedIndicator} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSubCategoryItem = ({ item }: { item: SubCategory }) => {
    const isSelected = selectedSubCategory?._id === item._id;
    const isMatching = !searchQuery || subCategoryMatches.get(item._id) !== false;

    return (
      <TouchableOpacity
        style={[
          styles.subCategoryTile,
          isSelected && styles.subCategoryTileActive,
          !isMatching && styles.subCategoryItemDimmed,
        ]}
        onPress={() => handleSubCategoryPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.subCategoryIconContainer}>
          <Image
            source={categoryIcons[item.icon] || categoryIcons['tools']}
            style={styles.subCategoryIcon}
          />
        </View>
        <HighlightedText
          text={item.name}
          searchQuery={searchQuery}
          style={[
            styles.subCategoryText,
            ...(isSelected ? [styles.subCategoryTextActive] : []),
          ]}
          highlightStyle={{
            fontWeight: '600',
          }}
          numberOfLines={2}
        />
        <Text
          style={[
            styles.subCategorySubtext,
            isSelected && styles.subCategorySubtextActive,
          ]}
        >
          Tap to continue
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={48} color={COLORS_MINIMAL.text.muted} />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'No matches found' : 'No items found'}
      </Text>
      <Text style={styles.emptyText}>
        {searchQuery ? 'Try a different category keyword' : 'Select a category to see options'}
      </Text>
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
            ) : filteredSubCategories.length > 0 ? (
              <FlatList
                data={filteredSubCategories}
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
  subCategoryTileActive: {
    borderWidth: 1,
    borderColor: COLORS_MINIMAL.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
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
  subCategoryTextActive: {
    color: COLORS_MINIMAL.accent,
  },
  subCategorySubtext: {
    fontSize: 10,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
  },
  subCategorySubtextActive: {
    color: COLORS_MINIMAL.accent,
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
  categoryItemDimmed: {
    opacity: 0.4,
  },
  subCategoryItemDimmed: {
    opacity: 0.4,
  },
});

export default CategoryBrowserScreen;
