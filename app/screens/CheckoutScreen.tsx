import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import Button from '../components/Button';

const CheckoutScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { listing, dateRange } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Get date from Redux if not passed in params
  const reduxDateRange = useSelector((state: RootState) => state.date);
  const activeDateRange = dateRange || reduxDateRange;
  
  const [quantity, setQuantity] = useState(listing.minimumOrder || 1);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod'); // cod, upi, card
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const unitPrice = listing.price;
  const totalAmount = unitPrice * quantity;
  const unitOfMeasure = listing.unitOfMeasure;

  const incrementQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    if (quantity > (listing.minimumOrder || 1)) {
      setQuantity(prev => prev - 1);
    }
  };

  const handlePlaceOrder = async () => {
    // Validation
    if (!selectedDate || !selectedTime) {
      Alert.alert('Missing Information', 'Please select date and time for the service.');
      return;
    }
    
    if (!address) {
      Alert.alert('Missing Information', 'Please provide your address.');
      return;
    }
    
    if (!phone) {
      Alert.alert('Missing Information', 'Please provide your phone number.');
      return;
    }

    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Order Placed Successfully!',
        'Your booking has been sent to the service provider. They will contact you shortly.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Home')
          }
        ]
      );
    }, 1500);
  };

  const timeSlots = [
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
  ];

  const getNextSevenDays = () => {
    const days = [];
    const today = new Date();
    
    // If we have a selected date from home screen, use it as starting point
    const startDate = activeDateRange?.startDate ? new Date(activeDateRange.startDate) : today;
    
    // Generate 7 days starting from selected date or today
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Calculate if this is today or tomorrow relative to actual today
      const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let label = '';
      
      if (diffDays === 0) {
        label = 'Today';
      } else if (diffDays === 1) {
        label = 'Tomorrow';
      } else if (diffDays < 0) {
        // If date is in the past relative to today, skip it
        continue;
      } else {
        label = date.toLocaleDateString('en-US', { weekday: 'short' });
      }
      
      days.push({
        label: label,
        date: date.toISOString().split('T')[0],
        dayNum: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
    
    // If we have less than 7 days (because some were in the past), add more future days
    while (days.length < 7) {
      const lastDate = new Date(days[days.length - 1].date);
      lastDate.setDate(lastDate.getDate() + 1);
      days.push({
        label: lastDate.toLocaleDateString('en-US', { weekday: 'short' }),
        date: lastDate.toISOString().split('T')[0],
        dayNum: lastDate.getDate(),
        month: lastDate.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
    
    return days;
  };

  const days = getNextSevenDays();
  
  // Pre-select the date from navigation/redux if available
  useEffect(() => {
    if (activeDateRange?.startDate && days.length > 0) {
      const dateStr = new Date(activeDateRange.startDate).toISOString().split('T')[0];
      // Check if this date is in our available days
      const dateExists = days.some(day => day.date === dateStr);
      if (dateExists) {
        setSelectedDate(dateStr);
      } else {
        // If the selected date is not in the next 7 days, select the first available day
        setSelectedDate(days[0]?.date || '');
      }
    } else if (days.length > 0 && !selectedDate) {
      // If no date from navigation/redux, default to first available day
      setSelectedDate(days[0]?.date || '');
    }
  }, []);

  return (
    <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Service Item Card with Quantity Selector */}
          <View style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{listing.subCategoryId.name}</Text>
                <Text style={styles.itemCategory}>{listing.categoryId.name}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{unitPrice}</Text>
            </View>
            
            {/* Inline Quantity Selector */}
            <View style={styles.quantityRow}>
              <View style={styles.minOrderInfo}>
                <Text style={styles.minOrderText}>
                  Min. Order: {listing.minimumOrder} {unitOfMeasure.replace('per_', '')}
                </Text>
              </View>
              <View style={styles.quantityControl}>
                <TouchableOpacity 
                  style={styles.quantityBtn} 
                  onPress={decrementQuantity}
                  disabled={quantity <= (listing.minimumOrder || 1)}
                >
                  <Ionicons 
                    name="remove" 
                    size={18} 
                    color={quantity <= (listing.minimumOrder || 1) ? COLORS.TEXT.PLACEHOLDER : COLORS.PRIMARY.MAIN} 
                  />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity style={styles.quantityBtn} onPress={incrementQuantity}>
                  <Ionicons name="add" size={18} color={COLORS.PRIMARY.MAIN} />
                </TouchableOpacity>
              </View>
            </View>

            
          </View>

          {/* Bill Summary */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bill Summary</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item Total ({quantity} {unitOfMeasure.replace('per_', '')})</Text>
              <Text style={styles.billValue}>₹{(unitPrice * quantity).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Service Fee</Text>
              <Text style={styles.billValue}>₹0</Text>
            </View>
            <View style={[styles.billRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>

          {/* Schedule Service */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Schedule Service</Text>
            
            {/* Show if date was pre-selected */}
            {activeDateRange?.startDate && selectedDate && (
              <View style={styles.preselectedInfo}>
                <Ionicons name="information-circle" size={14} color={COLORS.PRIMARY.MAIN} />
                <Text style={styles.preselectedText}>
                  Date pre-selected based on your search
                </Text>
              </View>
            )}
            
            {/* Date Selection */}
            <Text style={styles.inputLabel}>Select Date</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.dateScrollView}
            >
              {days.map((day) => (
                <TouchableOpacity
                  key={day.date}
                  style={[
                    styles.dateCard,
                    selectedDate === day.date && styles.dateCardActive
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <Text style={[
                    styles.dateLabel,
                    selectedDate === day.date && styles.dateLabelActive
                  ]}>
                    {day.label}
                  </Text>
                  <Text style={[
                    styles.dateNum,
                    selectedDate === day.date && styles.dateNumActive
                  ]}>
                    {day.dayNum}
                  </Text>
                  {day.month && (
                    <Text style={[
                      styles.dateMonth,
                      selectedDate === day.date && styles.dateMonthActive
                    ]}>
                      {day.month}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Time Selection */}
            <Text style={styles.inputLabel}>Select Time</Text>
            <View style={styles.timeGrid}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.timeSlotActive
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[
                    styles.timeText,
                    selectedTime === time && styles.timeTextActive
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Service Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Service Details</Text>
            
            <Text style={styles.inputLabel}>Service Address *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter complete address where service is needed"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter contact number"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Any special instructions or requirements"
              placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Payment Method */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Method</Text>
            
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'cod' && styles.paymentOptionActive
              ]}
              onPress={() => setPaymentMethod('cod')}
            >
              <View style={styles.paymentOptionContent}>
                <MaterialIcons name="payments" size={24} color={COLORS.PRIMARY.MAIN} />
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Cash on Delivery</Text>
                  <Text style={styles.paymentOptionSubtitle}>Pay when service is completed</Text>
                </View>
              </View>
              <View style={[
                styles.radioButton,
                paymentMethod === 'cod' && styles.radioButtonActive
              ]} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'upi' && styles.paymentOptionActive
              ]}
              onPress={() => setPaymentMethod('upi')}
            >
              <View style={styles.paymentOptionContent}>
                <MaterialIcons name="account-balance" size={24} color={COLORS.PRIMARY.MAIN} />
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>UPI Payment</Text>
                  <Text style={styles.paymentOptionSubtitle}>Pay using Google Pay, PhonePe, etc</Text>
                </View>
              </View>
              <View style={[
                styles.radioButton,
                paymentMethod === 'upi' && styles.radioButtonActive
              ]} />
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Payment Button */}
        <View style={styles.bottomContainer}>
          <Button
            title={`Pay ₹${totalAmount.toLocaleString('en-IN')}`}
            onPress={handlePlaceOrder}
            loading={loading}
            style={styles.payButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  backButton: {
    padding: SPACING.XS,
  },
  headerTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  scrollContent: {
    paddingBottom: SPACING.XL,
  },
  itemCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
    padding: SPACING.LG,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.SM,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.MD,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  itemPrice: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.SM,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
  },
  minOrderInfo: {
    flex: 1,
  },
  minOrderText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    paddingHorizontal: SPACING.XS,
  },
  quantityBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginHorizontal: SPACING.MD,
    minWidth: 30,
    textAlign: 'center',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SPACING.MD,
    marginTop: SPACING.MD,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.XS,
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  optionText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  card: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    marginHorizontal: SPACING.MD,
    marginTop: SPACING.MD,
    padding: SPACING.LG,
    borderRadius: BORDER_RADIUS.LG,
    ...SHADOWS.SM,
  },
  cardTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.MD,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
  },
  billLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  billValue: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    marginTop: SPACING.SM,
    paddingTop: SPACING.MD,
  },
  totalLabel: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
  },
  totalValue: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.PRIMARY.MAIN,
  },
  inputLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.SM,
    marginTop: SPACING.MD,
  },
  dateScrollView: {
    marginHorizontal: -SPACING.SM,
  },
  dateCard: {
    width: 70,
    paddingVertical: SPACING.SM,
    marginHorizontal: SPACING.XS,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.BACKGROUND.CARD,
    alignItems: 'center',
    minHeight: 80,
  },
  dateCardActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  dateLabel: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  dateLabelActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  dateNum: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginTop: 2,
  },
  dateNumActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  dateMonth: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 2,
  },
  dateMonthActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.XS,
  },
  timeSlot: {
    width: '23%',
    margin: '1%',
    paddingVertical: SPACING.SM,
    borderRadius: BORDER_RADIUS.MD,
    backgroundColor: COLORS.BACKGROUND.CARD,
    alignItems: 'center',
  },
  timeSlotActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  timeText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
  },
  timeTextActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    backgroundColor: COLORS.BACKGROUND.PRIMARY,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    marginBottom: SPACING.SM,
  },
  paymentOptionActive: {
    borderColor: COLORS.PRIMARY.MAIN,
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentOptionText: {
    marginLeft: SPACING.MD,
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  paymentOptionSubtitle: {
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
  },
  radioButtonActive: {
    borderColor: COLORS.PRIMARY.MAIN,
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.MD,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  preselectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    marginBottom: SPACING.SM,
  },
  preselectedText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.PRIMARY.MAIN,
  },
  payButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.LG,
  },
});

export default CheckoutScreen;