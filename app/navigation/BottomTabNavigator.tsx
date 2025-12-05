import React, { useEffect, useState } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/Seeker/HomeScreen';
import ProviderNavigator from './ProviderNavigator';
import Text from '../components/Text';
import { COLORS, FONTS } from '../utils';
import { RootState } from '../store';

import BookingsScreen from '../screens/Bookings/BookingsScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
    const [defaultTab, setDefaultTab] = useState<'seeker' | 'provider'>('seeker');
    const [isLoading, setIsLoading] = useState(true);
    const unreadCount = useSelector((state: RootState) => state.notifications.unreadCount);

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
        return null;
    }

    return (
        <Tab.Navigator
            initialRouteName={defaultTab === 'provider' ? 'Provider' : 'Seeker'}
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: Platform.OS === 'ios' ? 90 : 75,
                    backgroundColor: COLORS.NEUTRAL.WHITE || '#FFFFFF',
                    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
                    paddingTop: 15,
                    borderTopWidth: 0,
                    // Subtle shadow for depth/z-index effect
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: {
                        width: 0,
                        height: -3,
                    },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                },
            }}>
            <Tab.Screen
                name="Seeker"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ focused }) => renderIcon('search', 'Seeker', focused),
                }}
            />
            <Tab.Screen
                name="Provider"
                component={ProviderNavigator}
                options={{
                    tabBarIcon: ({ focused }) => renderIcon('briefcase', 'Provider', focused),
                }}
            />
            <Tab.Screen
                name="Bookings"
                component={BookingsScreen}
                options={{
                    tabBarIcon: ({ focused }) => renderIcon('calendar', 'Bookings', focused),
                }}
            />
            <Tab.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                    tabBarIcon: ({ focused }) => renderIconWithBadge('notifications', 'Alerts', focused, unreadCount),
                }}
            />
            <Tab.Screen
                name="Profile"
                component={SettingsScreen}
                options={{
                    tabBarIcon: ({ focused }) => renderIcon('person', 'Settings', focused),
                }}
            />
        </Tab.Navigator>
    );
}

function renderIcon(iconName: string, label: string, focused: boolean) {
    // Simplified icon mapping
    const iconMap: { [key: string]: string } = {
        search: 'home',
        briefcase: 'briefcase-outline',
        calendar: 'calendar-outline',
        notifications: 'notifications-outline',
        person: 'person-outline',
    };

    const activeIconMap: { [key: string]: string } = {
        search: 'home',
        briefcase: 'briefcase',
        calendar: 'calendar',
        notifications: 'notifications',
        person: 'person',
    };

    return (
        <View
            style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 8,
                minWidth: 60,
            }}>
            <Ionicons
                name={(focused ? activeIconMap[iconName] : iconMap[iconName]) as any}
                size={24}
                color={focused ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY || '#9CA3AF'}
                style={{ marginBottom: 4 }}
            />
            <Text
                style={{
                    fontSize: 11,
                    fontFamily: FONTS?.POPPINS?.MEDIUM || 'System',
                    color: focused ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY || '#9CA3AF',
                    textAlign: 'center',
                    opacity: focused ? 1 : 0.7,
                }}>
                {label}
            </Text>
        </View>
    );
}

function renderIconWithBadge(iconName: string, label: string, focused: boolean, badgeCount: number) {
    const iconMap: { [key: string]: string } = {
        notifications: 'notifications-outline',
    };

    const activeIconMap: { [key: string]: string } = {
        notifications: 'notifications',
    };

    return (
        <View
            style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: 8,
                minWidth: 60,
            }}>
            <View style={styles.iconContainer}>
                <Ionicons
                    name={(focused ? activeIconMap[iconName] : iconMap[iconName]) as any}
                    size={24}
                    color={focused ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY || '#9CA3AF'}
                />
                {badgeCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                    </View>
                )}
            </View>
            <Text
                style={{
                    fontSize: 11,
                    fontFamily: FONTS?.POPPINS?.MEDIUM || 'System',
                    color: focused ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY || '#9CA3AF',
                    textAlign: 'center',
                    marginTop: 4,
                    opacity: focused ? 1 : 0.7,
                }}>
                {label}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    iconContainer: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -5,
        right: -10,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
