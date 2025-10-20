import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
  Modal,
  Alert,
  Dimensions,
  TextInput,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import Button from '../components/Button';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils';
import { FONTS, FONT_SIZES } from '../utils/fonts';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { createServiceRequest } from '../store/slices/serviceRequestsSlice';
import CatalogueService, { Category, SubCategory } from '../services/CatalogueService';
import AddressService, { Address } from '../services/AddressService';

type CategoryHierarchyEntry = {
  category: Category;
  subCategories?: SubCategory[];
};

type DurationOption = {
  label: string;
  value: string;
  hours: number;
};

type PowerOption = {
  label: string;
  value: string;
};

const DURATION_OPTIONS: DurationOption[] = [
  { label: '2 Hours', value: '2h', hours: 2 },
  { label: '4 Hours', value: '4h', hours: 4 },
  { label: '8 Hours', value: '8h', hours: 8 },
  { label: 'Full Day', value: 'fullday', hours: 10 },
  { label: 'Custom', value: 'custom', hours: 0 },
];

const POWER_OPTIONS: PowerOption[] = [
  { label: '1-Phase', value: 'one-phase' },
  { label: '3-Phase', value: 'three-phase' },
];

const TIME_SLOTS = ['09:00 am', '11:00 am', '01:00 pm', '03:00 pm', '05:00 pm'];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const getNextSevenDays = (baseDate: Date) => {
  const today = new Date();
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + index);
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();

    return {
      label: isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' }),
      date: date.toISOString().split('T')[0],
      dayNum: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    };
  });
};

const getAddressIconName = (tag?: string) => {
  switch (tag) {
    case 'home':
      return 'home-outline';
    case 'work':
      return 'briefcase-outline';
    case 'personal':
      return 'person-outline';
    default:
      return 'location-outline';
  }
};

const formatAddress = (address: Address) =>
  [
    address.addressLine1,
    address.addressLine2,
    address.village,
    address.district,
    address.state,
    address.pincode,
  ]
    .filter(Boolean)
    .join(', ');

const CreateServiceRequestScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);

  const {
    preselectedCategoryId,
    preselectedCategoryName,
    preselectedSubCategoryId,
    preselectedSubCategoryName,
    requestDate,
    prefetchedCategories,
    prefetchedHierarchy,
  } = route.params || {};

  const parsedRequestDate =
    typeof requestDate === 'string' ? new Date(requestDate) : null;
  const validPrefillDate =
    parsedRequestDate && !Number.isNaN(parsedRequestDate.getTime())
      ? parsedRequestDate
      : null;

  const [categories, setCategories] = useState<Category[]>(prefetchedCategories || []);
  const [categoryHierarchy, setCategoryHierarchy] = useState<CategoryHierarchyEntry[]>(
    prefetchedHierarchy || []
  );
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<SubCategory | null>(null);

  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(
    DURATION_OPTIONS[0]
  );
  const [selectedPower, setSelectedPower] = useState<PowerOption>(POWER_OPTIONS[0]);
  const [operatorIncluded, setOperatorIncluded] = useState(true);

  const [selectedDate, setSelectedDate] = useState(
    (validPrefillDate || new Date()).toISOString().split('T')[0]
  );
  const [selectedTime, setSelectedTime] = useState<string>(TIME_SLOTS[0]);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAllAddresses, setShowAllAddresses] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ requestId?: string } | null>(null);
  const successAnim = useRef(new Animated.Value(0)).current;
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [durationModalVisible, setDurationModalVisible] = useState(false);
  const [powerModalVisible, setPowerModalVisible] = useState(false);
  const [customHoursModalVisible, setCustomHoursModalVisible] = useState(false);
  const [customHours, setCustomHours] = useState('2');

const serviceTitle = useMemo(() => {
  if (preselectedSubCategoryName) return preselectedSubCategoryName;
  if (preselectedCategoryName) return preselectedCategoryName;
  return 'Service Request';
}, [preselectedCategoryName, preselectedSubCategoryName]);

useEffect(() => {
  return () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  };
}, []);

  useEffect(() => {
    if (prefetchedHierarchy) {
      setCategoryHierarchy(prefetchedHierarchy);
    }
  }, [prefetchedHierarchy]);

  useEffect(() => {
    if (prefetchedCategories?.length) {
      setCategories(prefetchedCategories);
    } else {
      fetchCategories();
    }
  }, [prefetchedCategories]);

