import { Category, SubCategory } from './CatalogueService';
import { ImagePickerResult } from './ImagePickerService';
import apiInterceptor from './apiInterceptor';

export interface CreateListingPayload {
  providerId: string;
  title: string;
  description: string;
  categoryId: string;
  subCategoryId: string;
  // Optional human-readable category and subcategory names mapped from their IDs
  category?: string;
  subcategory?: string;
  photos: ImagePickerResult[];
  coordinates: [number, number]; // [longitude, latitude]
  // Optional: Address ID for service location (if provided, backend uses this address's coordinates)
  addressId?: string;
  price: number;
  unitOfMeasure: string;
  minimumOrder: number;
  availableFrom: string;
  availableTo: string;
  isActive: boolean;
  tags: string[];
  isVerified: boolean;
}

export interface Listing extends CreateListingPayload {
  _id: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  bookingCount: number;
  __v: number;
}

export interface PopulatedListing extends Omit<Listing, 'categoryId' | 'subCategoryId'> {
  categoryId: Category;
  subCategoryId: SubCategory;
}

class ListingService {
  async createListing(payload: CreateListingPayload, token: string): Promise<Listing> {
    try {
      console.log('ListingService: Creating listing with payload:', payload);
      console.log('ListingService: Using token:', token);

      // Create FormData for file upload
      const formData = new FormData();

      // Add photos as files
      if (payload.photos && payload.photos.length > 0) {
        payload.photos.forEach((photo, index) => {
          if (photo.uri) {
            // Create file object from URI
            const file = {
              uri: photo.uri,
              type: photo.type || 'image/jpeg',
              name: photo.name || `photo_${index}.jpg`,
            } as any;

            formData.append('photos', file);
          }
        });
      }

      // Add other data as JSON string
      const listingData = {
        providerId: payload.providerId,
        title: payload.title,
        description: payload.description,
        categoryId: payload.categoryId,
        subCategoryId: payload.subCategoryId,
        // Include mapped names if present
        ...(payload.category ? { category: payload.category } : {}),
        ...(payload.subcategory ? { subcategory: payload.subcategory } : {}),
        // Include addressId if provided (backend will use this address's coordinates)
        ...(payload.addressId ? { addressId: payload.addressId } : {}),
        coordinates: payload.coordinates,
        price: payload.price,
        unitOfMeasure: payload.unitOfMeasure,
        minimumOrder: payload.minimumOrder,
        availableFrom: payload.availableFrom,
        availableTo: payload.availableTo,
        tags: payload.tags,
        isActive: payload.isActive,
        isVerified: payload.isVerified,
      };

      formData.append('data', JSON.stringify(listingData));

      console.log('ListingService: Sending FormData with files:', payload.photos?.length || 0);
      console.log('ListingService: FormData structure:', {
        hasPhotos: (payload.photos?.length || 0) > 0,
        photoCount: payload.photos?.length || 0,
        firstPhotoUri: payload.photos?.[0]?.uri || 'none'
      });

      const response = await apiInterceptor.makeAuthenticatedRequest<Listing>('/listings', {
        method: 'POST',
        body: formData,
      });

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to create listing');
    } catch (error: any) {
      console.error('ListingService: Error creating listing:', error);
      throw error;
    }
  }

  async getProviderListings(providerId: string, token?: string): Promise<Listing[]> {
    try {
      const response = await apiInterceptor.makeAuthenticatedRequest<Listing[]>(
        `/listings/provider/${providerId}`,
        { method: 'GET' }
      );

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch provider listings');
    } catch (error: any) {
      console.error('Error fetching provider listings:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch provider listings');
    }
  }

  async getListingById(listingId: string, token?: string): Promise<PopulatedListing> {
    try {
      const response = await apiInterceptor.makeAuthenticatedRequest<PopulatedListing>(
        `/listings/${listingId}`,
        { method: 'GET' }
      );

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch listing');
    } catch (error: any) {
      console.error('Error fetching listing:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch listing');
    }
  }

