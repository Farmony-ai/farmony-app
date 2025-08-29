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
import { isValidEmail, isRequired } from '../utils/validators';
import { signIn, clearError, setIsOtpLogin, setPendingUserPhone } from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SignInScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isSigningIn, error } = useSelector((state: RootState) => state.auth);

  // Form state
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [emailOrPhoneError, setEmailOrPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // Refs for inputs
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

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

  const validateForm = () => {
    let isValid = true;
    setEmailOrPhoneError('');
    setPasswordError('');
    
    if (!isRequired(emailOrPhone)) {
      setEmailOrPhoneError('Email or Phone is required');
      isValid = false;
    }
    
    if (!isRequired(password)) {
      setPasswordError('Password is required');
      isValid = false;
    }
    
    return isValid;
  };

  const handleSignIn = async () => {
    Keyboard.dismiss();
    if (!validateForm()) return;
    dispatch(clearError());
    
    try {
      const result = await dispatch(signIn({ emailOrPhone, password }));
      if (signIn.fulfilled.match(result)) {
        console.log('✅ Sign in successful');
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleOTPLogin = () => {
    // Set OTP login flag and navigate to OTPLogin screen
    dispatch(setIsOtpLogin(true));
    navigation.navigate('OTPLogin');
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
        </LinearGradient>

        {/* Form Card */}
        <Animated.View style={[styles.formCard, {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }]}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.subtitleText}>Sign in to continue to your account</Text>

          {/* Email/Phone Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, emailOrPhoneError && styles.inputWrapperError]}>
              <Ionicons name="person-outline" size={18} color={COLORS.TEXT.PLACEHOLDER} />
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="Email or Phone"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                value={emailOrPhone}
                onChangeText={(text) => {
                  setEmailOrPhone(text);
                  if (emailOrPhoneError) setEmailOrPhoneError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
                editable={!isSigningIn}
              />
            </View>
            {emailOrPhoneError ? (
              <Text style={styles.errorText}>{emailOrPhoneError}</Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <View style={[styles.inputWrapper, passwordError && styles.inputWrapperError]}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.TEXT.PLACEHOLDER} />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSignIn}
                editable={!isSigningIn}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-outline" : "eye-off-outline"} 
                  size={18} 
                  color={COLORS.TEXT.PLACEHOLDER} 
                />
              </TouchableOpacity>
            </View>
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity 
              style={styles.rememberMe} 
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={12} color={COLORS.NEUTRAL.WHITE} />}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Error Display */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorMessageText}>{error}</Text>
            </View>
          )}

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInButton, isSigningIn && styles.signInButtonLoading]}
            onPress={handleSignIn}
            disabled={isSigningIn}
            activeOpacity={0.8}
          >
            {isSigningIn ? (
              <ActivityIndicator size="small" color={COLORS.NEUTRAL.WHITE} />
            ) : (
              <Text style={styles.signInText}>Sign In →</Text>
            )}
          </TouchableOpacity>

          {/* OR Divider */}
          <Text style={styles.dividerText}>OR</Text>

          {/* OTP Login Button */}
          <TouchableOpacity
            style={styles.otpButton}
            onPress={handleOTPLogin}
            activeOpacity={0.7}
          >
            <Ionicons name="phone-portrait-outline" size={18} color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.otpButtonText}>Sign in with OTP</Text>
          </TouchableOpacity>

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
    height: screenHeight * 0.30,
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
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.MD,
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
    fontSize: 22,
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
  welcomeText: {
    fontSize: 20,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.LG,
  },
  inputContainer: {
    marginBottom: SPACING.MD,
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
  input: {
    flex: 1,
    marginLeft: SPACING.SM,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  checkboxChecked: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  rememberText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  forgotText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: SPACING.SM,
    marginBottom: SPACING.SM,
  },
  errorMessageText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#EF4444',
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  signInButtonLoading: {
    opacity: 0.8,
  },
  signInText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  dividerText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  otpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: SPACING.LG,
  },
  otpButtonText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
    marginLeft: SPACING.SM,
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

export default SignInScreen;