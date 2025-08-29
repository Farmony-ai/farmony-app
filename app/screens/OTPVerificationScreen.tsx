import React, {useState, useRef, useEffect} from 'react';
/* eslint-disable react-hooks/exhaustive-deps */
import { 
  View, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  Image, 
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useDispatch, useSelector} from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import {COLORS, SPACING, BORDER_RADIUS, FONTS} from '../utils';
import {verifyOTP, clearError, updateUserVerification, otpLogin, setOtpChannel} from '../store/slices/authSlice';
import {RootState, AppDispatch} from '../store';
import otplessService from '../services/otpless';
import firebaseSMSService from '../services/firebaseSMS';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const OTPVerificationScreen = () => {
  const navigation = useNavigation();
  // Redux state and dispatch
  const dispatch = useDispatch<AppDispatch>();
  const {
    isVerifyingOTP,
    pendingUserPhone,
    isForgotPassword,
    otpChannel,
  } = useSelector((state: RootState) => state.auth);

  // OTP state - 6 digit OTP
  const [otp, setOTP] = useState(['', '', '', '', '', '']);
  const [otpError, setOTPError] = useState('');
  // Firebase confirmation object – required to verify OTP later (SMS only)
  const [smsConfirmation, setSMSConfirmation] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<string>('');
  
  // References for OTP inputs
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);
  const [isOTPLessInitialized, setIsOTPLessInitialized] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startFirebaseSMSAuth();
    return () => {
      otplessService.cleanup();
    };
  }, []);

  // Focus on first input when component mounts
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
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
  }, []);

  // Shake animation for errors
  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // 📱 Start SMS authentication via Firebase
  const startFirebaseSMSAuth = async () => {
    try {
      if (!pendingUserPhone) {
        setOTPError('Phone number required for OTP');
        return;
      }

      let phoneE164: string;
      if (pendingUserPhone.startsWith('+')) {
        phoneE164 = pendingUserPhone;
      } else if (/^\d{10}$/.test(pendingUserPhone)) {
        phoneE164 = `+91${pendingUserPhone}`;
      } else {
        phoneE164 = `+${pendingUserPhone}`;
      }

      setAuthStatus('Sending SMS OTP...');
      const confirmation = await firebaseSMSService.sendOTP(phoneE164);
      setSMSConfirmation(confirmation);
      setAuthStatus('OTP sent via SMS');
      dispatch(setOtpChannel('sms'));
    } catch (error) {
      console.error('❌ Failed to send SMS OTP:', error);
      setOTPError('Unable to send SMS OTP. Please try again.');
      setAuthStatus('');
      triggerShakeAnimation();
    }
  };

  // 🚀 Initialize OTPLess service
  const initializeOTPLess = async () => {
    setIsWhatsAppLoading(true);
    try {
      setAuthStatus('Initializing WhatsApp OTP service...');
      otplessService.setResultCallback(handleOTPLessResult);
      await otplessService.initialize();
      setIsOTPLessInitialized(true);
      setAuthStatus('WhatsApp OTP service ready.');
    } catch (error) {
      console.error('❌ Failed to initialize OTPLess:', error);
      setOTPError('Failed to initialize WhatsApp OTP service. Please try again.');
      setAuthStatus('');
      triggerShakeAnimation();
    } finally {
      setIsWhatsAppLoading(false);
    }
  };

  const handleWhatsAppOTP = async () => {
    if (!isOTPLessInitialized) {
      // If not initialized, initialize first. The actual OTP sending will happen in handleOTPLessResult.
      initializeOTPLess();
      return;
    }
    // If already initialized, proceed to send OTP
    sendWhatsAppOTP();
  };

  const sendWhatsAppOTP = async () => {
    try {
      if (!pendingUserPhone) {
        setOTPError('Phone number required for OTP');
        return;
      }
      const cleanedInput = pendingUserPhone.replace(/[^\d+]/g, '');
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
      console.error('❌ Failed to send WhatsApp OTP:', error);
      setOTPError('Failed to send WhatsApp OTP. Please try again.');
      setAuthStatus('');
      triggerShakeAnimation();
    }
  };

  // 🔄 Handle OTPLess service results
  const handleOTPLessResult = (result: any) => {
    if (result.success) {
      switch (result.message) {
        case 'SDK is ready for authentication':
          setAuthStatus('WhatsApp OTP service ready. Sending OTP...');
          sendWhatsAppOTP(); // Now send OTP after SDK is ready
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

  // ✅ Handle successful OTP verification
  const handleSuccessfulOTPVerification = async (token?: string) => {
    try {
      if (isForgotPassword) {
        // For forgot password flow, just verify the OTP
        // The ForgotPasswordScreen will handle the next step
        await dispatch(verifyOTP({ 
          phone: pendingUserPhone || '', 
          otp: otp.join('') 
        }));
        return;
      }

      const result = await dispatch(verifyOTP({
        phone: pendingUserPhone || '',
        otp: otp.join(''),
      }));
      
      if (verifyOTP.fulfilled.match(result)) {
        const payload = result.payload as { userId: string; requiresUserVerification: boolean };
        
        if (payload.requiresUserVerification && payload.userId) {
          const verificationResult = await dispatch(updateUserVerification({
            userId: payload.userId,
            isVerified: true,
            token: token || 'temp-token',
          }));
          
          if (!updateUserVerification.fulfilled.match(verificationResult)) {
            setOTPError('Failed to complete user verification. Please try again.');
            triggerShakeAnimation();
          }
        }
      }
    } catch (error) {
      setOTPError('Failed to complete authentication. Please try again.');
      triggerShakeAnimation();
    }
  };

  // Handle OTP input change
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

  // Handle backspace
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Validate OTP
  const validateOTP = () => {
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      setOTPError('Please enter all 6 digits');
      triggerShakeAnimation();
      return false;
    }
    
    return true;
  };

  // Handle OTP verification
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
          console.log('Firebase SMS verification failed:', smsError);
          lastError = smsError.message || 'Firebase SMS verification failed.';
        }
      } else if (otpChannel === 'whatsapp') {
        try {
          const cleanedInput = pendingUserPhone.replace(/[^\d+]/g, '');
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
          console.log('Otpless WhatsApp verification failed:', whatsappError);
          lastError = whatsappError.message || 'Otpless WhatsApp verification failed.';
        }
      } else {
        setOTPError('Please request an OTP first.');
        triggerShakeAnimation();
        return;
      }

      if (verificationSuccessful) {
        await handleSuccessfulOTPVerification();
        setOTPError(''); // Clear error if any method succeeds
      } else {
        setOTPError(lastError || 'Failed to verify OTP. Please try again.');
        setAuthStatus('');
        triggerShakeAnimation();
      }
    } catch (error: any) {
      setOTPError(error.message || 'Failed to verify OTP. Please try again.');
      setAuthStatus('');
      triggerShakeAnimation();
    }
  };

  // Handle resend OTP
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
        // Default to SMS if no channel is set (e.g., first load)
        await startFirebaseSMSAuth();
      }
    } catch (error) {
      setOTPError('Failed to resend OTP. Please try again.');
      setAuthStatus('');
      triggerShakeAnimation();
    }
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Minimal Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
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

        {/* OTP Card */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.otpCard, {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateX: shakeAnim }]
            }]}>
              {/* Icon and Title */}
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="shield-checkmark-outline" size={36} color={COLORS.PRIMARY.MAIN} />
                </View>
                <Text style={styles.title}>Verification Code</Text>
                <Text style={styles.subtitle}>
                  Enter the 6-digit code sent to{'\n'}
                  <Text style={styles.phoneNumber}>+91 {pendingUserPhone?.slice(-10) || 'your phone'}</Text>
                </Text>
              </View>

              {/* OTP Input Grid */}
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
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Status Display */}
              {authStatus && !otpError && (
                <View style={styles.statusContainer}>
                  <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
                  <Text style={styles.statusText}>{authStatus}</Text>
                </View>
              )}

              {/* Error Display */}
              {otpError && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{otpError}</Text>
                </View>
              )}

              {/* Verify Button */}
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
                    <Text style={styles.verifyButtonText}>Verify Code</Text>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.NEUTRAL.WHITE} />
                  </>
                )}
              </TouchableOpacity>

              {/* Resend Section */}
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

              {/* Help Text */}
              <Text style={styles.helpText}>
                Check your SMS or WhatsApp messages. The code expires in 10 minutes.
              </Text>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    marginRight: 40, // To center logo accounting for back button
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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.MD,
    paddingTop: SPACING.XL,
    paddingBottom: SPACING.XXL,
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
  cardHeader: {
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  title: {
    fontSize: 22,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  subtitle: {
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
  otpContainer: {
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
  errorText: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#EF4444',
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

export default OTPVerificationScreen;