useEffect(() => {
  fetchAddresses();
}, []);

useEffect(() => {
  if (successData) {
    successAnim.stopAnimation();
    successAnim.setValue(0);
    Animated.timing(successAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }

    successTimeoutRef.current = setTimeout(() => {
      Animated.timing(successAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setSuccessData(null);
        navigation.navigate('Main');
        successTimeoutRef.current = null;
      });
    }, 3000);
  }
}, [successData, navigation, successAnim]);

  const fetchCategories = async () => {
    try {
      const [allCategories, hierarchy] = await Promise.all([
        CatalogueService.getCategories(),
        CatalogueService.getCategoryHierarchy().catch(() => []),
      ]);
      setCategories(allCategories);
      if (Array.isArray(hierarchy)) {
        setCategoryHierarchy(hierarchy as CategoryHierarchyEntry[]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAddresses = async () => {
    const userId = user?._id || user?.id;
    if (!userId) {
      setLoadingAddresses(false);
      return;
    }

    try {
      setLoadingAddresses(true);
      const userAddresses = await AddressService.getUserAddresses(userId);
      setAddresses(userAddresses);
      const defaultAddress =
        userAddresses.find((addr) => addr.isDefault) || userAddresses[0] || null;
      setSelectedAddress(defaultAddress);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (!categories.length) return;

    let matchedCategory: Category | null = null;

    if (preselectedCategoryId) {
      matchedCategory =
        categories.find((cat) => cat._id === preselectedCategoryId) || null;
    }

    if (!matchedCategory && preselectedCategoryName) {
      const normalized = preselectedCategoryName.trim().toLowerCase();
      matchedCategory =
        categories.find((cat) => cat.name.toLowerCase() === normalized) || null;
    }

    if (!matchedCategory && categories.length) {
      matchedCategory = categories[0];
    }

    if (!matchedCategory) return;

    setSelectedCategory(matchedCategory);

    const hierarchyEntry = categoryHierarchy.find(
      (entry) => entry.category?._id === matchedCategory?._id
    );

    if (hierarchyEntry?.subCategories?.length) {
      setSubCategories(hierarchyEntry.subCategories);
      const matchedSub =
        hierarchyEntry.subCategories.find(
          (sub) => sub._id === preselectedSubCategoryId
        ) ||
        hierarchyEntry.subCategories.find(
          (sub) =>
            sub.name.toLowerCase() ===
            (preselectedSubCategoryName || '').trim().toLowerCase()
        ) ||
        hierarchyEntry.subCategories[0] ||
        null;
      setSelectedSubCategory(matchedSub);
    } else {
      loadSubCategories(matchedCategory._id);
    }
  }, [
    categories,
    categoryHierarchy,
    preselectedCategoryId,
    preselectedCategoryName,
    preselectedSubCategoryId,
    preselectedSubCategoryName,
  ]);

  const loadSubCategories = async (categoryId: string) => {
    try {
      const fetchedSubCategories = await CatalogueService.getSubCategories(categoryId);
      setSubCategories(fetchedSubCategories);
      const matchedSub =
        fetchedSubCategories.find((sub) => sub._id === preselectedSubCategoryId) ||
        fetchedSubCategories.find(
          (sub) =>
            sub.name.toLowerCase() ===
            (preselectedSubCategoryName || '').trim().toLowerCase()
        ) ||
        fetchedSubCategories[0] ||
        null;
      setSelectedSubCategory(matchedSub);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  const days = useMemo(
    () => getNextSevenDays(validPrefillDate || new Date()),
    [validPrefillDate]
  );

  const handleAddNewAddress = () => {
    navigation.navigate('AddAddress', { fromCreateRequest: true });
  };

  const handleSubmit = async () => {
    if (!selectedCategory?._id) {
      Alert.alert('Missing category', 'Unable to determine the service category.');
      return;
    }

    if (!selectedDate) {
      Alert.alert('Missing date', 'Please select a service date.');
      return;
    }

    if (!selectedTime) {
      Alert.alert('Missing time', 'Please select a preferred time slot.');
      return;
    }

    if (!selectedAddress || !Array.isArray(selectedAddress.coordinates)) {
      Alert.alert('Missing address', 'Please select an address.');
      return;
    }

    const [longitude, latitude] = selectedAddress.coordinates;

    const descriptionLines = [
      `Duration: ${selectedDuration.label}`,
      `Power: ${selectedPower.label}`,
      `Operator included: ${operatorIncluded ? 'Yes' : 'No'}`,
      `Preferred time: ${selectedTime}`,
    ];

    const addressText = formatAddress(selectedAddress);

    const requestData = {
      categoryId: selectedCategory._id,
      subCategoryId: selectedSubCategory?._id,
      title: serviceTitle,
      description: descriptionLines.join('\n'),
      location: {
        lat: latitude,
        lon: longitude,
      },
      address: addressText || undefined,
      serviceStartDate: selectedDate,
      serviceEndDate: selectedDate,
      urgency: 'scheduled' as const,
      metadata: {
        durationHours: selectedDuration.hours,
        durationLabel: selectedDuration.label,
        powerPhase: selectedPower.value,
        powerLabel: selectedPower.label,
        operatorIncluded,
        preferredTime: selectedTime,
      },
    };

    try {
      setIsSubmitting(true);
      const response = await dispatch(createServiceRequest(requestData)).unwrap();
      setSuccessData({
        requestId:
          response?.requestNumber ||
          response?.displayId ||
          response?.referenceId ||
          response?._id,
      });
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create service request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDurationSelect = (option: DurationOption) => {
    if (option.value === 'custom') {
      setDurationModalVisible(false);
      setCustomHoursModalVisible(true);
    } else {
      setSelectedDuration(option);
      setDurationModalVisible(false);
    }
  };

  const handleCustomHoursSubmit = () => {
    const hours = parseInt(customHours, 10);
    if (hours > 0 && hours <= 24) {
      setSelectedDuration({
        label: `${hours} Hours`,
        value: 'custom',
        hours: hours,
      });
      setCustomHoursModalVisible(false);
    } else {
      Alert.alert('Invalid Input', 'Please enter hours between 1 and 24');
    }
  };

  const renderOptionModal = (
    visible: boolean,
    onClose: () => void,
    options: Array<DurationOption | PowerOption>,
    onSelect: (option: DurationOption | PowerOption) => void,
    selectedValue: string,
    isDurationModal: boolean = false
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              {options.map((option) => {
                const optionValue =
                  'value' in option ? option.value : option.label;
                const isSelected = optionValue === selectedValue;
                return (
                  <TouchableOpacity
                    key={optionValue}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      onSelect(option);
                      if (!isDurationModal) {
                        onClose();
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        isSelected && styles.modalOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderCustomHoursModal = () => (
    <Modal
      visible={customHoursModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setCustomHoursModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setCustomHoursModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <Text style={styles.customHoursTitle}>Enter Custom Hours</Text>
              <View style={styles.customHoursInputContainer}>
                <Ionicons name="time-outline" size={20} color={COLORS.TEXT.SECONDARY} />
                <TextInput
                  value={customHours}
                  onChangeText={setCustomHours}
                  placeholder="Enter hours (1-24)"
                  keyboardType="number-pad"
                  style={styles.customHoursInput}
                  maxLength={2}
                  autoFocus
                />
              </View>
              <View style={styles.customHoursButtons}>
                <TouchableOpacity
                  style={[styles.customHoursButton, styles.customHoursCancelButton]}
                  onPress={() => setCustomHoursModalVisible(false)}
                >
                  <Text style={styles.customHoursCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.customHoursButton, styles.customHoursSubmitButton]}
                  onPress={handleCustomHoursSubmit}
                >
                  <Text style={styles.customHoursSubmitText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review Request</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.serviceTitle}>{serviceTitle}</Text>

            <View style={styles.inlineSelectors}>
              <View style={styles.selectorColumn}>
                <Text style={styles.selectorLabel}>Duration</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setDurationModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectorValue}>{selectedDuration.label}</Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.TEXT.SECONDARY} />
                </TouchableOpacity>
              </View>
              <View style={styles.selectorColumn}>
                <Text style={styles.selectorLabel}>Power</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setPowerModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectorValue}>{selectedPower.label}</Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.TEXT.SECONDARY} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.toggleRow}>
              <Switch
                value={operatorIncluded}
                onValueChange={setOperatorIncluded}
                trackColor={{ true: COLORS.PRIMARY.MAIN, false: '#E2E8F0' }}
                thumbColor={operatorIncluded ? COLORS.NEUTRAL.WHITE : '#f4f3f4'}
              />
              <Text style={styles.toggleLabel}>Operator Included</Text>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateList}
            >
              {days.map((day) => {
                const isSelected = selectedDate === day.date;
                return (
                  <TouchableOpacity
                    key={day.date}
                    style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                    onPress={() => setSelectedDate(day.date)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.dateChipLabel, isSelected && styles.dateChipLabelSelected]}
                    >
                      {day.label}
                    </Text>
                    <Text
                      style={[styles.dateChipDay, isSelected && styles.dateChipDaySelected]}
                    >
                      {day.dayNum}
                    </Text>
                    <Text
                      style={[styles.dateChipMonth, isSelected && styles.dateChipMonthSelected]}
                    >
                      {day.month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionTitle, { marginTop: SPACING.MD }]}>
              Select Time
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeList}
            >
              {TIME_SLOTS.map((slot) => {
                const isSelected = selectedTime === slot;
                return (
                  <TouchableOpacity
                    key={slot}
                    style={[styles.timeChip, isSelected && styles.timeChipSelected]}
                    onPress={() => setSelectedTime(slot)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Address</Text>
            {loadingAddresses ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
              </View>
            ) : addresses.length > 0 ? (
              <>
                {selectedAddress && (
                  <TouchableOpacity
                    style={styles.compactAddressCard}
                    onPress={() => setShowAllAddresses((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.compactAddressLeft}>
                      <Ionicons
                        name={getAddressIconName(selectedAddress.tag)}
                        size={18}
                        color={COLORS.PRIMARY.MAIN}
                      />
                    </View>
                    <View style={styles.compactAddressContent}>
                      <Text style={styles.compactAddressTag}>
                        {selectedAddress.tag
                          ? `${selectedAddress.tag.charAt(0).toUpperCase()}${selectedAddress.tag.slice(1)}`
                          : 'Address'}
                        {selectedAddress.isDefault ? ' • Default' : ''}
                      </Text>
                      <Text style={styles.compactAddressText} numberOfLines={2}>
                        {formatAddress(selectedAddress)}
                      </Text>
                    </View>
                    <Ionicons
                      name={showAllAddresses ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={COLORS.TEXT.SECONDARY}
                    />
                  </TouchableOpacity>
                )}

                {showAllAddresses && (
                  <View style={styles.expandedAddresses}>
                    {addresses.map((address) => {
                      const isActive = selectedAddress?._id === address._id;
                      return (
                        <TouchableOpacity
                          key={address._id}
                          style={[
                            styles.compactAddressOption,
                            isActive && styles.compactAddressOptionActive,
                          ]}
                          onPress={() => {
                            setSelectedAddress(address);
                            setShowAllAddresses(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.radioOuter}>
                            {isActive && <View style={styles.radioInner} />}
                          </View>
                          <View style={styles.compactAddressContent}>
                            <Text style={styles.compactAddressTag}>
                              {address.tag
                                ? `${address.tag.charAt(0).toUpperCase()}${address.tag.slice(1)}`
                                : 'Address'}
                            </Text>
                            <Text style={styles.compactAddressText} numberOfLines={2}>
                              {formatAddress(address)}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      style={styles.compactAddNewButton}
                      onPress={handleAddNewAddress}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={18}
                        color={COLORS.PRIMARY.MAIN}
                      />
                      <Text style={styles.compactAddNewText}>Add New Address</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <TouchableOpacity
                style={styles.emptyAddressButton}
                onPress={handleAddNewAddress}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color={COLORS.PRIMARY.MAIN} />
                <Text style={styles.emptyAddressText}>Add Your Address</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Send Request"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
        </View>
        {renderOptionModal(
          durationModalVisible,
          () => setDurationModalVisible(false),
          DURATION_OPTIONS,
          handleDurationSelect,
          selectedDuration.value,
          true
        )}

        {renderOptionModal(
          powerModalVisible,
          () => setPowerModalVisible(false),
          POWER_OPTIONS,
          setSelectedPower,
          selectedPower.value,
          false
        )}

        {renderCustomHoursModal()}

        <Modal visible={Boolean(successData)} transparent animationType="none">
          <View style={styles.successModalBackdrop}>
            <Animated.View
              style={[
                styles.successPanel,
                {
                  transform: [
                    {
                      translateY: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [SCREEN_HEIGHT, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.successIconWrapper}>
                <Ionicons name="checkmark" size={32} color={COLORS.NEUTRAL.WHITE} />
              </View>
              <Text style={styles.successTitle}>Request Submitted</Text>
              <Text style={styles.successMessage}>
                We will notify you once providers accept.
              </Text>
              {successData?.requestId ? (
                <Text style={styles.successMeta}>Request Id: {successData.requestId}</Text>
              ) : null}
            </Animated.View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  headerBackButton: {
    padding: SPACING.SM,
  },
  headerTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  headerPlaceholder: {
    width: 32,
  },
  contentContainer: {
    padding: SPACING.MD,
    paddingBottom: SPACING['2XL'],
  },
  sectionCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    ...SHADOWS.SM,
  },
  serviceTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.MD,
  },
  inlineSelectors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.MD,
  },
  selectorColumn: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.XS,
  },
  selectorButton: {
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorValue: {
    fontSize: FONT_SIZES.MD,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    marginTop: SPACING.LG,
  },
  toggleLabel: {
    fontSize: FONT_SIZES.MD,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.MD,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  dateList: {
    flexDirection: 'row',
    gap: SPACING.SM,
    paddingVertical: SPACING.SM,
  },
  dateChip: {
    width: 72,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  dateChipSelected: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  dateChipLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  dateChipLabelSelected: {
    color: COLORS.NEUTRAL.WHITE,
  },
  dateChipDay: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginVertical: 2,
  },
  dateChipDaySelected: {
    color: COLORS.NEUTRAL.WHITE,
  },
  dateChipMonth: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  dateChipMonthSelected: {
    color: COLORS.NEUTRAL.WHITE,
  },
  timeList: {
    flexDirection: 'row',
    paddingVertical: SPACING.SM,
    paddingRight: SPACING.SM,
  },
  timeChip: {
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginRight: SPACING.SM,
  },
  timeChipSelected: {
    borderColor: COLORS.PRIMARY.MAIN,
    backgroundColor: 'rgba(26, 127, 90, 0.12)',
  },
  timeChipText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  timeChipTextSelected: {
    color: COLORS.PRIMARY.MAIN,
  },
  loadingContainer: {
    paddingVertical: SPACING.LG,
    alignItems: 'center',
  },
  compactAddressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY.MAIN,
    backgroundColor: 'rgba(26, 127, 90, 0.08)',
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
    marginBottom: SPACING.MD,
    gap: SPACING.MD,
  },
  compactAddressLeft: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  compactAddressContent: {
    flex: 1,
  },
  compactAddressTag: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  compactAddressText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  expandedAddresses: {
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    gap: SPACING.SM,
  },
  compactAddressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
    paddingVertical: SPACING.SM,
  },
  compactAddressOptionActive: {
    backgroundColor: 'rgba(26, 127, 90, 0.08)',
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.SM,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY.MAIN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  compactAddNewButton: {
    marginTop: SPACING.SM,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.SM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
  },
  compactAddNewText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  emptyAddressButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.MD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
  },
  emptyAddressText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  footer: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
  },
  modalContent: {
    width: '100%',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    paddingVertical: SPACING.SM,
  },
  modalOption: {
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(26, 127, 90, 0.12)',
  },
  modalOptionText: {
    fontSize: FONT_SIZES.MD,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  modalOptionTextSelected: {
    color: COLORS.PRIMARY.MAIN,
  },
  successModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  successPanel: {
    height: SCREEN_HEIGHT,
    width: '100%',
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderTopLeftRadius: BORDER_RADIUS['2XL'],
    borderTopRightRadius: BORDER_RADIUS['2XL'],
    paddingHorizontal: SPACING.XL,
    paddingTop: SPACING['2XL'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: COLORS.NEUTRAL.WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.LG,
  },
  successTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
    marginBottom: SPACING.SM,
  },
  successMessage: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.NEUTRAL.WHITE,
    textAlign: 'center',
    marginHorizontal: SPACING.LG,
    marginBottom: SPACING.MD,
  },
  successMeta: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.NEUTRAL.WHITE,
  },
});

export default CreateServiceRequestScreen;
