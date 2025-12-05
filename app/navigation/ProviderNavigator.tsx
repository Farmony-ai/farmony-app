import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ProviderScreen from '../screens/Provider/ProviderScreen';
import CreateListingScreen from '../screens/Provider/CreateListingScreen';
import MyListingsScreen from '../screens/Provider/MyListingsScreen';
import ProviderBookingsScreen from '../screens/Provider/ProviderBookingsScreen';
import ProviderServiceRequestDetailScreen from '../screens/Provider/ProviderServiceRequestDetailScreen';

const Stack = createStackNavigator();

const ProviderNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProviderHome" component={ProviderScreen} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} />
      <Stack.Screen name="MyListings" component={MyListingsScreen} />
      <Stack.Screen name="ProviderBookings" component={ProviderBookingsScreen} />
      <Stack.Screen name="ServiceRequestDetail" component={ProviderServiceRequestDetailScreen} />
    </Stack.Navigator>
  );
};

export default ProviderNavigator;
