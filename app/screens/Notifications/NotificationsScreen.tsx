import React, { useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, scaleFontSize, scaleSize } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RootState, AppDispatch } from '../../store';
import {
    fetchNotifications,
    fetchMoreNotifications,
    fetchUnreadCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
} from '../../store/slices/notificationSlice';
import { Notification } from '../../services/NotificationService';

// Notification type to icon mapping
const getNotificationIcon = (type: string): { name: string; color: string; bgColor: string } => {
    switch (type) {
        case 'service-request-accepted':
            return { name: 'checkmark-circle', color: '#10B981', bgColor: '#D1FAE5' };
        case 'service-request-expired':
        case 'service-request-no-providers':
            return { name: 'alert-circle', color: '#F59E0B', bgColor: '#FEF3C7' };
        case 'service-request-new-opportunity':
            return { name: 'flash', color: '#3B82F6', bgColor: '#DBEAFE' };
        case 'service-request-closed':
            return { name: 'close-circle', color: '#6B7280', bgColor: '#F3F4F6' };
        case 'order-in-progress':
            return { name: 'time', color: '#8B5CF6', bgColor: '#EDE9FE' };
        case 'order-completed':
            return { name: 'trophy', color: '#10B981', bgColor: '#D1FAE5' };
        case 'payment-received':
            return { name: 'cash', color: '#10B981', bgColor: '#D1FAE5' };
        case 'new-review':
            return { name: 'star', color: '#F59E0B', bgColor: '#FEF3C7' };
        default:
            return { name: 'notifications', color: COLORS.PRIMARY.MAIN, bgColor: COLORS.PRIMARY.LIGHT };
    }
};

