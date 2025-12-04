import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import Button from '../components/Button';
import { COLORS, FONTS } from '../utils';
import { scaleFontSize, scaleSize } from '../utils/fonts';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import ServiceRequestService from '../services/ServiceRequestService';
import { calculateDistance, formatDistance } from '../utils/distance';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const ServiceRequestDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { booking } = route.params || {};
  const { latitude, longitude } = useSelector((state: RootState) => state.location);

  const [quotePrice, setQuotePrice] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serviceRequest, setServiceRequest] = useState<any>(null);

  useEffect(() => {
    if (booking) {
      const listingPrice = booking.listing?.price || 0;
      setQuotePrice(listingPrice > 0 ? listingPrice.toString() : '');
      setServiceRequest(booking);
    } else if (route.params?.requestId) {
      loadServiceRequest(route.params.requestId);
    }
  }, [booking, route.params]);

  const loadServiceRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const request = await ServiceRequestService.getRequestById(requestId);
      setServiceRequest(request);
      if ((request as any).listing?.price) {
        setQuotePrice((request as any).listing.price.toString());
      }
    } catch (error) {
      console.error('Error loading service request:', error);
      Alert.alert('Error', 'Failed to load service request details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatUnitOfMeasure = (unit?: string): string => {
    if (!unit) return '';
    const unitMap: { [key: string]: string } = {
      'per_hour': '/hr',
      'per_day': '/day',
      'per_piece': '/piece',
      'per_kg': '/kg',
      'per_unit': '/unit'
    };
    return unitMap[unit] || unit.replace('per_', '/').replace('_', '');
  };

  const submitAcceptance = async () => {
    if (!serviceRequest) return;

    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    try {
      setAccepting(true);
      const result = await ServiceRequestService.acceptRequest(serviceRequest._id, {
        price: parseFloat(quotePrice),
      });

      console.log('result of accepting service request', result);

      const orderId = result.orderId || result.order?._id || result.order?.id;
      
      if (!orderId) {
        console.error('Order ID not found in result:', result);
        Alert.alert('Error', 'Order was created but order ID is missing. Please check your orders.');
        navigation.goBack();
        return;
      }

      Alert.alert('Success!', 'You have successfully accepted the service request.', [
        {
          text: 'View Order',
          onPress: () => {
            navigation.goBack();
            setTimeout(() => {
              let rootNav = navigation.getParent();
              rootNav = rootNav?.getParent();
              rootNav = rootNav?.getParent();
              
              if (rootNav) {
                (rootNav as any).navigate('OrderDetail', { bookingId: orderId });
              } else {
                (navigation as any).navigate('OrderDetail', { bookingId: orderId });
              }
            }, 150);
          },
        },
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request. It may have been accepted by another provider.');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!serviceRequest) return;

    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this service request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeclining(true);
              await ServiceRequestService.declineRequest(serviceRequest._id);
              Alert.alert('Success', 'Service request declined successfully', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.navigate('ProviderHome', { refresh: true });
                  },
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline request. Please try again.');
            } finally {
              setDeclining(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaWrapper backgroundColor="#FFFFFF" style={styles.flex}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!serviceRequest) {
    return (
      <SafeAreaWrapper backgroundColor="#FFFFFF" style={styles.flex}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Service request not found</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaWrapper>
    );
  }

  let calculatedDistance: number | null = null;
  if (latitude && longitude && serviceRequest.serviceLocation?.coordinates) {
    const [reqLng, reqLat] = serviceRequest.serviceLocation.coordinates;
    calculatedDistance = calculateDistance(latitude, longitude, reqLat, reqLng);
  }

  const distance = serviceRequest.distance || calculatedDistance;
  const serviceTitle = serviceRequest.listing?.title || serviceRequest.title || 'Service Request';
  const customerName = serviceRequest.seeker?.name || 'Customer';
  const serviceAddress = serviceRequest.serviceLocation?.address || serviceRequest.address || '';
  const serviceDescription = serviceRequest.listing?.description || serviceRequest.description || '';
  const preferredTime = serviceRequest.serviceTime || serviceRequest.metadata?.preferredTime || '';

  return (
    <SafeAreaWrapper backgroundColor="#FFFFFF" style={styles.flex}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Accept Service Request</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
        >
          <View style={styles.detailsSection}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Ionicons name="construct-outline" size={20} color={COLORS.PRIMARY.MAIN} />
                <Text style={styles.detailCardTitle}>Service Details</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Service</Text>
                <Text style={styles.detailValue}>{serviceTitle}</Text>
              </View>

              {serviceDescription ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{serviceDescription}</Text>
                </View>
              ) : null}

              {preferredTime ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Preferred Time</Text>
                  <Text style={styles.detailValue}>{preferredTime}</Text>
                </View>
              ) : null}

              {serviceRequest.serviceStartDate ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Service Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(serviceRequest.serviceStartDate).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Ionicons name="person-outline" size={20} color={COLORS.PRIMARY.MAIN} />
                <Text style={styles.detailCardTitle}>Customer Information</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer Name</Text>
                <Text style={styles.detailValue}>{customerName}</Text>
              </View>
            </View>

            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Ionicons name="location-outline" size={20} color={COLORS.PRIMARY.MAIN} />
                <Text style={styles.detailCardTitle}>Service Location</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{serviceAddress}</Text>
              </View>

              {distance !== null && distance !== undefined ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Distance</Text>
                  <Text style={styles.detailValue}>{formatDistance(distance)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Your Quote</Text>

            <View style={styles.formCard}>
              <Text style={styles.formLabel}>
                Quote Price * {serviceRequest.listing?.unitOfMeasure ? 
                  `(${formatUnitOfMeasure(serviceRequest.listing.unitOfMeasure)})` : ''}
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder={serviceRequest.listing?.price ? "Adjust price if needed" : "Enter your quote"}
                  placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                  value={quotePrice}
                  onChangeText={setQuotePrice}
                  keyboardType="numeric"
                  autoFocus={!serviceRequest.listing?.price}
                />
              </View>
              {serviceRequest.listing?.price && parseFloat(quotePrice) !== serviceRequest.listing.price && (
                <Text style={styles.priceHint}>
                  Your listing price: ₹{serviceRequest.listing.price}
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.buttonRow}>
            <Button
              title={declining ? 'Declining...' : 'Decline'}
              onPress={handleDecline}
              disabled={accepting || declining}
              variant="outline"
              style={[styles.footerButton, styles.declineButton]}
            />
            <Button
              title={accepting ? 'Accepting...' : 'Accept'}
              onPress={submitAcceptance}
              disabled={accepting || declining || !quotePrice || parseFloat(quotePrice) <= 0}
              style={[styles.footerButton, styles.acceptButton]}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSize(20),
  },
  errorText: {
    fontSize: scaleFontSize(16),
    color: COLORS.TEXT.SECONDARY,
    marginBottom: scaleSize(20),
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleSize(20),
    paddingTop: Platform.OS === 'ios' ? scaleSize(10) : scaleSize(20),
    paddingBottom: scaleSize(16),
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: scaleSize(4),
  },
  headerTitle: {
    flex: 1,
    fontSize: scaleFontSize(18),
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    marginHorizontal: scaleSize(12),
  },
  headerRight: {
    width: scaleSize(32),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: scaleSize(20),
    paddingBottom: scaleSize(120),
  },
  detailsSection: {
    marginBottom: scaleSize(24),
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleSize(12),
    padding: scaleSize(16),
    marginBottom: scaleSize(16),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaleSize(16),
  },
  detailCardTitle: {
    fontSize: scaleFontSize(16),
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginLeft: scaleSize(8),
  },
  detailRow: {
    marginBottom: scaleSize(12),
  },
  detailLabel: {
    fontSize: scaleFontSize(12),
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: scaleSize(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: scaleFontSize(14),
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    lineHeight: scaleFontSize(20),
  },
  formSection: {
    marginBottom: scaleSize(24),
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: scaleSize(16),
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleSize(12),
    padding: scaleSize(16),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  formLabel: {
    fontSize: scaleFontSize(14),
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: scaleSize(8),
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: scaleSize(12),
    paddingHorizontal: scaleSize(16),
    backgroundColor: '#F9FAFB',
  },
  currencySymbol: {
    fontSize: scaleFontSize(18),
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
    marginRight: scaleSize(8),
  },
  priceInput: {
    flex: 1,
    fontSize: scaleFontSize(16),
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.PRIMARY,
    paddingVertical: scaleSize(14),
  },
  priceHint: {
    fontSize: scaleFontSize(12),
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: scaleSize(8),
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: scaleSize(20),
    paddingTop: scaleSize(16),
    paddingBottom: Platform.OS === 'ios' ? scaleSize(90) : scaleSize(80),
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: scaleSize(12),
  },
  footerButton: {
    flex: 1,
  },
  declineButton: {
    
  },
  acceptButton: {
  },
});

export default ServiceRequestDetailScreen;

