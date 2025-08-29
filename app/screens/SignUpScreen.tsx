/**
 * SignUpScreen with 4 steps:
 * 1. User Details (name, phone, email)
 * 2. Address Selection (with map)
 * 3. Password Creation
 * 4. OTP Verification
 * 
 * Note: Ensure GOOGLE_MAPS_API_KEY is configured in ../config/api
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
import { registerUser, setCurrentScreen, clearError, setOtpChannel, verifyOTP, setPendingUserPhone } from '../store/slices/authSlice';
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
import debounce from 'lodash.debounce';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { top: safeTop } = useSafeAreaInsets();
  const STEPPER_H = 28;         // visual height of your stepper bar/dots
  const STEPPER_TOP = safeTop + 6
  const TITLE_H = 22;

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

  const [placesOpen, setPlacesOpen] = useState(false);

  const SHEET_MIN = 0.40;   // 40% of screen
  const SHEET_MAX = 0.86;   // 86% of screen
  const sheetProgress = useRef(new Animated.Value(0)).current; // 0 collapsed, 1 expanded
  const [isAddressExpanded, setIsAddressExpanded] = useState(false);

  const SHEET_MIN_HEIGHT = screenHeight * SHEET_MIN;
  const SHEET_MAX_HEIGHT = screenHeight * SHEET_MAX;

  const sheetHeight = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [SHEET_MIN_HEIGHT, SHEET_MAX_HEIGHT],
  });
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
   const [isOTPVerified, setIsOTPVerified] = useState(false);
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

  const debouncedReverseGeocode = useCallback(
  debounce((region: Region) => {
    reverseGeocodeLocation(region.latitude, region.longitude);
  }, 800),
  []
);

  const pinTranslateY = sheetProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -((SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT) / 2)],
  });

  const toggleAddressSheet = useCallback(() => {
    const next = isAddressExpanded ? 0 : 1;
    Animated.timing(sheetProgress, {
      toValue: next,
      duration: 260,
      useNativeDriver: false,
    }).start();
    setIsAddressExpanded(!isAddressExpanded);
  }, [isAddressExpanded, sheetProgress]);


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
  debouncedReverseGeocode(region);
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
      console.log('Starting Firebase SMS Auth for phone:', phone);
      let phoneE164: string;
      if (phone.startsWith('+')) {
        phoneE164 = phone;
      } else if (/^\d{10}$/.test(phone)) {
        phoneE164 = `+91${phone}`;
      } else {
        phoneE164 = `+${phone}`;
      }
      setAuthStatus('Sending SMS OTP...');
      console.log('Sending OTP to', phoneE164);
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
      if (currentStep === 1) {
        // Step 1: Validate phone availability and move to address
        setIsValidatingPhone(true);
        try {
          const result = await checkPhoneExists(phone);
          if (result.exists) {
            setPhoneError('This phone number is already registered');
            setIsValidatingPhone(false);
            return;
          }
          // Phone is available, proceed to address step
          setCurrentStep(2);
        } catch (error) {
          setPhoneError('Unable to verify phone number');
        } finally {
          setIsValidatingPhone(false);
        }
      } else if (currentStep === 2) {
        // Step 2: Address collected, move to password
        setCurrentStep(3);
      } else if (currentStep === 3) {
        console.log('Password set, proceeding to OTP verification');
        console.log('User Details:', { name, phone, email });
        // Step 3: Password collected, send OTP for verification
        dispatch(setPendingUserPhone(phone));
        dispatch(clearError());
        
        // Start OTP verification
        try {
          await startFirebaseSMSAuth();
          setCurrentStep(4);
        } catch (error) {
          console.error('Failed to send OTP:', error);
          Alert.alert('Error', 'Failed to send verification code. Please try again.');
        }
      }
    }
  }
};


  const handleVerifyOTPThenRegister = async () => {
    if (!validateOTPFormat()) return;
    
    dispatch(clearError());
    setOTPError('');
    const otpString = otp.join('');

    try {
      setAuthStatus('Verifying OTP...');
      let verificationSuccessful = false;
      let lastError: string | null = null;

      // First, verify the OTP with Firebase/WhatsApp
      if (otpChannel === 'sms') {
        if (!smsConfirmation) {
          setOTPError('SMS confirmation not found. Please resend OTP.');
          return;
        }
        try {
          // Firebase verifies internally, no need to store OTP
          await firebaseSMSService.verifyOTP(smsConfirmation, otpString);
          verificationSuccessful = true;
          setAuthStatus('OTP verified successfully!');
        } catch (smsError: any) {
          lastError = smsError.message || 'Invalid OTP code';
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
          setAuthStatus('OTP verified successfully!');
        } catch (whatsappError: any) {
          lastError = whatsappError.message || 'Invalid OTP code';
        }
      }

      if (verificationSuccessful) {
        // NOW that OTP is verified, create the account
        setIsOTPVerified(true);
        setAuthStatus('Creating your account...');
        
        const registrationData: any = {
          name,
          email,
          phone,
          password,
          role: 'individual',
          isVerified: true, // Mark as verified since we just verified the OTP
          preferences: {
            defaultLandingPage: 'provider', // or 'seeker'
            defaultProviderTab: 'active',
            notificationsEnabled: true,
            preferredLanguage: 'en',
          },
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
          setAuthStatus('Account created successfully! 🎉');
          // If the register endpoint returns tokens (auto-login), the auth state will update
          // Otherwise navigation will be handled by auth state change
        } else {
          setOTPError(result.error?.message || 'Failed to create account. Please try again.');
          setAuthStatus('');
          setIsOTPVerified(false);
        }
      } else {
        setOTPError(lastError || 'Invalid OTP. Please try again.');
        setAuthStatus('');
      }
    } catch (error: any) {
      setOTPError(error.message || 'Verification failed');
      setAuthStatus('');
      setIsOTPVerified(false);
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

    const renderStep2 = () => {
    const safeMapRegion = mapRegion || {
      latitude: 17.385044,
      longitude: 78.486671,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };

  const TITLE_H = 28; // visual height for the title row

  return (
    <View style={{ flex: 1 }}>
      {/* Full-screen Map */}
      {GOOGLE_API_KEY ? (
        <View style={StyleSheet.absoluteFillObject}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            region={safeMapRegion}
            onRegionChangeComplete={handleRegionChangeComplete}
            showsUserLocation
            showsMyLocationButton={false}
            loadingEnabled
            loadingIndicatorColor={COLORS.PRIMARY.MAIN}
            loadingBackgroundColor={COLORS.BACKGROUND.PRIMARY}
          />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
          <MaterialIcons name="location-off" size={48} color={COLORS.TEXT.PLACEHOLDER} />
          <Text style={{ marginTop: 8, color: '#EF4444' }}>Map not available</Text>
        </View>
      )}

      {/* Center Pin */}
      {GOOGLE_API_KEY && (
        <Animated.View
          pointerEvents="none"
          style={[step2Styles.mapPinContainer, { transform: [{ translateY: pinTranslateY }] }]}
        >
          <View style={step2Styles.pinWrapper}>
            <Ionicons name="location-sharp" size={32} color={COLORS.PRIMARY.MAIN} />
            <View style={step2Styles.pinShadow} />
          </View>
          {reverseGeocoding && (
            <View style={step2Styles.locatingBadge}>
              <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
              <Text style={step2Styles.locatingText}>Locating...</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Title where stepper used to be */}
      <View style={[step2Styles.topTitleWrap, { top: STEPPER_TOP }]}>
        <Text style={step2Styles.topTitle}>Service Location</Text>
      </View>

      {/* Back button + Google Places in a single aligned row */}
      <View
        style={[step2Styles.topSection, { paddingTop: STEPPER_TOP + TITLE_H + 12 }]}
        pointerEvents="box-none"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.MD }}>
          <TouchableOpacity onPress={handleBack} style={step2Styles.backButtonCompact} activeOpacity={0.85}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>

          {GOOGLE_API_KEY ? (
            <GooglePlacesAutocomplete
              ref={placesRef}
              placeholder="Search for a place"
              fetchDetails
              predefinedPlaces={[]}
              predefinedPlacesAlwaysVisible={false}
              textInputProps={{ returnKeyType: 'search' }}
              minLength={2}
              debounce={150}
              enablePoweredByContainer={true}
              keyboardShouldPersistTaps="handled"
              listViewDisplayed="auto"
              keepResultsAfterBlur={false}
              nearbyPlacesAPI="GooglePlacesSearch"
              GooglePlacesSearchQuery={{ rankby: 'distance' }}
              GooglePlacesDetailsQuery={{}}
              GoogleReverseGeocodingQuery={{}}
              timeout={20000}
              onPress={handlePlaceSelected}
              query={{
                key: GOOGLE_API_KEY,
                language: 'en',
                components: 'country:in',
              }}
              /* IMPORTANT: container is flex:1 so the dropdown aligns under the input only */
              styles={{
                container: { flex: 1, marginLeft: 10 },
                textInput: step2Styles.placesInput,
                listView: step2Styles.placesList,          // absolute under the input (not full-screen)
                row: step2Styles.placesRow,
                separator: step2Styles.placesSeparator,
                description: step2Styles.placesDescription,
              }}
            />
          ) : (
            <View style={[step2Styles.searchInputWrapper, { flex: 1, marginLeft: 10 }]}>
              <Ionicons name="search" size={18} color={COLORS.TEXT.PLACEHOLDER} />
              <TextInput
                style={step2Styles.searchInputSimple}
                placeholder="Enter your location manually below"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                editable={false}
              />
            </View>
          )}
        </View>
      </View>

      {/* Current location FAB */}
      <TouchableOpacity
        style={step2Styles.locationFAB}
        onPress={getCurrentLocation}
        disabled={fetchingLocation}
        activeOpacity={0.85}
      >
        {fetchingLocation ? (
          <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
        ) : (
          <MaterialIcons name="my-location" size={22} color={COLORS.PRIMARY.MAIN} />
        )}
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Animated.View style={[step2Styles.bottomSheet, { height: sheetHeight }]}>
        <TouchableOpacity style={step2Styles.sheetHandle} onPress={toggleAddressSheet} activeOpacity={0.9}>
          <View style={step2Styles.handleBar} />
        </TouchableOpacity>

        <TouchableOpacity style={step2Styles.addressHeader} onPress={toggleAddressSheet} activeOpacity={0.9}>
          <View style={step2Styles.addressIconWrapper}>
            <Ionicons name="location" size={20} color={COLORS.PRIMARY.MAIN} />
          </View>
          <View style={step2Styles.addressHeaderText}>
            <Text style={step2Styles.addressLabel}>Service Location</Text>
            {(village || district) ? (
              <Text style={step2Styles.addressPreview} numberOfLines={1}>
                {[addressLine1, village, district].filter(Boolean).join(', ')}
              </Text>
            ) : (
              <Text style={step2Styles.addressPlaceholder}>
                {GOOGLE_API_KEY ? 'Move pin to your exact location' : 'Enter your address details'}
              </Text>
            )}
          </View>
          <Ionicons name={isAddressExpanded ? 'chevron-down' : 'chevron-up'} size={22} color={COLORS.TEXT.SECONDARY} />
        </TouchableOpacity>

        {/* Address form */}
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={step2Styles.formScrollView}
            contentContainerStyle={[step2Styles.formContent, { paddingBottom: 120 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Save-as tags */}
            <View style={step2Styles.tagSection}>
              <Text style={step2Styles.sectionTitle}>Save address as</Text>
              <View style={step2Styles.tagRow}>
                {TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[step2Styles.tag, addressTag === tag && step2Styles.tagActive]}
                    onPress={() => setAddressTag(tag)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={tag === 'home' ? 'home' : tag === 'work' ? 'briefcase' : tag === 'personal' ? 'person' : 'bookmark'}
                      size={16}
                      color={addressTag === tag ? COLORS.NEUTRAL.WHITE : COLORS.TEXT.SECONDARY}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[step2Styles.tagText, addressTag === tag && step2Styles.tagTextActive]}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fields */}
            <View style={step2Styles.fieldGroup}>
              <Text style={step2Styles.fieldLabel}>House/Flat/Building <Text style={step2Styles.required}>*</Text></Text>
              <TextInput
                style={[step2Styles.fieldInput, addressErrors.addressLine1 && step2Styles.fieldInputError]}
                placeholder="e.g., Flat 301, Green Apartments"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                value={addressLine1}
                onChangeText={(t) => {
                  setAddressLine1(t);
                  if (addressErrors.addressLine1) setAddressErrors({ ...addressErrors, addressLine1: '' });
                }}
                returnKeyType="next"
              />
              {!!addressErrors.addressLine1 && <Text style={step2Styles.fieldError}>{addressErrors.addressLine1}</Text>}
            </View>

            <View style={step2Styles.fieldGroup}>
              <Text style={step2Styles.fieldLabel}>Landmark / Area</Text>
              <TextInput
                style={step2Styles.fieldInput}
                placeholder="e.g., Near City Mall"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                value={addressLine2}
                onChangeText={setAddressLine2}
              />
            </View>

            <View style={step2Styles.fieldGroup}>
              <Text style={step2Styles.fieldLabel}>Village/Locality <Text style={step2Styles.required}>*</Text></Text>
              <TextInput
                style={[step2Styles.fieldInput, addressErrors.village && step2Styles.fieldInputError]}
                placeholder="e.g., Madhapur"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                value={village}
                onChangeText={(t) => {
                  setVillage(t);
                  if (addressErrors.village) setAddressErrors({ ...addressErrors, village: '' });
                }}
              />
              {!!addressErrors.village && <Text style={step2Styles.fieldError}>{addressErrors.village}</Text>}
            </View>

            <View style={step2Styles.fieldGroup}>
              <Text style={step2Styles.fieldLabel}>Tehsil/Sub-district</Text>
              <TextInput
                style={step2Styles.fieldInput}
                placeholder="Optional"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                value={tehsil}
                onChangeText={setTehsil}
              />
            </View>

            <View style={step2Styles.fieldRow}>
              <View style={[step2Styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={step2Styles.fieldLabel}>District <Text style={step2Styles.required}>*</Text></Text>
                <TextInput
                  style={[step2Styles.fieldInput, addressErrors.district && step2Styles.fieldInputError]}
                  placeholder="e.g., Hyderabad"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={district}
                  onChangeText={(t) => {
                    setDistrict(t);
                    if (addressErrors.district) setAddressErrors({ ...addressErrors, district: '' });
                  }}
                />
                {!!addressErrors.district && <Text style={step2Styles.fieldError}>{addressErrors.district}</Text>}
              </View>

              <View style={[step2Styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={step2Styles.fieldLabel}>State <Text style={step2Styles.required}>*</Text></Text>
                <TextInput
                  style={[step2Styles.fieldInput, addressErrors.state && step2Styles.fieldInputError]}
                  placeholder="e.g., Telangana"
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={state}
                  onChangeText={(t) => {
                    setState(t);
                    if (addressErrors.state) setAddressErrors({ ...addressErrors, state: '' });
                  }}
                />
                {!!addressErrors.state && <Text style={step2Styles.fieldError}>{addressErrors.state}</Text>}
              </View>
            </View>

            <View style={step2Styles.fieldGroup}>
              <Text style={step2Styles.fieldLabel}>Pincode <Text style={step2Styles.required}>*</Text></Text>
              <TextInput
                style={[step2Styles.fieldInput, addressErrors.pincode && step2Styles.fieldInputError]}
                placeholder="6-digit pincode"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                value={pincode}
                onChangeText={(t) => {
                  const cleaned = t.replace(/[^\d]/g, '').slice(0, 6);
                  setPincode(cleaned);
                  if (addressErrors.pincode && cleaned.length === 6) setAddressErrors({ ...addressErrors, pincode: '' });
                }}
                keyboardType="number-pad"
                maxLength={6}
              />
              {!!addressErrors.pincode && <Text style={step2Styles.fieldError}>{addressErrors.pincode}</Text>}
            </View>

            <View style={step2Styles.infoNote}>
              <Ionicons name="information-circle" size={16} color={COLORS.PRIMARY.MAIN} />
              <Text style={step2Styles.infoNoteText}>This will be your default service location for all bookings</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Continue button pinned to bottom of the sheet */}
        <View style={step2Styles.bottomActions}>
          <TouchableOpacity style={step2Styles.continueButton} onPress={handleNext} activeOpacity={0.9}>
            <Text style={step2Styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.NEUTRAL.WHITE} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};


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
      <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={16} color={COLORS.PRIMARY.MAIN} />
          <Text style={styles.infoNoteText}>
            After setting your password, we'll verify your phone number via OTP
          </Text>
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
          <Text style={styles.stepSubtitle}>
            {isOTPVerified 
              ? 'Creating your account...' 
              : `We sent a code to +91 ${phone}`
            }
          </Text>
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
      {isOTPVerified && (
          <View style={styles.successContainer}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.SUCCESS.MAIN} />
            <Text style={styles.successText}>Phone Verified Successfully!</Text>
            <Text style={styles.successSubtext}>Setting up your account...</Text>
          </View>
        )}
    </Animated.View>
  );

 return (
  <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
    <View style={styles.container}>
      {/* Header - Hide for Step 2 */}
      {currentStep !== 2 && (
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
      )}

      {/* Progress Bar — hidden on Step 2 */}
      {currentStep !== 2 && (
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
                  <Ionicons name="checkmark" size={14} color={COLORS.NEUTRAL.WHITE} />
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
      )}

      {/* Content - Special handling for Step 2 */}
      {currentStep === 2 ? (
        renderStep2()
      ) : (
        // Other steps get the card layout
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
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </Animated.View>
        </View>
      )}

      {/* Bottom Actions - Hide for Step 2 as it has its own Continue button */}
      {currentStep !== 2 && (
        <View style={styles.bottomActions}>
          {/* Steps 1 and 3 - Continue buttons */}
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
                    {currentStep === 1 && 'Continue'}
                    {currentStep === 3 && 'Send Verification Code'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.NEUTRAL.WHITE} />
                </>
              )}
            </TouchableOpacity>
          ) : (
            /* Step 4 - OTP Verification and Account Creation */
            <TouchableOpacity
              style={[
                styles.primaryButton, 
                (isVerifyingOTP || isSigningUp || isOTPVerified) && styles.primaryButtonLoading
              ]}
              onPress={handleVerifyOTPThenRegister}
              disabled={isVerifyingOTP || isSigningUp || isOTPVerified}
              activeOpacity={0.8}
            >
              {(isVerifyingOTP || isSigningUp || isOTPVerified) ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.NEUTRAL.WHITE} />
                  {isOTPVerified && (
                    <Text style={styles.loadingText}>Creating account...</Text>
                  )}
                </View>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.NEUTRAL.WHITE} />
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Sign In Link - Only show on Step 1 */}
          {currentStep === 1 && (
            <View style={styles.signInContainer}>
              <Text style={styles.signInPrompt}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Privacy Policy Note - Show on Step 4 */}
          {/* {currentStep === 4 && (
            <Text style={styles.privacyText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.privacyLink}>Terms & Conditions</Text> and{' '}
              <Text style={styles.privacyLink}>Privacy Policy</Text>
            </Text>
          )} */}
        </View>
      )}
    </View>
  </SafeAreaWrapper>
);

};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.NEUTRAL.WHITE,
    marginLeft: SPACING.SM,
  },
  privacyText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    lineHeight: 16,
  },
  privacyLink: {
    color: COLORS.PRIMARY.MAIN,
    fontFamily: FONTS.POPPINS.MEDIUM,
    textDecorationLine: 'underline',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.LIGHT,
    padding: SPACING.MD,
    borderRadius: 12,
    marginTop: SPACING.MD,
    gap: SPACING.SM,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.PRIMARY.MAIN,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: SPACING.XL,
  },
  successText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.SUCCESS.MAIN,
    marginTop: SPACING.MD,
  },
  successSubtext: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: SPACING.XS,
  },
  progressContainerStep2: {
  position: 'absolute',
  left: 0,
  right: 0,
  zIndex: 50,           // stays above the map but below nothing else we care about
},
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
  
  mapSection: {
    marginBottom: SPACING.LG,
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
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
  addressForm: {
    flex: 1,
    marginTop: -SPACING.LG,
    padding: SPACING.LG,
    height: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  optionalLabel: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
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

  searchSection: {
    marginBottom: SPACING.MD,
    zIndex: 10,
    elevation: 10,
  },
  searchInput: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
    paddingVertical: Platform.OS === 'ios' ? SPACING.SM : SPACING.XS,
    paddingLeft: 36,
    paddingRight: 32,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    height: 44,
  },
  searchIconLeft: {
    position: 'absolute',
    left: 10,
    height: 44,
    justifyContent: 'center',
    zIndex: 1,
  },
  searchIconRight: {
    position: 'absolute',
    right: 8,
    height: 44,
    justifyContent: 'center',
    padding: 6,
    zIndex: 1,
  },
  mapWrapper: {
    marginBottom: SPACING.MD,
  },
  miniMapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    marginHorizontal: 0,
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
    zIndex: 1,
  },
  locationButton: {
    position: 'absolute',
    bottom: SPACING.SM,
    right: SPACING.SM,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 20,
    padding: SPACING.SM,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 2,
  },
  addressScrollView: {
    flex: 1,
  },
  addressFormContent: {
    paddingBottom: SPACING.XL,
  },
  tagSection: {
    marginBottom: SPACING.MD,
  },
  tagContainer: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginTop: SPACING.XS,
  },
  tagChip: {
    flex: 1,
    paddingVertical: SPACING.SM,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    alignItems: 'center',
    backgroundColor: COLORS.NEUTRAL.WHITE,
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
    marginBottom: SPACING.MD,
  },
  inputGroupHalf: {
    flex: 1,
    marginBottom: 0,
  },
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.XS,
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
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    paddingVertical: 0,
    height: '100%',
  },
  errorText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: SPACING.XS,
  },
  infoText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },

});

