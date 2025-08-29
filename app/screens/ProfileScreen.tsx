import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
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
// Removed direct ProviderService usage for preferences; using centralized API interceptor
import { useEffect } from 'react';
import { usersAPI, ordersAPI } from '../services/api';
import apiInterceptor from '../services/apiInterceptor';
import { setUser, STORAGE_KEYS } from '../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import type { ProviderDashboardResponse } from '../services/ProviderService';

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
  const [preferredLanguage, setPreferredLanguage] = useState<'en' | 'te' | 'hi'>('en');
  // Align with backend: 'active' | 'completed' | 'review'
  const [defaultProviderTab, setDefaultProviderTab] = useState<'active' | 'completed' | 'review'>('active');
  const [fetchedUser, setFetchedUser] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [providerDashboard, setProviderDashboard] = useState<ProviderDashboardResponse | null>(null);
  const [seekerBookingsCount, setSeekerBookingsCount] = useState<number>(0);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState<boolean>(false);
  const [editedEmail, setEditedEmail] = useState<string>('');

  const { user } = useSelector((state: RootState) => state.auth);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // Fetch fresh user profile, provider dashboard, and seeker bookings count
  const refreshUser = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      if (!user?.id) return;

      // Get latest profile using centralized API (auto-handles token refresh)
      const profileRes = await usersAPI.getProfile(user.id);
      if (profileRes?.success && profileRes.data) {
        setFetchedUser(profileRes.data);
        // Sync local UI preferences with server values so screen reflects actual settings
        const prefs = (profileRes.data as any)?.preferences || {};
        const serverDefaultLanding: any = prefs.defaultLandingPage;
        if (serverDefaultLanding === 'seeker' || serverDefaultLanding === 'provider') {
          setDefaultTab(serverDefaultLanding);
          // Persist locally so next app start respects server preference
          try { await AsyncStorage.setItem('defaultTab', serverDefaultLanding); } catch {}
        }
        const serverProviderTab: any = prefs.defaultProviderTab;
        if (serverProviderTab === 'active' || serverProviderTab === 'completed' || serverProviderTab === 'review') {
          setDefaultProviderTab(serverProviderTab);
        }
        const serverLang: any = prefs.preferredLanguage;
        if (serverLang === 'en' || serverLang === 'te' || serverLang === 'hi') {
          setPreferredLanguage(serverLang);
        }
        if (typeof prefs.notificationsEnabled === 'boolean') {
          setNotificationsEnabled(prefs.notificationsEnabled);
        }
      }

      // Provider dashboard (provider-focused stats). Use interceptor directly for predictable shape
      const dashboardRes = await apiInterceptor.makeAuthenticatedRequest<ProviderDashboardResponse>(
        `/providers/${user.id}/dashboard`,
        { method: 'GET' }
      );
      if (dashboardRes.success && dashboardRes.data) {
        setProviderDashboard(dashboardRes.data as ProviderDashboardResponse);
      } else {
        setProviderDashboard(null);
      }

      // Seeker bookings count (simple length of orders array)
      const seekerRes = await ordersAPI.getBySeeker(user.id);
      if (seekerRes?.success && Array.isArray(seekerRes.data)) {
        setSeekerBookingsCount((seekerRes.data as any[]).length);
      } else {
        setSeekerBookingsCount(0);
      }
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

  // Local preferences payload aligned to backend
  type PreferencesPayload = {
    defaultLandingPage: 'seeker' | 'provider';
    defaultProviderTab: 'active' | 'completed' | 'review' | string;
    preferredLanguage: string;
    notificationsEnabled: boolean;
  };

  const persistPreferences = async (partial: Partial<PreferencesPayload>) => {
    try {
      const existing = {
        defaultLandingPage: defaultTab,
        defaultProviderTab,
        preferredLanguage,
        notificationsEnabled,
      };
      const payload: PreferencesPayload = { ...existing, ...partial };

      let updatedUser: any = null;

      // 1) Preferred: update only preferences via /users/:id/preferences
      if (user?.id) {
        const prefsRes = await apiInterceptor.makeAuthenticatedRequest<any>(
          `/users/${user.id}/preferences`,
          {
            method: 'PATCH',
            body: JSON.stringify(partial), // send only what changed
          }
        );

        if (prefsRes.success && (prefsRes.data?.preferences || prefsRes.data?.user)) {
          // If API returns just preferences, merge them into the latest user object
          if (prefsRes.data?.preferences) {
            const baseUser = fetchedUser || user;
            updatedUser = { ...(baseUser as any), preferences: prefsRes.data.preferences };
          } else {
            updatedUser = prefsRes.data.user ? prefsRes.data.user : prefsRes.data;
          }
        }
      }

      // 2) Fallback: existing providers/preferences endpoint (kept to avoid breaking current flows)
      if (!updatedUser) {
        const res = await apiInterceptor.makeAuthenticatedRequest<any>(
          `/providers/preferences`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          }
        );
        if (res.success && res.data) {
          updatedUser = (res.data.user) ? res.data.user : res.data;
        }
      }

      // 3) Final fallback: PATCH /users/:id with preferences nested
      if (!updatedUser && user?.id) {
        const userPatch = await apiInterceptor.makeAuthenticatedRequest<any>(
          `/users/${user.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ preferences: payload }),
          }
        );
        if (userPatch.success && userPatch.data) {
          updatedUser = userPatch.data.user ? userPatch.data.user : userPatch.data;
        }
      }

      if (updatedUser) {
        // Update global auth.user and persist
        dispatch(setUser(updatedUser));
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser)); // legacy
        setFetchedUser(updatedUser);
      }
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

  // Language selection UI removed as requested. We keep local state only for reading server prefs.

  const providerTabs: Array<{ key: 'active' | 'completed' | 'review'; label: string }> = [
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'review', label: 'To Review' },
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
        { icon: 'person-outline', label: 'Edit Profile', onPress: openEditModal },
        { icon: 'call-outline', label: 'Phone Number', value: (fetchedUser?.phone || user?.phone) || 'N/A' },
        { icon: 'mail-outline', label: 'Email', value: (fetchedUser?.email || user?.email) || 'N/A' },
        { icon: 'location-outline', label: 'Address', onPress: () => navigation.navigate('AddressSelection') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'albums-outline', label: 'Default Provider Tab', value: providerTabLabel, onPress: cycleProviderTab },
        {
          icon: 'notifications-outline',
          label: 'Notifications',
          toggle: true,
          toggleValue: notificationsEnabled,
           onToggle: onToggleNotifications,
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

  // Derived stats for the header stats row
  const providerSummary = providerDashboard?.summary;
  const providerBookings = providerSummary?.totalBookings ?? 0;
  const providerActiveListings = providerSummary?.activeListings ?? 0;
  const providerRating = providerSummary?.averageRating ?? 0;
  const providerTotalRatings = providerSummary?.totalRatings ?? 0;
  const hasProviderStats = !!providerSummary && (
    (providerSummary.totalBookings ?? 0) > 0 ||
    (providerSummary.activeListings ?? 0) > 0 ||
    (providerSummary.totalRatings ?? 0) > 0
  );

  const bookingsStatValue = hasProviderStats ? providerBookings : seekerBookingsCount;
  const listingsStatValue = hasProviderStats ? providerActiveListings : 0;
  const ratingStatValue = hasProviderStats ? providerRating : 0;

  // Prepare edit modal with current name
  function openEditModal() {
    const currentName = (fetchedUser?.name || user?.name) || '';
    setEditedName(currentName);
    const currentEmail = (fetchedUser?.email || user?.email) || '';
    setEditedEmail(currentEmail);
    setIsEditOpen(true);
  }

  // Simple and readable email validation: allow empty, otherwise must look like an email
  const isEmailValid = (email: string) => {
    if (!email) return true;
    const trimmed = email.trim();
    // Very relaxed check: one @ and at least one dot after
    return /.+@.+\..+/.test(trimmed);
  };

  const saveName = async () => {
    const trimmed = editedName.trim();
    const emailTrimmed = editedEmail.trim();
    if (!trimmed || trimmed.length < 2) {
      return;
    }
    if (!isEmailValid(emailTrimmed)) {
      return;
    }
    if (!user?.id) return;
    try {
      setIsSavingName(true);
      const res = await apiInterceptor.makeAuthenticatedRequest<any>(
        `/users/${user.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ name: trimmed, email: emailTrimmed }),
        }
      );
      if (res.success && res.data) {
        let updatedUser = res.data.user ? res.data.user : res.data;
        // If server ignored email in combined update, try updating email alone as a safe fallback
        if (emailTrimmed && updatedUser && (updatedUser.email ?? '') !== emailTrimmed) {
          const emailOnly = await apiInterceptor.makeAuthenticatedRequest<any>(
            `/users/${user.id}`,
            {
              method: 'PATCH',
              body: JSON.stringify({ email: emailTrimmed }),
            }
          );
          if (emailOnly.success && emailOnly.data) {
            updatedUser = emailOnly.data.user ? emailOnly.data.user : emailOnly.data;
          }
        }

        // As a final truth source, refetch the profile so UI and storage reflect DB
        const fresh = await usersAPI.getProfile(user.id);
        const finalUser = fresh?.success && fresh.data ? fresh.data : updatedUser;
        if (finalUser) {
          dispatch(setUser(finalUser));
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(finalUser));
          await AsyncStorage.setItem('user', JSON.stringify(finalUser));
          setFetchedUser(finalUser);
          setIsEditOpen(false);
        }
      }
    } catch (e) {
      // Non-blocking; could show toast
    } finally {
      setIsSavingName(false);
    }
  };

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
            {(fetchedUser?.name || user?.name) || 'John Doe'}
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
              onPress={openEditModal}
              style={styles.quickActionButton}
              textStyle={styles.quickActionText}
            />
            <Button
              title="Bookings"
              size="small"
              variant="outline"
              leftIcon={<Ionicons name="book-outline" size={16} color={COLORS.PRIMARY.MAIN} />}
              onPress={() => navigation.navigate('Bookings')}
              style={styles.quickActionButton}
              textStyle={styles.quickActionText}
            />
            <Button
              title="Listings"
              size="small"
              variant="outline"
              leftIcon={<Ionicons name="briefcase-outline" size={16} color={COLORS.PRIMARY.MAIN} />}
              onPress={() => navigation.navigate('MyListings')}
              style={styles.quickActionButton}
              textStyle={styles.quickActionText}
            />
          </View>

          {/* Stats Row */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{bookingsStatValue}</Text>
              <Text style={styles.statLabel}>Bookings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{listingsStatValue}</Text>
              <Text style={styles.statLabel}>Listings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{ratingStatValue}</Text>
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

      {/* Edit Profile Modal */}
      <Modal visible={isEditOpen} transparent animationType="fade" onRequestClose={() => setIsEditOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Your name"
              placeholderTextColor={COLORS.TEXT.SECONDARY}
              style={styles.modalInput}
            />
            <TextInput
              value={editedEmail}
              onChangeText={setEditedEmail}
              placeholder="Email (optional)"
              placeholderTextColor={COLORS.TEXT.SECONDARY}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setIsEditOpen(false)}
                style={[styles.modalButton, { marginRight: 8 }]}
              />
              <Button
                title={isSavingName ? 'Saving...' : 'Save'}
                onPress={saveName}
                disabled={
                  isSavingName ||
                  editedName.trim().length < 2 ||
                  (!(!editedEmail || /.+@.+\..+/.test(editedEmail.trim())))
                }
                style={styles.modalButton}
                leftIcon={isSavingName ? <ActivityIndicator size={16} color={COLORS.NEUTRAL.WHITE} /> : undefined}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.MD,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.LG,
    ...SHADOWS.MD,
  },
  modalTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER.SECONDARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.MD,
    paddingVertical: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    minWidth: 100,
  },
});

export default ProfileScreen;