  async updateListing(listingId: string, payload: Partial<CreateListingPayload>, token: string): Promise<Listing> {
    try {
      console.log('ListingService.updateListing - listingId:', listingId);

      // Create FormData for file upload (similar to createListing)
      const formData = new FormData();

      // Add photos as files if they exist
      if (payload.photos && payload.photos.length > 0) {
        payload.photos.forEach((photo, index) => {
          if (photo.uri) {
            // Create file object from URI
            const file = {
              uri: photo.uri,
              type: photo.type || 'image/jpeg',
              name: photo.name || `photo_${index}.jpg`,
            } as any;

            formData.append('photos', file);
          }
        });
      }

      // Create a copy of payload without photos for JSON data
      const { photos, ...rest } = payload;

      const listingData = {
        ...rest,
        ...(rest?.category ? { category: rest.category } : {}),
        ...(rest?.subcategory ? { subcategory: rest.subcategory } : {}),
      };

      // Add other data as JSON string
      formData.append('data', JSON.stringify(listingData));

      console.log('ListingService.updateListing - FormData structure:', {
        hasPhotos: (payload.photos?.length || 0) > 0,
        photoCount: payload.photos?.length || 0,
        firstPhotoUri: payload.photos?.[0]?.uri || 'none'
      });

      const response = await apiInterceptor.makeAuthenticatedRequest<Listing>(
        `/listings/${listingId}`,
        {
          method: 'PATCH',
          body: formData,
        }
      );

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to update listing');
    } catch (error: any) {
      console.error('Error updating listing:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update listing');
    }
  }

  async deleteListing(listingId: string, token: string): Promise<void> {
    try {
      const response = await apiInterceptor.makeAuthenticatedRequest<void>(
        `/listings/${listingId}`,
        { method: 'DELETE' }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete listing');
      }
    } catch (error: any) {
      console.error('Error deleting listing:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to delete listing');
    }
  }

  async toggleListingStatus(listingId: string, isActive: boolean, token: string): Promise<Listing> {
    try {
      const response = await apiInterceptor.makeAuthenticatedRequest<Listing>(
        `/listings/${listingId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive }),
        }
      );

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to update listing status');
    } catch (error: any) {
      console.error('Error toggling listing status:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to update listing status');
    }
  }

  async searchListings(params: {
    text?: string;
    categoryId?: string;
    subCategoryId?: string;
    location?: string;
    date?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    priceMin?: number;
    priceMax?: number;
    providerId?: string;
    isActive?: boolean;
  }, _token?: string): Promise<Listing[]> {
    try {
      const queryParams = new URLSearchParams();

      // Map parameters to API endpoint format
      if (params.text) queryParams.append('searchText', params.text);
      if (params.categoryId) queryParams.append('categoryId', params.categoryId);
      if (params.subCategoryId) queryParams.append('subCategoryId', params.subCategoryId);
      if (params.location) queryParams.append('location', params.location);
      if (params.date) queryParams.append('date', params.date);
      if (params.priceMin) queryParams.append('priceMin', String(params.priceMin));
      if (params.priceMax) queryParams.append('priceMax', String(params.priceMax));
      if (params.providerId) queryParams.append('providerId', params.providerId);
      if (params.isActive !== undefined) queryParams.append('isActive', String(params.isActive));

      // Handle coordinates for location-based search
      if (params.latitude && params.longitude) {
        queryParams.append('coordinates', `[${params.longitude},${params.latitude}]`);
        if (params.radius) queryParams.append('distance', String(params.radius));
      }

      const endpoint = `/listings/search?${queryParams.toString()}`;
      console.log('ListingService: Search Request Endpoint:', endpoint);
      console.log('ListingService: Search Request Payload (params):', params);

      const response = await apiInterceptor.makeAuthenticatedRequest<Listing[]>(endpoint, {
        method: 'GET',
      });

      if (response.success && response.data) {
        console.log('ListingService: Search Response:', response.data);
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to search listings');
      }
    } catch (error: any) {
      console.error('Error searching listings:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to search listings');
    }
  }

  // Add new method for nearby listings search
  async getNearbyListings(params: {
    lat: number;
    lng: number;
    distance: number;
  }, token?: string): Promise<Listing[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('lat', String(params.lat));
      queryParams.append('lng', String(params.lng));
      queryParams.append('distance', String(params.distance));

      const endpoint = `/listings/nearby?${queryParams.toString()}`;
      console.log('ListingService: Nearby Search Request Endpoint:', endpoint);

      const response = await apiInterceptor.makeAuthenticatedRequest<Listing[]>(endpoint, {
        method: 'GET',
      });

      if (response.success && response.data) {
        console.log('ListingService: Nearby Search Response:', response.data);
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch nearby listings');
    } catch (error: any) {
      console.error('Error fetching nearby listings:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch nearby listings');
    }
  }

  async getListingsByCategories(categoryId: string, subCategoryId: string, token?: string): Promise<Listing[]> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('categoryId', categoryId);
      queryParams.append('subCategoryId', subCategoryId);

      const endpoint = `/listings?${queryParams.toString()}`;

      const response = await apiInterceptor.makeAuthenticatedRequest<Listing[]>(endpoint, {
        method: 'GET',
      });

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch listings');
    } catch (error: any) {
      console.error('Error fetching listings by category:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch listings');
    }
  }
}

export default new ListingService();
