import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Text from '../../components/Text';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SPACING, FONTS } from '../../utils';
import { scaleFontSize, scaleSize } from '../../utils/fonts';

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
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
};

const PaymentSettingsScreen = () => {
  const navigation = useNavigation();
  const [defaultPaymentId, setDefaultPaymentId] = useState('card1');

  const paymentMethods = [
    {
      id: 'card1',
      type: 'card',
      icon: 'card-outline',
      brand: 'Visa',
      title: 'Debit Card',
      subtitle: '•••• •••• •••• 4242',
      expiry: 'Expires 08/26',
      isDefault: defaultPaymentId === 'card1',
    },
    {
      id: 'card2',
      type: 'card',
      icon: 'card-outline',
      brand: 'Mastercard',
      title: 'Credit Card',
      subtitle: '•••• •••• •••• 8569',
      expiry: 'Expires 12/25',
      isDefault: defaultPaymentId === 'card2',
    },
    {
      id: 'upi1',
      type: 'upi',
      icon: 'cash-outline',
      brand: 'UPI',
      title: 'UPI',
      subtitle: 'farmuser@ybl',
      expiry: null,
      isDefault: defaultPaymentId === 'upi1',
    },
  ];

  const handleSetDefault = (id: string) => {
    setDefaultPaymentId(id);
    // API call to update default payment method
  };

  const handleRemovePayment = (id: string) => {
    // API call to remove payment method
  };

  const handleAddPayment = () => {
    // Navigate to add payment screen
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={scaleSize(24)} color={COLORS_MINIMAL.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: scaleSize(24) }} />
      </View>

      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
          
          {paymentMethods.map((method, index) => (
            <View key={method.id} style={styles.paymentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <View style={styles.cardIcon}>
                    {method.type === 'upi' ? (
                      <MaterialCommunityIcons name="cash-fast" size={24} color={COLORS_MINIMAL.text.secondary} />
                    ) : (
                      <Ionicons name={method.icon} size={24} color={COLORS_MINIMAL.text.secondary} />
                    )}
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardType}>{method.title}</Text>
                      {method.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardNumber}>{method.subtitle}</Text>
                    {method.expiry && (
                      <Text style={styles.cardExpiry}>{method.expiry}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.menuButton}
                  activeOpacity={0.7}
                  onPress={() => {}}
                >
                  <Ionicons name="ellipsis-vertical" size={scaleSize(18)} color={COLORS_MINIMAL.text.muted} />
                </TouchableOpacity>
              </View>

              {!method.isDefault && (
                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleSetDefault(method.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.actionText}>Set as Default</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleRemovePayment(method.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.actionText, styles.removeText]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.addButton}
          activeOpacity={0.8}
          onPress={handleAddPayment}
        >
          <Ionicons name="add-circle-outline" size={scaleSize(20)} color={COLORS_MINIMAL.accent} />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Payment Options</Text>
          <View style={styles.quickPayContainer}>
            <TouchableOpacity style={styles.quickPayOption} activeOpacity={0.7}>
              <View style={styles.quickPayIcon}>
                <MaterialCommunityIcons name="google-pay" size={scaleSize(24)} color="#4285F4" />
              </View>
              <Text style={styles.quickPayText}>Google Pay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickPayOption} activeOpacity={0.7}>
              <View style={styles.quickPayIcon}>
                <Ionicons name="phone-portrait-outline" size={scaleSize(24)} color="#002E6E" />
              </View>
              <Text style={styles.quickPayText}>PhonePe</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickPayOption} activeOpacity={0.7}>
              <View style={styles.quickPayIcon}>
                <MaterialCommunityIcons name="cash" size={scaleSize(24)} color="#5F259F" />
              </View>
              <Text style={styles.quickPayText}>Paytm</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed-outline" size={scaleSize(18)} color={COLORS_MINIMAL.text.muted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Your payment info is secure</Text>
              <Text style={styles.infoText}>
                We use bank-level encryption to protect your payment information
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Settings</Text>
          <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={scaleSize(20)} color={COLORS_MINIMAL.text.secondary} />
              <Text style={styles.settingText}>Billing History</Text>
            </View>
            <Ionicons name="chevron-forward" size={scaleSize(18)} color={COLORS_MINIMAL.text.muted} />
          </TouchableOpacity>
          <View style={styles.separator} />
          <TouchableOpacity style={styles.settingItem} activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Ionicons name="receipt-outline" size={scaleSize(20)} color={COLORS_MINIMAL.text.secondary} />
              <Text style={styles.settingText}>Auto-pay Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={scaleSize(18)} color={COLORS_MINIMAL.text.muted} />
          </TouchableOpacity>
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
  section: {
    marginBottom: scaleSize(24),
  },
  sectionTitle: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: scaleFontSize(14),
    color: COLORS_MINIMAL.text.muted,
    marginBottom: scaleSize(12),
    paddingHorizontal: scaleSize(20),
  },
  paymentCard: {
    backgroundColor: COLORS_MINIMAL.surface,
    marginHorizontal: scaleSize(20),
    marginBottom: scaleSize(12),
    padding: scaleSize(16),
    borderRadius: scaleSize(12),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    width: scaleSize(48),
    height: scaleSize(48),
    borderRadius: scaleSize(10),
    backgroundColor: COLORS_MINIMAL.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSize(12),
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(8),
  },
  cardType: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: scaleFontSize(15),
    color: COLORS_MINIMAL.text.primary,
  },
  defaultBadge: {
    backgroundColor: COLORS_MINIMAL.accent,
    paddingHorizontal: scaleSize(8),
    paddingVertical: scaleSize(2),
    borderRadius: scaleSize(6),
  },
  defaultText: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: scaleFontSize(10),
    color: COLORS_MINIMAL.background,
  },
  cardNumber: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: scaleFontSize(13),
    color: COLORS_MINIMAL.text.secondary,
    marginTop: scaleSize(2),
  },
  cardExpiry: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: scaleFontSize(12),
    color: COLORS_MINIMAL.text.muted,
    marginTop: scaleSize(2),
  },
  menuButton: {
    padding: scaleSize(4),
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: scaleSize(12),
    paddingTop: scaleSize(12),
    borderTopWidth: 1,
    borderTopColor: COLORS_MINIMAL.border,
    gap: scaleSize(12),
  },
  actionButton: {
    paddingVertical: scaleSize(6),
    paddingHorizontal: scaleSize(12),
  },
  actionText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: scaleFontSize(13),
    color: COLORS_MINIMAL.accent,
  },
  removeText: {
    color: COLORS_MINIMAL.danger,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    marginHorizontal: scaleSize(20),
    marginBottom: scaleSize(32),
    paddingVertical: scaleSize(14),
    borderRadius: scaleSize(12),
    gap: scaleSize(8),
  },
  addButtonText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: scaleFontSize(15),
    color: COLORS_MINIMAL.accent,
  },
  quickPayContainer: {
    flexDirection: 'row',
    paddingHorizontal: scaleSize(20),
    gap: scaleSize(12),
  },
  quickPayOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    paddingVertical: scaleSize(16),
    borderRadius: scaleSize(12),
  },
  quickPayIcon: {
    marginBottom: scaleSize(8),
  },
  quickPayText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: scaleFontSize(12),
    color: COLORS_MINIMAL.text.secondary,
  },
  infoSection: {
    paddingHorizontal: scaleSize(20),
    marginBottom: scaleSize(24),
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${COLORS_MINIMAL.accent}10`,
    padding: scaleSize(16),
    borderRadius: scaleSize(12),
    alignItems: 'flex-start',
  },
  infoContent: {
    marginLeft: scaleSize(12),
    flex: 1,
  },
  infoTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: scaleFontSize(14),
    color: COLORS_MINIMAL.text.primary,
    marginBottom: scaleSize(4),
  },
  infoText: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: scaleFontSize(13),
    color: COLORS_MINIMAL.text.secondary,
    lineHeight: scaleSize(18),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleSize(14),
    paddingHorizontal: scaleSize(20),
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleSize(12),
  },
  settingText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: scaleFontSize(15),
    color: COLORS_MINIMAL.text.primary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS_MINIMAL.divider,
    marginLeft: scaleSize(52),
  },
});

export default PaymentSettingsScreen;