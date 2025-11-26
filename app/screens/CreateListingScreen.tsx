import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SHADOWS, FONTS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import CatalogueService, { Category, SubCategory } from '../services/CatalogueService';
import ListingService, { CreateListingPayload } from '../services/ListingService';
import categoryIcons from '../utils/icons';
import MultiImagePicker from '../components/MultiImagePicker';
import { ImagePickerResult } from '../services/ImagePickerService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 75; // keep in sync with BottomTabNavigator

interface ListingFormData {
  providerId: string;
  title: string;
  description: string;
  categoryId: string;
  subCategoryId: string;
  subCategorySelected: boolean;
  photos: ImagePickerResult[];
  videoUrl?: string;
  coordinates: [number, number];
  price: string;
  unitOfMeasure: string;
  minimumOrder: string;
}

const CreateListingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const listingId = route.params?.listingId;
  const isEditMode = !!listingId;

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [availableSubCategories, setAvailableSubCategories] = useState<SubCategory[]>([]);
  const [isDataReady, setIsDataReady] = useState(false);

  const { user, token } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState<ListingFormData>({
    providerId: '',
    title: '',
    description: '',
    categoryId: '',
    subCategoryId: '',
    subCategorySelected: false,
    photos: [],
    coordinates: [] as unknown as [number, number],
    price: '',
    unitOfMeasure: 'per_hour',
    minimumOrder: '1',
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentStep - 1) / 3,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const categories = await CatalogueService.getCategories();
        setAvailableCategories(categories);

        if (isEditMode) {
          const listingData = await ListingService.getListingById(listingId);
          const resolvedProviderId = (listingData as any)?.providerId?._id ?? (listingData as any)?.providerId ?? '';
          const resolvedCategoryId = (listingData as any)?.categoryId?._id ?? (listingData as any)?.categoryId ?? '';
          const resolvedSubCategoryId = (listingData as any)?.subCategoryId?._id ?? (listingData as any)?.subCategoryId ?? '';

          setFormData({
            ...formData,
            providerId: resolvedProviderId,
            title: (listingData as any)?.title ?? '',
            description: (listingData as any)?.description ?? '',
            categoryId: resolvedCategoryId,
            subCategoryId: resolvedSubCategoryId,
            photos: (listingData as any)?.photos ?? [],
            price: String((listingData as any)?.price ?? ''),
            unitOfMeasure: (listingData as any)?.unitOfMeasure ?? 'per_hour',
            minimumOrder: String((listingData as any)?.minimumOrder ?? '1'),
            subCategorySelected: true,
          });
          if ((listingData as any)?.categoryId) {
            const catIdForSubs = (listingData as any)?.categoryId?._id ?? (listingData as any)?.categoryId;
            if (catIdForSubs) {
              fetchSubCategories(catIdForSubs);
            }
          }
        } else if (user?.id) {
          setFormData(prev => ({ ...prev, providerId: user.id }));
        }
        setIsDataReady(true);
      } catch (error) {
        console.error('Error initializing data:', error);
        Alert.alert('Error', 'Failed to load initial data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [user, isEditMode, listingId, token]);

  const fetchSubCategories = async (categoryId: string) => {
    try {
      setLoading(true);
      const subCategories = await CatalogueService.getSubCategories(categoryId);
      setAvailableSubCategories(subCategories);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      categoryId,
      subCategoryId: '',
      subCategorySelected: false,
    }));
    await fetchSubCategories(categoryId);
  };

  const handleSubCategorySelect = (subCategoryId: string) => {
    const selectedSub = availableSubCategories.find(sub => sub._id === subCategoryId);
    setFormData(prev => ({
      ...prev,
      subCategoryId,
      unitOfMeasure: selectedSub?.defaultUnitOfMeasure || 'per_hour',
      price: selectedSub?.suggestedMinPrice?.toString() || '',
      subCategorySelected: true,
    }));
  };

  const unitOptions = [
    { value: 'per_hour', label: 'Per Hour' },
    { value: 'per_day', label: 'Per Day' },
    { value: 'per_hectare', label: 'Per Hectare' },

    { value: 'per_unit', label: 'Per Unit' },
  ];

  const handleInputChange = (field: keyof ListingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImagesSelected = (images: ImagePickerResult[]) => {
    setFormData(prev => ({
      ...prev,
      photos: images,
    }));
  };
  
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.categoryId;
      case 2:
        return !!formData.subCategoryId;
      case 3:
        return !!formData.price && !!formData.unitOfMeasure && !!formData.minimumOrder;
      case 4:
        return formData.photos.length > 0;  // Only photos are required, description is optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      Alert.alert('Required Fields', 'Please complete all required fields in this step.');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Error', 'You must be logged in to create or update a listing.');
      return;
    }

    try {
      setLoading(true);

      // Map selected IDs to their human-readable names right before building payload
      const selectedCategoryName = availableCategories.find(c => c._id === formData.categoryId)?.name;
      const selectedSubCategoryName = availableSubCategories.find(s => s._id === formData.subCategoryId)?.name;

      const payload: CreateListingPayload = {
        providerId: formData.providerId,
        title: formData.title || `${selectedSubCategoryName || formData.subCategoryId} Service`,
        description: formData.description,
        categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId,
        // Pass mapped names if found; these are optional in the payload
        ...(selectedCategoryName ? { category: selectedCategoryName } : {}),
        ...(selectedSubCategoryName ? { subcategory: selectedSubCategoryName } : {}),
        photos: formData.photos,
        coordinates: formData.coordinates,
        price: parseFloat(formData.price),
        unitOfMeasure: formData.unitOfMeasure,
        minimumOrder: parseInt(formData.minimumOrder),
        availableFrom: new Date().toISOString(),
        availableTo: new Date().toISOString(),
        tags: [],
        isActive: true,
        isVerified: false,
      };

      if (isEditMode) {
        await ListingService.updateListing(listingId, payload);
        Alert.alert('Success', 'Listing updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await ListingService.createListing(payload);
        Alert.alert('Success', 'Listing created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.error('Error submitting listing:', error);
      Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'create'} listing. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // Render Step 1: Category Selection
  const renderStep1 = () => (
    <Animated.View style={[styles.stepContent, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>01</Text>
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>Choose Category</Text>
          <Text style={styles.stepSubtitle}>What type of service do you offer?</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.formSection} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }} // Increased padding to avoid overlap
      >
        <View style={styles.categoryGrid}>
          {availableCategories.map((category) => (
            <TouchableOpacity
              key={category._id}
              style={[
                styles.categoryCard,
                formData.categoryId === category._id && styles.categoryCardActive,
              ]}
              onPress={() => handleCategorySelect(category._id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryText,
                  formData.categoryId === category._id && styles.categoryTextActive,
                ]}
                numberOfLines={2}
              >
                {category.name}
              </Text>
              <Image
                source={categoryIcons[category.icon || 'tools'] || categoryIcons['tools']}
                style={[
                  styles.categoryIcon,
                  formData.categoryId === category._id && { 
                    tintColor: COLORS.PRIMARY.MAIN,
                    opacity: 1 
                  }
                ]}
              />
              {formData.categoryId === category._id && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark" size={12} color={COLORS.NEUTRAL.WHITE} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Render Step 2: Subcategory Selection
  const renderStep2 = () => (
    <Animated.View style={[styles.stepContent, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>02</Text>
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>Select Service Type</Text>
          <Text style={styles.stepSubtitle}>Choose your specific service</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.formSection} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }} // Increased padding to avoid overlap
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.loadingText}>Loading subcategories...</Text>
          </View>
        ) : availableSubCategories.length > 0 ? (
          <View>
            {availableSubCategories.map((sub) => (
              <TouchableOpacity
                key={sub._id}
                style={[
                  styles.subCategoryItem,
                  formData.subCategoryId === sub._id && styles.subCategoryItemActive,
                ]}
                onPress={() => handleSubCategorySelect(sub._id)}
                activeOpacity={0.7}
              >
                <View style={styles.subCategoryContent}>
                  <View style={[
                    styles.subCategoryIconContainer,
                    formData.subCategoryId === sub._id && styles.subCategoryIconActive
                  ]}>
                    <Image
                      source={categoryIcons[sub.icon || 'tools'] || categoryIcons['tools']}
                      style={[
                        styles.subCategoryIcon,
                        formData.subCategoryId === sub._id && { tintColor: COLORS.PRIMARY.MAIN }
                      ]}
                    />
                  </View>
                  <View style={styles.subCategoryTextContainer}>
                    <Text
                      style={[
                        styles.subCategoryName,
                        formData.subCategoryId === sub._id && styles.subCategoryNameActive,
                      ]}
                    >
                      {sub.name}
                    </Text>
                    {sub.description && (
                      <Text style={styles.subCategoryDescription} numberOfLines={1}>
                        {sub.description}
                      </Text>
                    )}
                  </View>
                  {formData.subCategoryId === sub._id && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.PRIMARY.MAIN} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="category" size={48} color={COLORS.TEXT.PLACEHOLDER} />
            <Text style={styles.emptyStateText}>No subcategories available</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );

  // Render Step 3: Pricing & Details
  const renderStep3 = () => (
    <Animated.View style={[styles.stepContent, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>03</Text>
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>Pricing Details</Text>
          <Text style={styles.stepSubtitle}>Set your service pricing</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.formSection} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }} // Increased padding to avoid overlap
      >
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Service Price</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter price"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={formData.price}
              onChangeText={(text) => handleInputChange('price', text)}
              keyboardType="numeric"
            />
            {formData.price && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS.MAIN} />
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pricing Unit</Text>
          <TouchableOpacity
            style={styles.inputWrapper}
            onPress={() => setShowUnitDropdown(!showUnitDropdown)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="schedule" size={20} color={COLORS.TEXT.PLACEHOLDER} />
            <Text style={[styles.dropdownText, formData.unitOfMeasure && styles.dropdownTextSelected]}>
              {unitOptions.find(u => u.value === formData.unitOfMeasure)?.label || 'Select Unit'}
            </Text>
            <Ionicons 
              name={showUnitDropdown ? "chevron-up" : "chevron-down"} 
              size={20} 
              color={COLORS.TEXT.SECONDARY} 
            />
          </TouchableOpacity>
          {showUnitDropdown && (
            <View style={styles.dropdownOptions}>
              {unitOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    formData.unitOfMeasure === option.value && styles.dropdownOptionActive
                  ]}
                  onPress={() => {
                    handleInputChange('unitOfMeasure', option.value);
                    setShowUnitDropdown(false);
                  }}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    formData.unitOfMeasure === option.value && styles.dropdownOptionTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {formData.unitOfMeasure === option.value && (
                    <Ionicons name="checkmark" size={18} color={COLORS.PRIMARY.MAIN} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Minimum Order Quantity</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons name="shopping-cart" size={20} color={COLORS.TEXT.PLACEHOLDER} />
            <TextInput
              style={styles.input}
              placeholder="Enter minimum quantity"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={formData.minimumOrder}
              onChangeText={(text) => handleInputChange('minimumOrder', text)}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.PRIMARY.MAIN} />
          <Text style={styles.infoText}>
            Customers must order at least {formData.minimumOrder || '1'} {formData.unitOfMeasure.replace('per_', '')} of your service
          </Text>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Render Step 4: Photos & Description
  const renderStep4 = () => (
    <Animated.View style={[styles.stepContent, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>04</Text>
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>Service Details</Text>
          <Text style={styles.stepSubtitle}>Add photos and description</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.formSection} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }} // Increased padding to avoid overlap
      >
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Service Photos</Text>
          <Text style={styles.inputHint}>Add up to 10 photos to showcase your service</Text>
          <MultiImagePicker
            onImagesSelected={handleImagesSelected}
            maxImages={10}
            placeholder="Add Photos"
          />
          {formData.photos.length > 0 && (
            <View style={styles.photoCount}>
              <Ionicons name="images" size={16} color={COLORS.PRIMARY.MAIN} />
              <Text style={styles.photoCountText}>
                {formData.photos.length} photo{formData.photos.length > 1 ? 's' : ''} selected
              </Text>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Service Description (Optional)</Text>
          <Text style={styles.inputHint}>Describe what you offer and what makes it special</Text>
          <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter detailed description of your service..."
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          {formData.description && (
            <Text style={styles.charCount}>
              {formData.description.length} characters
            </Text>
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );

  if (!isDataReady) {
    return (
      <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
          <Text style={styles.loadingScreenText}>Loading...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          
          <View style={styles.logoSection}>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit' : 'Create'} Listing</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.progressSteps}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressStep,
                  currentStep >= step && styles.progressStepActive,
                ]}
              >
                {currentStep > step ? (
                  <Ionicons name="checkmark" size={12} color={COLORS.NEUTRAL.WHITE} />
                ) : (
                  <Text
                    style={[
                      styles.progressStepText,
                      currentStep >= step && styles.progressStepTextActive,
                    ]}
                  >
                    {step}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </Animated.View>
        </View>

        {/* The bottom action button is now consistently rendered across all steps */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!validateStep(currentStep) || loading) && styles.primaryButtonDisabled
            ]}
            onPress={handleNext}
            disabled={!validateStep(currentStep) || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.NEUTRAL.WHITE} />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>
                  {currentStep === 4 ? (isEditMode ? 'Update Listing' : 'Create Listing') : 'Continue'}
                </Text>
                {currentStep < 4 && (
                  <Ionicons name="arrow-forward" size={20} color={COLORS.NEUTRAL.WHITE} />
                )}
              </>
            )}
          </TouchableOpacity>
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
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingScreenText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  progressContainer: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 2,
  },
  progressSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -14,
    paddingHorizontal: SPACING.XL,
  },
  progressStep: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.NEUTRAL.WHITE,
  },
  progressStepActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  progressStepText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  progressStepTextActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.MD,
  },
  formCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 20,
    padding: SPACING.LG,
    flex: 1,
    marginBottom: SPACING.SM,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XL,
  },
  stepNumber: {
    fontSize: 24,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.PRIMARY.LIGHT,
    marginRight: SPACING.MD,
    lineHeight: 24,
    fontWeight: '700',
  },
  stepTitleContainer: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  stepSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  formSection: {
    flex: 1,
  },
  
  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 16,
    padding: SPACING.MD,
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: COLORS.BORDER.PRIMARY,
    minHeight: 110,
    position: 'relative',
  },
  categoryCardActive: {
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderColor: COLORS.PRIMARY.MAIN,
    borderWidth: 2,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
    tintColor: COLORS.TEXT.SECONDARY,
    position: 'absolute',
    bottom: SPACING.SM,
    right: SPACING.SM,
    opacity: 0.8,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.XS,
  },
  categoryTextActive: {
    color: COLORS.PRIMARY.DARK,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY.MAIN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Subcategory List
  subCategoryItem: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 14,
    marginBottom: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    overflow: 'hidden',
  },
  subCategoryItemActive: {
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  subCategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  subCategoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 22,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  subCategoryIconActive: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  subCategoryIcon: {
    width: 46,
    height: 46,
    resizeMode: 'contain',

  },
  subCategoryTextContainer: {
    flex: 1,
  },
  subCategoryName: {
    fontSize: 15,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  subCategoryNameActive: {
    color: COLORS.PRIMARY.DARK,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  subCategoryDescription: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  
  // Input Fields
  inputGroup: {
    marginBottom: SPACING.LG,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.XS,
  },
  inputHint: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.SM,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  textAreaWrapper: {
    height: 'auto',
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: SPACING.SM,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    paddingVertical: 0,
    marginLeft: SPACING.SM,
  },
  textArea: {
    marginLeft: 0,
    height: 80,
    textAlignVertical: 'top',
  },
  currencySymbol: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  
  // Dropdown
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PLACEHOLDER,
    marginLeft: SPACING.SM,
  },
  dropdownTextSelected: {
    color: COLORS.TEXT.PRIMARY,
  },
  dropdownOptions: {
    marginTop: SPACING.XS,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    overflow: 'hidden',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  dropdownOptionActive: {
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  dropdownOptionText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  dropdownOptionTextActive: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.LIGHT,
    padding: SPACING.MD,
    borderRadius: 12,
    marginTop: SPACING.SM,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.PRIMARY.MAIN,
    marginLeft: SPACING.SM,
    lineHeight: 18,
  },
  
  // Photo Count
  photoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.SM,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  photoCountText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
    marginLeft: SPACING.XS,
  },
  
  // Character Count
  charCount: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'right',
    marginTop: SPACING.XS,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['4XL'],
  },
  emptyStateText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: SPACING.MD,
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING['4XL'],
  },
  loadingText: {
    marginTop: SPACING.MD,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  
  // Bottom Actions
  bottomActions: {
    padding: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    paddingBottom: SPACING.MD + 12,
    marginBottom: 60, // ensure we sit above the tab bar
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    opacity: 0.5,
  },
  primaryButtonLoading: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.MD,
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
});

export default CreateListingScreen;