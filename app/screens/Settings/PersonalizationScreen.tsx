import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, StatusBar } from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { SPACING, FONTS, FONT_SIZES } from '../../utils';
import { scaleFontSize, scaleSize } from '../../utils/fonts';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setUser, STORAGE_KEYS } from '../../store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import apiInterceptor from '../../services/apiInterceptor';

// Ultra-minimal color scheme
const COLORS_MINIMAL = {
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: {
        primary: '#000000',
        secondary: '#4A5568',
        muted: '#A0AEC0',
    },
    accent: '#10B981',
    border: '#E2E8F0',
    divider: '#F1F5F9',
};

const SelectionRow = ({ icon, label, value, onPress, isLast = false }: any) => (
    <>
        <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={scaleSize(20)} color={COLORS_MINIMAL.text.secondary} />
                </View>
                <Text style={styles.label}>{label}</Text>
            </View>
            <View style={styles.rowRight}>
                <Text style={styles.value}>{value}</Text>
                <Ionicons name="chevron-forward" size={scaleSize(18)} color={COLORS_MINIMAL.text.muted} />
            </View>
        </TouchableOpacity>
        {!isLast && <View style={styles.separator} />}
    </>
);

const ToggleRow = ({ icon, label, value, onValueChange, isLast = false, description = '' }: any) => (
    <>
        <View style={styles.settingRow}>
            <View style={styles.rowLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon} size={scaleSize(20)} color={COLORS_MINIMAL.text.secondary} />
                </View>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>{label}</Text>
                    {description ? <Text style={styles.labelDescription}>{description}</Text> : null}
                </View>
            </View>
            <Switch
                trackColor={{ false: COLORS_MINIMAL.border, true: COLORS_MINIMAL.accent }}
                thumbColor={COLORS_MINIMAL.background}
                onValueChange={onValueChange}
                value={value}
                style={styles.switch}
            />
        </View>
        {!isLast && <View style={styles.separator} />}
    </>
);

