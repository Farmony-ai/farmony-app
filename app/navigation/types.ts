import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Main: NavigatorScreenParams<BottomTabParamList>;
  Auth: undefined;
  SignIn: undefined;
  SignUp: undefined;
  OTPVerification: undefined;
  ForgotPassword: undefined;
  CategoryBrowser: { selectedCategoryId?: string; searchQuery?: string; dateRange?: { startDate: string | null; endDate: string | null; } };
  ListingDetail: { listingId: string };
  Listings: undefined;
  SearchResults: { 
    searchQuery?: string; 
    location?: string; 
    dateRange?: { startDate: string | null; endDate: string | null; };
    categoryId?: string;
    subCategoryId?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  };
  OrderDetail: undefined;
  Chat: undefined;
  Profile: undefined;
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
