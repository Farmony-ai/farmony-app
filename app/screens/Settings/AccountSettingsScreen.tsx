import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, StatusBar, Platform, Alert, ActivityIndicator } from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import { SPACING, FONTS, FONT_SIZES } from '../../utils';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setUser } from '../../store/slices/authSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import DatePicker from 'react-native-date-picker';
import { usersAPI } from '../../services/api';
import ProfilePictureService from '../../services/ProfilePictureService';
import ImagePickerService, { ImagePickerResult } from '../../services/ImagePickerService';

// Ultra-minimal color scheme
const COLORS_MINIMAL = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: {
    primary: '#000000',
    secondary: '#4A5568',
    muted: '#A0AEC0',
  },
  accent: '#10B981',
  border: '#E2E8F0',
  divider: '#F1F5F9',
};

const IconFormInput = ({ icon, label, value, onChangeText, placeholder, editable = true, onPress, ...props }) => (
  <TouchableOpacity 
    style={styles.inputContainer} 
    onPress={onPress} 
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress && editable}
  >
    <Text style={styles.label}>{label}</Text>
    <View style={[styles.inputWrapper, !editable && styles.inputDisabled]}>
      <Ionicons name={icon} size={18} color={COLORS_MINIMAL.text.muted} style={styles.inputIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS_MINIMAL.text.muted}
        editable={editable && !onPress}
        {...props}
      />
      {onPress && (
        <Ionicons name="chevron-forward" size={18} color={COLORS_MINIMAL.text.muted} />
      )}
    </View>
  </TouchableOpacity>
);

