
import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, Modal, Platform } from 'react-native';
import SafeAreaWrapper from '../../components/SafeAreaWrapper';
import Text from '../../components/Text';
import Button from '../../components/Button';
import { COLORS, SPACING, FONTS, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../utils';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { setUser } from '../../store/slices/authSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import DatePicker from 'react-native-date-picker';
import { usersAPI } from '../../services/api';

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
    </View>
);

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
};

/**
 * AccountSettingsScreen
 *
 * A completely overhauled screen for editing user profiles, with a superior UI and enhanced UX,
 * including a date picker, gender selector, and icons for each field.
 */
const AccountSettingsScreen = () => {
    const dispatch: AppDispatch = useDispatch();
    const navigation = useNavigation();
    const { user } = useSelector((state: RootState) => state.auth);

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

    return (
        <SafeAreaWrapper>
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.TEXT.PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Account Settings</Text>
                <View style={styles.backButton} />
            </View>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.avatarSection}>
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    <TouchableOpacity style={styles.cameraIcon}>
                        <Ionicons name="camera" size={20} color={COLORS.NEUTRAL.WHITE} />
                    </TouchableOpacity>
                </View>

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
};

// Styles have been completely rewritten for a superior aesthetic.
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND.PRIMARY,
    },
    contentContainer: {
        paddingHorizontal: SPACING.LG,
        paddingBottom: SPACING['4XL'],
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.MD,
        paddingVertical: SPACING.SM,
        backgroundColor: COLORS.BACKGROUND.PRIMARY,
    },
    backButton: {
        padding: SPACING.XS,
    },
    headerTitle: {
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        fontSize: FONT_SIZES.LG,
        color: COLORS.TEXT.PRIMARY,
    },
    avatarSection: {
        alignItems: 'center',
        marginVertical: SPACING.LG,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: COLORS.PRIMARY.LIGHT,
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: '50%',
        transform: [{ translateX: 40 }, { translateY: 0 }],
        backgroundColor: COLORS.PRIMARY.MAIN,
        padding: SPACING.SM,
        borderRadius: BORDER_RADIUS.FULL,
        ...SHADOWS.MD,
        borderWidth: 2,
        borderColor: COLORS.NEUTRAL.WHITE,
    },
    inputContainer: {
        marginBottom: SPACING.LG,
    },
    label: {
        fontFamily: FONTS.POPPINS.MEDIUM,
        fontSize: FONT_SIZES.SM,
        color: COLORS.TEXT.SECONDARY,
        marginBottom: SPACING.XS,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.NEUTRAL.WHITE,
        borderRadius: BORDER_RADIUS.MD,
        height: 52,
        borderWidth: 1,
        borderColor: COLORS.BORDER.PRIMARY,
    },
    inputIcon: {
        paddingHorizontal: SPACING.MD,
    },
    input: {
        flex: 1,
        fontFamily: FONTS.POPPINS.REGULAR,
        fontSize: FONT_SIZES.BASE,
        color: COLORS.TEXT.PRIMARY,
        height: '100%',
    },
    inputDisabled: {
        backgroundColor: COLORS.BACKGROUND.PRIMARY,
    },
    genderContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.NEUTRAL.WHITE,
        borderRadius: BORDER_RADIUS.MD,
        borderWidth: 1,
        borderColor: COLORS.BORDER.PRIMARY,
        overflow: 'hidden',
    },
    genderTab: {
        flex: 1,
        paddingVertical: SPACING.SM,
        alignItems: 'center',
        justifyContent: 'center',
    },
    genderTabSelected: {
        backgroundColor: COLORS.PRIMARY.LIGHT,
    },
    genderText: {
        fontFamily: FONTS.POPPINS.REGULAR,
        fontSize: FONT_SIZES.SM,
        color: COLORS.TEXT.SECONDARY,
    },
    genderTextSelected: {
        fontFamily: FONTS.POPPINS.SEMIBOLD,
        color: COLORS.PRIMARY.MAIN,
    },
    saveButton: {
        marginTop: SPACING.XL,
        paddingVertical: SPACING.SM,
    },
});

export default AccountSettingsScreen;
