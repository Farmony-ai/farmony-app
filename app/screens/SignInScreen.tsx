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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import { COLORS, SPACING } from '../utils';
import { FONTS, FONT_SIZES, scaleSize, getFontFamily } from '../utils/fonts';
import { RootState, AppDispatch } from '../store';
import { 
  setPendingUserPhone, 
  clearError, 
  otpLogin,
  setOtpChannel 
} from '../store/slices/authSlice';
import { checkPhoneExists } from '../services/api';
import firebaseSMSService from '../services/firebaseSMS';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SignInScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error, isVerifyingOTP } = useSelector((state: RootState) => state.auth);

  // Screen state
  const [currentStep, setCurrentStep] = useState<'phone' | 'otp'>('phone');
  
  // Phone step state
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  
  // OTP step state
  const [otp, setOTP] = useState(['', '', '', '', '', '']);
  const [otpError, setOTPError] = useState('');
  const [smsConfirmation, setSMSConfirmation] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  const validatePhone = async () => {
    if (!phone || phone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return false;
    }
    
    setIsValidating(true);
    try {
      const result = await checkPhoneExists(phone);
      setIsValidating(false);
      
      if (!result.exists) {
        setPhoneError('Phone number not registered. Please sign up first.');
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
      await startFirebaseSMSAuth();
      setCurrentStep('otp');
    } catch (error) {
      console.error('Failed to send OTP:', error);
      setPhoneError('Failed to send OTP. Please try again.');
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

      // Step 1: Verify OTP with Firebase and get UserCredential
      const userCredential = await firebaseSMSService.verifyOTP(smsConfirmation, otpCode);

      // Step 2: Get the Firebase ID token from the credential
      const idToken = await userCredential.user.getIdToken();
      console.log('✅ Got Firebase ID token');

      // Step 3: Send ID token to backend for authentication
      const phoneE164 = `+91${phone}`;
      const result = await dispatch(otpLogin({
        idToken,
        phoneNumber: phoneE164,
        name: 'User' // Default name, can be customized later
      }));

      if (otpLogin.fulfilled.match(result)) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        setOTPError('Login failed. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ OTP verification error:', error);
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

  const handleBack = () => {
    if (currentStep === 'otp') {
      setCurrentStep('phone');
      setOTP(['', '', '', '', '', '']);
      setOTPError('');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } else {
      navigation.goBack();
    }
  };

  const renderPhoneStep = () => (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Login</Text>
        <Text style={styles.subtitle}>Enter your phone number to login</Text>
        
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
          <View style={styles.phoneInputWrapper}>
            <View style={styles.countryCode}>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="9876543210"
              placeholderTextColor="#999999"
              value={phone}
              onChangeText={(text) => {
                // Only allow numbers and limit to 10 digits
                const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                setPhone(cleaned);
                if (phoneError) setPhoneError('');
              }}
              keyboardType="phone-pad"
              maxLength={10}
              autoFocus
              editable={!isLoading && !isValidating}
            />
          </View>
          {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.proceedButton, (!phone || phone.length !== 10 || isValidating) && styles.buttonDisabled]}
        onPress={handlePhoneSubmit}
        disabled={!phone || phone.length !== 10 || isValidating}
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
        style={[styles.proceedButton, (otp.join('').length !== 6 || isVerifyingOTP) && styles.buttonDisabled]}
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
          {currentStep === 'phone' && renderPhoneStep()}
          {currentStep === 'otp' && renderOTPStep()}
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
    justifyContent: 'space-between',
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: scaleSize(24),
    paddingTop: scaleSize(32),
  },
  scrollContent: {
    flex: 1,
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
  inputSection: {
    marginTop: scaleSize(8),
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
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});

export default SignInScreen;