import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Text from '../components/Text';
import { SPACING, FONTS } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import SeekerService, { UnifiedBooking } from '../services/SeekerService';
import RippleAnimation from '../components/RippleAnimation';
import categoryIcons from '../utils/icons';

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
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

const ICON_KEY_ALIASES: Record<string, string> = {
  water: 'water-pump',
  pump: 'water-pump',
  'water-pump': 'water-pump',
  irrigation: 'sprinkler',
  sprinkler: 'sprinkler',
  drip: 'drip',
  tractor: 'tractor',
  rotavator: 'rotavator',
  harvester: 'harvester',
  thresher: 'thresher',
  plough: 'plough',
  sprayer: 'sprayer',
  'seed-drill': 'seed-drill',
  drill: 'drill',
  welder: 'welder',
  electrician: 'electrician',
  plumber: 'plumber',
  farmer: 'farmer',
  worker: 'worker',
  carpenter: 'carpenter',
  mason: 'mason',
  painter: 'painter',
  'hand-tools': 'hand-tools',
  'power-tools': 'power-tools',
  tools: 'tools',
};

const TITLE_KEYWORD_ALIASES: Record<string, string> = {
  'water pump': 'water-pump',
  'pump': 'water-pump',
  'tractor': 'tractor',
  'rotavator': 'rotavator',
  'harvester': 'harvester',
  'thresher': 'thresher',
  'plough': 'plough',
  'seed drill': 'seed-drill',
  'sprayer': 'sprayer',
  'drip': 'drip',
  'sprinkler': 'sprinkler',
  'flour mill': 'flour-mill',
  'oil press': 'oil-press',
  'welder': 'welder',
  'electrician': 'electrician',
  'plumber': 'plumber',
  'carpenter': 'carpenter',
  'mason': 'mason',
  'painter': 'painter',
  'worker': 'worker',
  'farmer': 'farmer',
};

const TITLE_STOP_WORDS = new Set([
  'hp',
  'kw',
  'ton',
  'tons',
  'ltr',
  'litre',
  'liter',
  'rent',
  'rental',
  'hire',
  'service',
  'services',
  'job',
  'unit',
  'units',
  'for',
  'and',
  'with',
  'of',
  'at',
  'the',
  'a',
  'an',
]);

const BookingsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, token } = useSelector((state: RootState) => state.auth);
  const [bookings, setBookings] = useState<UnifiedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const fetchBookings = async (isRefresh = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      const data = await SeekerService.getUnifiedBookings(user.id);
      setBookings(data);
    } catch (error) {
      // Silently handle errors
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [user?.id, token])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(true);
  };

  const getStatusDisplay = (booking: UnifiedBooking) => {
    switch (booking.displayStatus) {
      case 'searching':
        const minutes = booking.searchElapsedMinutes || 0;
        return {
          label: 'Searching',
          sublabel:
            minutes > 0
              ? `Finding provider • ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} elapsed`
              : 'Finding provider',
          color: '#2563EB',
          chipBackground: 'rgba(37, 99, 235, 0.12)',
          icon: 'search-outline',
          showAnimation: true,
        };
      case 'matched':
        return {
          label: 'Matched',
          sublabel: booking.providerName
            ? `${booking.providerName}${
                booking.providerEta ? ` • ETA ${booking.providerEta}` : ''
              }`
            : 'Provider assigned',
          color: '#059669',
          chipBackground: 'rgba(5, 150, 105, 0.14)',
          icon: 'checkmark-circle-outline',
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          sublabel: 'Job in progress',
          color: '#0F172A',
          chipBackground: 'rgba(15, 23, 42, 0.12)',
          icon: 'time-outline',
        };
      case 'no_accept':
        return {
          label: 'No providers',
          sublabel: 'No provider accepted',
          color: '#EA580C',
          chipBackground: 'rgba(234, 88, 12, 0.14)',
          icon: 'alert-circle-outline',
        };
      case 'completed':
        return {
          label: 'Completed',
          sublabel: booking.totalAmount ? `Paid ₹${booking.totalAmount.toLocaleString('en-IN')}` : 'Completed',
          color: '#475569',
          chipBackground: 'rgba(148, 163, 184, 0.16)',
          icon: 'checkmark-done-outline',
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          sublabel: 'Cancelled',
          color: '#94A3B8',
          chipBackground: 'rgba(226, 232, 240, 0.5)',
          icon: 'close-circle-outline',
        };
      case 'pending':
        return {
          label: 'Pending',
          sublabel: 'Awaiting confirmation',
          color: '#F59E0B',
          chipBackground: 'rgba(245, 158, 11, 0.14)',
          icon: 'time-outline',
        };
      default:
        return {
          label: booking.displayStatus,
          sublabel: '',
          color: COLORS_MINIMAL.text.secondary,
          chipBackground: 'rgba(148, 163, 184, 0.12)',
          icon: 'ellipse-outline',
        };
    }
  };

  const formatDateShort = (dateString: string | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTimeShort = (dateString: string | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const coerceNumber = (value: any) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    return `₹ ${value.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })}`;
  };

  const slugifyIconKey = (value: string | null | undefined) => {
    if (!value) return null;
    const slug = value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/&/g, '-and-')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return slug || null;
  };

  const extractIconCandidates = (entity: any): string[] => {
    if (!entity) return [];

    if (typeof entity === 'string') {
      const slug = slugifyIconKey(entity);
      return slug ? [slug, entity] : [entity];
    }

    const candidates: string[] = [];
    const possibleKeys = [
      'icon',
      'iconKey',
      'iconName',
      'iconSlug',
      'slug',
      'code',
      'key',
      'imageKey',
      'image',
    ];

    possibleKeys.forEach((key) => {
      const value = entity?.[key];
      if (typeof value === 'string' && value.trim()) {
        candidates.push(value.trim());
      }
    });

    if (typeof entity?.name === 'string') {
      const slug = slugifyIconKey(entity.name);
      if (slug) candidates.push(slug);
    }

    if (typeof entity?.title === 'string') {
      const slug = slugifyIconKey(entity.title);
      if (slug) candidates.push(slug);
    }

    if (typeof entity?.category === 'string') {
      const slug = slugifyIconKey(entity.category);
      if (slug) candidates.push(slug);
    }

    if (typeof entity?.subcategory === 'string') {
      const slug = slugifyIconKey(entity.subcategory);
      if (slug) candidates.push(slug);
    }

    return candidates;
  };

  const getServiceIconSource = (booking: UnifiedBooking) => {
    const candidates: string[] = [];

    const lowerTitle = (booking.title || '').toLowerCase();
    if (lowerTitle) {
      Object.entries(TITLE_KEYWORD_ALIASES).forEach(([keyword, iconKey]) => {
        if (lowerTitle.includes(keyword)) {
          candidates.push(iconKey);
        }
      });
    }

    const subcategoryCandidates = [
      (booking as any).subcategory,
      (booking as any).subCategory,
      (booking as any).subCategoryId,
      (booking.metadata as any)?.subcategory,
      (booking.metadata as any)?.subCategory,
    ];

    const categoryCandidates = [
      booking.category,
      (booking as any).categoryId,
      (booking.metadata as any)?.category,
    ];

    subcategoryCandidates.forEach((entity) => {
      candidates.push(...extractIconCandidates(entity));
    });
    categoryCandidates.forEach((entity) => {
      candidates.push(...extractIconCandidates(entity));
    });

    const titleSlug = slugifyIconKey(booking.title);
    if (titleSlug) {
      candidates.push(titleSlug);

      const parts = titleSlug
        .split('-')
        .filter(Boolean)
        .filter((part) => !TITLE_STOP_WORDS.has(part))
        .filter((part) => !/^\d+$/.test(part));

      for (let len = Math.min(3, parts.length); len >= 2; len -= 1) {
        for (let i = 0; i <= parts.length - len; i += 1) {
          const segment = parts.slice(i, i + len).join('-');
          candidates.push(segment);
        }
      }

      parts.forEach((part) => candidates.push(part));
    }

    const normalizedCandidates = candidates
      .map((candidate) => {
        if (!candidate) return null;
        const normalized = slugifyIconKey(candidate) || candidate;
        return ICON_KEY_ALIASES[normalized] || normalized;
      })
      .filter(Boolean) as string[];

    for (const candidate of normalizedCandidates) {
      if (candidate && categoryIcons[candidate]) {
        return categoryIcons[candidate];
      }
    }

    return categoryIcons['tools'];
  };

  const getDisplayId = (booking: UnifiedBooking) => {
    const raw =
      booking.referenceNumber ||
      booking.displayId ||
      booking.shortCode ||
      booking.bookingCode ||
      booking.orderNumber ||
      booking.id;
    if (!raw) return null;
    const cleaned = raw.toString().replace(/^#/, '');
    if (!cleaned) return null;
    if (cleaned === booking.id && cleaned.length > 8) {
      return `#${cleaned.slice(-8).toUpperCase()}`;
    }
    return `#${cleaned}`;
  };

  const getDurationLabel = (booking: UnifiedBooking) => {
    const durationLabel =
      booking.metadata?.durationLabel ||
      (booking.metadata?.durationHours
        ? `${booking.metadata.durationHours} hrs`
        : null);
    return durationLabel || null;
  };

  const getPriceBadge = (booking: UnifiedBooking) => {
    const totalAmount = coerceNumber(booking.totalAmount);
    const quotedPrice = coerceNumber(booking.metadata?.quotedPrice);
    const estimatedAmount = coerceNumber(booking.estimatedAmount);
    const budgetMax =
      typeof booking.budget === 'object' ? coerceNumber(booking.budget?.max) : null;
    const budgetScalar =
      typeof booking.budget === 'number' ? coerceNumber(booking.budget) : null;

    const amount =
      totalAmount ??
      quotedPrice ??
      estimatedAmount ??
      budgetMax ??
      budgetScalar;

    if (!amount) return null;

    const formatted = formatCurrency(amount);
    if (!formatted) return null;

    const isLocked = ['matched', 'in_progress', 'completed'].includes(
      booking.displayStatus || ''
    );

    return {
      text: `${formatted} ${isLocked ? 'locked' : '(est)'}`,
      variant: isLocked ? 'locked' : 'estimate',
    };
  };

  // Helper function to get display title and subtitle from booking
  const getBookingDisplayInfo = (booking: UnifiedBooking) => {
    let title = booking.title || 'Service';
    let subtitle = '';

    // For service requests, show category/subcategory
    if (booking.type === 'service_request') {
      if (booking.subcategory?.name) {
        subtitle = booking.subcategory.name;
      } else if (booking.category?.name) {
        subtitle = booking.category.name;
      }
    } else {
      // For orders, show category
      if (booking.subcategory?.name) {
        subtitle = booking.category?.name || '';
      } else if (booking.category?.name) {
        subtitle = booking.category.name;
      }
    }

    return { title, subtitle };
  };

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.serviceStartDate || booking.createdAt);
    const now = new Date();

    // Reset time to start of day for proper date comparison
    const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (activeTab === 'upcoming') {
      // Upcoming: future/today bookings with active statuses OR no_accept with future dates
      const isFutureOrToday = bookingDateOnly >= todayOnly;
      const isActiveStatus = ['searching', 'matched', 'in_progress', 'pending'].includes(booking.displayStatus);
      const isFailedButFuture = booking.displayStatus === 'no_accept' && isFutureOrToday;

      // Show in upcoming if:
      // 1. Active status with future/today date, OR
      // 2. Failed request (no_accept) but scheduled for future/today
      return (isActiveStatus && isFutureOrToday) || isFailedButFuture;
    } else {
      // Past: completed, cancelled, no_accept statuses with past dates
      const isPastDate = bookingDateOnly < todayOnly;
      const isCompletedStatus = ['completed', 'cancelled', 'no_accept'].includes(booking.displayStatus);

      // Show in past if:
      // 1. Completed/cancelled/no_accept status with past date
      return isCompletedStatus && isPastDate;
    }
  });

  const renderBookingCard = (booking: UnifiedBooking) => {
    const bookingDate = booking.serviceStartDate || booking.createdAt;
    const { title, subtitle } = getBookingDisplayInfo(booking);
    const statusDisplay = getStatusDisplay(booking);
    const serviceIcon = getServiceIconSource(booking);
    const displayId = getDisplayId(booking);
    const fallbackId =
      !displayId && booking.id ? `#${booking.id.slice(-8).toUpperCase()}` : null;
    const priceBadge = getPriceBadge(booking);
    const locationLabel = booking.location?.address
      ? booking.location.address.split(',')[0]?.trim()
      : null;
    const dateLabel = formatDateShort(bookingDate);
    const durationLabel = getDurationLabel(booking);
    const fallbackTime = durationLabel ? null : formatTimeShort(bookingDate);
    const metaParts = [locationLabel, dateLabel, durationLabel || fallbackTime].filter(Boolean);

    // Navigate to appropriate detail screen
    const handlePress = () => {
      if (booking.type === 'service_request') {
        // Pass the full booking object instead of just ID
        navigation.navigate('ServiceRequestDetails', {
          requestId: booking.id,
          serviceRequest: booking // Pass the entire booking data
        });
      } else {
        navigation.navigate('SeekerOrderDetail', { orderId: booking.id });
      }
    };

    return (
      <TouchableOpacity
        key={booking.id}
        style={styles.bookingItem}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.bookingRow}>
          <Image source={serviceIcon} style={styles.serviceIcon} resizeMode="contain" />
          <View style={styles.bookingContent}>
            <View style={styles.bookingTopRow}>
              <View style={styles.bookingTitleStack}>
                <Text style={styles.bookingTitle}>{title}</Text>
                {(displayId || fallbackId) && (
                  <Text style={styles.bookingIdText}>{displayId || fallbackId}</Text>
                )}
              </View>
              {priceBadge ? (
                <View
                  style={[
                    styles.priceBadge,
                    priceBadge.variant === 'locked'
                      ? styles.priceBadgeLocked
                      : styles.priceBadgeEstimate,
                  ]}
                >
                  <Text
                    style={[
                      styles.priceBadgeText,
                      priceBadge.variant === 'locked'
                        ? styles.priceBadgeTextLocked
                        : styles.priceBadgeTextEstimate,
                    ]}
                  >
                    {priceBadge.text}
                  </Text>
                </View>
              ) : null}
            </View>

            {subtitle ? (
              <Text style={styles.bookingSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}

            <View style={styles.statusLine}>
              <View
                style={[
                  styles.statusChip,
                  { backgroundColor: statusDisplay.chipBackground || 'rgba(148, 163, 184, 0.12)' },
                ]}
              >
                {/* {statusDisplay.showAnimation ? (
                  <View style={styles.statusChipAnimation}>
                    <RippleAnimation color={statusDisplay.color} size={20} duration={1600} />
                  </View>
                ) : (
                  <Ionicons name={statusDisplay.icon} size={14} color={statusDisplay.color} />
                )} */}
                <Text style={[styles.statusChipText, { color: statusDisplay.color }]}>
                  {statusDisplay.label}
                </Text>
              </View>
              {statusDisplay.sublabel ? (
                <Text style={styles.statusLineText} numberOfLines={1}>
                  {statusDisplay.sublabel}
                </Text>
              ) : null}
            </View>

            {metaParts.length > 0 ? (
              <Text style={styles.metaLine} numberOfLines={1}>
                {metaParts.join(' • ')}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.listDivider} />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        
      </View>

      {/* Tab Bar */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[COLORS_MINIMAL.accent]}
            tintColor={COLORS_MINIMAL.accent}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS_MINIMAL.accent} />
          </View>
        ) : filteredBookings.length > 0 ? (
          filteredBookings.map(renderBookingCard)
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons 
                name={activeTab === 'upcoming' ? 'calendar-outline' : 'time-outline'} 
                size={48} 
                color={COLORS_MINIMAL.text.muted} 
              />
            </View>
            <Text style={styles.emptyTitle}>
              No {activeTab} bookings
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'upcoming' 
                ? 'Your upcoming bookings will appear here'
                : 'Your completed and past bookings will appear here'}
            </Text>
            {activeTab === 'upcoming' && (
              <TouchableOpacity 
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Home')}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreButtonText}>Explore Services</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS_MINIMAL.background,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS_MINIMAL.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 10,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  bookingItem: {
    paddingVertical: 12,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  serviceIcon: {
    width: 64,
    height: 64,
  },
  bookingContent: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.text.primary,
  },
  bookingTitleStack: {
    flex: 1,
    marginRight: 12,
  },
  bookingIdText: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.muted,
  },
  bookingSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
  },
  bookingTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  priceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  priceBadgeEstimate: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  priceBadgeLocked: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    borderColor: '#34D399',
  },
  priceBadgeText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  priceBadgeTextEstimate: {
    color: '#475569',
  },
  priceBadgeTextLocked: {
    color: '#047857',
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusChipAnimation: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  statusLineText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS_MINIMAL.text.secondary,
  },
  metaLine: {
    marginTop: 12,
    fontSize: 13,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS_MINIMAL.text.secondary,
  },
  listDivider: {
    marginTop: 18,
    height: 1,
    backgroundColor: COLORS_MINIMAL.divider,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS_MINIMAL.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
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
  },
  exploreButton: {
    backgroundColor: COLORS_MINIMAL.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  exploreButtonText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.background,
  },
});

export default BookingsScreen;
