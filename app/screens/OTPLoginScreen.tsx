import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, FONTS } from '../utils';
import { isRequired } from '../utils/validators';
import { 
  setPendingUserPhone,
  clearError, 
  verifyOTP,
  otpLogin,
  setOtpChannel 
} from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';
import { checkPhoneExists } from '../services/api';
import firebaseSMSService from '../services/firebaseSMS';
import otplessService from '../services/otpless';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OTPLoginScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, otpChannel, isVerifyingOTP } = useSelector((state: RootState) => state.auth);

  // Step state management
  const [currentStep, setCurrentStep] = useState<'phone' | 'otp'>('phone');
  
  // Phone step state
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // OTP step state
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
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    const stepIndex = currentStep === 'phone' ? 0 : 1;
    Animated.timing(progressAnim, {
      toValue: stepIndex,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 'otp') {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    }
  }, [currentStep]);

  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const validatePhone = async () => {
    if (!isRequired(phone)) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (phone.length !== 10) {
      setPhoneError('Enter a valid 10-digit phone number');
      return false;
    }
    
    setIsValidating(true);
    try {
      const result = await checkPhoneExists(phone);
      setIsValidating(false);
      
      if (!result.exists) {
        setPhoneError('Phone number is not registered. Please sign up first.');
        return false;
      }
    } catch (error) {
      setIsValidating(false);
      setPhoneError('Unable to verify phone number. Please try again.');
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handlePhoneSubmit = async () => {
    Keyboard.dismiss();
    if (!(await validatePhone())) return;
    dispatch(clearError());
    dispatch(setPendingUserPhone(phone));
    
    try {
      startFirebaseSMSAuth();
      setCurrentStep('otp');
    } catch (error) {
      console.error('OTP login error:', error);
    }
  };

  // SMS/WhatsApp OTP functions
  const startFirebaseSMSAuth = async () => {
    try {
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
      setAuthStatus('OTP sent via SMS');
      dispatch(setOtpChannel('sms'));
    } catch (error) {
      console.error('Failed to send SMS OTP:', error);
      setOTPError('Unable to send SMS OTP. Please try again.');
      setAuthStatus('');
      triggerShakeAnimation();
    }
  };

  const initializeOTPLess = async () => {
    setIsWhatsAppLoading(true);
    try {
      setAuthStatus('Initializing WhatsApp OTP service...');
      otplessService.setResultCallback(handleOTPLessResult);
      await otplessService.initialize();
      setIsOTPLessInitialized(true);
      setAuthStatus('WhatsApp OTP service ready.');
    } catch (error) {
      console.error('Failed to initialize OTPLess:', error);
      setOTPError('Failed to initialize WhatsApp OTP service.');
      setAuthStatus('');
      triggerShakeAnimation();
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
    } catch (error) {
      console.error('Failed to send WhatsApp OTP:', error);
      setOTPError('Failed to send WhatsApp OTP.');
      setAuthStatus('');
      triggerShakeAnimation();
    }
  };

  const handleOTPLessResult = (result: any) => {
    if (result.success) {
      switch (result.message) {
        case 'SDK is ready for authentication':
          setAuthStatus('WhatsApp OTP service ready.');
          sendWhatsAppOTP();
          break;
        case 'Authentication initiated':
          setAuthStatus(`OTP sent via WhatsApp`);
          break;
        case 'OTP automatically detected':
          if (result.otp) {
            const otpDigits = result.otp.split('');
            setOTP(otpDigits);
            setAuthStatus('OTP automatically detected');
          }
          break;
        case 'One-tap authentication successful':
        case 'OTP verified successfully':
          if (result.token) {
            handleSuccessfulOTPVerification(result.token);
          }
          break;
        default:
          setAuthStatus(result.message || 'Ready');
      }
      setOTPError('');
    } else {
      setOTPError(result.error || 'OTP verification failed');
      setAuthStatus('');
      triggerShakeAnimation();
    }
  };

  const handleSuccessfulOTPVerification = async (token?: string) => {
    try {
      // For OTP login, directly log the user in
      const result = await dispatch(otpLogin({ phone }));
      
      if (otpLogin.fulfilled.match(result)) {
        // Navigate to home on successful login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        setOTPError('Login failed. Please try again.');
        triggerShakeAnimation();
      }
    } catch (error) {
      setOTPError('Failed to complete authentication. Please try again.');
      triggerShakeAnimation();
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
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const validateOTP = () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setOTPError('Please enter all 6 digits');
      return false;
    }
    return true;
  };

  const handleVerifyOTP = async () => {
    if (!validateOTP()) return;
    
    dispatch(clearError());
    setOTPError('');
    
    const otpString = otp.join('');
    
    try {
      setAuthStatus('Verifying OTP...');
      let verificationSuccessful = false;
      let lastError: string | null = null;

      if (otpChannel === 'sms') {
        if (!smsConfirmation) {
          setOTPError('SMS confirmation not found. Please resend OTP.');
          triggerShakeAnimation();
          return;
        }
        try {
          await firebaseSMSService.verifyOTP(smsConfirmation, otpString);
          verificationSuccessful = true;
          setAuthStatus('OTP verified via SMS.');
        } catch (smsError: any) {
          lastError = smsError.message || 'SMS verification failed.';
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
          setAuthStatus('OTP verified via WhatsApp.');
        } catch (whatsappError: any) {
          lastError = whatsappError.message || 'WhatsApp verification failed.';
        }
      }

      if (verificationSuccessful) {
        await handleSuccessfulOTPVerification();
        setOTPError('');
      } else {
        setOTPError(lastError || 'Failed to verify OTP.');
        setAuthStatus('');
        triggerShakeAnimation();
      }
    } catch (error: any) {
      setOTPError(error.message || 'Failed to verify OTP.');
      setAuthStatus('');
      triggerShakeAnimation();
    }
  };

  const handleResendOTP = async () => {
    try {
      setAuthStatus('Resending OTP...');
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
      setOTPError('Failed to resend OTP.');
      setAuthStatus('');
    }
  };

  const handleBack = () => {
    if (currentStep === 'otp') {
      setCurrentStep('phone');
    } else {
      navigation.goBack();
    }
  };

  const renderPhoneStep = () => (
    <Animated.View style={[styles.formCard, {
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }]
    }]}>
      <View style={styles.iconContainer}>
        <View style={styles.iconBackground}>
          <Ionicons name="phone-portrait-outline" size={32} color={COLORS.PRIMARY.MAIN} />
        </View>
      </View>

      <Text style={styles.welcomeText}>Sign in with OTP</Text>
      <Text style={styles.subtitleText}>
        Enter your registered phone number to receive a verification code
      </Text>

      <View style={styles.inputContainer}>
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
            onChangeText={(text) => {
              setPhone(text);
              if (phoneError) setPhoneError('');
            }}
            keyboardType="phone-pad"
            maxLength={10}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handlePhoneSubmit}
            editable={!isLoading && !isValidating}
          />
          {isValidating && (
            <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
          )}
          {phone.length === 10 && !phoneError && !isValidating && (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.SUCCESS.MAIN} />
          )}
        </View>
        {phoneError ? (
          <Text style={styles.errorText}>{phoneError}</Text>
        ) : null}
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.errorMessageText}>{error}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, (isLoading || isValidating) && styles.primaryButtonLoading]}
        onPress={handlePhoneSubmit}
        disabled={isLoading || isValidating}
        activeOpacity={0.8}
      >
        {(isLoading || isValidating) ? (
          <ActivityIndicator size="small" color={COLORS.NEUTRAL.WHITE} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Send OTP</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.NEUTRAL.WHITE} />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.signUpContainer}>
        <Text style={styles.signUpPrompt}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signUpLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderOTPStep = () => (
    <Animated.View style={[styles.otpCard, {
      opacity: fadeAnim,
      transform: [{ scale: 0.95 }, { translateX: shakeAnim }]
    }]}>
      <View style={styles.otpHeader}>
        <View style={styles.otpIconContainer}>
          <Ionicons name="shield-checkmark-outline" size={36} color={COLORS.PRIMARY.MAIN} />
        </View>
        <Text style={styles.otpTitle}>Verification Code</Text>
        <View style={styles.phoneNumberWrapper}>
            <Text style={styles.otpSubtitle}>
                Enter the 6-digit code sent to
            </Text>
            <Text style={styles.phoneNumber}>+91 {phone}</Text>
        </View>
      </View>

      <View style={styles.otpInputContainer}>
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
            selectTextOnFocus
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
        <View style={styles.otpErrorContainer}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.errorMessageText}>{otpError}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.verifyButton, isVerifyingOTP && styles.verifyButtonLoading]}
        onPress={handleVerifyOTP}
        disabled={isVerifyingOTP}
        activeOpacity={0.8}
      >
        {isVerifyingOTP ? (
          <ActivityIndicator size="small" color={COLORS.NEUTRAL.WHITE} />
        ) : (
          <>
            <Text style={styles.verifyButtonText}>Verify & Sign In</Text>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.NEUTRAL.WHITE} />
          </>
        )}
      </TouchableOpacity>

      <View style={styles.resendSection}>
        <Text style={styles.resendPrompt}>Didn't receive the code?</Text>
        <View style={styles.resendButtons}>
          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOTP}
            disabled={isVerifyingOTP}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={18} color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.resendButtonText}>Resend SMS</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.resendButton, styles.whatsappButton]}
            onPress={handleWhatsAppOTP}
            disabled={isVerifyingOTP || isWhatsAppLoading}
            activeOpacity={0.7}
          >
            {isWhatsAppLoading ? (
              <ActivityIndicator size="small" color="#25D366" />
            ) : (
              <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
            )}
            <Text style={[styles.resendButtonText, { color: '#25D366' }]}>
              WhatsApp
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.helpText}>
        Check your SMS or WhatsApp messages. The code expires in 10 minutes.
      </Text>
    </Animated.View>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Minimal Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
            activeOpacity={0.8}
          >
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
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.progressSteps}>
            {['phone', 'otp'].map((step, index) => (
              <View
                key={step}
                style={[
                  styles.progressStep,
                  (currentStep === 'otp' && index <= 1) || 
                  (currentStep === 'phone' && index === 0) 
                    ? styles.progressStepActive 
                    : null,
                ]}
              >
                {currentStep === 'otp' && index < 1 ? (
                  <Ionicons name="checkmark" size={14} color={COLORS.NEUTRAL.WHITE} />
                ) : (
                  <Text
                    style={[
                      styles.progressStepText,
                      (currentStep === 'otp' && index <= 1) || 
                      (currentStep === 'phone' && index === 0)
                        ? styles.progressStepTextActive 
                        : null,
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 'phone' && renderPhoneStep()}
          {currentStep === 'otp' && renderOTPStep()}
        </ScrollView>
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
  phoneNumberWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
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
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.XL,
  },
  formCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 15,
    padding: SPACING.XL,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  otpCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: 20,
    padding: SPACING.XL,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  iconBackground: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.LG,
    textAlign: 'center',
    lineHeight: 18,
  },
  inputContainer: {
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
    borderRadius: 10,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    height: 44,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
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
    marginLeft: SPACING.SM,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: SPACING.SM,
    marginBottom: SPACING.SM,
    gap: SPACING.SM,
  },
  errorMessageText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#EF4444',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  primaryButtonLoading: {
    opacity: 0.8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  signUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpPrompt: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  signUpLink: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.PRIMARY.MAIN,
  },
  
  // OTP Step Styles
  otpHeader: {
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  otpIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  otpTitle: {
    fontSize: 22,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  otpSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  phoneNumber: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.XL,
    paddingHorizontal: SPACING.XS,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    fontSize: 24,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  otpInputFilled: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderColor: COLORS.PRIMARY.MAIN,
    shadowColor: COLORS.PRIMARY.MAIN,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
  otpErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    paddingVertical: SPACING.MD,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    marginBottom: SPACING.MD,
  },
  verifyButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.XL,
  },
  verifyButtonLoading: {
    opacity: 0.8,
  },
  verifyButtonText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
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
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: 25,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  whatsappButton: {
    backgroundColor: '#E8F8F0',
    borderColor: '#25D366',
  },
  resendButtonText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.PRIMARY.MAIN,
  },
  helpText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PLACEHOLDER,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.SM,
  },
});

export default OTPLoginScreen;