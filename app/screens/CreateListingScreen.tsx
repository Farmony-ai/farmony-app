import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SHADOWS, FONTS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import CatalogueService, { Category, SubCategory } from '../services/CatalogueService';
import ListingService, { CreateListingPayload } from '../services/ListingService';
import categoryIcons from '../utils/icons';
import MultiImagePicker from '../components/MultiImagePicker';
import { ImagePickerResult } from '../services/ImagePickerService';

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

  const [currentStep, setCurrentStep] = useState(0);
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
    coordinates: [78.1134, 18.0534],
    price: '',
    unitOfMeasure: 'per_hour',
    minimumOrder: '1',

  });

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        const categories = await CatalogueService.getCategories();
        setAvailableCategories(categories);

        if (isEditMode && token) {
          const listingData = await ListingService.getListingById(listingId, token);
          setFormData({
            ...formData,
            providerId: typeof listingData.providerId === 'object' 
              ? listingData.providerId._id 
              : listingData.providerId,
            title: listingData.title,
            description: listingData.description,
            categoryId: listingData.categoryId._id,
            subCategoryId: listingData.subCategoryId._id,
            photos: listingData.photos,
            price: listingData.price.toString(),
            unitOfMeasure: listingData.unitOfMeasure,
            minimumOrder: listingData.minimumOrder.toString(),

            subCategorySelected: true,
          });
          if (listingData.categoryId) {
            fetchSubCategories(listingData.categoryId._id);
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
    { value: 'per_kg', label: 'Per Kg' },
    { value: 'per_unit', label: 'Per Unit' },
    { value: 'per_piece', label: 'Per Piece' },
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
      case 0:
        return !!formData.categoryId && !!formData.subCategoryId;
      case 1:
        return !!formData.price && !!formData.unitOfMeasure && !!formData.minimumOrder;
      case 2:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 2) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      Alert.alert('Validation Error', 'Please complete all required fields in this step.');
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Error', 'You must be logged in to create or update a listing.');
      return;
    }

    try {
      setLoading(true);
      const payload: CreateListingPayload = {
        providerId: formData.providerId,
        title: formData.title,
        description: formData.description,
        categoryId: formData.categoryId,
        subCategoryId: formData.subCategoryId,
        photos: formData.photos, // Send ImagePickerResult objects directly
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
        console.log('Updating listing with payload:', JSON.stringify(payload, null, 2));
        console.log('Updating listing - providerId:', payload.providerId);
        console.log('Updating listing - listingId:', listingId);
        await ListingService.updateListing(listingId, payload, token);
        Alert.alert('Success', 'Listing updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await ListingService.createListing(payload, token);
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

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}
            >
              {step + 1}
            </Text>
          </View>
          {step < 2 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Category Selection</Text>
      <Text style={styles.stepSubtitle}>Choose the right category for your service</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Category *</Text>
        <View style={styles.categoryGrid}>
          {availableCategories.map((category) => (
            <TouchableOpacity
              key={category._id}
              style={[
                styles.categoryCard,
                formData.categoryId === category._id && styles.categoryCardActive,
              ]}
              onPress={() => handleCategorySelect(category._id)}
            >
              <Image
                source={categoryIcons[category.icon || 'tools'] || categoryIcons['tools']}
                style={styles.categoryIcon}
              />
              <Text
                style={[
                  styles.categoryText,
                  formData.categoryId === category._id && styles.categoryTextActive,
                ]}
                numberOfLines={2}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {formData.categoryId && (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Subcategory *</Text>
          {availableSubCategories.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableSubCategories.map((sub) => (
                <TouchableOpacity
                  key={sub._id}
                  style={[
                    styles.subCategoryChip,
                    formData.subCategoryId === sub._id && styles.subCategoryChipActive,
                  ]}
                  onPress={() => handleSubCategorySelect(sub._id)}
                >
                  <Text
                    style={[
                      styles.subCategoryText,
                      formData.subCategoryId === sub._id && styles.subCategoryTextActive,
                    ]}
                  >
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noDataText}>No subcategories available</Text>
          )}
        </View>
      )}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Pricing & Details</Text>
      <Text style={styles.stepSubtitle}>Set your pricing and other details</Text>
      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Price *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="0"
            value={formData.price}
            onChangeText={(text) => handleInputChange('price', text)}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
          <Text style={styles.inputLabel}>Unit *</Text>
          <TouchableOpacity 
            style={styles.dropdown}
            onPress={() => setShowUnitDropdown(!showUnitDropdown)}
          >
            <Text style={styles.dropdownText}>
              {unitOptions.find(u => u.value === formData.unitOfMeasure)?.label || 'Select Unit'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </View>
      {showUnitDropdown && (
        <View style={styles.dropdownOptions}>
          {unitOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.dropdownOption}
              onPress={() => {
                handleInputChange('unitOfMeasure', option.value);
                setShowUnitDropdown(false);
              }}
            >
              <Text style={styles.dropdownOptionText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Minimum Order *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="1"
          value={formData.minimumOrder}
          onChangeText={(text) => handleInputChange('minimumOrder', text)}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Photos & Description</Text>
      <Text style={styles.stepSubtitle}>Add photos and a description for your listing</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Photos *</Text>
        <MultiImagePicker
          onImagesSelected={handleImagesSelected}
          maxImages={10}
          placeholder="Add Photos"
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Describe your service in detail..."
          value={formData.description}
          onChangeText={(text) => handleInputChange('description', text)}
          multiline
          numberOfLines={4}
        />
      </View>
    </View>
  );

  if (!isDataReady) {
    return (
      <SafeAreaWrapper backgroundColor="#f5f5f5">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
          <Text>Loading data...</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  return (
    <SafeAreaWrapper backgroundColor="#f5f5f5">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Listing' : 'Create New Listing'}</Text>
            <View style={{ width: 40 }} />
          </View>
          {renderStepIndicator()}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {currentStep === 0 && renderStep0()}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            <View style={styles.actionButtons}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setCurrentStep(currentStep - 1)}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  currentStep === 0 && { flex: 1 },
                ]}
                onPress={handleNext}
                disabled={loading}
              >
                <Text style={styles.primaryButtonText}>
                  {currentStep === 2 ? (isEditMode ? 'Update Listing' : 'Create Listing') : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: COLORS.PRIMARY.DARK,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 100,
  },
  categoryCardActive: {
    borderColor: COLORS.PRIMARY.MAIN,
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#6B7280',
    textAlign: 'center',
  },
  categoryTextActive: {
    color: COLORS.PRIMARY.MAIN,
  },
  subCategoryChip: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  subCategoryChipActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  subCategoryText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#6B7280',
  },
  subCategoryTextActive: {
    color: '#fff',
  },
  rowInputs: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  dropdownOptions: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: -15,
    marginBottom: 20,
    marginHorizontal: 106,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownOptionText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  photoUploadBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  photoUploadText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#6B7280',
    marginTop: 8,
  },
  photoList: {
    marginTop: 12,
  },
  photoItem: {
    position: 'relative',
    marginRight: 8,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...SHADOWS.MD,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#6B7280',
  },
  noDataText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default CreateListingScreen;
