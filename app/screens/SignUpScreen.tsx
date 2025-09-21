import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  Animated,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { COLORS, SPACING } from '../utils';
import { FONTS, FONT_SIZES, scaleSize, getFontFamily } from '../utils/fonts';
import { RootState, AppDispatch } from '../store';
import { 
  registerUser,
  setPendingUserPhone,
  clearError,
  setOtpChannel,
  verifyOTP,
} from '../store/slices/authSlice';
import { checkPhoneExists } from '../services/api';
import firebaseSMSService from '../services/firebaseSMS';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isSigningUp, error, isVerifyingOTP } = useSelector((state: RootState) => state.auth);

  // Screen state
  const [currentStep, setCurrentStep] = useState<'register' | 'otp' | 'profile'>('register');
  
  // Registration form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [formErrors, setFormErrors] = useState<any>({});
  const [isValidating, setIsValidating] = useState(false);
  
  // OTP state
  const [otp, setOTP] = useState(['', '', '', '', '', '']);
  const [otpError, setOTPError] = useState('');
  const [smsConfirmation, setSMSConfirmation] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Profile picture state
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Focus first OTP input when step changes
    if (currentStep === 'otp') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
      startResendTimer();
    }
    
    // Animate transition between steps
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startResendTimer = () => {
    setResendTimer(30);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateForm = async () => {
    const errors: any = {};
    
    // Name validation
    if (!name || name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    // Email validation - only if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email';
    }
    
    // Phone validation
    if (!phone || phone.length !== 10) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    setFormErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      return false;
    }
    
    // Check if phone already exists
    setIsValidating(true);
    try {
      const result = await checkPhoneExists(phone);
      if (result.exists) {
        setFormErrors({ phone: 'Phone number already registered' });
        setIsValidating(false);
        return false;
      }
    } catch (error) {
      setFormErrors({ phone: 'Unable to verify phone number' });
      setIsValidating(false);
      return false;
    }
    setIsValidating(false);
    
    return true;
  };

  const handleRegisterSubmit = async () => {
    Keyboard.dismiss();
    
    if (!(await validateForm())) return;
    
    dispatch(clearError());
    dispatch(setPendingUserPhone(phone));
    
    try {
      // Send OTP
      await startFirebaseSMSAuth();
      setCurrentStep('otp');
    } catch (error) {
      console.error('Failed to send OTP:', error);
      setFormErrors({ general: 'Failed to send OTP. Please try again.' });
    }
  };

  const startFirebaseSMSAuth = async () => {
    try {
      const phoneE164 = `+91${phone}`;
      const confirmation = await firebaseSMSService.sendOTP(phoneE164);
      setSMSConfirmation(confirmation);
      dispatch(setOtpChannel('sms'));
    } catch (error) {
      console.error('Failed to send SMS OTP:', error);
      throw error;
    }
  };

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
    
    // Auto-submit when all 6 digits are entered
    if (value !== '' && index === 5) {
      const otpString = [...newOTP].join('');
      if (otpString.length === 6) {
        handleVerifyOTP(otpString);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpString?: string) => {
    const otpCode = otpString || otp.join('');
    
    if (otpCode.length !== 6) {
      setOTPError('Please enter all 6 digits');
      return;
    }
    
    dispatch(clearError());
    setOTPError('');
    
    try {
      if (!smsConfirmation) {
        setOTPError('Please request OTP first');
        return;
      }
      
      // Verify OTP with Firebase
      await firebaseSMSService.verifyOTP(smsConfirmation, otpCode);
      
      // OTP verified, proceed to profile picture
      setCurrentStep('profile');
    } catch (error: any) {
      setOTPError(error.message || 'Invalid OTP. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;
    
    try {
      setOTPError('');
      setOTP(['', '', '', '', '', '']);
      await startFirebaseSMSAuth();
      startResendTimer();
    } catch (error) {
      setOTPError('Failed to resend OTP. Please try again.');
    }
  };

  const handleSelectImage = () => {
    const options = {
      mediaType: 'photo' as const,
      includeBase64: false,
      maxHeight: 800,
      maxWidth: 800,
      quality: 0.8 as const,
    };

    launchImageLibrary(options, (response) => {
      if (response.assets && response.assets[0]) {
        setProfileImage(response.assets[0].uri || null);
      }
    });
  };

  const handleCompleteSignup = async () => {
    setUploadingImage(true);
    
    try {
      // Register user with all collected data
      const userData = {
        name,
        email,
        phone,
        role: 'individual' as const,
        isVerified: true, // Already verified OTP
        referralCode: referralCode || undefined,
        // profileImage will be uploaded separately if selected
      };
      
      const result = await dispatch(registerUser(userData));
      
      if (registerUser.fulfilled.match(result)) {
        // If profile image was selected, upload it here
        // TODO: Implement profile image upload API
        
        // Navigate to home
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        Alert.alert('Registration Failed', 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete registration');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSkipProfilePicture = () => {
    handleCompleteSignup();
  };

  const handleBack = () => {
    if (currentStep === 'otp') {
      setCurrentStep('register');
      setOTP(['', '', '', '', '', '']);
      setOTPError('');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } else if (currentStep === 'profile') {
      // Can't go back from profile, only skip or complete
      return;
    } else {
      navigation.goBack();
    }
  };

  const renderRegisterStep = () => (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <ScrollView style={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Register</Text>
          <Text style={styles.subtitle}>Please fill in a few details below</Text>
          
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.textInput, formErrors.name && styles.inputError]}
                placeholder="John Doe"
                placeholderTextColor="#999999"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.textInput, formErrors.email && styles.inputError]}
                placeholder="name@email.com (Optional)"
                placeholderTextColor="#999999"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
              {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
              <View style={styles.phoneInputWrapper}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.phoneInput, formErrors.phone && styles.inputError]}
                  placeholder="9876543210"
                  placeholderTextColor="#999999"
                  value={phone}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                    setPhone(cleaned);
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="next"
                />
              </View>
              {formErrors.phone && <Text style={styles.errorText}>{formErrors.phone}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Referral Code (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="No code? Skip and do it later"
                placeholderTextColor="#999999"
                value={referralCode}
                onChangeText={setReferralCode}
                autoCapitalize="characters"
                returnKeyType="done"
              />
            </View>

            {formErrors.general && (
              <Text style={styles.generalError}>{formErrors.general}</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.proceedButton,
          (!name || !phone || isValidating) && styles.buttonDisabled
        ]}
        onPress={handleRegisterSubmit}
        disabled={!name || !phone || isValidating}
        activeOpacity={0.8}
      >
        {isValidating ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="arrow-forward" size={scaleSize(24)} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderOTPStep = () => (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={styles.otpScrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.otpContentWrapper}>
          <Text style={styles.title}>OTP</Text>
          <Text style={styles.subtitle}>
            Please enter the OTP sent to your{'\n'}phone number
          </Text>
          
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
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                editable={!isVerifyingOTP}
                selectTextOnFocus
              />
            ))}
          </View>

          {otpError && (
            <Text style={styles.otpErrorText}>{otpError}</Text>
          )}

          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResendOTP}
            disabled={resendTimer > 0}
            activeOpacity={0.7}
          >
            <Text style={styles.resendText}>
              Didn't receive OTP? 
              <Text style={[styles.resendLink, resendTimer > 0 && styles.resendLinkDisabled]}>
                {resendTimer > 0 ? ` Resend in ${resendTimer}s` : ' Resend Now'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.proceedButton, styles.proceedButtonGray]}
        onPress={() => handleVerifyOTP()}
        disabled={otp.join('').length !== 6 || isVerifyingOTP}
        activeOpacity={0.8}
      >
        {isVerifyingOTP ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="arrow-forward" size={scaleSize(24)} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderProfileStep = () => (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Lets setup a picture</Text>
        <Text style={styles.subtitle}>This will help others recognize you</Text>
        
        <View style={styles.profileImageSection}>
          <TouchableOpacity 
            style={styles.imagePickerContainer}
            onPress={handleSelectImage}
            activeOpacity={0.8}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="person-outline" size={scaleSize(60)} color="#999999" />
              </View>
            )}
            <View style={styles.addImageButton}>
              <Ionicons name="add" size={scaleSize(20)} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkipProfilePicture}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.proceedButton, styles.proceedButtonGray]}
        onPress={handleCompleteSignup}
        disabled={uploadingImage}
        activeOpacity={0.8}
      >
        {uploadingImage ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="arrow-forward" size={scaleSize(24)} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaWrapper backgroundColor="#FFFFFF">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={scaleSize(24)} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {currentStep === 'register' && renderRegisterStep()}
          {currentStep === 'otp' && renderOTPStep()}
          {currentStep === 'profile' && renderProfileStep()}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSize(20),
    paddingTop: scaleSize(16),
    paddingBottom: scaleSize(16),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: scaleSize(4),
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: scaleSize(24),
    paddingTop: scaleSize(32),
  },
  otpScrollContainer: {
    flexGrow: 1,
    paddingBottom: scaleSize(100), // Extra padding for keyboard
  },
  otpContentWrapper: {
    paddingHorizontal: scaleSize(24),
    paddingTop: scaleSize(32),
  },
  title: {
    fontSize: FONT_SIZES['3XL'],
    fontFamily: getFontFamily('SEMIBOLD'),
    color: '#000000',
    marginBottom: scaleSize(8),
  },
  subtitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('REGULAR'),
    color: '#666666',
    marginBottom: scaleSize(32),
    lineHeight: scaleSize(20),
  },
  formSection: {
    marginTop: scaleSize(8),
  },
  inputGroup: {
    marginBottom: scaleSize(20),
  },
  inputLabel: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('MEDIUM'),
    color: '#000000',
    marginBottom: scaleSize(8),
  },
  required: {
    color: '#FF0000',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: scaleSize(8),
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(14),
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('REGULAR'),
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#FF0000',
  },
  phoneInputWrapper: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: scaleSize(8),
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  countryCode: {
    paddingHorizontal: scaleSize(16),
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  countryCodeText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('MEDIUM'),
    color: '#000000',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: scaleSize(16),
    paddingVertical: scaleSize(14),
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('REGULAR'),
    color: '#000000',
  },
  errorText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: getFontFamily('REGULAR'),
    color: '#FF0000',
    marginTop: scaleSize(6),
  },
  generalError: {
    fontSize: FONT_SIZES.SM,
    fontFamily: getFontFamily('REGULAR'),
    color: '#FF0000',
    textAlign: 'center',
    marginTop: scaleSize(16),
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scaleSize(24),
    marginBottom: scaleSize(24),
    paddingHorizontal: scaleSize(4),
  },
  otpInput: {
    width: scaleSize(48),
    height: scaleSize(52),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: scaleSize(8),
    fontSize: FONT_SIZES.XL,
    fontFamily: getFontFamily('MEDIUM'),
    color: '#000000',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
  otpInputFilled: {
    borderColor: COLORS.PRIMARY.MAIN,
  },
  otpInputError: {
    borderColor: '#FF0000',
  },
  otpErrorText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: getFontFamily('REGULAR'),
    color: '#FF0000',
    textAlign: 'center',
    marginTop: scaleSize(-16),
    marginBottom: scaleSize(16),
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('REGULAR'),
    color: '#666666',
  },
  resendLink: {
    color: COLORS.PRIMARY.MAIN,
    fontFamily: getFontFamily('MEDIUM'),
  },
  resendLinkDisabled: {
    color: '#999999',
  },
  profileImageSection: {
    alignItems: 'center',
    marginTop: scaleSize(40),
    marginBottom: scaleSize(40),
  },
  imagePickerContainer: {
    position: 'relative',
  },
  imagePlaceholder: {
    width: scaleSize(150),
    height: scaleSize(150),
    borderRadius: scaleSize(75),
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: scaleSize(150),
    height: scaleSize(150),
    borderRadius: scaleSize(75),
  },
  addImageButton: {
    position: 'absolute',
    bottom: scaleSize(8),
    right: scaleSize(8),
    width: scaleSize(36),
    height: scaleSize(36),
    borderRadius: scaleSize(18),
    backgroundColor: COLORS.PRIMARY.MAIN,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: scaleSize(12),
    paddingHorizontal: scaleSize(24),
  },
  skipText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('MEDIUM'),
    color: COLORS.PRIMARY.MAIN,
    textDecorationLine: 'underline',
  },
  proceedButton: {
    position: 'absolute',
    bottom: scaleSize(32),
    right: scaleSize(24),
    width: scaleSize(56),
    height: scaleSize(56),
    borderRadius: scaleSize(28),
    backgroundColor: COLORS.PRIMARY.MAIN,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  proceedButtonGray: {
    backgroundColor: '#999999',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});

export default SignUpScreen;