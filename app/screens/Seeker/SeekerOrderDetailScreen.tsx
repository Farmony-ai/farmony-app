import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Dimensions,
  Animated,
  RefreshControl,
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import apiInterceptor from '../../services/apiInterceptor';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

const { width: screenWidth } = Dimensions.get('window');

// Minimalistic color scheme
const COLORS_MINIMAL = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: {
    primary: '#000000',
    secondary: '#4A5568',
    muted: '#A0AEC0',
  },
  accent: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  success: '#10B981',
};

interface OrderDetails {
  _id: string;
  seekerId: string | any;
  providerId: string | any;
  listingId: string | any;
  status: string;
  orderType: string;
  totalAmount: number;
  quantity: number;
  unitOfMeasure?: string;
  serviceStartDate?: string;
  serviceEndDate?: string;
  coordinates?: number[];
  createdAt: string;
  updatedAt: string;
  paymentMethod?: string;
  specialInstructions?: string;
}

const SeekerOrderDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { orderId } = route.params;
  const { user } = useSelector((state: RootState) => state.auth);

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchOrderDetails();

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 20,
        stiffness: 90,
        useNativeDriver: true,
      }),
    ]).start();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      // Fetch order details
      const orderResult = await apiInterceptor.makeAuthenticatedRequest(`/orders/${orderId}`, {
        method: 'GET',
      });

      if (!orderResult.success || !orderResult.data) {
        throw new Error('Failed to fetch order details');
      }

      let orderData = orderResult.data as OrderDetails;

      // Fetch provider details if needed
      if (typeof orderData.providerId === 'string') {
        try {
          const providerResult = await apiInterceptor.makeAuthenticatedRequest(`/users/${orderData.providerId}`, {
            method: 'GET',
          });
          if (providerResult.success && providerResult.data) {
            orderData.providerId = providerResult.data;
          }
        } catch (error) {
          console.error('Error fetching provider details:', error);
        }
      }

      // Fetch listing details if needed
      if (typeof orderData.listingId === 'string') {
        try {
          const listingResult = await apiInterceptor.makeAuthenticatedRequest(`/listings/${orderData.listingId}`, {
            method: 'GET',
          });
          if (listingResult.success && listingResult.data) {
            orderData.listingId = listingResult.data;
          }
        } catch (error) {
          console.error('Error fetching listing details:', error);
        }
      }

      setOrder(orderData);
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrderDetails();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return COLORS_MINIMAL.warning;
      case 'accepted':
      case 'paid':
        return COLORS_MINIMAL.info;
      case 'completed':
        return COLORS_MINIMAL.success;
      case 'canceled':
      case 'rejected':
        return COLORS_MINIMAL.danger;
      default:
        return COLORS_MINIMAL.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'paid':
        return 'wallet-outline';
      case 'completed':
        return 'checkmark-done-outline';
      case 'canceled':
      case 'rejected':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: string | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCallProvider = () => {
    if (order?.providerId?.phone) {
      Linking.openURL(`tel:${order.providerId.phone}`);
    }
  };

  const handleChatProvider = () => {
    // TODO: Navigate to chat screen with provider
    Alert.alert('Coming Soon', 'Chat feature will be available soon');
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await apiInterceptor.makeAuthenticatedRequest(
                `/orders/${orderId}/status`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({ status: 'canceled' }),
                }
              );
              if (result.success) {
                Alert.alert('Success', 'Order canceled successfully');
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS_MINIMAL.accent} />
        </View>
      </SafeAreaWrapper>
    );
  }

  if (!order) {
    return (
      <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS_MINIMAL.text.muted} />
          <Text style={styles.errorText}>Order not found</Text>
        </View>
      </SafeAreaWrapper>
    );
  }

  const statusColor = getStatusColor(order.status);
  const statusIcon = getStatusIcon(order.status);

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS_MINIMAL.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <TouchableOpacity onPress={() => {}} style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color={COLORS_MINIMAL.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Order Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Ionicons name={statusIcon} size={16} color={statusColor} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {order.status?.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.orderIdText}>#{order._id.slice(-8).toUpperCase()}</Text>
            </View>

            {/* Order Timeline */}
            <View style={styles.timeline}>
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: COLORS_MINIMAL.success }]} />
                <Text style={styles.timelineText}>Order Placed</Text>
              </View>
              <View style={[styles.timelineLine, order.status !== 'pending' && styles.timelineLineActive]} />
              <View style={styles.timelineItem}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: order.status !== 'pending' ? COLORS_MINIMAL.success : COLORS_MINIMAL.border }
                ]} />
                <Text style={styles.timelineText}>Confirmed</Text>
              </View>
              <View style={[styles.timelineLine, ['paid', 'completed'].includes(order.status) && styles.timelineLineActive]} />
              <View style={styles.timelineItem}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: order.status === 'completed' ? COLORS_MINIMAL.success : COLORS_MINIMAL.border }
                ]} />
                <Text style={styles.timelineText}>Completed</Text>
              </View>
            </View>
          </View>

          {/* Service Details Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Service Details</Text>
            <View style={styles.serviceDetails}>
              {order.listingId?.photoUrls?.[0] && (
                <Image
                  source={{ uri: order.listingId.photoUrls[0] }}
                  style={styles.serviceImage}
                />
              )}
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>
                  {order.listingId?.title || 'Service'}
                </Text>
                <Text style={styles.serviceDescription} numberOfLines={2}>
                  {order.listingId?.description || 'No description available'}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    {order.quantity} {order.unitOfMeasure || 'unit'} × ₹{order.listingId?.price || 0}
                  </Text>
                  <Text style={styles.priceValue}>₹{order.totalAmount}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Provider Information Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Service Provider</Text>
            <View style={styles.providerInfo}>
              <View style={styles.providerHeader}>
                {order.providerId?.profilePictureUrl ? (
                  <Image
                    source={{ uri: order.providerId.profilePictureUrl }}
                    style={styles.providerAvatar}
                  />
                ) : (
                  <View style={[styles.providerAvatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person-outline" size={24} color={COLORS_MINIMAL.text.muted} />
                  </View>
                )}
                <View style={styles.providerDetails}>
                  <Text style={styles.providerName}>
                    {order.providerId?.name || 'Provider'}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#FFB800" />
                    <Text style={styles.ratingText}>4.5</Text>
                    <Text style={styles.ratingCount}>(23 reviews)</Text>
                  </View>
                </View>
              </View>
              <View style={styles.providerActions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleCallProvider}>
                  <Ionicons name="call-outline" size={20} color={COLORS_MINIMAL.accent} />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleChatProvider}>
                  <Ionicons name="chatbubble-outline" size={20} color={COLORS_MINIMAL.accent} />
                  <Text style={styles.actionButtonText}>Chat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Schedule Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Schedule</Text>
            <View style={styles.scheduleInfo}>
              <View style={styles.scheduleRow}>
                <Ionicons name="calendar-outline" size={20} color={COLORS_MINIMAL.text.secondary} />
                <Text style={styles.scheduleText}>
                  {formatDate(order.serviceStartDate)}
                </Text>
              </View>
              {order.serviceStartDate && (
                <View style={styles.scheduleRow}>
                  <Ionicons name="time-outline" size={20} color={COLORS_MINIMAL.text.secondary} />
                  <Text style={styles.scheduleText}>
                    {formatTime(order.serviceStartDate)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Location Card */}
          {order.coordinates && order.coordinates.length === 2 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Service Location</Text>
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: order.coordinates[1],
                    longitude: order.coordinates[0],
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: order.coordinates[1],
                      longitude: order.coordinates[0],
                    }}
                  />
                </MapView>
              </View>
              <TouchableOpacity style={styles.directionsButton}>
                <MaterialIcons name="directions" size={20} color={COLORS_MINIMAL.info} />
                <Text style={styles.directionsText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Payment Summary Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Summary</Text>
            <View style={styles.paymentInfo}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Service Amount</Text>
                <Text style={styles.paymentValue}>₹{order.totalAmount}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.paymentRow}>
                <Text style={styles.paymentTotalLabel}>Total Amount</Text>
                <Text style={styles.paymentTotalValue}>₹{order.totalAmount}</Text>
              </View>
              <View style={styles.paymentMethodRow}>
                <Ionicons name="cash-outline" size={20} color={COLORS_MINIMAL.text.secondary} />
                <Text style={styles.paymentMethodText}>Cash on Delivery</Text>
              </View>
            </View>
          </View>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Special Instructions</Text>
              <Text style={styles.instructionsText}>{order.specialInstructions}</Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Actions */}
      {order.status === 'pending' && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.bottomButton, styles.cancelButton]}
            onPress={handleCancelOrder}
          >
            <Text style={styles.cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
    marginTop: SPACING.SM,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    backgroundColor: COLORS_MINIMAL.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS_MINIMAL.border,
  },
  backButton: {
    padding: SPACING.XS,
  },
  headerTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  helpButton: {
    padding: SPACING.XS,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statusCard: {
    backgroundColor: COLORS_MINIMAL.background,
    margin: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.SM,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    gap: SPACING.XS,
  },
  statusText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  orderIdText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.MD,
  },
  timelineItem: {
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: SPACING.XS,
  },
  timelineText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS_MINIMAL.border,
    marginHorizontal: SPACING.XS,
    marginBottom: SPACING.MD,
  },
  timelineLineActive: {
    backgroundColor: COLORS_MINIMAL.success,
  },
  card: {
    backgroundColor: COLORS_MINIMAL.background,
    marginHorizontal: SPACING.MD,
    marginBottom: SPACING.MD,
    padding: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    ...SHADOWS.SM,
  },
  cardTitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: SPACING.MD,
  },
  serviceDetails: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  serviceImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS_MINIMAL.surface,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: SPACING.XS,
  },
  serviceDescription: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
    marginBottom: SPACING.SM,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
  },
  priceValue: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.accent,
  },
  providerInfo: {
    gap: SPACING.MD,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.MD,
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS_MINIMAL.surface,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.XS,
    marginTop: SPACING.XS,
  },
  ratingText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.primary,
  },
  ratingCount: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
  },
  providerActions: {
    flexDirection: 'row',
    gap: SPACING.MD,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.XS,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS_MINIMAL.accent,
    borderRadius: BORDER_RADIUS.SM,
  },
  actionButtonText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.accent,
  },
  scheduleInfo: {
    gap: SPACING.SM,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  },
  scheduleText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.primary,
  },
  mapContainer: {
    height: 150,
    borderRadius: BORDER_RADIUS.SM,
    overflow: 'hidden',
    marginBottom: SPACING.SM,
  },
  map: {
    flex: 1,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.XS,
    paddingVertical: SPACING.SM,
    borderWidth: 1,
    borderColor: COLORS_MINIMAL.info,
    borderRadius: BORDER_RADIUS.SM,
  },
  directionsText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.info,
  },
  paymentInfo: {
    gap: SPACING.SM,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
  },
  paymentValue: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS_MINIMAL.border,
    marginVertical: SPACING.XS,
  },
  paymentTotalLabel: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.primary,
  },
  paymentTotalValue: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.accent,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
    marginTop: SPACING.SM,
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS_MINIMAL.border,
  },
  paymentMethodText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
  },
  instructionsText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
    lineHeight: 20,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS_MINIMAL.background,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: COLORS_MINIMAL.border,
    ...SHADOWS.MD,
  },
  bottomButton: {
    paddingVertical: SPACING.MD,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS_MINIMAL.danger,
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.background,
  },
});

export default SeekerOrderDetailScreen;