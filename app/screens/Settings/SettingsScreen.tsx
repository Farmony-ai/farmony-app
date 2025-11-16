import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image, StatusBar } from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { SPACING, FONTS, FONT_SIZES } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { usersAPI } from '../../services/api';
import { setUser, logout } from '../../store/slices/authSlice';

// Ultra-minimal color scheme matching HomeScreen
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
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
};

type SettingRowProps = {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
};

const SettingRow: React.FC<SettingRowProps> = ({ icon, label, subtitle, onPress, isLast }) => (
  <>
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color={COLORS_MINIMAL.text.secondary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingLabel}>{label}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS_MINIMAL.text.muted} />
    </TouchableOpacity>
    {!isLast && <View style={styles.separator} />}
  </>
);

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    try {
      const response = await usersAPI.getProfile(user.id);
      if (response.success && response.data) {
        // Ensure profilePictureUrl is included in the user state
        dispatch(setUser({
          ...response.data,
          id: response.data.id || user.id,
          profilePictureUrl: response.data.profilePictureUrl || null,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchUserProfile();
    setIsRefreshing(false);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
  };

  const currentUser = {
    name: user?.name ?? 'Guest User',
    phone: user?.phone ?? 'No phone number',
    email: user?.email ?? 'No email',
    avatarUrl: user?.profilePictureUrl || null,
    isVerified: user?.isVerified ?? false,
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {currentUser.avatarUrl ? (
        <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Ionicons name="person-outline" size={28} color={COLORS_MINIMAL.text.muted} />
        </View>
      )}
      <View style={styles.headerTextContainer}>
        <View style={styles.nameRow}>
          <Text style={styles.headerName}>{currentUser.name}</Text>
          {currentUser.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS_MINIMAL.accent} />
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitle}>{currentUser.phone}</Text>
      </View>
    </View>
  );

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', onPress: () => navigation.navigate('AccountSettings') },
        { icon: 'location-outline', label: 'Addresses', onPress: () => navigation.navigate('AddressSelection') },
        // Temporarily hidden: Security and Payment Methods
        // { icon: 'shield-checkmark-outline', label: 'Security', onPress: () => {} },
        // { icon: 'card-outline', label: 'Payment Methods', onPress: () => navigation.navigate('PaymentSettings') },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { icon: 'color-palette-outline', label: 'Personalization', onPress: () => navigation.navigate('Personalization') },

      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', onPress: () => navigation.navigate('Help') },
        { icon: 'document-text-outline', label: 'Terms & Privacy', onPress: () => navigation.navigate('Legal') },
        { icon: 'chatbubbles-outline', label: 'Contact Us', onPress: () => {} },
      ],
    },
  ];

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh}
            colors={[COLORS_MINIMAL.accent]}
            tintColor={COLORS_MINIMAL.accent}
          />
        }
      >
        {renderHeader()}

        {sections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, index) => (
                <SettingRow
                  key={item.label}
                  {...item}
                  isLast={index === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={COLORS_MINIMAL.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: COLORS_MINIMAL.background,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS_MINIMAL.border,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerName: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 16,
    color: COLORS_MINIMAL.text.primary,
  },
  headerSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 13,
    color: COLORS_MINIMAL.text.muted,
    marginTop: 2,
  },
  headerEmail: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 12,
    color: COLORS_MINIMAL.text.muted,
    marginTop: 1,
  },
  verifiedBadge: {
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 12,
    padding: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 14,
    color: COLORS_MINIMAL.text.muted,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: COLORS_MINIMAL.background,
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 15,
    color: COLORS_MINIMAL.text.primary,
  },
  settingSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 12,
    color: COLORS_MINIMAL.text.muted,
    marginTop: 1,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS_MINIMAL.divider,
    marginLeft: 52,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS_MINIMAL.dangerLight,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
    gap: 8,
  },
  logoutText: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 15,
    color: COLORS_MINIMAL.danger,
  },
  versionText: {
    textAlign: 'center',
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 12,
    color: COLORS_MINIMAL.text.muted,
    marginTop: 20,
    marginBottom: 10,
  }
});

export default SettingsScreen;