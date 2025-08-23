/**
 * SignUpScreen with 4 steps:
 * 1. User Details (name, phone, email)
 * 2. Address Selection (with map)
 * 3. Password Creation
 * 4. OTP Verification
 * 
 * Note: Ensure GOOGLE_MAPS_API_KEY is configured in ../config/api
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, FONT_SIZES } from '../utils';
import { isValidEmail, isRequired, isValidPassword } from '../utils/validators';
import { registerUser, setCurrentScreen, clearError, setOtpChannel, verifyOTP } from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';
import { checkPhoneExists } from '../services/api';
import firebaseSMSService from '../services/firebaseSMS';
import otplessService from '../services/otpless';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_MAPS_API_KEY } from '../config/api';
import AddressService from '../services/AddressService';
import LocationService from '../services/locationService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const GOOGLE_API_KEY = (GOOGLE_MAPS_API_KEY || '') as string;

// Check if Google API key is available
if (!GOOGLE_API_KEY) {
  console.warn('Google Maps API key is not configured. Map features may not work properly.');
}

const TAGS = ['home', 'work', 'personal', 'other'] as const;
type TagType = typeof TAGS[number];

const SignUpScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isSigningUp, error, otpChannel, isVerifyingOTP, isAuthenticated, currentScreen } = useSelector((state: RootState) => state.auth);
  const { latitude: currentLat, longitude: currentLng } = useSelector((state: RootState) => state.location);

  const [currentStep, setCurrentStep] = useState(1);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  // Step 1 State - User Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);

  // Step 2 State - Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [village, setVillage] = useState('');
  const [tehsil, setTehsil] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [addressTag, setAddressTag] = useState<TagType>('home');
  const [mapRegion, setMapRegion] = useState<Region>({
    latitude: currentLat || 17.385044,
    longitude: currentLng || 78.486671,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [addressErrors, setAddressErrors] = useState<{ [key: string]: string }>({});
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const mapRef = useRef<MapView>(null);
  const placesRef = useRef<any>(null);
    // inside SignUpScreen component, near your other hooks:
  const [placesOpen, setPlacesOpen] = useState(false);

  const screenHeight = useRef(Dimensions.get('window').height).current;
  const MAP_HEIGHT = useMemo(
    () => Math.min(300, Math.max(220, Math.floor(screenHeight * 0.30))),
    [screenHeight]
  );


  // Step 3 State - Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 4 State - OTP Verification
  const [otp, setOTP] = useState(['', '', '', '', '', '']);
  const [otpError, setOTPError] = useState('');
  const [smsConfirmation, setSMSConfirmation] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<string>('');
  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);
  const [isOTPLessInitialized, setIsOTPLessInitialized] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

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
      toValue: (currentStep - 1) / 3, // 0, 0.33, 0.66, 1 for steps 1, 2, 3, 4
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // OTP input focus effect
  useEffect(() => {
    if (currentStep === 4) {
      inputRefs.current[0]?.focus();
    }
  }, [currentStep]);

  // Monitor authentication state
  useEffect(() => {
    console.log('SignUpScreen: isAuthenticated changed to', isAuthenticated);
    if (isAuthenticated && currentScreen === 'authenticated') {
      navigation.navigate('Home');
    }
  }, [isAuthenticated, currentScreen]);

  // Address helper functions
  const getCurrentLocation = async () => {
    setFetchingLocation(true);
    try {
      const hasPermission = await LocationService.requestLocationPermission();
      if (!hasPermission) {
        Alert.alert('Location Permission', 'Please enable location permission to use this feature.');
        setFetchingLocation(false);
        return;
      }
      
      const location = await LocationService.getCurrentLocation();
      if (location) {
        const newRegion = {
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        setMapRegion(newRegion);
        mapRef.current?.animateToRegion(newRegion, 800);
        await reverseGeocodeLocation(location.latitude, location.longitude);
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Could not fetch current location. Please try again.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const firstLongName = (components: any[], typesWanted: string[]) => {
    const c = components.find((x) => (x.types || []).some((t: string) => typesWanted.includes(t)));
    return c?.long_name || '';
  };

  const applyAddressComponentsFromPlace = (components: any[] = [], formatted?: string) => {
    setAddressLine1('');
    setAddressLine2('');
    setVillage('');
    setTehsil('');
    setDistrict('');
    setState('');
    setPincode('');

    const premise = firstLongName(components, ['premise', 'subpremise', 'street_number']);
    const route = firstLongName(components, ['route']);
    if (premise) setAddressLine1(premise);
    if (route) setAddressLine2(route);

    const vill = firstLongName(components, ['sublocality_level_2', 'neighborhood', 'administrative_area_level_3']) ||
      firstLongName(components, ['sublocality', 'sublocality_level_1', 'political']) ||
      firstLongName(components, ['locality']);
    if (vill) setVillage(vill);

    const teh = firstLongName(components, ['sublocality', 'sublocality_level_1']);
    if (teh) setTehsil(teh);

    const dist = firstLongName(components, ['administrative_area_level_2']) ||
      firstLongName(components, ['locality']);
    if (dist) setDistrict(dist);

    const st = firstLongName(components, ['administrative_area_level_1']);
    if (st) setState(st);

    const pin = firstLongName(components, ['postal_code']);
    if (pin) setPincode(pin);
  };

  const reverseGeocodeLocation = async (latitude: number, longitude: number) => {
    setReverseGeocoding(true);
    try {
      const result = await AddressService.reverseGeocode(latitude, longitude);
      const best = result?.results?.[0];
      if (best) {
        applyAddressComponentsFromPlace(best.address_components, best.formatted_address);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    } finally {
      setReverseGeocoding(false);
    }
  };

  const handleRegionChangeComplete = (region: Region) => {
    setMapRegion(region);
    // Debounce is built into the reverseGeocoding with timeout
    if (!reverseGeocoding) {
      setTimeout(() => {
        reverseGeocodeLocation(region.latitude, region.longitude);
      }, 800);
    }
  };

  const handlePlaceSelected = (data: any, details: any) => {
    if (!details || !details.geometry || !details.geometry.location) {
      Alert.alert('Error', 'Could not fetch location details. Please try again.');
      return;
    }
    
    const lat = details.geometry.location.lat;
    const lng = details.geometry.location.lng;
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      Alert.alert('Location not available', 'Could not fetch location details for the selected place.');
      return;
    }
    
    const newRegion = { 
      latitude: lat, 
      longitude: lng, 
      latitudeDelta: 0.005, 
      longitudeDelta: 0.005 
    };
    
    setMapRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 800);

    if (details.address_components) {
      applyAddressComponentsFromPlace(details.address_components, details.formatted_address);
    } else {
      reverseGeocodeLocation(lat, lng);
    }
  };

  // OTP helper functions
  const handleOTPChange = (value: string, index: number) => {
    if (value.length > 1) return;
    if (value !== '' && !/^\d$/.test(value)) return;
    const newOTP = [...otp];
    newOTP[index] = value;
    setOTP(newOTP);
    if (otpError) setOTPError('');
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validateOTPFormat = () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setOTPError('Please enter all 6 digits');
      return false;
    }
    return true;
  };

  // SMS/WhatsApp OTP functions
  const startFirebaseSMSAuth = async () => {
    try {
      if (!phone) {
        setOTPError('Phone number required for OTP');
        return;
      }
      let phoneE164: string;
      if (phone.startsWith('+')) {
        phoneE164 = phone;
      } else if (/^\d{10}$/.test(phone)) {
        phoneE164 = `+91${phone}`;
      } else {
        phoneE164 = `+${phone}`;
      }
      setAuthStatus('Sending SMS OTP...');
      const confirmation = await firebaseSMSService.sendOTP(phoneE164);
      setSMSConfirmation(confirmation);
      setAuthStatus('OTP sent successfully');
      dispatch(setOtpChannel('sms'));
    } catch (err: any) {
      console.error('❌ Failed to send SMS OTP:', err);
      setOTPError(err.message || 'Unable to send SMS OTP. Please try again.');
      setAuthStatus('');
    }
  };

  const initializeOTPLess = async () => {
    setIsWhatsAppLoading(true);
    try {
      setAuthStatus('Initializing WhatsApp...');
      otplessService.setResultCallback(handleOTPLessResult);
      await otplessService.initialize();
      setIsOTPLessInitialized(true);
      setAuthStatus('WhatsApp ready');
    } catch (err: any) {
      console.error('❌ Failed to initialize OTPLess:', err);
      setOTPError(err.message || 'Failed to initialize WhatsApp OTP');
      setAuthStatus('');
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  const handleWhatsAppOTP = async () => {
    if (!isOTPLessInitialized) {
      initializeOTPLess();
      return;
    }
    sendWhatsAppOTP();
  };

  const sendWhatsAppOTP = async () => {
    try {
      if (!phone) {
        setOTPError('Phone number required');
        return;
      }
      const cleanedInput = phone.replace(/[^\d+]/g, '');
      let countryCode = '91';
      let phoneNumber = cleanedInput;

      if (cleanedInput.startsWith('+')) {
        const match = cleanedInput.match(/^\+(\d{1,3})(\d+)/);
        if (match) {
          countryCode = match[1];
          phoneNumber = match[2];
        }
      }
      setAuthStatus('Sending WhatsApp OTP...');
      await otplessService.startPhoneAuth(phoneNumber, countryCode);
      dispatch(setOtpChannel('whatsapp'));
    } catch (err: any) {
      console.error('❌ Failed to send WhatsApp OTP:', err);
      setOTPError(err.message || 'Failed to send WhatsApp OTP');
      setAuthStatus('');
    }
  };

  const handleOTPLessResult = (result: any) => {
    if (result.success) {
      switch (result.message) {
        case 'SDK is ready for authentication':
          setAuthStatus('WhatsApp ready');
          sendWhatsAppOTP();
          break;
        case 'Authentication initiated':
          setAuthStatus(`OTP sent via WhatsApp`);
          break;
        case 'OTP automatically detected':
          if (result.otp) {
            const otpDigits = result.otp.split('');
            setOTP(otpDigits);
            setAuthStatus('OTP detected');
          }
          break;
        case 'One-tap authentication successful':
        case 'OTP verified successfully':
          setAuthStatus('Verified via WhatsApp');
          break;
        default:
          setAuthStatus(result.message || 'Ready');
      }
      setOTPError('');
    } else {
      setOTPError(result.error || 'Verification failed');
      setAuthStatus('');
    }
  };

  // Validation functions
  const validateStep = async (step: number): Promise<boolean> => {
    let isValid = true;
    dispatch(clearError());

    switch (step) {
      case 1:
        setNameError('');
        setPhoneError('');
        setEmailError('');

        if (!isRequired(name)) { 
          setNameError('Name is required'); 
          isValid = false; 
        } else if (name.length < 2) { 
          setNameError('Name must be at least 2 characters'); 
          isValid = false; 
        }

        if (!isRequired(phone)) { 
          setPhoneError('Phone number is required'); 
          isValid = false; 
        } else if (phone.length !== 10) { 
          setPhoneError('Enter a valid 10-digit number'); 
          isValid = false; 
        } else {
          setIsValidatingPhone(true);
          try {
            const result = await checkPhoneExists(phone);
            setIsValidatingPhone(false);
            if (result.exists) {
              setPhoneError('This number is already registered');
              isValid = false;
            }
          } catch (err: any) {
            setIsValidatingPhone(false);
            setPhoneError(err.message || 'Unable to verify phone');
            isValid = false;
          }
        }

        if (email && !isValidEmail(email)) { 
          setEmailError('Enter a valid email'); 
          isValid = false; 
        }
        break;

      case 2:
        const newErrors: { [key: string]: string } = {};
        if (!addressLine1.trim()) newErrors.addressLine1 = 'House/Plot/Building is required';
        if (!village.trim()) newErrors.village = 'Village/Locality is required';
        if (!district.trim()) newErrors.district = 'City/District is required';
        if (!state.trim()) newErrors.state = 'State is required';
        if (!pincode.trim()) newErrors.pincode = 'Pincode is required';
        else if (!/^\d{6}$/.test(pincode)) newErrors.pincode = 'Enter a valid 6-digit pincode';
        
        setAddressErrors(newErrors);
        isValid = Object.keys(newErrors).length === 0;
        break;

      case 3:
        setPasswordError('');
        setConfirmPasswordError('');

        if (!isRequired(password)) { 
          setPasswordError('Password is required'); 
          isValid = false; 
        } else if (!isValidPassword(password)) { 
          setPasswordError('Use 8+ characters with mixed case & numbers'); 
          isValid = false; 
        }

        if (!isRequired(confirmPassword)) { 
          setConfirmPasswordError('Please confirm password'); 
          isValid = false; 
        } else if (password !== confirmPassword) { 
          setConfirmPasswordError('Passwords don\'t match'); 
          isValid = false; 
        }
        break;

      case 4:
        setOTPError('');
        if (!validateOTPFormat()) { 
          isValid = false; 
        }
        break;
    }
    return isValid;
  };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep < 4) {
        if (currentStep === 3) {
          // After password step, register user with all collected data
          try {
            setAuthStatus('Creating account...');
            
            // Only include address if basic fields are filled
            const registrationData: any = {
              name,
              email,
              phone,
              password,
              role: 'individual',
            };
            
            // Add address if it's properly filled
            if (addressLine1 && village && district && state && pincode) {
              registrationData.address = {
                tag: addressTag,
                addressLine1,
                addressLine2,
                village,
                tehsil,
                district,
                state,
                pincode,
                coordinates: [mapRegion.longitude, mapRegion.latitude],
              };
            }

            const result = await dispatch(registerUser(registrationData));

            if (registerUser.fulfilled.match(result)) {
              setRegisteredUserId(result.payload.userId);
              startFirebaseSMSAuth();
              setCurrentStep(currentStep + 1);
            } else {
              Alert.alert('Error', result.error?.message || 'Account creation failed');
              setAuthStatus('');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message || 'An error occurred');
            setAuthStatus('');
          }
        } else {
          setCurrentStep(currentStep + 1);
        }
      } else if (currentStep === 4) {
        handleVerifyOTP();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleVerifyOTP = async () => {
    if (!validateOTPFormat()) return;
    dispatch(clearError());
    setOTPError('');
    const otpString = otp.join('');

    try {
      setAuthStatus('Verifying...');
      let verificationSuccessful = false;
      let lastError: string | null = null;

      if (otpChannel === 'sms') {
        if (!smsConfirmation) {
          setOTPError('Please request OTP first');
          return;
        }
        try {
          await firebaseSMSService.verifyOTP(smsConfirmation, otpString);
          verificationSuccessful = true;
          setAuthStatus('Verified!');
        } catch (smsError: any) {
          lastError = smsError.message || 'SMS verification failed';
        }
      } else if (otpChannel === 'whatsapp') {
        try {
          const cleanedInput = phone.replace(/[^\d+]/g, '');
          let countryCode = '91';
          let phoneNumber = cleanedInput;

          if (cleanedInput.startsWith('+')) {
            const match = cleanedInput.match(/^\+(\d{1,3})(\d+)/);
            if (match) {
              countryCode = match[1];
              phoneNumber = match[2];
            }
          }
          await otplessService.verifyOTP(phoneNumber, countryCode, otpString);
          verificationSuccessful = true;
          setAuthStatus('Verified!');
        } catch (whatsappError: any) {
          lastError = whatsappError.message || 'WhatsApp verification failed';
        }
      } else {
        setOTPError('Please request OTP first');
        return;
      }

      if (verificationSuccessful) {
        const result = await dispatch(verifyOTP({ 
          phone, 
          otp: otpString, 
          password, 
          userId: registeredUserId 
        }));
        
        if (verifyOTP.rejected.match(result)) {
          setOTPError(result.error.message || 'Verification failed');
          setAuthStatus('');
        }
      } else {
        setOTPError(lastError || 'Verification failed');
        setAuthStatus('');
      }
    } catch (err: any) {
      setOTPError(err.message || 'Verification failed');
      setAuthStatus('');
    }
  };

  const handleResendOTP = async () => {
    try {
      setAuthStatus('Resending...');
      setOTPError('');
      setOTP(['', '', '', '', '', '']);
      if (otpChannel === 'sms') {
        await startFirebaseSMSAuth();
      } else if (otpChannel === 'whatsapp') {
        await sendWhatsAppOTP();
      } else {
        await startFirebaseSMSAuth();
      }
    } catch (error) {
      setOTPError('Failed to resend OTP');
      setAuthStatus('');
    }
  };

  // Render Step 1: Basic Info
  const renderStep1 = () => (
    <Animated.View style={[styles.stepContent, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>01</Text>
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>Basic Info</Text>
          <Text style={styles.stepSubtitle}>Let's get to know you</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Full Name</Text>
          <View style={[styles.inputWrapper, nameError && styles.inputWrapperError]}>
            <Ionicons name="person-outline" size={20} color={COLORS.TEXT.PLACEHOLDER} />
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isSigningUp}
            />
            {name.length > 0 && !nameError && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS.MAIN} />
            )}
          </View>
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={[styles.inputWrapper, phoneError && styles.inputWrapperError]}>
            <View style={styles.phonePrefix}>
              <Text style={styles.phonePrefixText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!isSigningUp && !isValidatingPhone}
            />
            {isValidatingPhone && (
              <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
            )}
            {phone.length === 10 && !phoneError && !isValidatingPhone && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS.MAIN} />
            )}
          </View>
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.inputLabel}>Email</Text>
            <Text style={styles.optionalLabel}>Optional</Text>
          </View>
          <View style={[styles.inputWrapper, emailError && styles.inputWrapperError]}>
            <Ionicons name="mail-outline" size={20} color={COLORS.TEXT.PLACEHOLDER} />
            <TextInput
              style={styles.input}
              placeholder="john@example.com"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSigningUp}
            />
            {email.length > 0 && !emailError && (
              <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS.MAIN} />
            )}
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>
      </View>
    </Animated.View>
  );

// Render Step 2: Address (dropdown truly hidden when not focused; bigger map)
const renderStep2 = () => (
  <Animated.View
    style={[
      styles.stepContent,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
    ]}
  >
    <View style={styles.stepHeader}>
      <Text style={styles.stepNumber}>02</Text>
      <View style={styles.stepTitleContainer}>
        <Text style={styles.stepTitle}>Service Location</Text>
        <Text style={styles.stepSubtitle}>Where will services be provided?</Text>
      </View>
    </View>

    <FlatList
      data={[]}
      keyExtractor={() => 'header-only'}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      removeClippedSubviews={false}
      contentContainerStyle={[styles.addressScrollView, { paddingBottom: SPACING.LG }]}
      ListFooterComponent={<View style={{ height: SPACING.LG }} />}
      ListHeaderComponent={
        <>
          {/* Search + Map (relative so the dropdown can be absolutely positioned) */}
          <View style={[styles.mapSection, { position: 'relative', zIndex: 10, overflow: 'visible' }]}>
            {GOOGLE_API_KEY ? (
              <GooglePlacesAutocomplete
                ref={placesRef}
                placeholder="Search for location"
                minLength={2}
                onPress={(data, details = null) => {
                  handlePlaceSelected(data, details);
                  setPlacesOpen(false);
                }}
                onFail={(e) => console.warn('Places error:', e)}
                query={{ key: GOOGLE_API_KEY, language: 'en', components: 'country:in' }}
                fetchDetails={true}
                GooglePlacesDetailsQuery={{
                  fields: 'geometry,address_components,formatted_address,name,place_id,types',
                }}
                enablePoweredByContainer={false}
                predefinedPlaces={[]}
                predefinedPlacesAlwaysVisible={false}
                nearbyPlacesAPI="GooglePlacesSearch"
                debounce={200}
                renderDescription={(row) => row.description}
                textInputProps={{
                  placeholderTextColor: COLORS.TEXT.PLACEHOLDER,
                  returnKeyType: 'search',
                  style: styles.searchInput,
                  onFocus: () => setPlacesOpen(true),
                  onBlur: () => setPlacesOpen(false),
                  onEndEditing: () => setPlacesOpen(false),
                  // Optional: close when the user clears the field
                  onChangeText: (t) => { if (!t) setPlacesOpen(false); },
                  blurOnSubmit: true,
                }}
                styles={{
                  container: {
                    flex: 0,
                    position: 'relative',
                    width: '100%',
                    zIndex: 20,
                  },
                  textInputContainer: {
                    backgroundColor: 'transparent',
                    height: 44,
                    marginHorizontal: 0,
                    borderTopWidth: 0,
                    borderBottomWidth: 0,
                  },
                  textInput: styles.searchInput,
                  // ⬇️ This is the key: when not focused, don't render it at all
                  listView: [
                    styles.searchListView,
                    {
                      position: 'absolute',
                      top: 52,
                      left: 0,
                      right: 0,
                      maxHeight: 260,
                      zIndex: 30,
                      elevation: 6,
                      overflow: 'hidden',
                      display: placesOpen ? 'flex' : 'none',
                    },
                  ],
                  row: {
                    backgroundColor: COLORS.NEUTRAL.WHITE,
                    padding: 13,
                    height: 44,
                    flexDirection: 'row',
                  },
                  separator: {
                    height: 0.5,
                    backgroundColor: COLORS.BORDER.PRIMARY,
                  },
                }}
              />
            ) : (
              <View style={styles.searchInput}>
                <Text style={styles.errorText}>Google Maps API key not configured</Text>
              </View>
            )}

            {/* Bigger map (height override only, styles untouched) */}
            <View style={[styles.miniMapContainer, { height: MAP_HEIGHT }]}>
              {mapRegion && GOOGLE_API_KEY ? (
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.miniMap}
                  initialRegion={mapRegion}
                  onRegionChangeComplete={handleRegionChangeComplete}
                  showsUserLocation={true}
                  showsMyLocationButton={false}
                />
              ) : (
                <View
                  style={[
                    styles.miniMap,
                    {
                      backgroundColor: COLORS.BACKGROUND.PRIMARY,
                      justifyContent: 'center',
                      alignItems: 'center',
                    },
                  ]}
                >
                  <Text style={styles.errorText}>Map not available</Text>
                </View>
              )}

              <View pointerEvents="none" style={styles.centerPin}>
                <Ionicons name="location-sharp" size={24} color={COLORS.PRIMARY.MAIN} />
              </View>

              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
                disabled={fetchingLocation || !GOOGLE_API_KEY}
                activeOpacity={0.8}
              >
                {fetchingLocation ? (
                  <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
                ) : (
                  <MaterialIcons name="my-location" size={20} color={COLORS.PRIMARY.MAIN} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Address Form */}
          <View style={[styles.addressForm, { zIndex: 1 }]}>
            <View style={styles.tagContainer}>
              <Text style={[styles.inputLabel, { marginBottom: SPACING.XS }]}>Address Type</Text>
              {TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[styles.tagChip, addressTag === tag && styles.tagChipSelected]}
                  onPress={() => setAddressTag(tag)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tagText, addressTag === tag && styles.tagTextSelected]}>
                    {tag.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>House/Plot/Building</Text>
              <View style={[styles.inputWrapper, addressErrors.addressLine1 && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter house/plot number"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                />
              </View>
              {addressErrors.addressLine1 ? <Text style={styles.errorText}>{addressErrors.addressLine1}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Area/Landmark</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter area or landmark"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={addressLine2}
                  onChangeText={setAddressLine2}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Village/Locality</Text>
              <View style={[styles.inputWrapper, addressErrors.village && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter village or locality"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={village}
                  onChangeText={setVillage}
                />
              </View>
              {addressErrors.village ? <Text style={styles.errorText}>{addressErrors.village}</Text> : null}
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: SPACING.SM }]}>
                <Text style={styles.inputLabel}>District/City</Text>
                <View style={[styles.inputWrapper, addressErrors.district && styles.inputWrapperError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter district"
                    placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                    value={district}
                    onChangeText={setDistrict}
                  />
                </View>
                {addressErrors.district ? <Text style={styles.errorText}>{addressErrors.district}</Text> : null}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>State</Text>
                <View style={[styles.inputWrapper, addressErrors.state && styles.inputWrapperError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter state"
                    placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                    value={state}
                    onChangeText={setState}
                  />
                </View>
                {addressErrors.state ? <Text style={styles.errorText}>{addressErrors.state}</Text> : null}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pincode</Text>
              <View style={[styles.inputWrapper, addressErrors.pincode && styles.inputWrapperError]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit pincode"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={pincode}
                  onChangeText={(text) => setPincode(text.replace(/[^\d]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              {addressErrors.pincode ? <Text style={styles.errorText}>{addressErrors.pincode}</Text> : null}
            </View>
          </View>
        </>
      }
    />
  </Animated.View>
);


  // Render Step 3: Password
  const renderStep3 = () => (
    <Animated.View style={[styles.stepContent, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>03</Text>
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>Secure Your Account</Text>
          <Text style={styles.stepSubtitle}>Create a strong password</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <View style={[styles.inputWrapper, passwordError && styles.inputWrapperError]}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.TEXT.PLACEHOLDER} />
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSigningUp}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color={COLORS.TEXT.PLACEHOLDER} 
              />
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={[styles.inputWrapper, confirmPasswordError && styles.inputWrapperError]}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.TEXT.PLACEHOLDER} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSigningUp}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons 
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color={COLORS.TEXT.PLACEHOLDER} 
              />
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
        </View>

        <View style={styles.passwordStrength}>
          <View style={styles.strengthItem}>
            <Ionicons 
              name={password.length >= 8 ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={password.length >= 8 ? COLORS.SUCCESS.MAIN : COLORS.TEXT.PLACEHOLDER} 
            />
            <Text style={[styles.strengthText, password.length >= 8 && styles.strengthTextMet]}>
              8+ characters
            </Text>
          </View>
          <View style={styles.strengthItem}>
            <Ionicons 
              name={/[A-Z]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={/[A-Z]/.test(password) ? COLORS.SUCCESS.MAIN : COLORS.TEXT.PLACEHOLDER} 
            />
            <Text style={[styles.strengthText, /[A-Z]/.test(password) && styles.strengthTextMet]}>
              Uppercase
            </Text>
          </View>
          <View style={styles.strengthItem}>
            <Ionicons 
              name={/[a-z]/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={/[a-z]/.test(password) ? COLORS.SUCCESS.MAIN : COLORS.TEXT.PLACEHOLDER} 
            />
            <Text style={[styles.strengthText, /[a-z]/.test(password) && styles.strengthTextMet]}>
              Lowercase
            </Text>
          </View>
          <View style={styles.strengthItem}>
            <Ionicons 
              name={/\d/.test(password) ? "checkmark-circle" : "ellipse-outline"} 
              size={16} 
              color={/\d/.test(password) ? COLORS.SUCCESS.MAIN : COLORS.TEXT.PLACEHOLDER} 
            />
            <Text style={[styles.strengthText, /\d/.test(password) && styles.strengthTextMet]}>
              Number
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  // Render Step 4: OTP Verification
  const renderStep4 = () => (
    <Animated.View style={[styles.stepContent, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>04</Text>
        <View style={styles.stepTitleContainer}>
          <Text style={styles.stepTitle}>Verify Your Number</Text>
          <Text style={styles.stepSubtitle}>We sent a code to +91 {phone}</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => { inputRefs.current[index] = ref; }}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled,
                otpError && styles.otpInputError,
              ]}
              value={digit}
              onChangeText={text => handleOTPChange(text, index)}
              onKeyPress={({nativeEvent}) => handleKeyPress(nativeEvent.key, index)}
              keyboardType="numeric"
              maxLength={1}
              textAlign="center"
              editable={!isVerifyingOTP}
            />
          ))}
        </View>

        {authStatus && !otpError && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.statusText}>{authStatus}</Text>
          </View>
        )}
        
        {otpError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorMessageText}>{otpError}</Text>
          </View>
        )}

        <View style={styles.resendSection}>
          <Text style={styles.resendPrompt}>Didn't receive the code?</Text>
          <View style={styles.resendButtons}>
            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOTP}
              disabled={isVerifyingOTP}
            >
              <Ionicons name="refresh" size={18} color={COLORS.PRIMARY.MAIN} />
              <Text style={styles.resendButtonText}>Resend SMS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.resendButton, styles.whatsappButton]}
              onPress={handleWhatsAppOTP}
              disabled={isVerifyingOTP || isWhatsAppLoading}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
              <Text style={[styles.resendButtonText, { color: '#25D366' }]}>
                WhatsApp
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          
          <View style={styles.logoSection}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>Farmony</Text>
          </View>
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
                  })
                }
              ]}
            />
          </View>
          <View style={styles.progressSteps}>
            {[1, 2, 3, 4].map((step) => (
              <View 
                key={step} 
                style={[
                  styles.progressStep,
                  currentStep >= step && styles.progressStepActive
                ]}
              >
                {currentStep > step ? (
                  <Ionicons name="checkmark" size={14} color={COLORS.NEUTRAL.WHITE} />
                ) : (
                  <Text style={[
                    styles.progressStepText,
                    currentStep >= step && styles.progressStepTextActive
                  ]}>
                    {step}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Animated.View style={[styles.formCard, {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }]}>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </Animated.View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          {currentStep < 4 ? (
            <TouchableOpacity
              style={[styles.primaryButton, (isSigningUp || isValidatingPhone) && styles.primaryButtonLoading]}
              onPress={handleNext}
              disabled={isSigningUp || isValidatingPhone}
              activeOpacity={0.8}
            >
              {(isSigningUp || isValidatingPhone) ? (
                <ActivityIndicator size="small" color={COLORS.NEUTRAL.WHITE} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {currentStep === 3 ? 'Create Account' : 'Continue'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.NEUTRAL.WHITE} />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, isVerifyingOTP && styles.primaryButtonLoading]}
              onPress={handleVerifyOTP}
              disabled={isVerifyingOTP}
              activeOpacity={0.8}
            >
              {isVerifyingOTP ? (
                <ActivityIndicator size="small" color={COLORS.NEUTRAL.WHITE} />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Complete</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Sign In Link */}
          {currentStep === 1 && (
            <View style={styles.signInContainer}>
              <Text style={styles.signInPrompt}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 40,
  },
  logo: {
    width: 28,
    height: 28,
    marginRight: SPACING.SM,
  },
  brandName: {
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
    fontSize: 32,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.PRIMARY.LIGHT,
    marginRight: SPACING.MD,
    lineHeight: 32,
    fontWeight: '900',
  },
  stepTitleContainer: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 20,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  formSection: {
    flex: 1,
  },
  addressScrollView: {
    flex: 1,
  },
  
  mapSection: {
    marginBottom: SPACING.LG,
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  searchInput: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: Platform.OS === 'ios' ? SPACING.SM : SPACING.XS,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    height: 44,
  },
  searchListView: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 12,
    marginTop: SPACING.XS,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 200,
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  miniMapContainer: {
    height: 150,
    marginTop: SPACING.MD,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  miniMap: {
    ...StyleSheet.absoluteFillObject,
  },
  centerPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -12,
    marginTop: -24,
  },
  locationButton: {
    position: 'absolute',
    bottom: SPACING.SM,
    right: SPACING.SM,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 20,
    padding: SPACING.SM,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  addressForm: {
    flex: 1,
    marginTop: -SPACING.LG,
    padding: SPACING.LG,
    height: '100%',
  },
  tagContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  tagChip: {
    flex: 1,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    alignItems: 'center',
  },
  tagChipSelected: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  tagText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  tagTextSelected: {
    color: COLORS.NEUTRAL.WHITE,
  },
  inputGroup: {
    marginBottom: SPACING.LG,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: SPACING.LG,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  optionalLabel: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    height: 52,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  phonePrefix: {
    paddingRight: SPACING.SM,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER.PRIMARY,
    marginRight: SPACING.SM,
  },
  phonePrefixText: {
    fontSize: 15,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    paddingVertical: 0,
  },
  errorText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: SPACING.SM,
  },
  passwordStrength: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    padding: SPACING.MD,
    borderRadius: 12,
    marginTop: SPACING.SM,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  strengthText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PLACEHOLDER,
  },
  strengthTextMet: {
    color: COLORS.SUCCESS.MAIN,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.XL,
    paddingHorizontal: SPACING.SM,
  },
  otpInput: {
    width: 45,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    fontSize: 20,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  otpInputFilled: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  otpInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  statusText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    paddingVertical: SPACING.MD,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  errorMessageText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#EF4444',
  },
  resendSection: {
    alignItems: 'center',
    marginTop: SPACING.LG,
  },
  resendPrompt: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.MD,
  },
  resendButtons: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  whatsappButton: {
    backgroundColor: '#E8F8F0',
  },
  resendButtonText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  bottomActions: {
    padding: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
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
  primaryButtonLoading: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  signInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.MD,
    gap: 6,
  },
  signInPrompt: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  signInLink: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.PRIMARY.MAIN,
  },
});

export default SignUpScreen;