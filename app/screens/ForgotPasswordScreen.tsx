import React, { useState } from 'react';
import { View, StyleSheet, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import Button from '../components/Button';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils';
import { isRequired } from '../utils/validators';
import { startForgotPassword, clearError } from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';
import { checkPhoneExists } from '../services/api';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { isLoading, error } = useSelector((state: RootState) => state.auth);

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const validate = async () => {
    if (!isRequired(phone)) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (phone.length < 10) {
      setPhoneError('Enter a valid phone number (10 digits)');
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
    if (!(await validate())) return;
    dispatch(clearError());
    dispatch(startForgotPassword(phone));
    navigation.navigate('OTPVerification');
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text variant="h2" weight="bold" style={styles.title}>Sign in with OTP</Text>
          <Text variant="body" style={styles.subtitle}>
            Enter your registered phone number to receive an OTP
          </Text>

          <View style={styles.inputContainer}>
            <Text variant="label" weight="medium" style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[styles.input, phoneError ? styles.inputError : null]}
              placeholder="Enter your phone number"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={text => {
                setPhone(text);
                if (phoneError) setPhoneError('');
              }}
              editable={!isLoading && !isValidating}
            />
            {phoneError ? (
              <Text variant="caption" style={styles.errorText}>
                {phoneError}
              </Text>
            ) : null}
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text variant="caption" style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button 
            title={isValidating ? "Validating..." : "Send OTP"} 
            onPress={handleSubmit} 
            loading={isLoading || isValidating} 
            fullWidth 
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: SPACING.LG, justifyContent: 'center' },
  backButton: {
    position: 'absolute',
    top: SPACING.LG,
    left: SPACING.LG,
  },
  backImage: {
    width: 24,
    height: 24,
  },
  title: { color: COLORS.PRIMARY.MAIN, marginBottom: SPACING.MD, textAlign: 'center' },
  subtitle: { color: COLORS.TEXT.SECONDARY, marginBottom: SPACING.XL, textAlign: 'center' },
  inputContainer: { marginBottom: SPACING.LG },
  inputLabel: { color: COLORS.TEXT.PRIMARY, marginBottom: SPACING.SM },
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
  inputError: { borderColor: '#EF4444' },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: BORDER_RADIUS.SM,
    padding: SPACING.SM,
    marginBottom: SPACING.MD,
  },
  errorText: { color: '#EF4444' },
});

export default ForgotPasswordScreen; 