const PersonalizationScreen = () => {
    const dispatch: AppDispatch = useDispatch();
    const navigation = useNavigation();
    const { user } = useSelector((state: RootState) => state.auth);

    // Helper to capitalize first letter for display
    const capitalize = (str: string) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : str);

    const [defaultLanding, setDefaultLanding] = useState(capitalize(user?.preferences?.defaultLandingPage || 'seeker'));
    const [defaultProviderTab, setDefaultProviderTab] = useState(capitalize(user?.preferences?.defaultProviderTab || 'active'));
    const [language, setLanguage] = useState(user?.preferences?.preferredLanguage || 'English');
    const [theme, setTheme] = useState(user?.preferences?.theme || 'Light');
    const [notificationsEnabled, setNotificationsEnabled] = useState(user?.preferences?.notificationsEnabled ?? true);

    // Granular notification preferences
    const notifPrefs = user?.preferences?.notificationPreferences || {};
    const [serviceRequestUpdates, setServiceRequestUpdates] = useState(notifPrefs.serviceRequestUpdates ?? true);
    const [newOpportunities, setNewOpportunities] = useState(notifPrefs.newOpportunities ?? true);
    const [orderStatusUpdates, setOrderStatusUpdates] = useState(notifPrefs.orderStatusUpdates ?? true);
    const [paymentUpdates, setPaymentUpdates] = useState(notifPrefs.paymentUpdates ?? true);
    const [reviewUpdates, setReviewUpdates] = useState(notifPrefs.reviewUpdates ?? true);

    const persistPreferences = async (partialPrefs: Record<string, any>) => {
        try {
            if (!user?.id) return;

            const merged = {
                defaultLandingPage: defaultLanding,
                defaultProviderTab,
                preferredLanguage: language,
                theme,
                notificationsEnabled,
                notificationPreferences: {
                    serviceRequestUpdates,
                    newOpportunities,
                    orderStatusUpdates,
                    paymentUpdates,
                    reviewUpdates,
                },
                ...partialPrefs,
            };

            let updatedUser: any = null;

            const tryUserPrefs = await apiInterceptor.makeAuthenticatedRequest<any>(`/users/${user.id}/preferences`, {
                method: 'PATCH',
                body: JSON.stringify(partialPrefs),
            });
            if (tryUserPrefs.success && (tryUserPrefs.data?.preferences || tryUserPrefs.data?.user)) {
                updatedUser = tryUserPrefs.data?.user || { ...(user as any), preferences: tryUserPrefs.data.preferences };
            }

            if (!updatedUser) {
                const tryProviders = await apiInterceptor.makeAuthenticatedRequest<any>(`/providers/preferences`, {
                    method: 'PATCH',
                    body: JSON.stringify(merged),
                });
                if (tryProviders.success && tryProviders.data) {
                    updatedUser = tryProviders.data.user ? tryProviders.data.user : { ...(user as any), preferences: merged };
                }
            }

            if (!updatedUser) {
                const tryUserPatch = await apiInterceptor.makeAuthenticatedRequest<any>(`/users/${user.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ preferences: merged }),
                });
                if (tryUserPatch.success && tryUserPatch.data) {
                    updatedUser = tryUserPatch.data.user ? tryUserPatch.data.user : tryUserPatch.data;
                }
            }

            if (updatedUser) {
                dispatch(setUser(updatedUser));
                await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
                await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

                const landing = partialPrefs.defaultLandingPage ?? merged.defaultLandingPage;
                if (landing === 'provider' || landing === 'seeker' || landing === 'Provider' || landing === 'Seeker') {
                    const normalized = (landing as string).toLowerCase() === 'provider' ? 'provider' : 'seeker';
                    await AsyncStorage.setItem('defaultTab', normalized);
                }
            }
        } catch (err) {
            console.log('Failed to persist preferences:', err);
        }
    };

    const handleLandingChange = async (value: string) => {
        setDefaultLanding(value);
        await persistPreferences({ defaultLandingPage: value.toLowerCase() });
    };

    const handleProviderTabChange = async (value: string) => {
        setDefaultProviderTab(value);
        await persistPreferences({ defaultProviderTab: value.toLowerCase() });
    };

    const handleLanguageChange = async (value: string) => {
        setLanguage(value);
        await persistPreferences({ preferredLanguage: value });
    };

    const handleThemeChange = async (value: string) => {
        setTheme(value);
        await persistPreferences({ theme: value });
    };

    const handleNotificationsChange = async (value: boolean) => {
        setNotificationsEnabled(value);
        await persistPreferences({ notificationsEnabled: value });
    };

    // Handlers for granular notification preferences
    const handleServiceRequestUpdatesChange = async (value: boolean) => {
        setServiceRequestUpdates(value);
        await persistPreferences({
            notificationPreferences: {
                serviceRequestUpdates: value,
                newOpportunities,
                orderStatusUpdates,
                paymentUpdates,
                reviewUpdates,
            },
        });
    };

    const handleNewOpportunitiesChange = async (value: boolean) => {
        setNewOpportunities(value);
        await persistPreferences({
            notificationPreferences: {
                serviceRequestUpdates,
                newOpportunities: value,
                orderStatusUpdates,
                paymentUpdates,
                reviewUpdates,
            },
        });
    };

    const handleOrderStatusUpdatesChange = async (value: boolean) => {
        setOrderStatusUpdates(value);
        await persistPreferences({
            notificationPreferences: {
                serviceRequestUpdates,
                newOpportunities,
                orderStatusUpdates: value,
                paymentUpdates,
                reviewUpdates,
            },
        });
    };

    const handlePaymentUpdatesChange = async (value: boolean) => {
        setPaymentUpdates(value);
        await persistPreferences({
            notificationPreferences: {
                serviceRequestUpdates,
                newOpportunities,
                orderStatusUpdates,
                paymentUpdates: value,
                reviewUpdates,
            },
        });
    };

    const handleReviewUpdatesChange = async (value: boolean) => {
        setReviewUpdates(value);
        await persistPreferences({
            notificationPreferences: {
                serviceRequestUpdates,
                newOpportunities,
                orderStatusUpdates,
                paymentUpdates,
                reviewUpdates: value,
            },
        });
    };

    return (
        <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={scaleSize(24)} color={COLORS_MINIMAL.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Personalization</Text>
                <View style={{ width: scaleSize(24) }} />
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
                <View style={styles.heroSection}>
                    <View style={styles.heroIcon}>
                        <Ionicons name="color-palette-outline" size={scaleSize(32)} color={COLORS_MINIMAL.accent} />
                    </View>
                    <Text style={styles.heroTitle}>Customize your experience</Text>
                    <Text style={styles.heroSubtitle}>Adjust settings to make the app work better for you</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App Behavior</Text>
                    <View style={styles.card}>
                        <SelectionRow
                            icon="apps-outline"
                            label="Default Landing"
                            value={defaultLanding}
                            onPress={() => handleLandingChange(defaultLanding === 'Seeker' ? 'Provider' : 'Seeker')}
                        />
                        <SelectionRow
                            icon="briefcase-outline"
                            label="Provider Tab"
                            value={defaultProviderTab}
                            onPress={() =>
                                handleProviderTabChange(
                                    defaultProviderTab === 'Active'
                                        ? 'Completed'
                                        : defaultProviderTab === 'Completed'
                                          ? 'Review'
                                          : 'Active',
                                )
                            }
                            isLast
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Display</Text>
                    <View style={styles.card}>
                        <SelectionRow
                            icon="language-outline"
                            label="Language"
                            value={language}
                            onPress={() =>
                                handleLanguageChange(language === 'English' ? 'Telugu' : language === 'Telugu' ? 'Hindi' : 'English')
                            }
                        />
                        <SelectionRow
                            icon="moon-outline"
                            label="Theme"
                            value={theme}
                            onPress={() => handleThemeChange(theme === 'Light' ? 'Dark' : theme === 'Dark' ? 'System' : 'Light')}
                            isLast
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <View style={styles.card}>
                        <ToggleRow
                            icon="notifications-outline"
                            label="Push Notifications"
                            description="Master toggle for all notifications"
                            value={notificationsEnabled}
                            onValueChange={handleNotificationsChange}
                            isLast
                        />
                    </View>
                </View>

                {/* Granular notification preferences - only show if master toggle is on */}
                {notificationsEnabled && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notification Types</Text>
                        <View style={styles.card}>
                            <ToggleRow
                                icon="checkmark-circle-outline"
                                label="Request Updates"
                                description="When your service requests are accepted or expired"
                                value={serviceRequestUpdates}
                                onValueChange={handleServiceRequestUpdatesChange}
                            />
                            <ToggleRow
                                icon="flash-outline"
                                label="New Opportunities"
                                description="New service requests matching your services"
                                value={newOpportunities}
                                onValueChange={handleNewOpportunitiesChange}
                            />
                            <ToggleRow
                                icon="time-outline"
                                label="Order Status"
                                description="Updates when orders start or complete"
                                value={orderStatusUpdates}
                                onValueChange={handleOrderStatusUpdatesChange}
                            />
                            <ToggleRow
                                icon="cash-outline"
                                label="Payment Updates"
                                description="When you receive payments"
                                value={paymentUpdates}
                                onValueChange={handlePaymentUpdatesChange}
                            />
                            <ToggleRow
                                icon="star-outline"
                                label="Reviews"
                                description="When you receive new reviews"
                                value={reviewUpdates}
                                onValueChange={handleReviewUpdatesChange}
                                isLast
                            />
                        </View>
                    </View>
                )}

                <View style={styles.tipSection}>
                    <View style={styles.tipIcon}>
                        <Ionicons name="bulb-outline" size={scaleSize(20)} color={COLORS_MINIMAL.accent} />
                    </View>
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>Pro tip</Text>
                        <Text style={styles.tipText}>
                            Keep "New Opportunities" enabled to never miss a service request in your area
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaWrapper>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS_MINIMAL.background,
    },
    contentContainer: {
        paddingBottom: scaleSize(100),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(16),
        backgroundColor: COLORS_MINIMAL.background,
    },
    headerTitle: {
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        fontSize: scaleFontSize(18),
        color: COLORS_MINIMAL.text.primary,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: scaleSize(32),
        paddingHorizontal: scaleSize(20),
    },
    heroIcon: {
        width: scaleSize(64),
        height: scaleSize(64),
        borderRadius: scaleSize(32),
        backgroundColor: `${COLORS_MINIMAL.accent}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scaleSize(16),
    },
    heroTitle: {
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        fontSize: scaleFontSize(20),
        color: COLORS_MINIMAL.text.primary,
        marginBottom: scaleSize(8),
    },
    heroSubtitle: {
        fontFamily: FONTS.POPPINS.REGULAR,
        fontSize: scaleFontSize(14),
        color: COLORS_MINIMAL.text.muted,
        textAlign: 'center',
    },
    section: {
        marginBottom: scaleSize(24),
    },
    sectionTitle: {
        fontFamily: FONTS.POPPINS.MEDIUM,
        fontSize: scaleFontSize(14),
        color: COLORS_MINIMAL.text.muted,
        marginBottom: scaleSize(8),
        paddingHorizontal: scaleSize(20),
    },
    card: {
        backgroundColor: COLORS_MINIMAL.background,
        marginHorizontal: scaleSize(20),
        borderRadius: scaleSize(12),
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: scaleSize(14),
        paddingHorizontal: scaleSize(4),
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scaleSize(8),
    },
    iconContainer: {
        width: scaleSize(36),
        height: scaleSize(36),
        borderRadius: scaleSize(10),
        backgroundColor: COLORS_MINIMAL.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scaleSize(12),
    },
    labelContainer: {
        flex: 1,
    },
    label: {
        fontFamily: FONTS.POPPINS.MEDIUM,
        fontSize: scaleFontSize(15),
        color: COLORS_MINIMAL.text.primary,
    },
    labelDescription: {
        fontFamily: FONTS.POPPINS.REGULAR,
        fontSize: scaleFontSize(12),
        color: COLORS_MINIMAL.text.muted,
        marginTop: scaleSize(2),
    },
    value: {
        fontFamily: FONTS.POPPINS.REGULAR,
        fontSize: scaleFontSize(14),
        color: COLORS_MINIMAL.text.secondary,
    },
    separator: {
        height: 1,
        backgroundColor: COLORS_MINIMAL.divider,
        marginLeft: scaleSize(52),
    },
    switch: {
        transform: [{ scale: 0.9 }],
    },
    tipSection: {
        flexDirection: 'row',
        backgroundColor: `${COLORS_MINIMAL.accent}10`,
        marginHorizontal: scaleSize(20),
        marginTop: scaleSize(8),
        marginBottom: scaleSize(24),
        padding: scaleSize(16),
        borderRadius: scaleSize(12),
    },
    tipIcon: {
        marginRight: scaleSize(12),
        marginTop: scaleSize(2),
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        fontSize: scaleFontSize(14),
        color: COLORS_MINIMAL.text.primary,
        marginBottom: scaleSize(4),
    },
    tipText: {
        fontFamily: FONTS.POPPINS.REGULAR,
        fontSize: scaleFontSize(13),
        color: COLORS_MINIMAL.text.secondary,
        lineHeight: scaleSize(18),
    },
});

export default PersonalizationScreen;
