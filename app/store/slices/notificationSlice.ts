import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import NotificationService, { Notification, PaginatedNotifications } from '../../services/NotificationService';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
}

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
    },
    loading: false,
    loadingMore: false,
    error: null,
};

// Fetch notifications (initial load or refresh)
export const fetchNotifications = createAsyncThunk(
    'notifications/fetchNotifications',
    async (_, { rejectWithValue }) => {
        try {
            const response = await NotificationService.getNotifications(1, 20, false);
            return response;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch notifications');
        }
    },
);

// Fetch more notifications (pagination)
export const fetchMoreNotifications = createAsyncThunk(
    'notifications/fetchMoreNotifications',
    async (page: number, { rejectWithValue }) => {
        try {
            const response = await NotificationService.getNotifications(page, 20, false);
            return response;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch more notifications');
        }
    },
);

// Fetch unread count
export const fetchUnreadCount = createAsyncThunk(
    'notifications/fetchUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const response = await NotificationService.getUnreadCount();
            return response.count;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to fetch unread count');
        }
    },
);

// Mark notification as read
export const markNotificationAsRead = createAsyncThunk(
    'notifications/markAsRead',
    async (notificationId: string, { rejectWithValue }) => {
        try {
            await NotificationService.markAsRead(notificationId);
            return notificationId;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to mark notification as read');
        }
    },
);

// Mark all notifications as read
export const markAllNotificationsAsRead = createAsyncThunk(
    'notifications/markAllAsRead',
    async (_, { rejectWithValue }) => {
        try {
            await NotificationService.markAllAsRead();
            return true;
        } catch (error: any) {
            return rejectWithValue(error?.message || 'Failed to mark all notifications as read');
        }
    },
);

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        // Optimistically increment unread count (for new push notifications)
        incrementUnreadCount: (state) => {
            state.unreadCount += 1;
        },
        // Add notification at the top of the list (for new push notifications)
        addNotification: (state, action: PayloadAction<Notification>) => {
            state.notifications.unshift(action.payload);
            state.unreadCount += 1;
        },
        // Reset state on logout
        resetNotifications: () => initialState,
    },
    extraReducers: (builder) => {
        builder
            // Fetch notifications
            .addCase(fetchNotifications.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action: PayloadAction<PaginatedNotifications>) => {
                state.loading = false;
                state.notifications = action.payload.notifications;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch more notifications
            .addCase(fetchMoreNotifications.pending, (state) => {
                state.loadingMore = true;
            })
            .addCase(fetchMoreNotifications.fulfilled, (state, action: PayloadAction<PaginatedNotifications>) => {
                state.loadingMore = false;
                state.notifications = [...state.notifications, ...action.payload.notifications];
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchMoreNotifications.rejected, (state, action) => {
                state.loadingMore = false;
                state.error = action.payload as string;
            })
            // Fetch unread count
            .addCase(fetchUnreadCount.fulfilled, (state, action: PayloadAction<number>) => {
                state.unreadCount = action.payload;
            })
            // Mark notification as read
            .addCase(markNotificationAsRead.fulfilled, (state, action: PayloadAction<string>) => {
                const notification = state.notifications.find((n) => n._id === action.payload);
                if (notification && !notification.isRead) {
                    notification.isRead = true;
                    notification.readAt = new Date().toISOString();
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            // Mark all as read
            .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
                state.notifications.forEach((n) => {
                    n.isRead = true;
                    n.readAt = new Date().toISOString();
                });
                state.unreadCount = 0;
            });
    },
});

export const { incrementUnreadCount, addNotification, resetNotifications } = notificationSlice.actions;

export default notificationSlice.reducer;
