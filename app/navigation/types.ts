import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Main: NavigatorScreenParams<BottomTabParamList>;
  SignIn: undefined;
  SignUp: undefined;
  OTPVerification: undefined;
  CategoryBrowser: { selectedCategoryId?: string; searchQuery?: string; dateRange?: { startDate: string | null; endDate: string | null; } };
  ListingDetail: { listingId: string };
  OrderDetail: { orderId?: string; bookingId?: string };
  Chat: undefined;
  CreateListing: { listingId?: string };
};

export type BottomTabParamList = {
  Home: undefined;
  Bookings: undefined;
  Create: undefined;
  Messages: undefined;
  Account: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
