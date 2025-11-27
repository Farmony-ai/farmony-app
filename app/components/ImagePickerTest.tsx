import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import SingleImagePicker from './SingleImagePicker';
import MultiImagePicker from './MultiImagePicker';
import { ImagePickerResult } from '../services/ImagePickerService';
import { COLORS, FONTS, SPACING } from '../utils';

const ImagePickerTest: React.FC = () => {
  const [singleImage, setSingleImage] = useState<ImagePickerResult | null>(null);
  const [multipleImages, setMultipleImages] = useState<ImagePickerResult[]>([]);

  const handleSingleImageSelected = (image: ImagePickerResult) => {
    setSingleImage(image);
    Alert.alert('Success', 'Single image selected successfully!');
  };

  const handleMultipleImagesSelected = (images: ImagePickerResult[]) => {
    setMultipleImages(images);
    Alert.alert('Success', `${images.length} images selected successfully!`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Picker Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Single Image Picker</Text>
        <SingleImagePicker
          onImageSelected={handleSingleImageSelected}
          placeholder="Select Single Image"
          showPreview={true}
        />
        {singleImage && (
          <Text style={styles.resultText}>
            Selected: {singleImage.name}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Multiple Image Picker</Text>
        <MultiImagePicker
          onImagesSelected={handleMultipleImagesSelected}
          maxImages={5}
          placeholder="Select Multiple Images"
        />
        {multipleImages.length > 0 && (
          <Text style={styles.resultText}>
            Selected: {multipleImages.length} images
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.clearButton}
        onPress={() => {
          setSingleImage(null);
          setMultipleImages([]);
          Alert.alert('Cleared', 'All images cleared');
        }}
      >
        <Text style={styles.clearButtonText}>Clear All Images</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.MD,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.TEXT.PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.LG,
  },
  section: {
    marginBottom: SPACING.LG,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: SPACING.MD,
  },
  resultText: {
    fontSize: 14,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
    marginTop: SPACING.SM,
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.LG,
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: '#fff',
  },
});

export default ImagePickerTest; 