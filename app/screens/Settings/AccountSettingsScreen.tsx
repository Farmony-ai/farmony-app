<<<<<<< HEAD

import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, Modal, Platform } from 'react-native';
=======
import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, StatusBar, Platform } from 'react-native';
>>>>>>> a09bc2adc5060933560154eb2013c86520769a8a
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

<<<<<<< HEAD
// A vastly improved, reusable component for form inputs, now with leading icons.
type IconFormInputProps = {
    icon: string;
    label: string;
    value: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    editable?: boolean;
    [key: string]: any;
};
const IconFormInput = ({ icon, label, value, onChangeText, placeholder, editable = true, ...props }: IconFormInputProps) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.inputWrapper, !editable && styles.inputDisabled]}>
            <Ionicons name={icon} size={20} color={COLORS.TEXT.PLACEHOLDER} style={styles.inputIcon} />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.TEXT.PLACEHOLDER}
                editable={editable}
                {...props}
            />
        </View>
=======
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
>>>>>>> a09bc2adc5060933560154eb2013c86520769a8a
    </View>
  </TouchableOpacity>
);

<<<<<<< HEAD
// A new, dedicated component for gender selection using stylish tabs.
type GenderSelectorProps = {
    label: string;
    selected: string;
    onSelect: (value: string) => void;
};
const GenderSelector = ({ label, selected, onSelect }: GenderSelectorProps) => {
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
                    >
                        <Text style={[styles.genderText, selected === option && styles.genderTextSelected]}>
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
=======
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
>>>>>>> a09bc2adc5060933560154eb2013c86520769a8a
};

const AccountSettingsScreen = () => {
  const dispatch: AppDispatch = useDispatch();
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);

<<<<<<< HEAD
    // State for form fields
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    // Initialize gender and date of birth strictly from the user profile, without changing other behavior
    const initialGender = useMemo(() => {
        const g = (user as any)?.gender as string | undefined;
        if (!g) return '';
        const normalized = g.toLowerCase();
        if (normalized === 'male') return 'Male';
        if (normalized === 'female') return 'Female';
        if (normalized === 'other') return 'Other';
        return '';
    }, [user]);
    const initialDob = useMemo(() => {
        const dobStr = (user as any)?.dateOfBirth as string | undefined;
        if (!dobStr) return null as Date | null;
        const parsed = new Date(dobStr);
        return isNaN(parsed.getTime()) ? null : parsed;
    }, [user]);

    const [dob, setDob] = useState<Date | null>(initialDob);
    const [gender, setGender] = useState(initialGender);
    const [dobTouched, setDobTouched] = useState(false);
    const [genderTouched, setGenderTouched] = useState(false);
    const originalGenderRef = useRef(initialGender);
    const originalDobRef = useRef(initialDob);
    const [occupation, setOccupation] = useState('');
    const [bio, setBio] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('https://i.pravatar.cc/150?u=a042581f4e29026704d');
    
    // State for the date picker modal
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const formatDateForApi = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`; // YYYY-MM-DD as per backend examples
    };

    const handleSaveChanges = async () => {
        try {
            if (!user?.id) return;
            // Build minimal update payload: only include fields the user actually changed
            const updates: any = {};

            // Gender
            const currentGender = gender;
            const originalGender = originalGenderRef.current;
            if (genderTouched && currentGender !== originalGender) {
                const normalized = currentGender ? currentGender.toLowerCase() : undefined;
                if (normalized === 'male' || normalized === 'female' || normalized === 'other') {
                    updates.gender = normalized;
                }
            }

            // Date of Birth
            const currentDob = dob;
            const originalDob = originalDobRef.current;
            const dobChanged = dobTouched && (
                (!!currentDob && !originalDob) ||
                (!currentDob && !!originalDob) ||
                (!!currentDob && !!originalDob && currentDob.toDateString() !== originalDob.toDateString())
            );
            if (dobChanged && currentDob) {
                updates.dateOfBirth = formatDateForApi(currentDob);
            }

            // If nothing changed, exit quietly
            if (Object.keys(updates).length === 0) {
                return;
            }

            setIsSaving(true);
            const result = await usersAPI.updateUser(user.id, updates);
            setIsSaving(false);

            if (result?.success) {
                const returnedUser = (result as any).data?.user;
                if (returnedUser) {
                    // Merge minimally to avoid disturbing any other fields
                    dispatch(setUser({ ...(user as any), ...returnedUser }));
                } else {
                    // Fallback: merge the minimal updates
                    dispatch(setUser({ ...(user as any), ...updates }));
                }
            }
        } catch (error) {
            setIsSaving(false);
            console.error('Failed to update profile:', error);
        }
    };
    
    // Formats the date to DD MM YYYY for display purposes.
    const formatDisplayDate = (date: Date | null) => {
        if (!date) return '';
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    };
=======
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
  const [avatarUrl, setAvatarUrl] = useState('https://i.pravatar.cc/150?u=a042581f4e29026704d');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  const handleSaveChanges = () => {
    console.log('Profile changes saved (simulated).');
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
        <TouchableOpacity onPress={handleSaveChanges} activeOpacity={0.7}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>
>>>>>>> a09bc2adc5060933560154eb2013c86520769a8a

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8}>
              <Ionicons name="camera" size={18} color={COLORS_MINIMAL.background} />
            </TouchableOpacity>
          </View>
          <Text style={styles.changePhotoText}>Change Photo</Text>
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

<<<<<<< HEAD
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
                
                {/* Date of Birth field now opens a beautiful date picker */}
                <TouchableOpacity onPress={() => setDatePickerVisible(true)}>
                    <IconFormInput
                        icon="calendar-outline"
                        label="Date of Birth (Optional)"
                        value={dob ? formatDisplayDate(dob) : ''}
                        placeholder="DD MM YYYY"
                        editable={false}
                    />
                </TouchableOpacity>
                <DatePicker
                    modal
                    open={isDatePickerVisible}
                    date={dob || new Date()}
                    mode="date"
                    onConfirm={(date: Date) => {
                        setDatePickerVisible(false);
                        setDob(date);
                        setDobTouched(true);
                    }}
                    onCancel={() => {
                        setDatePickerVisible(false);
                    }}
                />

                <GenderSelector
                    label="Gender (Optional)"
                    selected={gender}
                    onSelect={(g: string) => { setGender(g); setGenderTouched(true); }}
                />

                <IconFormInput
                    icon="briefcase-outline"
                    label="Occupation (Optional)"
                    value={occupation}
                    onChangeText={setOccupation}
                    placeholder="Your occupation"
                />
                <IconFormInput
                    icon="document-text-outline"
                    label="Bio (Optional)"
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us a little about yourself"
                    multiline
                />

                <Button title={isSaving ? 'Saving...' : 'Save Changes'} onPress={handleSaveChanges} style={styles.saveButton} disabled={isSaving} />
            </ScrollView>
        </SafeAreaWrapper>
    );
=======
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaWrapper>
  );
>>>>>>> a09bc2adc5060933560154eb2013c86520769a8a
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