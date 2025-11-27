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

interface ImagePickerProps {
  onImageSelected: (image: ImagePickerResult) => void;
  onError?: (error: ImagePickerError) => void;
  multiple?: boolean;
  maxImages?: number;
  style?: any;
  showPreview?: boolean;
  placeholder?: string;
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelected,
  onError,
  multiple = false,
  maxImages = 10,
  style,
  showPreview = true,
  placeholder = 'Add Photos',
}) => {
  const [selectedImages, setSelectedImages] = useState<ImagePickerResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleImagePickerSuccess = (result: ImagePickerResult) => {
    const validation = ImagePickerService.validateImage(result);
    if (!validation.isValid) {
      Alert.alert('Invalid Image', validation.error || 'Please select a valid image');
      return;
    }

    if (multiple) {
      if (selectedImages.length >= maxImages) {
        Alert.alert('Maximum Images Reached', `You can only select up to ${maxImages} images`);
        return;
      }
      const newImages = [...selectedImages, result];
      setSelectedImages(newImages);
      onImageSelected(result);
    } else {
      setSelectedImages([result]);
      onImageSelected(result);
    }
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
      await ImagePickerService.openGallery(handleImagePickerSuccess, handleImagePickerError, multiple);
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

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  const renderImagePreview = () => {
    if (!showPreview || selectedImages.length === 0) return null;

    return (
      <View style={styles.previewContainer}>
        {selectedImages.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

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
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.MD,
    gap: SPACING.SM,
  },
  imageContainer: {
    position: 'relative',
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.SM,
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
});

export default ImagePicker; 