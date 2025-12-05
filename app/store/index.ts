import {configureStore} from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import dateRangeReducer from './slices/dateRangeSlice';
import listingReducer from './slices/listingSlice';
import locationReducer from './slices/locationSlice';
import serviceRequestsReducer from './slices/serviceRequestsSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    date: dateRangeReducer,
    listing: listingReducer,
    location: locationReducer,
    serviceRequests: serviceRequestsReducer,
    notifications: notificationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