// Format time relative to now (Instagram style)
const formatTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d`;
    } else {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `${weeks}w`;
    }
};

// Group notifications by time period (Instagram style)
const groupNotifications = (notifications: Notification[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeek = new Date(today.getTime() - 7 * 86400000);
    const thisMonth = new Date(today.getTime() - 30 * 86400000);

    const groups: { title: string; data: Notification[] }[] = [
        { title: 'Today', data: [] },
        { title: 'Yesterday', data: [] },
        { title: 'This Week', data: [] },
        { title: 'This Month', data: [] },
        { title: 'Earlier', data: [] },
    ];

    notifications.forEach((notification) => {
        const notifDate = new Date(notification.createdAt);
        if (notifDate >= today) {
            groups[0].data.push(notification);
        } else if (notifDate >= yesterday) {
            groups[1].data.push(notification);
        } else if (notifDate >= thisWeek) {
            groups[2].data.push(notification);
        } else if (notifDate >= thisMonth) {
            groups[3].data.push(notification);
        } else {
            groups[4].data.push(notification);
        }
    });

    // Filter out empty groups
    return groups.filter((group) => group.data.length > 0);
};

// Notification item component
const NotificationItem = ({
    notification,
    onPress,
}: {
    notification: Notification;
    onPress: (notification: Notification) => void;
}) => {
    const icon = getNotificationIcon(notification.type);

    return (
        <TouchableOpacity
            style={[styles.notificationItem, !notification.isRead && styles.unreadItem]}
            onPress={() => onPress(notification)}
            activeOpacity={0.7}>
            <View style={[styles.iconContainer, { backgroundColor: icon.bgColor }]}>
                <Ionicons name={icon.name as any} size={scaleSize(20)} color={icon.color} />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, !notification.isRead && styles.unreadTitle]}>{notification.title}</Text>
                    <Text style={styles.body} numberOfLines={2}>
                        {notification.body}
                    </Text>
                </View>
                <View style={styles.timeContainer}>
                    <Text style={styles.time}>{formatTimeAgo(notification.createdAt)}</Text>
                    {!notification.isRead && <View style={styles.unreadDot} />}
                </View>
            </View>
        </TouchableOpacity>
    );
};

// Section header component
const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
    </View>
);

const NotificationsScreen = () => {
    const navigation = useNavigation<any>();
    const dispatch: AppDispatch = useDispatch();
    const { notifications, unreadCount, loading, loadingMore, pagination, error } = useSelector(
        (state: RootState) => state.notifications,
    );

    // Fetch notifications on screen focus, mark all as read when leaving
    useFocusEffect(
        useCallback(() => {
            dispatch(fetchNotifications());
            dispatch(fetchUnreadCount());

            // Return cleanup function that runs when screen loses focus
            return () => {
                // Mark all notifications as read when navigating away
                dispatch(markAllNotificationsAsRead());
            };
        }, [dispatch]),
    );

    // Group notifications for display
    const groupedNotifications = useMemo(() => groupNotifications(notifications), [notifications]);

    // Handle notification press
    const handleNotificationPress = useCallback(
        (notification: Notification) => {
            console.log('[NotificationsScreen] Pressed notification:', {
                type: notification.type,
                targetType: notification.targetType,
                targetId: notification.targetId,
            });

            // Mark as read
            if (!notification.isRead) {
                dispatch(markNotificationAsRead(notification._id));
            }

            // Navigate based on notification type and target type
            try {
                // Seeker notifications for accepted requests or no providers
                if (notification.type === 'service-request-accepted' || notification.type === 'service-request-no-providers') {
                    // For these notifications, targetType is service_request and targetId is requestId
                    const requestId = notification.targetId ||
                                     (notification as any).metadata?.requestId;
                    if (requestId) {
                        console.log(`[NotificationsScreen] Navigating to ServiceRequestDetails (seeker view) for ${notification.type} with requestId:`, requestId);
                        navigation.navigate('ServiceRequestDetails', { requestId });
                    } else {
                        console.log(`[NotificationsScreen] No requestId found for ${notification.type} notification`);
                    }
                } else if (notification.type === 'order-in-progress') {
                    // For order-in-progress, check if we have requestId in metadata (new format)
                    // or fall back to orderId navigation (old format)
                    const requestId = (notification as any).metadata?.requestId;
                    if (requestId) {
                        console.log('[NotificationsScreen] Navigating to ServiceRequestDetails with requestId:', requestId);
                        navigation.navigate('ServiceRequestDetails', { requestId });
                    } else if (notification.targetId) {
                        // Old format - targetId is orderId, navigate to OrderDetail
                        console.log('[NotificationsScreen] Navigating to OrderDetail with orderId:', notification.targetId);
                        navigation.navigate('OrderDetail', { orderId: notification.targetId });
                    } else {
                        console.log('[NotificationsScreen] No requestId or orderId found for order-in-progress notification');
                    }
                } else if (notification.targetType === 'service_request' && notification.targetId) {
                    // Provider notifications (e.g., new-opportunity) - navigate to accept/decline screen
                    console.log('[NotificationsScreen] Navigating to ServiceRequestDetail (provider view) with requestId:', notification.targetId);
                    navigation.navigate('Provider', {
                        screen: 'ServiceRequestDetail',
                        params: { requestId: notification.targetId },
                    });
                } else if (notification.targetType === 'order' && notification.targetId) {
                    console.log('[NotificationsScreen] Navigating to OrderDetail with orderId:', notification.targetId);
                    navigation.navigate('OrderDetail', { orderId: notification.targetId });
                } else {
                    console.log('[NotificationsScreen] No navigation target for notification type:', notification.type);
                }
            } catch (error) {
                console.error('[NotificationsScreen] Navigation error:', error);
            }
        },
        [dispatch, navigation],
    );

    // Handle mark all as read
    const handleMarkAllAsRead = useCallback(() => {
        if (unreadCount > 0) {
            dispatch(markAllNotificationsAsRead());
        }
    }, [dispatch, unreadCount]);

    // Handle refresh
    const handleRefresh = useCallback(() => {
        dispatch(fetchNotifications());
        dispatch(fetchUnreadCount());
    }, [dispatch]);

    // Handle load more
    const handleLoadMore = useCallback(() => {
        if (pagination.hasMore && !loadingMore) {
            dispatch(fetchMoreNotifications(pagination.page + 1));
        }
    }, [dispatch, pagination, loadingMore]);

    // Render footer (loading indicator)
    const renderFooter = () => {
        if (!loadingMore) return null;
        return (
            <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
            </View>
        );
    };

    // Render empty state
    const renderEmpty = () => {
        if (loading) {
            return (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color={COLORS.PRIMARY.MAIN} />
                </View>
            );
        }

        return (
            <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                    <Ionicons name="notifications-outline" size={scaleSize(40)} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptySubtitle}>
                    When you get notifications, they'll show up here
                </Text>
            </View>
        );
    };

    // Flatten grouped notifications for FlatList with section headers
    const flattenedData = useMemo(() => {
        const result: Array<{ type: 'header' | 'item'; data: string | Notification }> = [];
        groupedNotifications.forEach((group) => {
            result.push({ type: 'header', data: group.title });
            group.data.forEach((notification) => {
                result.push({ type: 'item', data: notification });
            });
        });
        return result;
    }, [groupedNotifications]);

    const renderFlatItem = ({ item }: { item: { type: 'header' | 'item'; data: string | Notification } }) => {
        if (item.type === 'header') {
            return <SectionHeader title={item.data as string} />;
        }
        return <NotificationItem notification={item.data as Notification} onPress={handleNotificationPress} />;
    };

    return (
        <SafeAreaWrapper backgroundColor={COLORS.BACKGROUND.PRIMARY}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
                        <Text style={styles.markAllText}>Mark all as read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Notification List */}
            {notifications.length === 0 ? (
                renderEmpty()
            ) : (
                <FlatList
                    data={flattenedData}
                    renderItem={renderFlatItem}
                    keyExtractor={(item, index) =>
                        item.type === 'header' ? `header-${item.data}` : (item.data as Notification)._id
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={loading}
                            onRefresh={handleRefresh}
                            colors={[COLORS.PRIMARY.MAIN]}
                            tintColor={COLORS.PRIMARY.MAIN}
                        />
                    }
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListFooterComponent={renderFooter}
                />
            )}
        </SafeAreaWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(16),
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    headerTitle: {
        fontSize: scaleFontSize(18),
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        color: '#000000',
    },
    markAllButton: {
        paddingVertical: scaleSize(6),
        paddingHorizontal: scaleSize(12),
    },
    markAllText: {
        fontSize: scaleFontSize(14),
        fontFamily: FONTS.POPPINS.MEDIUM,
        color: COLORS.PRIMARY.MAIN,
    },
    listContent: {
        paddingBottom: scaleSize(100),
    },
    sectionHeader: {
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(12),
        backgroundColor: '#F8FAFC',
    },
    sectionTitle: {
        fontSize: scaleFontSize(14),
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        color: '#64748B',
    },
    notificationItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: scaleSize(20),
        paddingVertical: scaleSize(14),
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    unreadItem: {
        backgroundColor: '#F0F9FF',
    },
    iconContainer: {
        width: scaleSize(44),
        height: scaleSize(44),
        borderRadius: scaleSize(22),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scaleSize(12),
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    textContainer: {
        flex: 1,
        marginRight: scaleSize(12),
    },
    title: {
        fontSize: scaleFontSize(14),
        fontFamily: FONTS.POPPINS.MEDIUM,
        color: '#1F2937',
        marginBottom: scaleSize(2),
    },
    unreadTitle: {
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        color: '#000000',
    },
    body: {
        fontSize: scaleFontSize(13),
        fontFamily: FONTS.POPPINS.REGULAR,
        color: '#6B7280',
        lineHeight: scaleFontSize(18),
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    time: {
        fontSize: scaleFontSize(12),
        fontFamily: FONTS.POPPINS.REGULAR,
        color: '#9CA3AF',
    },
    unreadDot: {
        width: scaleSize(8),
        height: scaleSize(8),
        borderRadius: scaleSize(4),
        backgroundColor: COLORS.PRIMARY.MAIN,
        marginTop: scaleSize(6),
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: scaleSize(40),
        paddingBottom: scaleSize(100),
    },
    emptyIconContainer: {
        width: scaleSize(80),
        height: scaleSize(80),
        borderRadius: scaleSize(40),
        borderWidth: 2,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scaleSize(20),
    },
    emptyTitle: {
        fontSize: scaleFontSize(18),
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        color: '#1F2937',
        marginBottom: scaleSize(8),
    },
    emptySubtitle: {
        fontSize: scaleFontSize(14),
        fontFamily: FONTS.POPPINS.REGULAR,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: scaleFontSize(20),
    },
    loadingFooter: {
        paddingVertical: scaleSize(20),
        alignItems: 'center',
    },
});

export default NotificationsScreen;
