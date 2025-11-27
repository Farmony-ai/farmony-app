import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ImagePickerService, { ImagePickerResult, ImagePickerError } from '../services/ImagePickerService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../utils';

interface SingleImagePickerProps {
  onImageSelected: (image: ImagePickerResult) => void;
  onError?: (error: ImagePickerError) => void;
  style?: any;
  placeholder?: string;
  showPreview?: boolean;
  imageSize?: number;
}

const SingleImagePicker: React.FC<SingleImagePickerProps> = ({
  onImageSelected,
  onError,
  style,
  placeholder = 'Add Photo',
  showPreview = true,
  imageSize = 120,
}) => {
  const [selectedImage, setSelectedImage] = useState<ImagePickerResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImagePickerSuccess = (result: ImagePickerResult) => {
    const validation = ImagePickerService.validateImage(result);
    if (!validation.isValid) {
      Alert.alert('Invalid Image', validation.error || 'Please select a valid image');
      return;
    }

    setSelectedImage(result);
    onImageSelected(result);
  };

  const handleImagePickerError = (error: ImagePickerError) => {
    if (error.errorCode === 'USER_CANCELLED') {
      return; // Don't show alert for user cancellation
    }
    
    Alert.alert('Error', error.errorMessage);
    onError?.(error);
  };

  const handleCameraPress = async () => {
    setLoading(true);
    try {
      await ImagePickerService.openCamera(handleImagePickerSuccess, handleImagePickerError);
    } finally {
      setLoading(false);
    }
  };

  const handleGalleryPress = async () => {
    setLoading(true);
    try {
      await ImagePickerService.openGallery(handleImagePickerSuccess, handleImagePickerError, false);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePickerPress = () => {
    if (loading) return;
    
    ImagePickerService.showImagePickerOptions(
      handleCameraPress,
      handleGalleryPress,
      () => {} // Cancel handler
    );
  };

  const removeImage = () => {
    setSelectedImage(null);
    onImageSelected({ uri: '', type: '', name: '' }); // Send empty result to clear
  };

  const renderImagePreview = () => {
    if (!showPreview || !selectedImage) return null;

    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: selectedImage.uri }} style={[styles.previewImage, { width: imageSize, height: imageSize }]} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={removeImage}
        >
          <Ionicons name="close-circle" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  if (selectedImage && showPreview) {
    return (
      <View style={[styles.container, style]}>
        {renderImagePreview()}
        <TouchableOpacity
          style={styles.changeButton}
          onPress={handleImagePickerPress}
          disabled={loading}
        >
          <Text style={styles.changeButtonText}>Change Photo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.uploadButton, loading && styles.uploadButtonDisabled]}
        onPress={handleImagePickerPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
        ) : (
          <>
            <Ionicons name="camera-outline" size={24} color={COLORS.PRIMARY.MAIN} />
            <Text style={styles.uploadText}>{placeholder}</Text>
          </>
        )}
      </TouchableOpacity>
      
      {renderImagePreview()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  uploadButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.LG,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#6B7280',
    marginTop: SPACING.SM,
  },
  previewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    borderRadius: BORDER_RADIUS.MD,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeButton: {
    marginTop: SPACING.MD,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    backgroundColor: COLORS.PRIMARY.LIGHT,
    borderRadius: BORDER_RADIUS.SM,
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
  },
});

export default SingleImagePicker; 