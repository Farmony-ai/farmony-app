
import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Image } from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { usersAPI } from '../../services/api';
import { setUser, logout } from '../../store/slices/authSlice';

// Define a type for a single setting item for clarity and reusability.
type SettingRowProps = {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
};

/**
 * A reusable component to render a single row in a settings list.
 * This component standardizes the appearance of setting items, ensuring consistency.
 * It includes an icon, a label, an optional subtitle, and a chevron to indicate it's tappable.
 */
const SettingRow: React.FC<SettingRowProps> = ({ icon, label, subtitle, onPress }) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress}>
    <Ionicons name={icon} size={24} color={COLORS.PRIMARY.MAIN} style={styles.settingIcon} />
    <View style={styles.settingTextContainer}>
      <Text style={styles.settingLabel}>{label}</Text>
      {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={22} color={COLORS.TEXT.SECONDARY} />
  </TouchableOpacity>
);

/**
 * SettingsScreen
 *
 * This screen serves as the main hub for all user-configurable settings in the app.
 * It fetches the latest user profile data when the screen is focused and provides
 * navigation to various sub-screens for detailed settings management.
 */
const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  /**
   * Fetches the user's profile from the API.
   * This function is called when the screen is focused or when the user performs a pull-to-refresh.
   * It ensures that the displayed data is always up-to-date.
   */
  const fetchUserProfile = async () => {
    if (!user?.id) return;
    try {
      const response = await usersAPI.getProfile(user.id);
      if (response.success && response.data) {
        // Dispatch the fetched user data to update the Redux store.
        dispatch(setUser(response.data));
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Optionally, show a toast or message to the user.
    }
  };

  // useFocusEffect is a hook from React Navigation that runs an effect when the screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  /**
   * Handles the pull-to-refresh action.
   * It sets the refreshing state and calls fetchUserProfile to reload the data.
   */
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchUserProfile();
    setIsRefreshing(false);
  }, []);

  /**
   * Dispatches the logout action to sign the user out of the application.
   */
  const handleLogout = () => {
    dispatch(logout());
  };

  const currentUser = {
    name: user?.name ?? 'Guest User',
    phone: user?.phone ?? 'No phone number',
    email: user?.email ?? 'No email',
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', // Placeholder
    isVerified: user?.isVerified ?? false,
  };

  const renderHeader = () => (
    <TouchableOpacity style={styles.headerContainer} onPress={() => navigation.navigate('AccountSettings')}>
        <Image source={{ uri: currentUser.avatarUrl }} style={styles.avatar} />
      <View style={styles.headerTextContainer}>
        <Text style={styles.headerName}>{currentUser.name}</Text>
        <Text style={styles.headerSubtitle}>{currentUser.phone}</Text>
        {currentUser.isVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.SUCCESS.MAIN} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color={COLORS.TEXT.SECONDARY} />
    </TouchableOpacity>
  );

  const renderSection = (items: SettingRowProps[]) => (
    <View style={styles.sectionCard}>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          <SettingRow {...item} />
          {index < items.length - 1 && <View style={styles.separator} />}
        </React.Fragment>
      ))}
    </View>
  );

  const sections = [
    {
      title: 'Account & Profile',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', subtitle: 'Name, email, phone, bio', onPress: () => navigation.navigate('AccountSettings') },
        { icon: 'location-outline', label: 'Addresses', subtitle: 'Manage your saved addresses', onPress: () => navigation.navigate('AddressSelection') },
        { icon: 'shield-checkmark-outline', label: 'Security', subtitle: 'Change password', onPress: () => {} },
        { icon: 'ribbon-outline', label: 'Verification', subtitle: 'KYC Status', onPress: () => {} },
      ],
    },
    {
      title: 'Personalization',
      items: [
        { icon: 'apps-outline', label: 'Personalization', subtitle: 'Theme, language, preferences', onPress: () => navigation.navigate('Personalization') },
      ],
    },
    {
      title: 'Payments',
      items: [
        { icon: 'card-outline', label: 'Payment Modes', subtitle: 'Manage saved cards, UPI', onPress: () => navigation.navigate('PaymentSettings') },
      ],
    },
    {
      title: 'Help & Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help', subtitle: 'Get support, contact us', onPress: () => navigation.navigate('Help') },
        { icon: 'document-text-outline', label: 'Legal', subtitle: 'Terms of Service, Privacy Policy', onPress: () => navigation.navigate('Legal') },
      ],
    },
    {
        title: 'Advanced',
        items: [
            { icon: 'settings-outline', label: 'Advanced', subtitle: 'Advanced application settings', onPress: () => navigation.navigate('AdvancedSettings') },
        ]
    }
  ];

  return (
    <SafeAreaWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {renderHeader()}
        {sections.map(section => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {renderSection(section.items)}
          </View>
        ))}

        {/* A clear and accessible Sign Out button, placed at the end of the settings list. */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={COLORS.DANGER.MAIN} />
            <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Displaying the app version at the very bottom. */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  contentContainer: {
    paddingVertical: SPACING.LG,
    paddingBottom: 120, // Added extra padding to ensure content is scrollable above the bottom tab bar
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.CARD,
    marginHorizontal: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.SM,
    marginBottom: SPACING.LG,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.NEUTRAL[200],
    marginRight: SPACING.MD,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerName: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: FONT_SIZES.LG,
    color: COLORS.TEXT.PRIMARY,
  },
  headerSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT.SECONDARY,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS.LIGHT,
    borderRadius: BORDER_RADIUS.SM,
    paddingHorizontal: SPACING.XS,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: SPACING.XS,
  },
  verifiedText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: FONT_SIZES.XS,
    color: COLORS.SUCCESS.MAIN,
    marginLeft: SPACING.XS,
  },
  sectionTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: FONT_SIZES.MD,
    color: COLORS.TEXT.PRIMARY,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.SM,
    marginTop: SPACING.MD,
  },
  sectionCard: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    marginHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.SM,
    overflow: 'hidden',
    marginBottom: SPACING.LG,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
  },
  settingIcon: {
    marginRight: SPACING.MD,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: FONT_SIZES.BASE,
    color: COLORS.TEXT.PRIMARY,
  },
  settingSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: FONT_SIZES.SM,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.BORDER.PRIMARY,
    marginLeft: SPACING.MD + 24 + SPACING.MD,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.DANGER.LIGHT,
    marginHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING.XL,
  },
  logoutText: {
      fontFamily: FONTS.POPPINS.SEMIBOLD,
      fontSize: FONT_SIZES.BASE,
      color: COLORS.DANGER.MAIN,
      marginLeft: SPACING.SM,
  },
  versionText: {
      textAlign: 'center',
      fontFamily: FONTS.POPPINS.REGULAR,
      fontSize: FONT_SIZES.SM,
      color: COLORS.TEXT.SECONDARY,
      marginTop: SPACING.LG,
      marginBottom: SPACING.SM,
  }
});

export default SettingsScreen;