const GenderSelector = ({ label, selected, onSelect }) => {
  const options = ['Male', 'Female', 'Other'];
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.genderContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.genderTab, selected === option && styles.genderTabSelected]}
            onPress={() => onSelect(option)}
            activeOpacity={0.7}
          >
            <Text style={[styles.genderText, selected === option && styles.genderTextSelected]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const AccountSettingsScreen = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [dob, setDob] = useState(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 20);
    return date;
  });
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load user profile data including profile picture
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user?.id) {
        try {
          setIsLoadingProfile(true);
          const result = await usersAPI.getProfile(user.id);

          if (result.success && result.data) {
            const profileData = result.data;

            // Update avatar URL if available
            if (profileData.profilePictureUrl) {
              setAvatarUrl(profileData.profilePictureUrl);
            }

            // Set other profile fields if available
            if (profileData.gender) {
              setGender(profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1));
            }
            if (profileData.dateOfBirth) {
              try {
                setDob(new Date(profileData.dateOfBirth));
              } catch (dateError) {
                console.warn('Invalid date format:', profileData.dateOfBirth);
              }
            }
            if (profileData.bio) {
              setBio(profileData.bio);
            }
            if (profileData.occupation) {
              setOccupation(profileData.occupation);
            }
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
        } finally {
          setIsLoadingProfile(false);
        }
      } else {
        setIsLoadingProfile(false);
      }
    };

    loadUserProfile();
  }, [user?.id]);

  const handleCameraButtonPress = () => {
    ImagePickerService.showImagePickerOptions(
      () => handleCameraPress(),
      () => handleGalleryPress(),
      () => console.log('Image picker cancelled')
    );
  };

  const handleCameraPress = () => {
    ImagePickerService.openCamera(
      (result: ImagePickerResult) => {
        uploadProfilePicture(result);
      },
      (error) => {
        if (error.errorCode !== 'USER_CANCELLED') {
          Alert.alert('Camera Error', error.errorMessage);
        }
      }
    );
  };

  const handleGalleryPress = () => {
    ImagePickerService.openGallery(
      (result: ImagePickerResult) => {
        uploadProfilePicture(result);
      },
      (error) => {
        if (error.errorCode !== 'USER_CANCELLED') {
          Alert.alert('Gallery Error', error.errorMessage);
        }
      }
    );
  };

  const uploadProfilePicture = async (imageResult: ImagePickerResult) => {
    if (!user?.id) {
      Alert.alert('Error', 'User ID not found');
      return;
    }

    // Validate image
    const validation = ProfilePictureService.validateImage(imageResult);
    if (!validation.isValid) {
      Alert.alert('Invalid Image', validation.error);
      return;
    }

    setUploadingProfilePicture(true);
    setUploadProgress(0);

    try {
      const result = await ProfilePictureService.uploadProfilePicture(
        user.id,
        imageResult,
        (progress) => {
          setUploadProgress(progress.percentage);
        }
      );

      if (result.success && result.data) {
        console.log('[AccountSettingsScreen] Profile picture URL received:', result.data.profilePictureUrl);
        setAvatarUrl(result.data.profilePictureUrl);
        Alert.alert('Success', 'Profile picture updated successfully');

        // Update user state with new profile picture URL
        dispatch(setUser({
          ...user,
          profilePictureUrl: result.data.profilePictureUrl,
        }));
      } else {
        Alert.alert('Upload Failed', result.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      Alert.alert('Upload Error', 'An unexpected error occurred');
    } finally {
      setUploadingProfilePicture(false);
      setUploadProgress(0);
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User ID not found');
      return;
    }

    // Validate required fields
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    setIsSaving(true);

    try {
      // Prepare update data
      const updateData: any = {
        name: name.trim(),
      };

      // Add optional fields if they exist
      if (email && email.trim()) {
        updateData.email = email.trim();
      }

      if (gender) {
        updateData.gender = gender.toLowerCase();
      }

      if (dob) {
        // Format date as YYYY-MM-DD
        const year = dob.getFullYear();
        const month = String(dob.getMonth() + 1).padStart(2, '0');
        const day = String(dob.getDate()).padStart(2, '0');
        updateData.dateOfBirth = `${year}-${month}-${day}`;
      }

      if (bio && bio.trim()) {
        updateData.bio = bio.trim();
      }

      if (occupation && occupation.trim()) {
        updateData.occupation = occupation.trim();
      }

      console.log('Updating user profile with data:', updateData);

      // Call API to update user
      const result = await usersAPI.updateUser(user.id, updateData);

      if (result.success && result.data) {
        // Update Redux store with new user data
        dispatch(setUser({
          ...user,
          ...result.data.user,
          profilePictureUrl: avatarUrl || user.profilePictureUrl,
        }));

        Alert.alert('Success', 'Profile updated successfully');
        navigation.goBack();
      } else {
        Alert.alert('Update Failed', result.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Update Error', 'An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };
  
  const formatDisplayDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <SafeAreaWrapper backgroundColor={COLORS_MINIMAL.background}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS_MINIMAL.background} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={COLORS_MINIMAL.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSaveChanges} activeOpacity={0.7} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS_MINIMAL.accent} />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {isLoadingProfile ? (
              <View style={[styles.avatar, styles.avatarLoading]}>
                <ActivityIndicator size="large" color={COLORS_MINIMAL.accent} />
              </View>
            ) : (
              <>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                    onError={(error) => console.log('[AccountSettingsScreen] Image load error:', error.nativeEvent, 'URL:', avatarUrl)}
                    onLoad={() => console.log('[AccountSettingsScreen] Image loaded successfully:', avatarUrl)}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Ionicons name="person-outline" size={40} color={COLORS_MINIMAL.text.muted} />
                  </View>
                )}
              </>
            )}

            {uploadingProfilePicture && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cameraButton}
              activeOpacity={0.8}
              onPress={handleCameraButtonPress}
              disabled={uploadingProfilePicture || isLoadingProfile}
            >
              <Ionicons name="camera" size={18} color={COLORS_MINIMAL.background} />
            </TouchableOpacity>
          </View>
          <Text style={styles.changePhotoText}>
            {uploadingProfilePicture ? 'Uploading...' : 'Change Photo'}
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <IconFormInput
            icon="person-outline"
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
          />
          
          <IconFormInput
            icon="mail-outline"
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <IconFormInput
            icon="call-outline"
            label="Phone Number"
            value={user?.phone || ''}
            placeholder="Your phone number"
            editable={false}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          
          <IconFormInput
            icon="calendar-outline"
            label="Date of Birth"
            value={dob ? formatDisplayDate(dob) : ''}
            placeholder="Select date"
            editable={false}
            onPress={() => setDatePickerVisible(true)}
          />
          
          <DatePicker
            modal
            open={isDatePickerVisible}
            date={dob}
            mode="date"
            onConfirm={(date) => {
              setDatePickerVisible(false);
              setDob(date);
            }}
            onCancel={() => {
              setDatePickerVisible(false);
            }}
          />

          <GenderSelector
            label="Gender"
            selected={gender}
            onSelect={setGender}
          />

          <IconFormInput
            icon="briefcase-outline"
            label="Occupation"
            value={occupation}
            onChangeText={setOccupation}
            placeholder="What do you do?"
          />
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Bio</Text>
            <View style={styles.textAreaWrapper}>
              <TextInput
                style={styles.textArea}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us a little about yourself..."
                placeholderTextColor={COLORS_MINIMAL.text.muted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS_MINIMAL.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS_MINIMAL.background,
  },
  headerTitle: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 18,
    color: COLORS_MINIMAL.text.primary,
  },
  saveText: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    fontSize: 16,
    color: COLORS_MINIMAL.accent,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS_MINIMAL.surface,
  },
  avatarLoading: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressText: {
    fontSize: 12,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: '#FFFFFF',
    marginTop: 4,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS_MINIMAL.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS_MINIMAL.background,
  },
  changePhotoText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 14,
    color: COLORS_MINIMAL.accent,
    marginTop: 12,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 14,
    color: COLORS_MINIMAL.text.muted,
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    fontSize: 13,
    color: COLORS_MINIMAL.text.secondary,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 15,
    color: COLORS_MINIMAL.text.primary,
    height: '100%',
  },
  inputDisabled: {
    backgroundColor: COLORS_MINIMAL.surface,
    opacity: 0.7,
  },
  textAreaWrapper: {
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 15,
    color: COLORS_MINIMAL.text.primary,
    minHeight: 80,
  },
  genderContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS_MINIMAL.surface,
    borderRadius: 12,
    padding: 4,
  },
  genderTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  genderTabSelected: {
    backgroundColor: COLORS_MINIMAL.background,
  },
  genderText: {
    fontFamily: FONTS.POPPINS.REGULAR,
    fontSize: 14,
    color: COLORS_MINIMAL.text.secondary,
  },
  genderTextSelected: {
    fontFamily: FONTS.POPPINS.SEMIBOLD,
    color: COLORS_MINIMAL.accent,
  },
});

export default AccountSettingsScreen;