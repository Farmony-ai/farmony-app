import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { checkAuth } from '../store/slices/authSlice';

// Screens
import SplashScreen from '../screens/SplashScreen';
import AuthScreen from '../screens/AuthScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import BottomTabNavigator from './BottomTabNavigator';

import CategoryBrowserScreen from '../screens/CategoryBrowserScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import ListingsScreen from '../screens/ListingsScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';

import OrderDetailScreen from '../screens/OrderDetailScreen';
import ChatScreen from '../screens/ChatScreen';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../utils';
import CreateListingScreen from '../screens/CreateListingScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import AddressSelectionScreen from '../screens/AddressSelectionScreen';
import AddAddressScreen from '../screens/AddAddressScreen';
import PaymentSelectionScreen from '../screens/PaymentSelectionScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import AccountSettingsScreen from '../screens/Settings/AccountSettingsScreen';
import PersonalizationScreen from '../screens/Settings/PersonalizationScreen';
import PaymentSettingsScreen from '../screens/Settings/PaymentSettingsScreen';
import HelpScreen from '../screens/Settings/HelpScreen';
import LegalScreen from '../screens/Settings/LegalScreen';
import AdvancedSettingsScreen from '../screens/Settings/AdvancedSettingsScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const dispatch: AppDispatch = useDispatch();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check auth while splash is showing
    dispatch(checkAuth());
    
    // Hide splash after minimum display time
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [dispatch]);

  // Show splash screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Show loading after splash if still checking auth
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={BottomTabNavigator} />
            {/* Add other main app screens here if they are not part of the tab navigator */}
            
            <Stack.Screen name="CategoryBrowser" component={CategoryBrowserScreen} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
            {/* <Stack.Screen name="Listings" component={ListingsScreen} /> */}
            <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
            
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="CreateListing" component={CreateListingScreen} />
            <Stack.Screen name="MyListings" component={MyListingsScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
            <Stack.Screen name="AddressSelection" component={AddressSelectionScreen} />
            <Stack.Screen name="AddAddress" component={AddAddressScreen} />
            <Stack.Screen name="PaymentSelection" component={PaymentSelectionScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen name="Personalization" component={PersonalizationScreen} />
            <Stack.Screen name="PaymentSettings" component={PaymentSettingsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Legal" component={LegalScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
});

export default RootNavigator;