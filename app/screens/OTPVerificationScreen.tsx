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
import LinearGradient from 'react-native-linear-gradient';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import Button from '../components/Button';
import {COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS} from '../utils';
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
        await dispatch(otpLogin({ phone: pendingUserPhone || '' }));
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
        {/* Gradient Header */}
        <LinearGradient
          colors={[COLORS.PRIMARY.MAIN, COLORS.PRIMARY.DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Decorative circles */}
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />
          
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.NEUTRAL.WHITE} />
            </TouchableOpacity>
            
            <Animated.View style={[styles.logoContainer, {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]}>
              <View style={styles.logoBackground}>
                <Image
                  source={require('../assets/logo.png')}
                  style={styles.headerImage}
                  resizeMode="contain"
                />
              </View>
            </Animated.View>
            
            <Animated.View style={[styles.titleContainer, {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }]}>
              <Text style={styles.appName}>Verify OTP</Text>
              <Text style={styles.tagline}>
                We sent a code to +91 {pendingUserPhone?.slice(-10) || 'your phone'}
              </Text>
            </Animated.View>
          </View>
        </LinearGradient>

        {/* OTP Card */}
        <Animated.View style={[styles.otpCard, {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateX: shakeAnim }]
        }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoid}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Status Display */}
              {authStatus && !otpError && (
                <View style={styles.statusContainer}>
                  <View style={styles.statusIcon}>
                    <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
                  </View>
                  <Text style={styles.statusText}>{authStatus}</Text>
                </View>
              )}

              {/* Error Display */}
              {otpError && (
                <View style={styles.errorContainer}>
                  <View style={styles.errorIcon}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  </View>
                  <Text style={styles.errorText}>{otpError}</Text>
                </View>
              )}

              {/* OTP Input Grid */}
              <View style={styles.otpContainer}>
                <Text style={styles.otpLabel}>Enter Verification Code</Text>
                <View style={styles.otpInputs}>
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
              </View>

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
                    <Text style={styles.verifyButtonText}>Verify OTP</Text>
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
                Having trouble? Check your SMS or WhatsApp messages, or ensure you have a stable internet connection.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  headerGradient: {
    height: screenHeight * 0.32, // Reduced from 0.35 to match other screens
    borderBottomLeftRadius: 15, // Reduced from 30 to match other screens
    borderBottomRightRadius: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute',
    width: 150, // Reduced from 200 to match other screens
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30, // Adjusted from -50
    right: -30,
  },
  headerCircle2: {
    position: 'absolute',
    width: 120, // Reduced from 150 to match other screens
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -20, // Adjusted from -30
    left: -20,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Adjusted padding to match other screens
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30, // Adjusted to match other screens
    left: SPACING.MD,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: SPACING.SM, // Reduced from MD to match other screens
  },
  logoBackground: {
    width: 80, // Reduced from 100 to match other screens
    height: 80,
    borderRadius: 30, // Adjusted from 50 to match other screens
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.SM, // Reduced from MD
  },
  headerImage: {
    width: 40, // Reduced from 60 to match other screens
    height: 40,
  },
  titleContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 24, // Reduced from 28 to match other screens
    fontFamily: FONTS.POPPINS.SEMIBOLD, // Changed from BOLD to match other screens
    color: COLORS.NEUTRAL.WHITE,
    marginBottom: 2, // Reduced from 8
  },
  tagline: {
    fontSize: 11, // Reduced from 14 to match other screens
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: SPACING.LG,
    letterSpacing: 1.5, // Added to match other screens
  },
  otpCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginTop: -20, // Reduced from -30 to match other screens
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.LG, // Added to match other screens
    borderRadius: 15, // Reduced from 20 to match other screens
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow to match other screens
    shadowOpacity: 0.08, // Reduced from 0.1
    shadowRadius: 4, // Reduced from 8
    elevation: 2, // Reduced from 5
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.XL, // Kept the same as original
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
  },
  statusIcon: {
    marginRight: SPACING.SM,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorIcon: {
    marginRight: SPACING.SM,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#EF4444',
  },
  otpContainer: {
    marginBottom: SPACING.XL,
  },
  otpLabel: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  otpInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.SM,
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  otpInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  verifyButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 10, // Reduced from 14 to match other screens
    paddingVertical: 12, // Reduced from 16
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
    fontSize: 14, // Reduced from 16 to match other screens
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  resendPrompt: {
    fontSize: 12, // Reduced from 14 to match other screens
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
    fontSize: 12, // Reduced from 14 to match other screens
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.PRIMARY.MAIN,
  },
  helpText: {
    fontSize: 11, // Reduced from 12
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PLACEHOLDER,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: SPACING.SM,
  },
});

export default OTPVerificationScreen;