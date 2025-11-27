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

interface MultiImagePickerProps {
  onImagesSelected: (images: ImagePickerResult[]) => void;
  onError?: (error: ImagePickerError) => void;
  maxImages?: number;
  style?: any;
  placeholder?: string;
}

const MultiImagePicker: React.FC<MultiImagePickerProps> = ({
  onImagesSelected,
  onError,
  maxImages = 10,
  style,
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

    if (selectedImages.length >= maxImages) {
      Alert.alert('Maximum Images Reached', `You can only select up to ${maxImages} images`);
      return;
    }

    const newImages = [...selectedImages, result];
    setSelectedImages(newImages);
    onImagesSelected(newImages);
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
      await ImagePickerService.openGallery(handleImagePickerSuccess, handleImagePickerError, true);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePickerPress = () => {
    if (loading) return;
    
    if (selectedImages.length >= maxImages) {
      Alert.alert('Maximum Images Reached', `You can only select up to ${maxImages} images`);
      return;
    }
    
    ImagePickerService.showImagePickerOptions(
      handleCameraPress,
      handleGalleryPress,
      () => {} // Cancel handler
    );
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    onImagesSelected(newImages);
  };

  const renderImageGrid = () => {
    if (selectedImages.length === 0) return null;

    return (
      <View style={styles.imageGrid}>
        {selectedImages.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: image.uri }} style={styles.imageThumbnail} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {selectedImages.length < maxImages && (
          <TouchableOpacity
            style={[styles.addImageButton, loading && styles.addImageButtonDisabled]}
            onPress={handleImagePickerPress}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY.MAIN} />
            ) : (
              <Ionicons name="add" size={24} color={COLORS.PRIMARY.MAIN} />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {selectedImages.length === 0 ? (
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
              <Text style={styles.uploadSubtext}>Tap to add photos (max {maxImages})</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.imagesContainer}>
          <View style={styles.imagesHeader}>
            <Text style={styles.imagesTitle}>Selected Photos ({selectedImages.length}/{maxImages})</Text>
            {selectedImages.length < maxImages && (
              <TouchableOpacity
                style={styles.addMoreButton}
                onPress={handleImagePickerPress}
                disabled={loading}
              >
                <Ionicons name="add" size={20} color={COLORS.PRIMARY.MAIN} />
                <Text style={styles.addMoreText}>Add More</Text>
              </TouchableOpacity>
            )}
          </View>
          {renderImageGrid()}
        </View>
      )}
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
  uploadSubtext: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: '#9CA3AF',
    marginTop: SPACING.XS,
  },
  imagesContainer: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.MD,
    padding: SPACING.MD,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  imagesTitle: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.PRIMARY,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
    borderRadius: BORDER_RADIUS.SM,
    backgroundColor: COLORS.PRIMARY.LIGHT,
  },
  addMoreText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.PRIMARY.MAIN,
    marginLeft: SPACING.XS,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  },
  imageContainer: {
    position: 'relative',
  },
  imageThumbnail: {
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
  addImageButton: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.SM,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  addImageButtonDisabled: {
    opacity: 0.6,
  },
});

export default MultiImagePicker; 