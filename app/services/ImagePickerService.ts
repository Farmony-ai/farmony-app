import { launchImageLibrary, launchCamera, ImagePickerResponse, ImageLibraryOptions, CameraOptions } from 'react-native-image-picker';
import { Platform, Alert, PermissionsAndroid } from 'react-native';

export interface ImagePickerResult {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export interface ImagePickerError {
  errorCode: string;
  errorMessage: string;
}

class ImagePickerService {
  private requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'RuralShare needs access to your camera to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission request failed:', err);
        return false;
      }
    }
    return true; // iOS handles permissions through Info.plist
  };

  private requestStoragePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission',
            message: 'RuralShare needs access to your storage to select photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Storage permission request failed:', err);
        return false;
      }
    }
    return true; // iOS handles permissions through Info.plist
  };

  private handleImagePickerResponse = (
    response: ImagePickerResponse,
    onSuccess: (result: ImagePickerResult) => void,
    onError: (error: ImagePickerError) => void
  ) => {
    if (response.didCancel) {
      onError({
        errorCode: 'USER_CANCELLED',
        errorMessage: 'User cancelled the image picker',
      });
      return;
    }

    if (response.errorCode) {
      onError({
        errorCode: response.errorCode,
        errorMessage: response.errorMessage || 'Unknown error occurred',
      });
      return;
    }

    if (response.assets && response.assets.length > 0) {
      const asset = response.assets[0];
      if (asset.uri) {
        const result: ImagePickerResult = {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          size: asset.fileSize,
        };
        onSuccess(result);
      } else {
        onError({
          errorCode: 'NO_URI',
          errorMessage: 'No image URI found in response',
        });
      }
    } else {
      onError({
        errorCode: 'NO_ASSETS',
        errorMessage: 'No images selected',
      });
    }
  };

  public openCamera = async (
    onSuccess: (result: ImagePickerResult) => void,
    onError: (error: ImagePickerError) => void
  ): Promise<void> => {
    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        onError({
          errorCode: 'PERMISSION_DENIED',
          errorMessage: 'Camera permission denied',
        });
        return;
      }

      const options: CameraOptions = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 1024,
        maxWidth: 1024,
        quality: 0.8,
        saveToPhotos: false,
        cameraType: 'back',
      };

      const response = await launchCamera(options);
      this.handleImagePickerResponse(response, onSuccess, onError);
    } catch (error) {
      onError({
        errorCode: 'LAUNCH_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Failed to launch camera',
      });
    }
  };

  public openGallery = async (
    onSuccess: (result: ImagePickerResult) => void,
    onError: (error: ImagePickerError) => void,
    multiple: boolean = false
  ): Promise<void> => {
    try {
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        onError({
          errorCode: 'PERMISSION_DENIED',
          errorMessage: 'Storage permission denied',
        });
        return;
      }

      const options: ImageLibraryOptions = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 1024,
        maxWidth: 1024,
        quality: 0.8,
        selectionLimit: multiple ? 10 : 1,
      };

      const response = await launchImageLibrary(options);
      this.handleImagePickerResponse(response, onSuccess, onError);
    } catch (error) {
      onError({
        errorCode: 'LAUNCH_ERROR',
        errorMessage: error instanceof Error ? error.message : 'Failed to launch gallery',
      });
    }
  };

  public showImagePickerOptions = (
    onCameraPress: () => void,
    onGalleryPress: () => void,
    onCancel: () => void
  ): void => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add an image',
      [
        {
          text: 'Camera',
          onPress: onCameraPress,
          icon: 'camera',
        },
        {
          text: 'Gallery',
          onPress: onGalleryPress,
          icon: 'photo',
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
      ],
      { cancelable: true }
    );
  };

  public validateImage = (result: ImagePickerResult): { isValid: boolean; error?: string } => {
    // Check file size (max 10MB)
    if (result.size && result.size > 10 * 1024 * 1024) {
      return {
        isValid: false,
        error: 'Image size must be less than 10MB',
      };
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(result.type.toLowerCase())) {
      return {
        isValid: false,
        error: 'Only JPEG, PNG, and WebP images are allowed',
      };
    }

    return { isValid: true };
  };
}

export default new ImagePickerService(); 