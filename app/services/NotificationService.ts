import apiInterceptor from './apiInterceptor';

export interface Notification {
    _id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    imageUrl?: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, any>;
    isRead: boolean;
    readAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedNotifications {
    notifications: Notification[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

export interface UnreadCount {
    count: number;
}

class NotificationService {
    /**
     * Get user notifications with pagination
     */
    async getNotifications(
        page: number = 1,
        limit: number = 20,
        unreadOnly: boolean = false,
    ): Promise<PaginatedNotifications> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            unreadOnly: unreadOnly.toString(),
        });

        const result = await apiInterceptor.makeAuthenticatedRequest<PaginatedNotifications>(
            `/notifications?${params}`,
            { method: 'GET' },
        );

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to fetch notifications');
        }

        return result.data;
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(): Promise<UnreadCount> {
        const result = await apiInterceptor.makeAuthenticatedRequest<UnreadCount>(
            '/notifications/unread-count',
            { method: 'GET' },
        );

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to fetch unread count');
        }

        return result.data;
    }

    /**
     * Mark single notification as read
     */
    async markAsRead(notificationId: string): Promise<Notification> {
        const result = await apiInterceptor.makeAuthenticatedRequest<Notification>(
            `/notifications/${notificationId}/read`,
            { method: 'POST' },
        );

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to mark notification as read');
        }

        return result.data;
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<{ modifiedCount: number }> {
        const result = await apiInterceptor.makeAuthenticatedRequest<{ modifiedCount: number }>(
            '/notifications/read-all',
            { method: 'POST' },
        );

        if (!result.success || !result.data) {
            throw new Error(result.error || 'Failed to mark all notifications as read');
        }

        return result.data;
    }
}

export default new NotificationService();
