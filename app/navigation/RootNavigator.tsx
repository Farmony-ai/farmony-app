import React, { useEffect, useState, forwardRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { checkAuth } from '../store/slices/authSlice';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS } from '../utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigation
import BottomTabNavigator from './BottomTabNavigator';

// Utility Screens
import SplashScreen from '../screens/Utility/SplashScreen';

// Auth Screens
import InfoScreen from '../screens/Auth/InfoScreen';
import SignInScreen from '../screens/Auth/SignInScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import OTPVerificationScreen from '../screens/Auth/OTPVerificationScreen';

// Seeker Screens
import CategoryBrowserScreen from '../screens/Seeker/CategoryBrowserScreen';
import ListingDetailScreen from '../screens/Seeker/ListingDetailScreen';
import CheckoutScreen from '../screens/Seeker/CheckoutScreen';
import PaymentSelectionScreen from '../screens/Seeker/PaymentSelectionScreen';
import SeekerOrderDetailScreen from '../screens/Seeker/SeekerOrderDetailScreen';

// Provider Screens
import CreateListingScreen from '../screens/Provider/CreateListingScreen';
import MyListingsScreen from '../screens/Provider/MyListingsScreen';
import AvailableRequestsScreen from '../screens/Provider/AvailableRequestsScreen';

// Bookings Screens
import OrderDetailScreen from '../screens/Bookings/OrderDetailScreen';

// Address Screens
import AddressSelectionScreen from '../screens/Address/AddressSelectionScreen';
import AddAddressScreen from '../screens/Address/AddAddressScreen';

// Chat Screens
import ChatScreen from '../screens/Chat/ChatScreen';

// Service Request Screens
import CreateServiceRequestScreen from '../screens/ServiceRequests/CreateServiceRequestScreen';
import MyServiceRequestsScreen from '../screens/ServiceRequests/MyServiceRequestsScreen';
import ServiceRequestDetailsScreen from '../screens/ServiceRequests/ServiceRequestDetailsScreen';

// Settings Screens
import SettingsScreen from '../screens/Settings/SettingsScreen';
import AccountSettingsScreen from '../screens/Settings/AccountSettingsScreen';
import PersonalizationScreen from '../screens/Settings/PersonalizationScreen';
import PaymentSettingsScreen from '../screens/Settings/PaymentSettingsScreen';
import HelpScreen from '../screens/Settings/HelpScreen';
import LegalScreen from '../screens/Settings/LegalScreen';

const Stack = createStackNavigator();

const RootNavigator = forwardRef<NavigationContainerRef<any>>((_, ref) => {
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
        <NavigationContainer ref={ref}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <>
                        <Stack.Screen name="Main" component={BottomTabNavigator} />
                        <Stack.Screen name="CategoryBrowser" component={CategoryBrowserScreen} />
                        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
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
                        <Stack.Screen name="Info" component={InfoScreen} />
                        <Stack.Screen name="SignIn" component={SignInScreen} />
                        <Stack.Screen name="SignUp" component={SignUpScreen} />
                        <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
});

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.BACKGROUND.PRIMARY,
    },
});

export default RootNavigator;
