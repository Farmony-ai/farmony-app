import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProviderScreen from '../screens/ProviderScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import MyListingsScreen from '../screens/MyListingsScreen';
import ProviderBookingsScreen from '../screens/ProviderBookingsScreen';
import ServiceRequestDetailScreen from '../screens/ServiceRequestDetailScreen';

const Stack = createStackNavigator();

const ProviderNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderHome" component={ProviderScreen} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} />
      <Stack.Screen name="ProviderBookings" component={ProviderBookingsScreen} />
      <Stack.Screen name="ServiceRequestDetail" component={ServiceRequestDetailScreen} />
    </Stack.Navigator>
  );
};

export default ProviderNavigator;