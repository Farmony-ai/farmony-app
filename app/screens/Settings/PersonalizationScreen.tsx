
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { COLORS, SPACING, FONTS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../utils';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setUser, STORAGE_KEYS } from '../../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import apiInterceptor from '../../services/apiInterceptor';
import { usersAPI } from '../../services/api';

// Reusable component for a setting that has multiple options (e.g., radio buttons)
const SelectionRow = ({ icon, label, value, onPress }) => (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
        <Ionicons name={icon} size={24} color={COLORS.PRIMARY.MAIN} style={styles.icon} />
        <View style={styles.textContainer}>
            <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>{value}</Text>
        <Ionicons name="chevron-forward" size={22} color={COLORS.TEXT.SECONDARY} />
    </TouchableOpacity>
);

// Reusable component for a setting that is a toggle switch
const ToggleRow = ({ icon, label, value, onValueChange }) => (
    <View style={styles.settingRow}>
        <Ionicons name={icon} size={24} color={COLORS.PRIMARY.MAIN} style={styles.icon} />
        <View style={styles.textContainer}>
            <Text style={styles.label}>{label}</Text>
        </View>
        <Switch
            trackColor={{ false: COLORS.NEUTRAL[300], true: COLORS.PRIMARY.MAIN }}
            thumbColor={COLORS.NEUTRAL.WHITE}
            onValueChange={onValueChange}
            value={value}
        />
    </View>
);

/**
 * PersonalizationScreen
 *
 * This screen allows the user to customize their experience within the app.
 * It includes options for setting default views, language, theme, and notification preferences.
 * Changes are saved to the backend and reflected locally.
 */
const PersonalizationScreen = () => {
    const dispatch: AppDispatch = useDispatch();
    const navigation = useNavigation();
    const { user } = useSelector((state: RootState) => state.auth);

    // State for each preference, initialized from the Redux store or with default values.
    const [defaultLanding, setDefaultLanding] = useState(user?.preferences?.defaultLandingPage || 'Seeker');
    const [defaultProviderTab, setDefaultProviderTab] = useState(user?.preferences?.defaultProviderTab || 'Active');
    const [language, setLanguage] = useState(user?.preferences?.preferredLanguage || 'English');
    const [theme, setTheme] = useState(user?.preferences?.theme || 'System');
    const [notificationsEnabled, setNotificationsEnabled] = useState(user?.preferences?.notificationsEnabled ?? true);

    /**
     * Persist preferences to server with robust fallbacks
     * 1) PATCH /users/:id/preferences (preferred, if available)
     * 2) PATCH /providers/preferences (current backend documented path)
     * 3) PATCH /users/:id with { preferences }
     * Also updates Redux and stores only `defaultTab` locally for app startup behavior.
     */
    const persistPreferences = async (partialPrefs: Record<string, any>) => {
        try {
            if (!user?.id) return;

            // Create a merged preferences payload from current screen state
            const merged = {
                defaultLandingPage: defaultLanding,
                defaultProviderTab,
                preferredLanguage: language,
                theme,
                notificationsEnabled,
                ...partialPrefs,
            };

            let updatedUser: any = null;

            // 1) Try user-specific preferences endpoint
            const tryUserPrefs = await apiInterceptor.makeAuthenticatedRequest<any>(
                `/users/${user.id}/preferences`,
                {
                    method: 'PATCH',
                    body: JSON.stringify(partialPrefs),
                }
            );
            if (tryUserPrefs.success && (tryUserPrefs.data?.preferences || tryUserPrefs.data?.user)) {
                updatedUser = tryUserPrefs.data?.user || { ...(user as any), preferences: tryUserPrefs.data.preferences };
            }

            // 2) Fallback to providers/preferences if needed
            if (!updatedUser) {
                const tryProviders = await apiInterceptor.makeAuthenticatedRequest<any>(
                    `/providers/preferences`,
                    {
                        method: 'PATCH',
                        body: JSON.stringify(merged),
                    }
                );
                if (tryProviders.success && tryProviders.data) {
                    updatedUser = tryProviders.data.user ? tryProviders.data.user : { ...(user as any), preferences: merged };
                }
            }

            // 3) Final fallback: PATCH user with nested preferences
            if (!updatedUser) {
                const tryUserPatch = await apiInterceptor.makeAuthenticatedRequest<any>(
                    `/users/${user.id}`,
                    {
                        method: 'PATCH',
                        body: JSON.stringify({ preferences: merged }),
                    }
                );
                if (tryUserPatch.success && tryUserPatch.data) {
                    updatedUser = tryUserPatch.data.user ? tryUserPatch.data.user : tryUserPatch.data;
                }
            }

            // Update Redux and persist minimal local state
            if (updatedUser) {
                dispatch(setUser(updatedUser));
                await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser)); // legacy

                // Keep default tab in AsyncStorage for faster startup behavior
                const landing = partialPrefs.defaultLandingPage ?? merged.defaultLandingPage;
                if (landing === 'provider' || landing === 'seeker' || landing === 'Provider' || landing === 'Seeker') {
                    // Normalize casing to the app's expectation
                    const normalized = (landing as string).toLowerCase() === 'provider' ? 'provider' : 'seeker';
                    await AsyncStorage.setItem('defaultTab', normalized);
                }
            }
        } catch (err) {
            console.log('Failed to persist preferences:', err);
        }
    };

    // Handlers for changing each preference → send to server and update local state
    const handleLandingChange = async (value) => {
        setDefaultLanding(value);
        await persistPreferences({ defaultLandingPage: value });
    };

    const handleProviderTabChange = async (value) => {
        setDefaultProviderTab(value);
        await persistPreferences({ defaultProviderTab: value });
    };

    const handleLanguageChange = async (value) => {
        setLanguage(value);
        await persistPreferences({ preferredLanguage: value });
    };

    const handleThemeChange = async (value) => {
        setTheme(value);
        await persistPreferences({ theme: value });
    };

    const handleNotificationsChange = async (value) => {
        setNotificationsEnabled(value);
        await persistPreferences({ notificationsEnabled: value });
    };

    return (
        <SafeAreaWrapper>
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Personalization</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Personalization</Text>
                    <Text style={styles.subtitle}>Customize your app experience.</Text>
                </View>

                <View style={styles.section}>
                    <SelectionRow
                        icon="apps-outline"
                        label="Default Landing Page"
                        value={defaultLanding}
                        onPress={() => handleLandingChange(defaultLanding === 'Seeker' ? 'Provider' : 'Seeker')}
                    />
                    <SelectionRow
                        icon="briefcase-outline"
                        label="Default Provider Tab"
                        value={defaultProviderTab}
                        onPress={() => handleProviderTabChange(
                            defaultProviderTab === 'Active' ? 'Completed' : defaultProviderTab === 'Completed' ? 'Review' : 'Active'
                        )}
                    />
                    <SelectionRow
                        icon="language-outline"
                        label="Language"
                        value={language}
                        onPress={() => handleLanguageChange(language === 'English' ? 'Telugu' : language === 'Telugu' ? 'Hindi' : 'English')}
                    />
                    <SelectionRow
                        icon="color-palette-outline"
                        label="Appearance"
                        value={theme}
                        onPress={() => handleThemeChange(theme === 'Light' ? 'Dark' : theme === 'Dark' ? 'System' : 'Light')}
                    />
                    <ToggleRow
                        icon="notifications-outline"
                        label="Notifications"
                        value={notificationsEnabled}
                        onValueChange={handleNotificationsChange}
                    />
                </View>
            </ScrollView>
        </SafeAreaWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND.PRIMARY,
    },
    header: {
        padding: SPACING.MD,
        marginBottom: SPACING.SM,
    },
    title: {
        fontFamily: FONTS.POPPINS.BOLD,
        fontSize: FONT_SIZES.XL,
        color: COLORS.TEXT.PRIMARY,
    },
    subtitle: {
        fontFamily: FONTS.POPPINS.REGULAR,
        fontSize: FONT_SIZES.BASE,
        color: COLORS.TEXT.SECONDARY,
    },
    section: {
        backgroundColor: COLORS.BACKGROUND.CARD,
        borderRadius: BORDER_RADIUS.LG,
        marginHorizontal: SPACING.MD,
        ...SHADOWS.SM,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.MD,
        paddingVertical: SPACING.MD,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.BORDER.PRIMARY,
    },
    icon: {
        marginRight: SPACING.MD,
    },
    textContainer: {
        flex: 1,
    },
    label: {
        fontFamily: FONTS.POPPINS.MEDIUM,
        fontSize: FONT_SIZES.BASE,
        color: COLORS.TEXT.PRIMARY,
    },
    value: {
        fontFamily: FONTS.POPPINS.REGULAR,
        fontSize: FONT_SIZES.BASE,
        color: COLORS.TEXT.SECONDARY,
        marginRight: SPACING.XS,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.MD,
        paddingVertical: SPACING.SM,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.BORDER.PRIMARY,
    },
    headerTitle: {
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        fontSize: FONT_SIZES.LG,
        color: COLORS.TEXT.PRIMARY,
    },
});

export default PersonalizationScreen;
