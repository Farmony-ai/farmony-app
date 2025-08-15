import React, { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import ProviderNavigator from './ProviderNavigator';
import Text from '../components/Text'; // Custom Text component
import { COLORS, BORDER_RADIUS, SHADOWS } from '../utils'; // Your theme constants

import ProfileScreen from '../screens/ProfileScreen';
import BookingsScreen from '../screens/BookingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Tab = createBottomTabNavigator();

// Removed unused placeholder screen

export default function BottomTabNavigator() {
  const [defaultTab, setDefaultTab] = useState<'seeker' | 'provider'>('seeker');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const savedTab = await AsyncStorage.getItem('defaultTab');
        if (savedTab === 'provider') {
          setDefaultTab('provider');
        }
      } catch (error) {
        console.error('Error loading tab preference:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreference();
  }, []);

  if (isLoading) {
    return null; // Or loading spinner
  }

  return (
    <Tab.Navigator
      initialRouteName={defaultTab === 'provider' ? 'Provider' : 'Seeker'}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,    // Flush with bottom
          left: 0,      // Full width
          right: 0,     // Full width
          height: 75,
          borderTopLeftRadius: BORDER_RADIUS.XL || 30,   // Only top corners rounded
          borderTopRightRadius: BORDER_RADIUS.XL || 30,  // Only top corners rounded
          backgroundColor: COLORS.BACKGROUND.NAV,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 12,
          
          ...SHADOWS.MD,
          borderTopWidth: 0,
          elevation: 8,
        },
      }}
    >
      <Tab.Screen name="Seeker" component={HomeScreen} options={{ tabBarIcon: ({ focused }) => renderIcon('search-outline', 'Seeker', focused) }} />
      <Tab.Screen name="Provider" component={ProviderNavigator} options={{ tabBarIcon: ({ focused }) => renderIcon('briefcase-outline', 'Provider', focused) }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ tabBarIcon: ({ focused }) => renderIcon('calendar-outline', 'Bookings', focused) }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarIcon: ({ focused }) => renderIcon('notifications-outline', 'Notifications', focused) }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => renderIcon('person-outline', 'Profile', focused) }} />
    </Tab.Navigator>
  );
}

function renderIcon(iconName: string, label: string, focused: boolean) {
  const wrapperStyle = {
    flexDirection: 'column' as const,
    backgroundColor: focused ? COLORS.PRIMARY.MAIN : 'transparent',
    paddingHorizontal: focused ? 5 : 0,
    paddingVertical: focused ? 2 : 0,
    borderRadius: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: focused ? 100 : undefined,
    maxHeight: 60,
    minHeight: 60,
    marginLeft: 5,
    alignSelf: 'center' as const,
  };
  const labelStyle = {
    color: COLORS.BACKGROUND.NAV,
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600' as const,
  };
  return (
    <View style={wrapperStyle}>
      <Ionicons
        name={iconName as any}
        size={20}
        color={focused ? COLORS.BACKGROUND.NAV : COLORS.TEXT.SECONDARY}
      />
      {focused && <Text style={labelStyle}>{label}</Text>}
    </View>
  );
}
