import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import Button from '../components/Button';
import { COLORS, SPACING, FONTS, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { ordersAPI } from '../services/api';

interface RouteParams {
  listing: any;
  quantity: number;
  duration: number;
  address: any;
  serviceDate: string;
  serviceTime: string;
  specialInstructions: string;
  totalAmount: number;
  orderDetails: any;
}

type PaymentMethod = 'cod' | 'upi' | 'card';

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: string;
  iconType: 'ionicon' | 'material' | 'fontawesome5';
  available: boolean;
  recommended?: boolean;
}

const PaymentSelectionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params as RouteParams;
  const { user } = useSelector((state: RootState) => state.auth);

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cod');
  const [upiId, setUpiId] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('cod');

  const paymentOptions: PaymentOption[] = [
    {
      id: 'cod',
      name: 'Cash on Delivery',
      description: 'Pay when service is completed',
      icon: 'cash-outline',
      iconType: 'ionicon',
      available: true,
      recommended: true,
    },
    {
      id: 'upi',
      name: 'UPI',
      description: 'Pay using Google Pay, PhonePe, PayTM',
      icon: 'qr-code-scanner',
      iconType: 'material',
      available: true,
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, Rupay',
      icon: 'credit-card',
      iconType: 'fontawesome5',
      available: true,
    },
  ];

  const validateUPI = (id: string): boolean => {
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    return upiRegex.test(id);
  };

  const handlePlaceOrder = async () => {
    // Validate payment method specific requirements
    if (selectedPayment === 'upi' && !validateUPI(upiId)) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID');
      return;
    }

    setProcessingPayment(true);

    try {
      // Create the order
      const orderData = {
        ...params.orderDetails,
        paymentMethod: selectedPayment,
        paymentDetails: selectedPayment === 'upi' ? { upiId } : {},
        specialInstructions: params.specialInstructions,
      };

      const response = await ordersAPI.create(orderData);

      if (response.success) {
        // Navigate to order confirmation
        navigation.reset({
          index: 0,
          routes: [
            { name: 'Home' },
            { 
              name: 'OrderConfirmation', 
              params: { 
                orderId: response.data._id,
                orderDetails: response.data 
              } 
            }
          ],
        });
      } else {
        throw new Error(response.error || 'Failed to create order');
      }
    } catch (error: any) {
      console.error('Error placing order:', error);
      Alert.alert(
        'Order Failed',
        error.message || 'Failed to place order. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const renderPaymentIcon = (option: PaymentOption) => {
    const iconProps = {
      size: 24,
      color: selectedPayment === option.id ? COLORS.PRIMARY.MAIN : COLORS.TEXT.SECONDARY,
    };

    switch (option.iconType) {
      case 'ionicon':
        return <Ionicons name={option.icon as any} {...iconProps} />;
      case 'material':
        return <MaterialIcons name={option.icon as any} {...iconProps} />;
      case 'fontawesome5':
        return <FontAwesome5 name={option.icon as any} {...iconProps} />;
      default:
        return null;
    }
  };

  const renderPaymentDetails = (method: PaymentMethod) => {
    switch (method) {
      case 'upi':
        return (
          <View style={styles.paymentDetails}>
            <Text style={styles.inputLabel}>Enter UPI ID</Text>
            <TextInput
              style={styles.upiInput}
              placeholder="yourname@upi"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={upiId}
              onChangeText={setUpiId}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.upiProviders}>
              <Text style={styles.providersLabel}>Popular UPI Apps:</Text>
              <View style={styles.providersList}>
                {['GPay', 'PhonePe', 'PayTM', 'BHIM'].map((provider) => (
                  <TouchableOpacity key={provider} style={styles.providerChip}>
                    <Text style={styles.providerName}>{provider}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      case 'card':
        return (
          <View style={styles.paymentDetails}>
            <TouchableOpacity style={styles.addCardButton}>
              <Ionicons name="add-circle-outline" size={20} color={COLORS.PRIMARY.MAIN} />
              <Text style={styles.addCardText}>Add New Card</Text>
            </TouchableOpacity>
            <Text style={styles.secureText}>
              <Ionicons name="lock-closed" size={12} color={COLORS.SUCCESS} />
              {' '}Your card details are secure and encrypted
            </Text>
          </View>
        );
      case 'cod':
        return (
          <View style={styles.paymentDetails}>
            <View style={styles.codInfo}>
              <Ionicons name="information-circle" size={16} color={COLORS.PRIMARY.MAIN} />
              <Text style={styles.codText}>
                Please keep exact change ready. Our service provider will collect ₹{params.totalAmount.toFixed(2)} upon completion of service.
              </Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Order Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.editText}>EDIT</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.serviceName}>
                {params.listing.title || params.listing.subCategoryId?.name || 'Service Booking'}
              </Text>
              <Text style={styles.serviceQuantity}>
                {params.quantity} {params.listing.unitOfMeasure?.replace('per_', '')} × ₹{params.listing.price}
              </Text>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.TEXT.SECONDARY} />
                <Text style={styles.summaryText} numberOfLines={2}>
                  {params.address.addressLine1}, {params.address.village || params.address.district}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={14} color={COLORS.TEXT.SECONDARY} />
                <Text style={styles.summaryText}>
                  {new Date(params.serviceDate).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })} at {params.serviceTime}
                </Text>
              </View>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>₹{params.totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Methods */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            
            {paymentOptions.map((option) => (
              <View key={option.id} style={styles.paymentOptionContainer}>
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    selectedPayment === option.id && styles.selectedPaymentOption,
                    !option.available && styles.disabledOption,
                  ]}
                  onPress={() => {
                    if (option.available) {
                      setSelectedPayment(option.id);
                      setExpandedSection(option.id);
                    }
                  }}
                  disabled={!option.available}
                >
                  <View style={styles.paymentOptionLeft}>
                    {renderPaymentIcon(option)}
                    <View style={styles.paymentInfo}>
                      <View style={styles.paymentNameRow}>
                        <Text style={[
                          styles.paymentName,
                          selectedPayment === option.id && styles.selectedPaymentName
                        ]}>
                          {option.name}
                        </Text>
                        {option.recommended && (
                          <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>RECOMMENDED</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.paymentDescription}>{option.description}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.radioButton,
                    selectedPayment === option.id && styles.radioButtonSelected
                  ]}>
                    {selectedPayment === option.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
                
                {selectedPayment === option.id && expandedSection === option.id && (
                  <View style={styles.expandedContent}>
                    {renderPaymentDetails(option.id)}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.bottomContainer}>
          <View style={styles.finalAmount}>
            <Text style={styles.finalLabel}>Amount to Pay</Text>
            <Text style={styles.finalValue}>₹{params.totalAmount.toFixed(2)}</Text>
          </View>
          <Button
            title={selectedPayment === 'cod' ? 'Place Order' : 'Proceed to Pay'}
            onPress={handlePlaceOrder}
            style={styles.payButton}
            loading={processingPayment}
            disabled={processingPayment}
          />
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color={COLORS.SUCCESS} />
            <Text style={styles.securityText}>
              100% Safe and Secure Payments
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  backButton: {
    padding: SPACING.XS,
    marginRight: SPACING.MD,
  },
  headerTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  summaryCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    margin: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.SM,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  editText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  summaryContent: {
    paddingBottom: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  serviceName: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.XS,
  },
  serviceQuantity: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.SM,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.BORDER.PRIMARY,
    marginVertical: SPACING.SM,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.XS,
  },
  summaryText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.XS,
    flex: 1,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.MD,
  },
  amountLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  amountValue: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.PRIMARY.MAIN,
  },
  paymentSection: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginTop: SPACING.SM,
    paddingVertical: SPACING.MD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    paddingHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
  },
  paymentOptionContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
  },
  selectedPaymentOption: {
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  disabledOption: {
    opacity: 0.5,
  },
  paymentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentInfo: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  paymentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentName: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  selectedPaymentName: {
    color: COLORS.PRIMARY.MAIN,
  },
  recommendedBadge: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: SPACING.XS,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.XS,
    marginLeft: SPACING.SM,
  },
  recommendedText: {
    fontSize: 10,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.NEUTRAL.WHITE,
  },
  paymentDescription: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 2,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.BORDER.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.PRIMARY.MAIN,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  expandedContent: {
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
  },
  paymentDetails: {
    paddingHorizontal: SPACING.MD,
  },
  inputLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.SM,
  },
  upiInput: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    borderRadius: BORDER_RADIUS.SM,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  upiProviders: {
    marginTop: SPACING.MD,
  },
  providersLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.SM,
  },
  providersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  providerChip: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.XS,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  providerName: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.PRIMARY.MAIN,
    borderStyle: 'dashed',
  },
  addCardText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
    marginLeft: SPACING.SM,
  },
  secureText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.SUCCESS,
    textAlign: 'center',
    marginTop: SPACING.SM,
  },
  bankNote: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: SPACING.MD,
  },
  selectBankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  selectBankText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
  walletOptions: {
    gap: SPACING.SM,
  },
  walletOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.SM,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    marginBottom: SPACING.SM,
  },
  walletName: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
  },
  codInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.WARNING_LIGHT,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.SM,
  },
  codText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.WARNING,
    marginLeft: SPACING.SM,
    flex: 1,
  },
  offersSection: {
    margin: SPACING.MD,
  },
  offerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.SUCCESS_LIGHT,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.SUCCESS,
    borderStyle: 'dashed',
  },
  offerContent: {
    flex: 1,
    marginLeft: SPACING.SM,
  },
  offerTitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.SUCCESS,
  },
  offerDescription: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.SUCCESS,
  },
  offerAmount: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.SUCCESS,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    ...SHADOWS.MD,
  },
  finalAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  finalLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  finalValue: {
    fontSize: FONT_SIZES.XL,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  payButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.SM,
  },
  securityText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.SUCCESS,
    marginLeft: SPACING.XS,
  },
});

export default PaymentSelectionScreen;