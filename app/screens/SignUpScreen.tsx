import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import Button from '../components/Button';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS } from '../utils';
import { isValidEmail, isRequired, isValidPassword } from '../utils/validators';
import { registerUser, setCurrentScreen, clearError, setOtpChannel, otpLogin, updateUserVerification, verifyOTP, loginAndVerifyUser, signIn } from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';
import { checkPhoneExists } from '../services/api';
import locationService from '../services/locationService';
import firebaseSMSService from '../services/firebaseSMS';
import otplessService from '../services/otpless';
import Ionicons from 'react-native-vector-icons/Ionicons';


const SignUpScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isSigningUp, error, pendingUserPhone, isForgotPassword, otpChannel, isVerifyingOTP, isCreatingProfile, isAuthenticated,currentScreen } = useSelector((state: RootState) => state.auth);

  const [currentStep, setCurrentStep] = useState(1);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);

  // Step 1 State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [country, setCountry] = useState('');
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Step 2 State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  // Step 3 State (OTP Verification)
  const [otp, setOTP] = useState(['', '', '', '', '', '']);
  const [otpError, setOTPError] = useState('');
  const [smsConfirmation, setSMSConfirmation] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<string>('');
  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);
  const [isOTPLessInitialized, setIsOTPLessInitialized] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // OTP input focus effect
  useEffect(() => {
    if (currentStep === 3) {
      inputRefs.current[0]?.focus();
    }
  }, [currentStep]);

  // Monitor authentication state for debugging
  useEffect(() => {
    console.log('SignUpScreen: isAuthenticated changed to', isAuthenticated);
    console.log('SignUpScreen: currentScreen changed to', currentScreen);
  }, [isAuthenticated, currentScreen]);

  // Helper for OTP input change
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

  // Helper for OTP backspace
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Helper to validate OTP format
  const validateOTPFormat = () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setOTPError('Please enter all 6 digits');
      return false;
    }
    return true;
  };

  // 📱 Start SMS authentication via Firebase
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
      setAuthStatus('OTP sent via SMS');
      dispatch(setOtpChannel('sms'));
    } catch (err: any) {
      console.error('❌ Failed to send SMS OTP:', err);
      setOTPError(err.message || 'Unable to send SMS OTP. Please try again.');
      setAuthStatus('');
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
    } catch (err: any) {
      console.error('❌ Failed to initialize OTPLess:', err);
      setOTPError(err.message || 'Failed to initialize WhatsApp OTP service. Please try again.');
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
        setOTPError('Phone number required for OTP');
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
      setOTPError(err.message || 'Failed to send WhatsApp OTP. Please try again.');
      setAuthStatus('');
    }
  };

  // 🔄 Handle OTPLess service results
  const handleOTPLessResult = (result: any) => {
    if (result.success) {
      switch (result.message) {
        case 'SDK is ready for authentication':
          setAuthStatus('WhatsApp OTP service ready. Sending OTP...');
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
          // For sign-up, we don't directly log in here. We just confirm OTP success.
          // The final sign-up dispatch happens in handleVerifyOTP.
          setAuthStatus('OTP verified successfully via WhatsApp.');
          break;
        default:
          setAuthStatus(result.message || 'Ready');
      }
      setOTPError('');
    } else {
      setOTPError(result.error || 'OTP verification failed');
      setAuthStatus('');
    }
  };

  

  // Handle input changes with error clearing
  const handleNameChange = (text: string) => {
    setName(text);
    if (nameError) setNameError('');
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    if (phoneError) setPhoneError('');
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) setEmailError('');
  };

  const handleAddressChange = (field: string, text: string) => {
    if (addressError) setAddressError('');
    switch (field) {
      case 'street': setStreet(text); break;
      case 'city': setCity(text); break;
      case 'state': setState(text); break;
      case 'zipCode': setZipCode(text); break;
      case 'country': setCountry(text); break;
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) setPasswordError('');
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (confirmPasswordError) setConfirmPasswordError('');
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    setAddressError('');
    try {
      const loc = await locationService.getCurrentLocation();
      if (loc) {
        setStreet(loc.address || ''); // Assuming address is directly available or needs parsing
        setCity(loc.city || '');
        setState(loc.state || '');
        setCountry(loc.country || '');
        setZipCode(loc.zipCode || ''); // Assuming zipCode is available
        // No alert, directly populate fields
      } else {
        // Optionally, you could set an error state for the address fields if location isn't found
        setAddressError('Could not retrieve current location.');
      }
    } catch (err: any) {
      console.error('Error getting location:', err);
      setAddressError(err.message || 'Failed to get current location.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const validateStep = async (step: number): Promise<boolean> => {
    let isValid = true;
    dispatch(clearError()); // Clear global Redux error

    switch (step) {
      case 1:
        setNameError('');
        setPhoneError('');
        setEmailError('');
        setAddressError('');

        if (!isRequired(name)) { setNameError('Name is required'); isValid = false; }
        else if (name.length < 2) { setNameError('Name must be at least 2 characters'); isValid = false; }

        if (!isRequired(phone)) { setPhoneError('Phone number is required'); isValid = false; }
        else if (phone.length !== 10) { setPhoneError('Please enter a valid 10-digit phone number'); isValid = false; }
        else {
          setIsValidatingPhone(true);
          try {
            console.log('[SignUp] ➜ Checking phone availability:', phone);
            const result = await checkPhoneExists(phone);
            console.log('[SignUp] ⇦ checkPhoneExists:', result);
            setIsValidatingPhone(false);
            if (result.exists) {
              setPhoneError('Phone number is already registered. Please use a different number.');
              isValid = false;
            }
          } catch (err: any) {
            setIsValidatingPhone(false);
            setPhoneError(err.message || 'Unable to verify phone number. Please try again.');
            isValid = false;
          }
        }

        if (email && !isValidEmail(email)) { setEmailError('Please enter a valid email address'); isValid = false; }

        if (!isRequired(street) || !isRequired(city) || !isRequired(state) || !isRequired(zipCode) || !isRequired(country)) {
          setAddressError('All address fields are required');
          isValid = false;
        }
        break;
      case 2:
        setPasswordError('');
        setConfirmPasswordError('');

        if (!isRequired(password)) { setPasswordError('Password is required'); isValid = false; }
        else if (!isValidPassword(password)) { setPasswordError('Password must be at least 8 characters with uppercase, lowercase, and number'); isValid = false; }

        if (!isRequired(confirmPassword)) { setConfirmPasswordError('Please confirm your password'); isValid = false; }
        else if (password !== confirmPassword) { setConfirmPasswordError('Passwords do not match'); isValid = false; }
        break;
      case 3:
        setOTPError('');
        if (!validateOTPFormat()) { isValid = false; }
        break;
    }
    return isValid;
  };

  const handleNext = async () => {
    if (await validateStep(currentStep)) {
      if (currentStep < 3) {
        if (currentStep === 2) {
          // Create profile before moving to OTP verification
          try {
            setAuthStatus('Creating your profile...');
            const result = await dispatch(registerUser({
              name,
              email,
              phone,
              password,
              role: 'individual',
            }));

            if (registerUser.fulfilled.match(result)) {
              setRegisteredUserId(result.payload.userId);
              console.log('SignUpScreen: registeredUserId set to', result.payload.userId);
              // Profile created, now send OTP
              startFirebaseSMSAuth();
              setCurrentStep(currentStep + 1);
            } else {
              Alert.alert('Error', result.error?.message || 'Profile creation failed.');
              setAuthStatus('');
            }
          } catch (err: any) {
            Alert.alert('Error', err.message || 'An unexpected error occurred.');
            setAuthStatus('');
          }
        } else {
          setCurrentStep(currentStep + 1);
        }
      } else if (currentStep === 3) {
        handleVerifyOTP();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack(); // Go back to SignIn if on first step
    }
  };

  // Handle OTP verification (from Step 3)
  const handleVerifyOTP = async () => {
    if (!validateOTPFormat()) return;
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
          console.log('Otpless WhatsApp verification failed:', whatsappError);
          lastError = whatsappError.message || 'Otpless WhatsApp verification failed.';
        }
      } else {
        setOTPError('Please request an OTP first.');
        return;
      }

      if (verificationSuccessful) {
        // After successful OTP verification, dispatch loginAndVerifyUser
  console.log('SignUpScreen: Dispatching verifyOTP with userId:', registeredUserId);
    const result = await dispatch(verifyOTP({ phone, otp: otpString, password, userId: registeredUserId }));
        if (loginAndVerifyUser.rejected.match(result)) {
          setOTPError(result.error.message || 'Login and verification failed after OTP.');
          setAuthStatus('');
        }
      } else {
        setOTPError(lastError || 'Failed to verify OTP. Please try again.');
        setAuthStatus('');
      }
    } catch (err: any) {
      setOTPError(err.message || 'Failed to verify OTP. Please try again.');
      setAuthStatus('');
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
        // Default to SMS if no channel is set (e.g., first load)
        await startFirebaseSMSAuth();
      }
    } catch (error) {
      setOTPError('Failed to resend OTP. Please try again.');
      setAuthStatus('');
    }
  };

  // Render step indicator (adapted from CreateListingScreen)
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => ( // 3 steps for sign up
        <View key={step} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
            ]}
          >
            <Text
              style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}
            >
              {step}
            </Text>
          </View>
          {step < 3 && ( // Only show line between steps
            <View
              style={[
                styles.stepLine,
                currentStep > step && styles.stepLineActive,
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  // Render Step 1: Personal Information & Address
  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text variant="h2" weight="bold" style={styles.stepTitle}>Personal Details</Text>
      <Text variant="body" style={styles.stepSubtitle}>Tell us about yourself</Text>

      <View style={styles.inputGroup}>
        <Text variant="label" weight="medium" style={styles.inputLabel}>Full Name *</Text>
        <TextInput
          style={[styles.input, nameError ? styles.inputError : null]}
          placeholder="Enter your full name"
          placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
          value={name}
          onChangeText={handleNameChange}
          autoCapitalize="words"
          autoCorrect={false}
          editable={!isSigningUp}
        />
        {nameError ? <Text variant="caption" style={styles.errorText}>{nameError}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <Text variant="label" weight="medium" style={styles.inputLabel}>Phone Number *</Text>
        <TextInput
          style={[styles.input, phoneError ? styles.inputError : null]}
          placeholder="Enter your 10-digit phone number"
          placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
          value={phone}
          onChangeText={handlePhoneChange}
          keyboardType="phone-pad"
          maxLength={10}
          editable={!isSigningUp && !isValidatingPhone}
        />
        {phoneError ? <Text variant="caption" style={styles.errorText}>{phoneError}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <Text variant="label" weight="medium" style={styles.inputLabel}>Email Address (Optional)</Text>
        <TextInput
          style={[styles.input, emailError ? styles.inputError : null]}
          placeholder="Enter your email"
          placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
          value={email}
          onChangeText={handleEmailChange}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSigningUp}
        />
        {emailError ? <Text variant="caption" style={styles.errorText}>{emailError}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <Text variant="label" weight="medium" style={styles.inputLabel}>Address *</Text>
        <TextInput
          style={[styles.input, addressError ? styles.inputError : null]}
          placeholder="Street Address"
          placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
          value={street}
          onChangeText={(text) => handleAddressChange('street', text)}
          editable={!isSigningUp}
        />
        <View style={styles.addressRow}>
          <TextInput
            style={[styles.input, styles.addressInputHalf, addressError ? styles.inputError : null]}
            placeholder="City"
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
            value={city}
            onChangeText={(text) => handleAddressChange('city', text)}
            editable={!isSigningUp}
          />
          <TextInput
            style={[styles.input, styles.addressInputHalf, addressError ? styles.inputError : null]}
            placeholder="State"
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
            value={state}
            onChangeText={(text) => handleAddressChange('state', text)}
            editable={!isSigningUp}
          />
        </View>
        <View style={styles.addressRow}>
          <TextInput
            style={[styles.input, styles.addressInputHalf, addressError ? styles.inputError : null]}
            placeholder="Zip Code"
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
            value={zipCode}
            onChangeText={(text) => handleAddressChange('zipCode', text)}
            keyboardType="numeric"
            editable={!isSigningUp}
          />
          <TextInput
            style={[styles.input, styles.addressInputHalf, addressError ? styles.inputError : null]}
            placeholder="Country"
            placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
            value={country}
            onChangeText={(text) => handleAddressChange('country', text)}
            editable={!isSigningUp}
          />
        </View>
        {addressError ? <Text variant="caption" style={styles.errorText}>{addressError}</Text> : null}

        <TouchableOpacity
          style={[styles.locationButton, isGettingLocation && styles.locationButtonLoading]}
          onPress={handleGetCurrentLocation}
          disabled={isGettingLocation}
        >
          {isGettingLocation ? (
            <Text style={styles.locationButtonText}>Fetching Location...</Text>
          ) : (
            <View style={styles.locationButtonContent}>
              <Ionicons name="locate-outline" size={20} color={COLORS.NEUTRAL.WHITE} />
              <Text style={styles.locationButtonText}>Get Current Location</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Step 2: Password Setting
  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text variant="h2" weight="bold" style={styles.stepTitle}>Set Your Password</Text>
      <Text variant="body" style={styles.stepSubtitle}>Create a strong password for your account</Text>

      <View style={styles.inputGroup}>
        <Text variant="label" weight="medium" style={styles.inputLabel}>Password *</Text>
        <TextInput
          style={[styles.input, passwordError ? styles.inputError : null]}
          placeholder="Create a secure password"
          placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
          value={password}
          onChangeText={handlePasswordChange}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSigningUp}
        />
        {passwordError ? <Text variant="caption" style={styles.errorText}>{passwordError}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <Text variant="label" weight="medium" style={styles.inputLabel}>Confirm Password *</Text>
        <TextInput
          style={[styles.input, confirmPasswordError ? styles.inputError : null]}
          placeholder="Confirm your password"
          placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
          value={confirmPassword}
          onChangeText={handleConfirmPasswordChange}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSigningUp}
        />
        {confirmPasswordError ? <Text variant="caption" style={styles.errorText}>{confirmPasswordError}</Text> : null}
      </View>
    </View>
  );

  // Render Step 3: OTP Verification
  const renderStep3 = () => (
    <View style={[styles.stepContent, styles.step3Content]}>
      <Text variant="h2" weight="bold" style={styles.stepTitle}>Verify Phone Number</Text>
      <Text variant="body" style={styles.stepSubtitle}>Enter the 6-digit code sent to {phone}</Text>

      {/* Status and Error Display */}
      <View style={styles.statusContainer}>
        {authStatus && (
          <Text variant="body" style={styles.statusText}>
            {authStatus}
          </Text>
        )}
        {otpError && (
          <Text variant="caption" style={styles.errorText}>
            {otpError}
          </Text>
        )}
      </View>

      {/* OTP Input Grid */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => { inputRefs.current[index] = ref; }}
            style={[
              styles.otpInput,
              otpError ? styles.otpInputError : null,
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

      {/* Verify Button */}
      <Button
        title="Verify & Create Account"
        onPress={handleVerifyOTP}
        loading={isVerifyingOTP}
        fullWidth
        style={styles.verifyButton}
      />

      {/* Resend OTP Link */}
      <TouchableOpacity
        style={styles.resendContainer}
        onPress={handleResendOTP}
        disabled={isVerifyingOTP}
      >
        <Text variant="caption" style={styles.resendText}>
          Didn't receive the code? <Text style={styles.resendLink}>Resend</Text>
        </Text>
      </TouchableOpacity>

      {/* WhatsApp OTP Link */}
      <TouchableOpacity
        style={styles.whatsappContainer}
        onPress={handleWhatsAppOTP}
        disabled={isVerifyingOTP || isWhatsAppLoading}
      >
        <Text variant="caption" style={styles.whatsappText}>
          Receive OTP on WhatsApp
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text variant="h3" weight="bold" style={styles.headerTitle}>
            Sign Up
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {currentStep > 1 && (
              <Button
                title="Back"
                onPress={handleBack}
                fullWidth
                style={styles.secondaryButton}
                textStyle={styles.secondaryButtonText}
              />
            )}
            {currentStep < 3 && (
              <Button
                title="Next"
                onPress={handleNext}
                loading={isSigningUp || isValidatingPhone || isGettingLocation}
                fullWidth
                style={styles.primaryButton}
                textStyle={styles.primaryButtonText}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.LG,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.NEUTRAL.GRAY[300],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  stepNumberActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.NEUTRAL.GRAY[300],
    marginHorizontal: SPACING.SM,
  },
  stepLineActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING['4XL'],
  },
  stepContent: {
    padding: SPACING.LG,
  },
  stepTitle: {
    color: COLORS.PRIMARY.MAIN,
    marginBottom: SPACING.SM,
  },
  stepSubtitle: {
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.XL,
  },
  inputGroup: {
    marginBottom: SPACING.LG,
  },
  inputLabel: {
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    fontSize: 16,
    color: COLORS.TEXT.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    ...SHADOWS.SM,
  },
  addressInput: {
    marginTop: SPACING.SM,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.SM,
    gap: SPACING.SM,
  },
  addressInputHalf: {
    flex: 1,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    marginTop: SPACING.XS,
  },
  locationButton: {
    marginTop: SPACING.MD,
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.MD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.MD,
  },
  locationButtonLoading: {
    opacity: 0.7,
  },
  locationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
  },
  locationButtonText: {
    color: COLORS.NEUTRAL.WHITE,
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  statusContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: BORDER_RADIUS.SM,
    padding: SPACING.SM,
    marginBottom: SPACING.MD,
    alignItems: 'center',
  },
  statusText: {
    color: '#0369A1',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginBottom: SPACING.MD,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: COLORS.BORDER.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    ...SHADOWS.SM,
  },
  otpInputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  verifyButton: {
    marginBottom: SPACING.LG,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: SPACING.MD,
  },
  resendText: {
    color: COLORS.TEXT.SECONDARY,
  },
  resendLink: {
    color: COLORS.PRIMARY.MAIN,
  },
  whatsappContainer: {
    alignItems: 'center',
    marginTop: SPACING.MD,
  },
  whatsappText: {
    color: COLORS.PRIMARY.MAIN,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    gap: SPACING.MD,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.MD,
    alignItems: 'center',
    ...SHADOWS.MD,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.MD,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.SECONDARY,
  },
  step3Content: {
    alignItems: 'center',
  },
});

export default SignUpScreen;