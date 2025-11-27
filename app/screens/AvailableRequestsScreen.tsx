import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import Button from '../components/Button';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchAvailableRequests,
  acceptServiceRequest,
  setFilters,
} from '../store/slices/serviceRequestsSlice';
import ServiceRequestService, { ServiceRequest } from '../services/ServiceRequestService';

const AvailableRequestsScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();

  const { availableRequests, loading, accepting, filters } = useSelector(
    (state: RootState) => state.serviceRequests
  );
  const { user } = useSelector((state: RootState) => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedUrgency, setSelectedUrgency] = useState<string | undefined>(undefined);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');

  const urgencyOptions = [
    { value: undefined, label: 'All', icon: 'apps', color: COLORS.TEXT.PRIMARY },
    { value: 'immediate', label: 'Immediate', icon: 'flash-on', color: '#F44336' },
    { value: 'scheduled', label: 'Scheduled', icon: 'schedule', color: '#FF9800' },
    { value: 'flexible', label: 'Flexible', icon: 'date-range', color: '#4CAF50' },
  ];

  useFocusEffect(
    useCallback(() => {
      loadAvailableRequests();
    }, [filters])
  );

  const loadAvailableRequests = async () => {
    dispatch(fetchAvailableRequests(filters));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAvailableRequests();
    setRefreshing(false);
  };

  const handleUrgencyFilter = (urgency: string | undefined) => {
    setSelectedUrgency(urgency);
    dispatch(setFilters({ ...filters, urgency }));
  };

  const handleAcceptRequest = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setShowAcceptModal(true);
  };

  const submitAcceptance = async () => {
    if (!selectedRequest) return;

    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price');
      return;
    }

    try {
      const result = await dispatch(
        acceptServiceRequest({
          requestId: selectedRequest._id,
          data: {
            price: parseFloat(quotePrice),
            message: quoteMessage,
            estimatedCompletionTime: estimatedTime,
          },
        })
      ).unwrap();

      Alert.alert(
        'Success!',
        'You have successfully accepted the service request. An order has been created.',
        [
          {
            text: 'View Order',
            onPress: () => {
              setShowAcceptModal(false);
              navigation.navigate('OrderDetailScreen', { orderId: result.orderId });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to accept request. It may have been accepted by another provider.'
      );
    }
  };

  const calculateDistance = (request: ServiceRequest) => {
    // In real implementation, calculate based on provider's location
    // For now, return mock distance
    return `${(Math.random() * 10 + 1).toFixed(1)} km`;
  };

  const renderRequestCard = ({ item }: { item: ServiceRequest }) => {
    const remainingTime = new Date(item.expiresAt).getTime() - Date.now();
    const hoursRemaining = Math.floor(remainingTime / (1000 * 60 * 60));
    const isExpiring = hoursRemaining < 24;

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => navigation.navigate('ServiceRequestDetails', { requestId: item._id })}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleRow}>
            <View style={styles.urgencyIndicator}>
              <MaterialIcons
                name={urgencyOptions.find(u => u.value === item.urgency)?.icon || 'help'}
                size={16}
                color={ServiceRequestService.getUrgencyColor(item.urgency)}
              />
            </View>
            <Text style={styles.requestTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          {isExpiring && (
            <View style={styles.expiringBadge}>
              <MaterialIcons name="timer" size={12} color="#FF5722" />
              <Text style={styles.expiringText}>{hoursRemaining}h left</Text>
            </View>
          )}
        </View>

        <Text style={styles.requestDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.requestInfo}>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={14} color={COLORS.TEXT.SECONDARY} />
            <Text style={styles.infoText}>{calculateDistance(item)}</Text>
            <Text style={styles.infoDivider}>•</Text>
            <MaterialIcons name="calendar-today" size={14} color={COLORS.TEXT.SECONDARY} />
            <Text style={styles.infoText}>
              {ServiceRequestService.formatRequestDate(item.serviceStartDate)}
            </Text>
          </View>

          {item.budget && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="currency-inr" size={14} color={COLORS.TEXT.SECONDARY} />
              <Text style={styles.budgetText}>
                ₹{item.budget.min} - ₹{item.budget.max}
              </Text>
              {item.metadata?.quantity && (
                <>
                  <Text style={styles.infoDivider}>•</Text>
                  <Text style={styles.infoText}>
                    {item.metadata.quantity} {item.metadata.unitOfMeasure}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.requestFooter}>
          <View style={styles.seekerInfo}>
            <Ionicons name="person-outline" size={14} color={COLORS.TEXT.SECONDARY} />
            <Text style={styles.seekerName}>
              {typeof item.seekerId === 'object' ? item.seekerId.name : 'Seeker'}
            </Text>
            {item.viewCount > 0 && (
              <>
                <Text style={styles.infoDivider}>•</Text>
                <Ionicons name="eye-outline" size={14} color={COLORS.TEXT.SECONDARY} />
                <Text style={styles.viewCount}>{item.viewCount}</Text>
              </>
            )}
          </View>

          <Button
            title="Accept"
            size="small"
            onPress={() => handleAcceptRequest(item)}
            style={styles.acceptButton}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="inbox-outline" size={64} color={COLORS.TEXT.SECONDARY} />
      <Text style={styles.emptyStateTitle}>No Available Requests</Text>
      <Text style={styles.emptyStateText}>
        {selectedUrgency
          ? `No ${selectedUrgency} requests available for your services`
          : 'There are no service requests matching your profile at the moment'}
      </Text>
      <Text style={styles.emptyStateHint}>
        Check back later or adjust your service categories
      </Text>
    </View>
  );

  return (
    <SafeAreaWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Available Requests</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Ionicons name="refresh-outline" size={24} color={COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Urgency Filter */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={urgencyOptions}
            keyExtractor={(item) => item.label}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedUrgency === item.value && styles.filterChipActive,
                ]}
                onPress={() => handleUrgencyFilter(item.value)}
              >
                <MaterialIcons
                  name={item.icon}
                  size={16}
                  color={
                    selectedUrgency === item.value ? COLORS.NEUTRAL.WHITE : COLORS.TEXT.SECONDARY
                  }
                />
                <Text
                  style={[
                    styles.filterChipText,
                    selectedUrgency === item.value && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Requests List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
          </View>
        ) : (
          <FlatList
            data={availableRequests}
            renderItem={renderRequestCard}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.PRIMARY.MAIN]}
              />
            }
            ListEmptyComponent={renderEmptyState}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}

        {/* Accept Request Modal */}
        <Modal
          visible={showAcceptModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowAcceptModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Accept Service Request</Text>
                <TouchableOpacity onPress={() => setShowAcceptModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.TEXT.PRIMARY} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalRequestTitle}>{selectedRequest?.title}</Text>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Your Quote Price *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={quotePrice}
                    onChangeText={setQuotePrice}
                    placeholder="Enter your price in ₹"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.TEXT.SECONDARY}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Message to Seeker</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    value={quoteMessage}
                    onChangeText={setQuoteMessage}
                    placeholder="Explain your experience, equipment, and approach..."
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor={COLORS.TEXT.SECONDARY}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Estimated Completion Time</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={estimatedTime}
                    onChangeText={setEstimatedTime}
                    placeholder="e.g., 2 days, 8 hours"
                    placeholderTextColor={COLORS.TEXT.SECONDARY}
                  />
                </View>

                <View style={styles.modalNote}>
                  <MaterialIcons name="info-outline" size={16} color={COLORS.TEXT.SECONDARY} />
                  <Text style={styles.modalNoteText}>
                    Once accepted, an order will be created and the seeker will be notified
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowAcceptModal(false)}
                  style={styles.modalButton}
                />
                <Button
                  title="Submit Acceptance"
                  onPress={submitAcceptance}
                  loading={accepting}
                  disabled={accepting}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>
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
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  filterContainer: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    marginRight: SPACING.xs,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  filterChipActive: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.xxs,
  },
  filterChipTextActive: {
    color: COLORS.NEUTRAL.WHITE,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  requestCard: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.sm,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  requestTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.BACKGROUND.CARD,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.xs,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    flex: 1,
  },
  expiringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.xs,
  },
  expiringText: {
    fontSize: 11,
    color: '#FF5722',
    marginLeft: 2,
    fontWeight: '600',
  },
  requestDescription: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  requestInfo: {
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xxs,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.xxs,
  },
  infoDivider: {
    marginHorizontal: SPACING.xs,
    color: COLORS.TEXT.SECONDARY,
  },
  budgetText: {
    fontSize: 14,
    color: COLORS.TEXT.PRIMARY,
    fontWeight: '600',
    marginLeft: SPACING.xxs,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  seekerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seekerName: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.xxs,
  },
  viewCount: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: 2,
  },
  acceptButton: {
    paddingHorizontal: SPACING.md,
  },
  separator: {
    height: SPACING.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginTop: SPACING.md,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginHorizontal: SPACING.xl,
  },
  emptyStateHint: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.NEUTRAL.WHITE,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER.PRIMARY,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
  },
  modalBody: {
    padding: SPACING.md,
  },
  modalRequestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.md,
  },
  modalSection: {
    marginBottom: SPACING.md,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.BORDER.PRIMARY,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    fontSize: 16,
    color: COLORS.TEXT.PRIMARY,
    backgroundColor: COLORS.NEUTRAL.WHITE,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalNote: {
    flexDirection: 'row',
    backgroundColor: COLORS.BACKGROUND.CARD,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
  },
  modalNoteText: {
    fontSize: 12,
    color: COLORS.TEXT.SECONDARY,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER.PRIMARY,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
});

export default AvailableRequestsScreen;