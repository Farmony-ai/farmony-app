import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES, getColorWithOpacity } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ImagePickerService, { ImagePickerResult } from '../services/ImagePickerService';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../components/Button';

import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logout } from '../store/slices/authSlice';
import ProviderService, { ProviderPreferencesPayload } from '../services/ProviderService';
import { useEffect } from 'react';
import UserService, { UserProfile } from '../services/UserService';

type ProfileSectionItem = {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
};

type ProfileSection = {
  title: string;
  items: ProfileSectionItem[];
};

const ProfileScreen = () => {
  const dispatch: AppDispatch = useDispatch();
  const [defaultTab, setDefaultTab] = useState<'seeker' | 'provider'>('seeker');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileImage, setProfileImage] = useState<ImagePickerResult | null>(null);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'te' | 'hi'>('en');
  const [defaultProviderTab, setDefaultProviderTab] = useState<'active' | 'inactive' | 'all'>('active');
  const [fetchedUser, setFetchedUser] = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const insets = useSafeAreaInsets();

  // Fetch fresh user profile on mount to reflect latest server data
  const refreshUser = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const token = await AsyncStorage.getItem('token');
      if (!user?.id) return;
      const result = await UserService.getUserById(user.id, token || undefined);
      setFetchedUser(result);
    } catch (e) {
      // Non-blocking
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onRefresh = () => refreshUser(true);

  const handleTabPreferenceChange = async (tab: 'seeker' | 'provider') => {
    setDefaultTab(tab);
    await AsyncStorage.setItem('defaultTab', tab);
    await persistPreferences({ defaultLandingPage: tab });
  };

  const persistPreferences = async (partial: Partial<ProviderPreferencesPayload>) => {
    try {
      const token = (await AsyncStorage.getItem('token')) || undefined;
      const existing = {
        defaultLandingPage: defaultTab,
        defaultProviderTab,
        preferredLanguage,
        notificationsEnabled,
      };
      const payload: ProviderPreferencesPayload = { ...existing, ...partial };
      await ProviderService.updatePreferences(payload, token);
    } catch (e) {
      console.log('Failed to update preferences', e);
    }
  };

  const onToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await persistPreferences({ notificationsEnabled: value });
  };

  const openAvatarPicker = async () => {
    const onSuccess = (image: ImagePickerResult) => setProfileImage(image);
    const onError = () => {};
    ImagePickerService.showImagePickerOptions(
      () => ImagePickerService.openCamera(onSuccess, onError),
      () => ImagePickerService.openGallery(onSuccess, onError, false),
      () => {}
    );
  };

  const languages: Array<{ code: 'en' | 'te' | 'hi'; label: string }> = [
    { code: 'en', label: 'English' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'hi', label: 'हिंदी' },
  ];

  const languageLabel = languages.find(l => l.code === preferredLanguage)?.label || 'English';

  const cycleLanguage = async () => {
    const idx = languages.findIndex(l => l.code === preferredLanguage);
    const next = languages[(idx + 1) % languages.length].code;
    setPreferredLanguage(next);
    await persistPreferences({ preferredLanguage: next });
  };

  const providerTabs: Array<{ key: 'active' | 'inactive' | 'all'; label: string }> = [
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
    { key: 'all', label: 'All' },
  ];

  const providerTabLabel = providerTabs.find(t => t.key === defaultProviderTab)?.label || 'Active';

  const cycleProviderTab = async () => {
    const idx = providerTabs.findIndex(t => t.key === defaultProviderTab);
    const next = providerTabs[(idx + 1) % providerTabs.length].key;
    setDefaultProviderTab(next);
    await persistPreferences({ defaultProviderTab: next });
  };

  const profileSections: ProfileSection[] = [
    {
      title: 'Account Settings',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', onPress: () => {} },
        { icon: 'call-outline', label: 'Phone Number', value: (fetchedUser?.phone || user?.phone) || 'N/A' },
        { icon: 'mail-outline', label: 'Email', value: (fetchedUser?.email || user?.email) || 'N/A' },
        { icon: 'location-outline', label: 'Address', onPress: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'language-outline', label: 'Language', value: languageLabel, onPress: cycleLanguage },
        { icon: 'albums-outline', label: 'Default Provider Tab', value: providerTabLabel, onPress: cycleProviderTab },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          toggle: true,
          toggleValue: notificationsEnabled,
           onToggle: onToggleNotifications,
        },
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          toggle: true,
          toggleValue: darkModeEnabled,
           onToggle: setDarkModeEnabled,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', onPress: () => {} },
        { icon: 'chatbubble-outline', label: 'Contact Us', onPress: () => {} },
        { icon: 'document-text-outline', label: 'Terms & Conditions', onPress: () => {} },
        { icon: 'shield-checkmark-outline', label: 'Privacy Policy', onPress: () => {} },
      ],
    },
  ];

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.PRIMARY.MAIN]}
          />
        }
      >
        {/* Gradient Header */}
        <LinearGradient
          colors={[COLORS.PRIMARY.MAIN, COLORS.PRIMARY.DARK]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.headerGradient,
            {
              marginLeft: -insets.left,
              marginRight: -insets.right,
            },
          ]}
        >
          {/* Decorative shapes */}
          <View style={styles.headerBlobOne} />
          <View style={styles.headerBlobTwo} />
          <View style={styles.headerTopRow}>
            <Text color={COLORS.TEXT.INVERSE} style={styles.headerTitle}>Profile</Text>
          </View>
          <View style={[{paddingLeft: SPACING.MD + insets.left, paddingRight: SPACING.MD + insets.right}]}>
          <Text color={COLORS.TEXT.INVERSE} style={styles.headerSubtitle}>
            Manage your account and preferences
          </Text></View>
        </LinearGradient>

        {/* Profile Card (overlapping) */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarRing}>
              {profileImage ? (
                <Image source={{ uri: profileImage.uri }} style={styles.profileImage} />
              ) : (
                <Ionicons name="person-circle" size={96} color={COLORS.PRIMARY.MAIN} />
              )}
            </View>
            <TouchableOpacity style={styles.cameraButton} onPress={openAvatarPicker}>
              <Ionicons name="camera" size={16} color={COLORS.PRIMARY.MAIN} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>
            {user?.name || 'John Doe'}
          </Text>
          <View style={styles.roleChip}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.roleChipText}>
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Rural Service Provider'}
            </Text>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsRow}>
            <Button
              title="Edit Profile"
              size="small"
              variant="outline"
              leftIcon={<Ionicons name="create-outline" size={16} color={COLORS.PRIMARY.MAIN} />}
              onPress={() => {}}
              style={styles.quickActionButton}
              textStyle={styles.quickActionText}
            />
            <Button
              title="Bookings"
              size="small"
              variant="outline"
              leftIcon={<Ionicons name="book-outline" size={16} color={COLORS.PRIMARY.MAIN} />}
              onPress={() => {}}
              style={styles.quickActionButton}
              textStyle={styles.quickActionText}
            />
            <Button
              title="Listings"
              size="small"
              variant="outline"
              leftIcon={<Ionicons name="briefcase-outline" size={16} color={COLORS.PRIMARY.MAIN} />}
              onPress={() => {}}
              style={styles.quickActionButton}
              textStyle={styles.quickActionText}
            />
          </View>

          {/* Stats Row */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>5</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </View>

        {/* Default Tab Preference */}
         <View style={styles.preferenceCard}>
          <Text style={styles.preferenceTitle}>
            Default Landing Page
          </Text>
          <Text style={styles.preferenceDescription}>
            Choose which page to show when you open the app
          </Text>
          
          <View style={styles.tabOptions}>
            <TouchableOpacity
              style={[styles.tabOption, defaultTab === 'seeker' && styles.tabOptionActive]}
              onPress={() => handleTabPreferenceChange('seeker')}
            >
              <View style={styles.tabOptionContent}>
                <Ionicons 
                  name="search-outline" 
                  size={20} 
                  color={defaultTab === 'seeker' ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY} 
                  style={styles.tabOptionIcon}
                />
                <View style={styles.tabOptionTextContainer}>
                  <Text 
                    style={[
                      styles.tabOptionText,
                      defaultTab === 'seeker' && styles.tabOptionTextActive
                    ]}
                  >
                    Service Seeker
                  </Text>
                  <Text style={styles.tabOptionSubtext}>
                    Find services & equipment
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabOption, defaultTab === 'provider' && styles.tabOptionActive]}
              onPress={() => handleTabPreferenceChange('provider')}
            >
              <View style={styles.tabOptionContent}>
                <Ionicons 
                  name="briefcase-outline" 
                  size={20} 
                  color={defaultTab === 'provider' ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY} 
                  style={styles.tabOptionIcon}
                />
                <View style={styles.tabOptionTextContainer}>
                  <Text 
                    style={[
                      styles.tabOptionText,
                      defaultTab === 'provider' && styles.tabOptionTextActive
                    ]}
                  >
                    Service Provider
                  </Text>
                  <Text style={styles.tabOptionSubtext}>
                    Offer your services
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>


        {/* Settings Sections */}
        {profileSections.map((section, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.sectionTitle}>
              {section.title}
            </Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex < section.items.length - 1 && styles.settingItemBorder,
                  ]}
                  onPress={item.onPress}
                  disabled={!item.onPress && !item.toggle}
                >
                  <View style={styles.settingItemLeft}>
                    <View style={styles.iconContainer}>
                      <Ionicons name={item.icon} size={18} color={COLORS.PRIMARY.MAIN} />
                    </View>
                    <Text style={styles.settingLabel}>
                      {item.label}
                    </Text>
                  </View>
                  <View style={styles.settingItemRight}>
                    {item.value && (
                      <Text style={styles.settingValue}>
                        {item.value}
                      </Text>
                    )}
                    {item.toggle && (
                      <Switch
                        value={item.toggleValue ?? false}
                        onValueChange={(value) => item.onToggle?.(value)}
                        trackColor={{ false: COLORS.NEUTRAL.GRAY[300], true: COLORS.PRIMARY.LIGHT }}
                        thumbColor={COLORS.PRIMARY.MAIN}
                      />
                    )}
                    {item.onPress && (
                      <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT.SECONDARY} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={() => dispatch(logout())}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.NEUTRAL.WHITE} />
          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

         {/* App Version */}
        <Text style={styles.version}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: SPACING['4XL'],
  },
  headerGradient: {
    height: 140,
    width: '100%',
    justifyContent: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBlobOne: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: getColorWithOpacity(COLORS.PRIMARY.CONTRAST, 0.08),
    top: -40,
    right: -30,
  },
  headerBlobTwo: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: getColorWithOpacity(COLORS.SECONDARY.CONTRAST, 0.06),
    bottom: -30,
    left: -20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
  },
  headerTitle: {
    fontSize: FONT_SIZES['XL'],
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    opacity: 0.9,
    fontWeight: '500',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.SECONDARY.MAIN,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: getColorWithOpacity(COLORS.NEUTRAL.WHITE, 0.12),
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.LG,
    marginTop: -34,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.MD,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 54,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY.LIGHT,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: BORDER_RADIUS.FULL,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.MD,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.BACKGROUND.CARD,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.BORDER.SECONDARY,
    ...SHADOWS.MD,
  },
  userName: {
    fontSize: FONT_SIZES.XL,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.XS,
    textAlign: 'center',
  },
  roleChip: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: 6,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: 999,
  },
  roleChipText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  quickActionsRow: {
    marginTop: SPACING.MD,
    flexDirection: 'row',
    gap: SPACING.SM,
  },
  statsCard: {
    marginTop: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND.CARD,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.LG,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.LG,
    ...SHADOWS.SM,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.XS,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.BORDER.PRIMARY,
    marginHorizontal: SPACING.SM,
  },
  statValue: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    lineHeight: 22,
  },
  statLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    lineHeight: 16,
  },
  quickActionButton: {
    flex: 1,
    borderColor: COLORS.BORDER.SECONDARY,
  },
  quickActionText: {
    fontSize: 13,
  },
   preferenceCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.LG,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.SM,
  },
  preferenceTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.XS,
  },
  preferenceDescription: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.MD,
  },
  tabOptions: {
    gap: SPACING.SM,
  },
  tabOption: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.SECONDARY,
  },
  tabOptionActive: {
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  tabOptionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tabOptionIcon: {
    marginRight: SPACING.SM,
    marginTop: 2,
  },
  tabOptionTextContainer: {
    flex: 1,
  },
  tabOptionText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  tabOptionTextActive: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.PRIMARY.MAIN,
  },
  tabOptionSubtext: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
  },
  sectionCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    marginHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.SM,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderRadius: BORDER_RADIUS.MD,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.SM,
  },
  settingLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    flex: 1,
  },
  settingValue: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN,
    marginHorizontal: SPACING.MD,
    marginVertical: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.MD,
  },
  logoutText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.NEUTRAL.WHITE,
    marginLeft: 8,
  },
  version: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
});

export default ProfileScreen;