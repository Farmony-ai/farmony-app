import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch, StatusBar } from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { SPACING, FONTS, FONT_SIZES } from '../../utils';
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

const SelectionRow = ({ icon, label, value, onPress, isLast = false }) => (
  <>
    <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color={COLORS_MINIMAL.text.secondary} />
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.value}>{value}</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS_MINIMAL.text.muted} />
      </View>
    </TouchableOpacity>
    {!isLast && <View style={styles.separator} />}
  </>
);

const ToggleRow = ({ icon, label, value, onValueChange, isLast = false }) => (
  <>
    <View style={styles.settingRow}>
      <View style={styles.rowLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color={COLORS_MINIMAL.text.secondary} />
        </View>
        <Text style={styles.label}>{label}</Text>
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

  const [defaultLanding, setDefaultLanding] = useState(user?.preferences?.defaultLandingPage || 'Seeker');
  const [defaultProviderTab, setDefaultProviderTab] = useState(user?.preferences?.defaultProviderTab || 'Active');
  const [language, setLanguage] = useState(user?.preferences?.preferredLanguage || 'English');
  const [theme, setTheme] = useState(user?.preferences?.theme || 'Light');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.preferences?.notificationsEnabled ?? true);

  const persistPreferences = async (partialPrefs: Record<string, any>) => {
    try {
      if (!user?.id) return;

      const merged = {
        defaultLandingPage: defaultLanding,
        defaultProviderTab,
        preferredLanguage: language,
        theme,
        notificationsEnabled,
        ...partialPrefs,
      };

      let updatedUser: any = null;

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
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={COLORS_MINIMAL.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personalization</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="color-palette-outline" size={32} color={COLORS_MINIMAL.accent} />
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
              onPress={() => handleProviderTabChange(
                defaultProviderTab === 'Active' ? 'Completed' : defaultProviderTab === 'Completed' ? 'Review' : 'Active'
              )}
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
              onPress={() => handleLanguageChange(language === 'English' ? 'Telugu' : language === 'Telugu' ? 'Hindi' : 'English')}
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
              value={notificationsEnabled}
              onValueChange={handleNotificationsChange}
              isLast
            />
          </View>
        </View>

        <View style={styles.tipSection}>
          <View style={styles.tipIcon}>
            <Ionicons name="bulb-outline" size={20} color={COLORS_MINIMAL.accent} />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Pro tip</Text>
            <Text style={styles.tipText}>
              Choose "Provider" as your default landing if you frequently offer services
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS_MINIMAL.background,
  },
  headerTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 18,
    color: COLORS_MINIMAL.text.primary,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${COLORS_MINIMAL.accent}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 20,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 14,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 14,
    color: COLORS_MINIMAL.text.muted,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: COLORS_MINIMAL.background,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS_MINIMAL.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 15,
    color: COLORS_MINIMAL.text.primary,
  },
  value: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 14,
    color: COLORS_MINIMAL.text.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS_MINIMAL.divider,
    marginLeft: 52,
  },
  switch: {
    transform: [{ scale: 0.9 }],
  },
  tipSection: {
    flexDirection: 'row',
    backgroundColor: `${COLORS_MINIMAL.accent}10`,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  tipIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 14,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 4,
  },
  tipText: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 13,
    color: COLORS_MINIMAL.text.secondary,
    lineHeight: 18,
  },
});

export default PersonalizationScreen;