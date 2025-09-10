import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Text from '../../components/Text';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SPACING, FONTS } from '../../utils';

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

const LegalScreen = () => {
  const navigation = useNavigation();

  const legalItems = [
    { 
      icon: 'document-text-outline', 
      title: 'Terms of Service', 
      subtitle: 'Last updated: January 15, 2025',
      badge: null,
      onPress: () => {} 
    },
    { 
      icon: 'shield-checkmark-outline', 
      title: 'Privacy Policy', 
      subtitle: 'How we protect your data',
      badge: 'Updated',
      onPress: () => {} 
    },
    { 
      icon: 'ribbon-outline', 
      title: 'Community Guidelines', 
      subtitle: 'Rules for using our platform',
      badge: null,
      onPress: () => {} 
    },
    { 
      icon: 'information-circle-outline', 
      title: 'Licenses', 
      subtitle: 'Open source and third-party licenses',
      badge: null,
      onPress: () => {} 
    },
    { 
      icon: 'business-outline', 
      title: 'Company Information', 
      subtitle: 'Registration and compliance details',
      badge: null,
      onPress: () => {} 
    },
  ];

  const complianceInfo = {
    company: 'FarmRent Technologies Pvt. Ltd.',
    cin: 'U74999DL2024PTC123456',
    gstin: '07AAACF1234L1ZM',
    registered: 'New Delhi, India',
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={COLORS_MINIMAL.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Legal</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.infoCard}>
          <Ionicons name="shield-outline" size={20} color={COLORS_MINIMAL.accent} />
          <Text style={styles.infoText}>
            We're committed to transparency and protecting your rights
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal Documents</Text>
          <View style={styles.card}>
            {legalItems.map((item, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity 
                  style={styles.legalItem} 
                  activeOpacity={0.7}
                  onPress={item.onPress}
                >
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon} size={20} color={COLORS_MINIMAL.text.secondary} />
                  </View>
                  <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {item.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={COLORS_MINIMAL.text.muted} />
                </TouchableOpacity>
                {index < legalItems.length - 1 && <View style={styles.separator} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Details</Text>
          <View style={styles.complianceCard}>
            <View style={styles.complianceRow}>
              <Text style={styles.complianceLabel}>Company</Text>
              <Text style={styles.complianceValue}>{complianceInfo.company}</Text>
            </View>
            <View style={styles.complianceDivider} />
            <View style={styles.complianceRow}>
              <Text style={styles.complianceLabel}>CIN</Text>
              <Text style={styles.complianceValue}>{complianceInfo.cin}</Text>
            </View>
            <View style={styles.complianceDivider} />
            <View style={styles.complianceRow}>
              <Text style={styles.complianceLabel}>GSTIN</Text>
              <Text style={styles.complianceValue}>{complianceInfo.gstin}</Text>
            </View>
            <View style={styles.complianceDivider} />
            <View style={styles.complianceRow}>
              <Text style={styles.complianceLabel}>Registered</Text>
              <Text style={styles.complianceValue}>{complianceInfo.registered}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            For legal inquiries, contact us at{'\n'}
            <Text style={styles.footerLink}>legal@farmrent.com</Text>
          </Text>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS_MINIMAL.accent}10`,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 14,
    color: COLORS_MINIMAL.text.secondary,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
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
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  legalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
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
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 15,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 2,
  },
  badge: {
    backgroundColor: COLORS_MINIMAL.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 10,
    color: COLORS_MINIMAL.background,
  },
  itemSubtitle: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 13,
    color: COLORS_MINIMAL.text.muted,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS_MINIMAL.divider,
    marginLeft: 52,
  },
  complianceCard: {
    backgroundColor: COLORS_MINIMAL.surface,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
  },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  complianceLabel: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 14,
    color: COLORS_MINIMAL.text.muted,
  },
  complianceValue: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 14,
    color: COLORS_MINIMAL.text.primary,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  complianceDivider: {
    height: 1,
    backgroundColor: COLORS_MINIMAL.border,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  footerText: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 13,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLink: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.accent,
  },
});

export default LegalScreen;