const enhancedStyles = StyleSheet.create({
  locationContainer: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  
  // Top Section Styles
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  
  backButtonCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  
  headerTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  
  searchContainer: {
    paddingHorizontal: SPACING.MD,
  },
  
  searchIcon: {
    position: 'absolute',
    left: 12,
    height: 48,
    justifyContent: 'center',
  },
  
  // Map Pin Styles
  mapPinContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -16,
    marginTop: -32,
    zIndex: 5,
    alignItems: 'center',
  },
  
  pinWrapper: {
    alignItems: 'center',
  },
  
  pinShadow: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: -4,
  },
  
  locatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  
  locatingText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginLeft: 6,
  },
  
  // Location FAB
  locationFAB: {
    position: 'absolute',
    right: SPACING.MD,
    bottom: '45%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 5,
  },
  
  // Bottom Sheet Styles
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    minHeight: '40%',
  },
  
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.BORDER.PRIMARY,
  },
  
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  
  addressIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  
  addressHeaderText: {
    flex: 1,
  },
  
  addressLabel: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  
  addressPreview: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    marginTop: 2,
  },
  
  addressPlaceholder: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PLACEHOLDER,
    marginTop: 2,
  },
  
  // Form Styles
  formScrollView: {
    flex: 1,
  },
  
  formContent: {
    padding: SPACING.LG,
    paddingBottom: 100,
  },
  
  tagSection: {
    marginBottom: SPACING.LG,
  },
  
  sectionTitle: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  
  tagRow: {
    flexDirection: 'row',
    gap: 10,
  },
  
  tag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  
  tagActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  
  tagText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  
  tagTextActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  
  fieldsSection: {
    marginTop: SPACING.SM,
  },
  
  fieldGroup: {
    marginBottom: SPACING.MD,
  },
  
  fieldRow: {
    flexDirection: 'row',
    marginBottom: SPACING.MD,
  },
  
  fieldLabel: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 6,
  },
  
  required: {
    color: '#EF4444',
  },
  
  fieldInput: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  
  fieldInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  
  fieldError: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#EF4444',
    marginTop: 4,
  },
  
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.LIGHT,
    padding: SPACING.MD,
    borderRadius: 10,
    marginTop: SPACING.MD,
  },
  
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.PRIMARY.MAIN,
    marginLeft: SPACING.SM,
  },
  
  // Bottom Actions
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    padding: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
  },
  
  continueButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  
  continueButtonText: {
    fontSize: 15,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },

   searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIconSimple: {
    marginRight: 10,
  },
  searchInputSimple: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PLACEHOLDER,
  },
  searchHint: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginTop: 6,
  },
});

  const step2Styles = StyleSheet.create({
 
    compactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.MD,
      marginBottom: SPACING.SM,
    },
    backButtonCompact: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: COLORS.NEUTRAL.WHITE,
      justifyContent: 'center', alignItems: 'center',
      elevation: 3,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
    },
    headerTitle: { fontSize: 16, fontFamily: FONTS.POPPINS.SEMIBOLD, color: COLORS.TEXT.PRIMARY },

    // Google Places
    placesContainer: { paddingHorizontal: SPACING.MD },
    placesInput: {
      height: 44,
      borderRadius: 12,
      paddingHorizontal: 14,
      backgroundColor: COLORS.NEUTRAL.WHITE,
      borderWidth: 1, borderColor: COLORS.BORDER.PRIMARY,
      fontSize: 14, fontFamily: FONTS.POPPINS.REGULAR, color: COLORS.TEXT.PRIMARY,
    },

    // fallback search hint
    searchContainer: { paddingHorizontal: SPACING.MD },
    searchInputWrapper: {
      height: 44, borderRadius: 12, paddingHorizontal: 12,
      backgroundColor: COLORS.NEUTRAL.WHITE,
      borderWidth: 1, borderColor: COLORS.BORDER.PRIMARY,
      flexDirection: 'row', alignItems: 'center', gap: 8,
    },
    searchInputSimple: { flex: 1, fontSize: 14, fontFamily: FONTS.POPPINS.REGULAR, color: COLORS.TEXT.PRIMARY },
    searchHint: { marginTop: 6, fontSize: 12, color: COLORS.TEXT.SECONDARY },

    // map pin
    mapPinContainer: {
      position: 'absolute',
      left: '50%',
      top: '40%',
      marginLeft: -16,
      zIndex: 5,
      alignItems: 'center',
    },
    pinWrapper: { alignItems: 'center' },
    pinShadow: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)', marginTop: -4 },
    locatingBadge: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.NEUTRAL.WHITE,
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
      marginTop: 8,
      elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
    },
    locatingText: { fontSize: 12, fontFamily: FONTS.POPPINS.MEDIUM, color: COLORS.TEXT.PRIMARY, marginLeft: 6 },

    // FAB
    locationFAB: {
      position: 'absolute',
      right: SPACING.MD,
      bottom: '45%', // sits above collapsed sheet and still fine when expanded
      width: 48, height: 48, borderRadius: 24,
      backgroundColor: COLORS.NEUTRAL.WHITE,
      justifyContent: 'center', alignItems: 'center',
      elevation: 5,
      shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4,
      zIndex: 6,
    },

    // sheet
    bottomSheet: {
      position: 'absolute',
      bottom: 0, left: 0, right: 0,
      backgroundColor: COLORS.NEUTRAL.WHITE,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      elevation: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.2, shadowRadius: 6,
      zIndex: 20,
      minHeight: '40%',
    },
    sheetHandle: { alignItems: 'center', paddingVertical: 12 },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.BORDER.PRIMARY },

    addressHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.MD, paddingBottom: 12 },
    addressIconWrapper: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: COLORS.PRIMARY.LIGHT, justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    addressHeaderText: { flex: 1 },
    addressLabel: { fontFamily: FONTS.POPPINS.MEDIUM, fontSize: 13, color: COLORS.TEXT.SECONDARY },
    addressPreview: { fontFamily: FONTS.POPPINS.SEMIBOLD, fontSize: 15, color: COLORS.TEXT.PRIMARY },
    addressPlaceholder: { fontFamily: FONTS.POPPINS.REGULAR, fontSize: 14, color: COLORS.TEXT.SECONDARY },

    formScrollView: { flex: 1 },
    formContent: { paddingHorizontal: SPACING.MD },

    // tags
    tagSection: { marginBottom: SPACING.MD },
    sectionTitle: { fontSize: 13, fontFamily: FONTS.POPPINS.MEDIUM, color: COLORS.TEXT.PRIMARY, marginBottom: 8 },
    tagRow: { flexDirection: 'row', gap: SPACING.SM },
    tag: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
      borderWidth: 1, borderColor: COLORS.BORDER.PRIMARY, backgroundColor: COLORS.NEUTRAL.WHITE,
    },
    tagActive: { backgroundColor: COLORS.PRIMARY.MAIN, borderColor: COLORS.PRIMARY.MAIN },
    tagText: { fontSize: 13, fontFamily: FONTS.POPPINS.MEDIUM, color: COLORS.TEXT.SECONDARY },
    tagTextActive: { color: COLORS.NEUTRAL.WHITE },

    // fields
    fieldsSection: {},
    fieldGroup: { marginBottom: SPACING.MD },
    fieldLabel: { fontSize: 13, fontFamily: FONTS.POPPINS.MEDIUM, color: COLORS.TEXT.PRIMARY, marginBottom: 6 },
    required: { color: COLORS.PRIMARY.MAIN },
    fieldInput: {
      height: 48, borderRadius: 12,
      backgroundColor: COLORS.BACKGROUND.PRIMARY,
      borderWidth: 1, borderColor: COLORS.BORDER.PRIMARY,
      paddingHorizontal: 12, fontSize: 14, fontFamily: FONTS.POPPINS.REGULAR, color: COLORS.TEXT.PRIMARY,
    },
    fieldRow: { flexDirection: 'row' },
    fieldInputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    fieldError: { marginTop: 4, fontSize: 11, color: '#EF4444', fontFamily: FONTS.POPPINS.REGULAR },

    infoNote: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: COLORS.PRIMARY.LIGHT, padding: 10, borderRadius: 12, marginTop: 6,
    },
    infoNoteText: { fontSize: 12, color: COLORS.PRIMARY.MAIN, fontFamily: FONTS.POPPINS.MEDIUM },

    bottomActions: {
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: SPACING.MD,
      borderTopWidth: 1, borderTopColor: COLORS.BORDER.PRIMARY,
      backgroundColor: COLORS.NEUTRAL.WHITE,
    },
    continueButton: {
      flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
      backgroundColor: COLORS.PRIMARY.MAIN, borderRadius: 14, paddingVertical: 14,
    },
    continueButtonText: { color: COLORS.NEUTRAL.WHITE, fontSize: 15, fontFamily: FONTS.POPPINS.SEMIBOLD },


  // one row: back button + search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: SPACING.MD,
  },

  // make the Places container flex in a row
  placesContainerRow: {
    flex: 1,
  },

   topTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 16,
    alignItems: 'center',
  },
  topTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },

  topSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 15, // list lives inside here
  },

  // Back button as an absolute FAB (never moves with list)
  backFab: {
    position: 'absolute',
    left: SPACING.MD,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    zIndex: 30, // above map; below list if you prefer, set to 10
  },

  // Full-width container for GPlaces (we’ll shift the input itself)
  placesContainerFull: {
    paddingHorizontal: SPACING.MD,
  },

  // Shift input to the right so it doesn't sit under the back FAB
  placesInputShifted: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    marginLeft: 56,             // <- space for the back FAB
  },

  // keep your existing listView/row/description styles
  placesList: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginTop: 8,
    borderRadius: 12,
    elevation: 6,
    zIndex: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 240,
  },
  placesRow: { paddingVertical: 12, paddingHorizontal: 12 },
  placesSeparator: { height: 1, backgroundColor: COLORS.BORDER.PRIMARY },
  placesDescription: { fontFamily: FONTS.POPPINS.REGULAR, color: COLORS.TEXT.PRIMARY },

  });




export default SignUpScreen;