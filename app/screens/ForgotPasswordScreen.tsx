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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, FONT_SIZES } from '../utils';
import { isRequired } from '../utils/validators';
import { startForgotPassword, clearError } from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';
import { checkPhoneExists } from '../services/api';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Refs for inputs
  const phoneInputRef = useRef<TextInput>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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

  const validate = async () => {
    if (!isRequired(phone)) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (phone.length !== 10) {
      setPhoneError('Enter a valid 10-digit phone number');
      return false;
    }
    
    // Check if phone exists in database
    setIsValidating(true);
    try {
      console.log('[ForgotPassword] ➜ Validating phone before OTP:', phone);
      const result = await checkPhoneExists(phone);
      console.log('[ForgotPassword] ⇦ checkPhoneExists:', result);
      setIsValidating(false);
      
      if (!result.exists) {
        setPhoneError('Phone number is not registered. Please register first.');
        return false;
      }
    } catch (error) {
      setIsValidating(false);
      console.log('[ForgotPassword] ❌ Phone validation error:', error);
      setPhoneError('Unable to verify phone number. Please try again.');
      return false;
    }
    
    setPhoneError('');
    return true;
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!(await validate())) return;
    dispatch(clearError());
    
    try {
      await dispatch(startForgotPassword(phone));
      navigation.navigate('OTPVerification');
    } catch (error) {
      console.error('Forgot password error:', error);
    }
  };

  const handleBack = () => {
    navigation.goBack();
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
          
          <Animated.View style={[styles.headerContent, {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }]}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Image
                  source={require('../assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.appName}>Farmony</Text>
            <Text style={styles.tagline}>Connect • Share • Grow</Text>
          </Animated.View>

          {/* Back button */}
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.NEUTRAL.WHITE} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Form Card */}
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

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={[styles.inputWrapper, phoneError && styles.inputWrapperError]}>
              <View style={styles.phonePrefix}>
                <Text style={styles.phonePrefixText}>+91</Text>
              </View>
              <TextInput
                ref={phoneInputRef}
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
                onSubmitEditing={handleSubmit}
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

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorMessageText}>{error}</Text>
            </View>
          )}

          {/* Send OTP Button */}
          <TouchableOpacity
            style={[styles.sendOTPButton, (isLoading || isValidating) && styles.sendOTPButtonLoading]}
            onPress={handleSubmit}
            disabled={isLoading || isValidating}
            activeOpacity={0.8}
          >
            {(isLoading || isValidating) ? (
              <ActivityIndicator size="small" color={COLORS.NEUTRAL.WHITE} />
            ) : (
              <>
                <Text style={styles.sendOTPText}>Send OTP</Text>
                <Ionicons name="arrow-forward" size={20} color={COLORS.NEUTRAL.WHITE} />
              </>
            )}
          </TouchableOpacity>

          {/* Additional Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.PRIMARY.MAIN} />
              <Text style={styles.infoText}>
                We'll send a 6-digit verification code to your phone
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time" size={16} color={COLORS.PRIMARY.MAIN} />
              <Text style={styles.infoText}>
                Code expires in 10 minutes
              </Text>
            </View>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpPrompt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
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
    height: screenHeight * 0.32,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -30,
    right: -30,
  },
  headerCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -20,
    left: -20,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: SPACING.MD,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  logoContainer: {
    marginBottom: SPACING.SM,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.SM,
  },
  logo: {
    width: 40,
    height: 40,
  },
  appName: {
    fontSize: 24,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
    marginBottom: 2,
  },
  tagline: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 1.5,
  },
  formCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginTop: -20,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.LG,
    borderRadius: 15,
    padding: SPACING.XL,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
  sendOTPButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.SM,
    marginBottom: SPACING.LG,
  },
  sendOTPButtonLoading: {
    opacity: 0.8,
  },
  sendOTPText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  infoSection: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: 12,
    padding: SPACING.MD,
    marginBottom: SPACING.LG,
    gap: SPACING.SM,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  infoText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    flex: 1,
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
});

export default ForgotPasswordScreen;