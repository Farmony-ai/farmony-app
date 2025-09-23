import apiInterceptor from './apiInterceptor';
import { ImagePickerResult } from './ImagePickerService';

export interface ProfilePictureUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ProfilePictureUploadResult {
  success: boolean;
  data?: {
    profilePictureUrl: string;
  };
  error?: string;
}

export interface ProfilePictureDeleteResult {
  success: boolean;
  error?: string;
}

class ProfilePictureService {
  /**
   * Upload profile picture for a user
   * @param userId - The user ID
   * @param imageResult - Image picker result containing URI, type, and name
   * @param onProgress - Optional progress callback
   * @returns Promise with upload result
   */
  async uploadProfilePicture(
    userId: string,
    imageResult: ImagePickerResult,
    onProgress?: (progress: ProfilePictureUploadProgress) => void
  ): Promise<ProfilePictureUploadResult> {
    try {
      // Create FormData for multipart upload
      const formData = new FormData();

      // Add the file to FormData
      formData.append('file', {
        uri: imageResult.uri,
        type: imageResult.type,
        name: imageResult.name,
      } as any);

      console.log(`[ProfilePictureService] Uploading profile picture for user ${userId}`);
      console.log(`[ProfilePictureService] File: ${imageResult.name}, Type: ${imageResult.type}, Size: ${imageResult.size}`);

      // Use XMLHttpRequest for progress tracking if progress callback is provided
      if (onProgress) {
        return this.uploadWithProgress(userId, formData, onProgress);
      }

      // Use standard API interceptor for simple upload
      const result = await apiInterceptor.makeAuthenticatedRequest<{profilePictureUrl: string}>(
        `/users/${userId}/profile-picture`,
        {
          method: 'POST',
          body: formData,
          // Don't set Content-Type header - FormData sets it automatically with boundary
        }
      );

      if (result.success && result.data) {
        console.log('[ProfilePictureService] ✅ Profile picture uploaded successfully');
        return {
          success: true,
          data: {
            profilePictureUrl: result.data.profilePictureUrl,
          },
        };
      } else {
        console.error('[ProfilePictureService] ❌ Upload failed:', result.error);
        return {
          success: false,
          error: result.error || 'Upload failed',
        };
      }
    } catch (error) {
      console.error('[ProfilePictureService] Upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload with progress tracking using XMLHttpRequest
   */
  private async uploadWithProgress(
    userId: string,
    formData: FormData,
    onProgress: (progress: ProfilePictureUploadProgress) => void
  ): Promise<ProfilePictureUploadResult> {
    return new Promise(async (resolve) => {
      try {
        // Get access token for authentication
        const { accessToken } = await this.getStoredTokens();

        if (!accessToken) {
          resolve({
            success: false,
            error: 'Authentication required',
          });
          return;
        }

        const xhr = new XMLHttpRequest();
        const url = `${await this.getApiBaseUrl()}/users/${userId}/profile-picture`;

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percentage,
            });
          }
        });

        // Handle response
        xhr.addEventListener('load', () => {
          try {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              resolve({
                success: true,
                data: {
                  profilePictureUrl: response.profilePictureUrl,
                },
              });
            } else {
              const errorResponse = JSON.parse(xhr.responseText);
              resolve({
                success: false,
                error: errorResponse.message || `Upload failed with status ${xhr.status}`,
              });
            }
          } catch (parseError) {
            resolve({
              success: false,
              error: 'Failed to parse response',
            });
          }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          resolve({
            success: false,
            error: 'Network error during upload',
          });
        });

        // Handle timeout
        xhr.addEventListener('timeout', () => {
          resolve({
            success: false,
            error: 'Upload timeout',
          });
        });

        // Configure and send request
        xhr.open('POST', url);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        xhr.timeout = 60000; // 60 seconds timeout
        xhr.send(formData);
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    });
  }

  /**
   * Delete profile picture for a user
   * @param userId - The user ID
   * @returns Promise with delete result
   */
  async deleteProfilePicture(userId: string): Promise<ProfilePictureDeleteResult> {
    try {
      console.log(`[ProfilePictureService] Deleting profile picture for user ${userId}`);

      const result = await apiInterceptor.makeAuthenticatedRequest(
        `/users/${userId}/profile-picture`,
        {
          method: 'DELETE',
        }
      );

      if (result.success) {
        console.log('[ProfilePictureService] ✅ Profile picture deleted successfully');
        return {
          success: true,
        };
      } else {
        console.error('[ProfilePictureService] ❌ Delete failed:', result.error);
        return {
          success: false,
          error: result.error || 'Delete failed',
        };
      }
    } catch (error) {
      console.error('[ProfilePictureService] Delete error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Helper method to get stored tokens (mirrors apiInterceptor implementation)
   */
  private async getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('refresh_token')
      ]);

      // Fallback to legacy token if new one doesn't exist
      if (!accessToken) {
        const legacyToken = await AsyncStorage.getItem('token');
        return { accessToken: legacyToken, refreshToken };
      }

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  }

  /**
   * Helper method to get API base URL
   */
  private async getApiBaseUrl(): Promise<string> {
    const { API_BASE_URL } = require('../config/api');
    return API_BASE_URL;
  }

  /**
   * Validate image before upload
   * @param imageResult - Image picker result
   * @returns Validation result
   */
  validateImage(imageResult: ImagePickerResult): { isValid: boolean; error?: string } {
    // Check file size (max 5MB for profile pictures)
    if (imageResult.size && imageResult.size > 5 * 1024 * 1024) {
      return {
        isValid: false,
        error: 'Profile picture must be less than 5MB',
      };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageResult.type.toLowerCase())) {
      return {
        isValid: false,
        error: 'Only JPEG, PNG, and WebP images are allowed',
      };
    }

    return { isValid: true };
  }
}

export default new ProfilePictureService();