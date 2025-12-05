import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { fetchMyRequests, setFilters } from '../../store/slices/serviceRequestsSlice';
import ServiceRequestService, { ServiceRequest } from '../../services/ServiceRequestService';

// Ultra-minimal color scheme matching BookingsScreen
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
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  success: '#22C55E',
};

const MyServiceRequestsScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();

  const { myRequests, loading, filters, totalMyRequests } = useSelector(
    (state: RootState) => state.serviceRequests
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);

  const statusOptions = [
    { value: undefined, label: 'All', color: COLORS_MINIMAL.text.primary },
    { value: 'open', label: 'Open', color: COLORS_MINIMAL.accent },
    { value: 'matched', label: 'Matched', color: COLORS_MINIMAL.info },
    { value: 'accepted', label: 'Accepted', color: COLORS_MINIMAL.warning },
    { value: 'completed', label: 'Completed', color: COLORS_MINIMAL.text.muted },
    { value: 'cancelled', label: 'Cancelled', color: COLORS_MINIMAL.danger },
  ];

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [filters])
  );

  const loadRequests = async () => {
    dispatch(fetchMyRequests(filters));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleStatusFilter = (status: string | undefined) => {
    setSelectedStatus(status);
    dispatch(setFilters({ ...filters, status }));
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(opt => opt.value === status);
    const color = statusConfig?.color || COLORS_MINIMAL.text.muted;
    return (
      <View style={[styles.statusBadge, { backgroundColor: `${color}15` }]}>
        <Ionicons
          name={getStatusIcon(status)}
          size={12}
          color={color}
        />
        <Text style={[styles.statusBadgeText, { color }]}>
          {statusConfig?.label || status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return 'time-outline';
      case 'matched':
        return 'people-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'completed':
        return 'checkmark-done-outline';
      case 'cancelled':
        return 'close-circle-outline';
      default:
        return 'ellipse-outline';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'immediate':
        return 'flash-on';
      case 'scheduled':
        return 'schedule';
      case 'flexible':
        return 'date-range';
      default:
        return 'help-outline';
    }
  };

  const renderRequestCard = ({ item }: { item: ServiceRequest }) => {
    const isExpired = new Date(item.expiresAt) < new Date();
    const matchCount = item.matchedProviderIds?.length || 0;

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => navigation.navigate('ServiceRequestDetails', { requestId: item._id })}
        activeOpacity={0.7}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestTitleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.requestTitle}>
                {item.title}
              </Text>
              <View style={styles.requestMeta}>
                <Ionicons
                  name={getUrgencyIcon(item.urgency) === 'flash-on' ? 'flash' : getUrgencyIcon(item.urgency) === 'schedule' ? 'time' : 'calendar-outline'}
                  size={14}
                  color={COLORS_MINIMAL.text.muted}
                />
                <Text style={styles.requestSubtitle}>{item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}</Text>
                {item.budget && (
                  <>
                    <Text style={styles.detailSeparator}>•</Text>
                    <Text style={styles.requestSubtitle}>
                      ₹{item.budget.min.toLocaleString()} - ₹{item.budget.max.toLocaleString()}
                    </Text>
                  </>
                )}
              </View>
            </View>
            {getStatusBadge(item.status)}
          </View>
        </View>

        <View style={styles.requestDetails}>
          <Text style={styles.requestDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS_MINIMAL.text.muted} />
            <Text style={styles.detailText}>
              {ServiceRequestService.formatRequestDate(item.serviceStartDate)}
            </Text>
            {item.serviceEndDate && item.serviceEndDate !== item.serviceStartDate && (
              <>
                <Text style={styles.detailSeparator}>•</Text>
                <Text style={styles.detailText}>
                  {ServiceRequestService.formatRequestDate(item.serviceEndDate)}
                </Text>
              </>
            )}
          </View>

          {item.location && (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={COLORS_MINIMAL.text.muted} />
              <Text style={styles.detailText} numberOfLines={1}>
                {item.location.address || item.location.village || 'Location set'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.requestFooter}>
          {item.status === 'matched' && matchCount > 0 && (
            <View style={styles.matchBadge}>
              <Ionicons name="people-outline" size={14} color={COLORS_MINIMAL.accent} />
              <Text style={styles.matchBadgeText}>{matchCount} providers matched</Text>
            </View>
          )}

          {item.status === 'accepted' && item.orderId && (
            <View style={styles.orderBadge}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS_MINIMAL.success} />
              <Text style={styles.orderBadgeText}>Order Created</Text>
            </View>
          )}

          {isExpired && item.status === 'open' && (
            <View style={styles.expiredBadge}>
              <Ionicons name="time-outline" size={14} color={COLORS_MINIMAL.danger} />
              <Text style={styles.expiredText}>Expired</Text>
            </View>
          )}

          <Ionicons name="chevron-forward" size={18} color={COLORS_MINIMAL.text.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="document-text-outline" size={48} color={COLORS_MINIMAL.text.muted} />
      </View>
      <Text style={styles.emptyTitle}>No Service Requests</Text>
      <Text style={styles.emptySubtitle}>
        {selectedStatus
          ? `You don't have any ${selectedStatus} requests`
          : "You haven't created any service requests yet"}
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateServiceRequest')}
        activeOpacity={0.8}
      >
        <Text style={styles.createButtonText}>Create Service Request</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS_MINIMAL.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Service Requests</Text>
          <TouchableOpacity
            style={styles.headerIcon}
            onPress={() => navigation.navigate('CreateServiceRequest')}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={20} color={COLORS_MINIMAL.accent} />
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={statusOptions}
            keyExtractor={(item) => item.label}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.tab,
                  selectedStatus === item.value && styles.activeTab,
                ]}
                onPress={() => handleStatusFilter(item.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedStatus === item.value && styles.activeTabText,
                  ]}
                >
                  {item.label}
                </Text>
                {item.value === undefined && totalMyRequests > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{totalMyRequests}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.tabScrollContent}
          />
        </View>

        {/* Requests List */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
          </View>
        ) : (
          <FlatList
            data={myRequests}
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

      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS_MINIMAL.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS_MINIMAL.background,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  headerIcon: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: COLORS_MINIMAL.surface,
  },
  tabContainer: {
    backgroundColor: COLORS_MINIMAL.surface,
    paddingVertical: 4,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS_MINIMAL.text.primary,
  },
  tabText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.secondary,
  },
  activeTabText: {
    color: COLORS_MINIMAL.background,
  },
  tabBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: COLORS_MINIMAL.accent,
  },
  tabBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
  },
  requestCard: {
    backgroundColor: COLORS_MINIMAL.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS_MINIMAL.border,
  },
  requestHeader: {
    marginBottom: 12,
  },
  requestTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  requestTitle: {
    fontSize: 15,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 4,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestSubtitle: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
    marginLeft: 4,
  },
  requestDetails: {
    marginBottom: 12,
  },
  requestDescription: {
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
    marginLeft: 6,
    flex: 1,
  },
  detailSeparator: {
    marginHorizontal: 6,
    fontSize: 12,
    color: COLORS_MINIMAL.text.muted,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS_MINIMAL.divider,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.POPPINS.MEDIUM,
    marginLeft: 4,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  matchBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.accent,
    marginLeft: 4,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.success,
    marginLeft: 4,
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expiredText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.danger,
    marginLeft: 4,
  },
  separator: {
    height: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS_MINIMAL.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS_MINIMAL.text.primary,
    borderRadius: 24,
  },
  createButtonText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.background,
  },
});

export default MyServiceRequestsScreen;