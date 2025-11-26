import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { checkAuth } from '../store/slices/authSlice';

// Screens
import SplashScreen from '../screens/SplashScreen';
import InfoScreen from '../screens/InfoScreen';
import AuthScreen from '../screens/AuthScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import OTPVerificationScreen from '../screens/OTPVerificationScreen';
import BottomTabNavigator from './BottomTabNavigator';

import CategoryBrowserScreen from '../screens/CategoryBrowserScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import SearchResultsScreen from '../screens/SearchResultsScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import SeekerOrderDetailScreen from '../screens/SeekerOrderDetailScreen';
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
// Service Request Screens
import CreateServiceRequestScreen from '../screens/CreateServiceRequestScreen';
import MyServiceRequestsScreen from '../screens/MyServiceRequestsScreen';
import AvailableRequestsScreen from '../screens/AvailableRequestsScreen';
import ServiceRequestDetailsScreen from '../screens/ServiceRequestDetailsScreen';
import AccountSettingsScreen from '../screens/Settings/AccountSettingsScreen';
import PersonalizationScreen from '../screens/Settings/PersonalizationScreen';
import PaymentSettingsScreen from '../screens/Settings/PaymentSettingsScreen';
import HelpScreen from '../screens/Settings/HelpScreen';
import LegalScreen from '../screens/Settings/LegalScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const dispatch: AppDispatch = useDispatch();
  const [showSplash, setShowSplash] = useState(true);
  const [hasSeenInfo, setHasSeenInfo] = useState<boolean | null>(null);

  useEffect(() => {
    // Check auth and info screen status while splash is showing
    const initialize = async () => {
      dispatch(checkAuth());
      
      // Check if user has seen info screen before
      try {
        const seenInfo = await AsyncStorage.getItem('hasSeenInfoScreen');
        setHasSeenInfo(seenInfo === 'true');
      } catch (error) {
        setHasSeenInfo(false);
      }
    };

    initialize();
    
    // Hide splash after minimum display time
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [dispatch]);

  // Show splash screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Show loading after splash if still checking auth or info status
  if (isLoading || hasSeenInfo === null) {
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
            <Stack.Screen name="CategoryBrowser" component={CategoryBrowserScreen} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
            <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
            <Stack.Screen name="SeekerOrderDetail" component={SeekerOrderDetailScreen} />
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
            {/* Service Request Screens */}
            <Stack.Screen name="CreateServiceRequest" component={CreateServiceRequestScreen} />
            <Stack.Screen name="MyServiceRequests" component={MyServiceRequestsScreen} />
            <Stack.Screen name="AvailableRequests" component={AvailableRequestsScreen} />
            <Stack.Screen name="ServiceRequestDetails" component={ServiceRequestDetailsScreen} />
          </>
        ) : (
          <>
            {/* Show InfoScreen first if user hasn't seen it */}
            
              <Stack.Screen name="Info" component={InfoScreen} />
           
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
            {/* Removed ForgotPassword as per requirements */}
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