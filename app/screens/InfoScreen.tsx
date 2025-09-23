import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  StatusBar,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SPACING } from '../utils';
import { FONTS, FONT_SIZES, scaleSize, getFontFamily } from '../utils/fonts';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Language {
  code: string;
  name: string;
  nativeName: string;
  bgColor: string;
  textColor: string;
}

const languages: Language[] = [
  { code: 'EN', name: 'English', nativeName: 'English', bgColor: '#2196F3', textColor: '#FFFFFF' },
  { code: 'TE', name: 'Telugu', nativeName: 'తెలుగు', bgColor: '#4CAF50', textColor: '#FFFFFF' },
  { code: 'TA', name: 'Tamil', nativeName: 'தமிழ்', bgColor: '#FFC107', textColor: '#000000' },
  { code: 'HI', name: 'Hindi', nativeName: 'हिन्दी', bgColor: '#FF5722', textColor: '#FFFFFF' },
];

const carouselData = [
  {
    image: require('../assets/info1.png'),
    title: 'Welcome to Farmony!',
    subtitle: 'Rent machines, hire trusted workers, and pay safely with UPI escrow.',
  },
  {
    image: require('../assets/info2.png'),
    title: 'Book the help you need',
    subtitle: 'Tractor with driver, spraying crew, or water pump—nearby and ready when you are.',
  },
  {
    image: require('../assets/info3.png'),
    title: 'Fair price. Trusted work.',
    subtitle: 'See ratings and clear rates, start on time, and pay easily after the job is done—no surprises.',
  },
];

const InfoScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Animations
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const overlayAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load saved language preference
    loadLanguagePreference();
    
    // Start auto-scroll
    startAutoScroll();
    
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    // Restart auto-scroll when index changes
    startAutoScroll();
  }, [currentIndex]);

  const startAutoScroll = () => {
    // Clear existing timer
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
    
    // Set new timer for 4 seconds
    autoScrollTimer.current = setInterval(() => {
      const nextIndex = (currentIndex + 1) % carouselData.length;
      scrollToIndex(nextIndex);
    }, 4000);
  };

  const loadLanguagePreference = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage) {
        setSelectedLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Error loading language preference:', error);
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setCurrentIndex(index);
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: true });
    setCurrentIndex(index);
  };

  const handleManualScroll = (index: number) => {
    scrollToIndex(index);
    // Reset auto-scroll timer when user manually scrolls
    startAutoScroll();
  };

  const openLanguageModal = () => {
    setIsLanguageModalVisible(true);
    Animated.parallel([
      Animated.timing(overlayAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(modalAnimation, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeLanguageModal = () => {
    Animated.parallel([
      Animated.timing(overlayAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsLanguageModalVisible(false);
    });
  };

  const selectLanguage = async (langCode: string) => {
    setSelectedLanguage(langCode);
    try {
      await AsyncStorage.setItem('selectedLanguage', langCode);
      // Dispatch to global state if needed
      // dispatch(setAppLanguage(langCode));
    } catch (error) {
      console.log('Error saving language preference:', error);
    }
    closeLanguageModal();
  };

  const handleNavigate = async (screen: string) => {
    // Save that user has seen the info screen
    try {
      await AsyncStorage.setItem('hasSeenInfoScreen', 'true');
    } catch (error) {
      console.log('Error saving info screen status:', error);
    }
    navigation.navigate(screen);
  };

  const selectedLangData = languages.find(l => l.code === selectedLanguage) || languages[0];

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={styles.languageItem}
      onPress={() => selectLanguage(item.code)}
      activeOpacity={0.7}
    >
      <View style={styles.languageItemLeft}>
        <View style={[styles.languageCircle, { backgroundColor: item.bgColor }]}>
          <Text style={[styles.languageCode, { color: item.textColor }]}>
            {item.code}
          </Text>
        </View>
        <View>
          <Text style={styles.languageName}>{item.name}</Text>
          <Text style={styles.languageNativeName}>{item.nativeName}</Text>
        </View>
      </View>
      {/* Radio button with filled circle for selected */}
      <View style={styles.radioContainer}>
        <View style={[
          styles.radioOuter,
          selectedLanguage === item.code && styles.radioOuterSelected
        ]}>
          {selectedLanguage === item.code && (
            <View style={styles.radioInner} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaWrapper backgroundColor="#FFFFFF">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>farmony</Text>
          </View>
          <TouchableOpacity 
            style={[styles.languageButton, { backgroundColor: selectedLangData.bgColor }]}
            onPress={openLanguageModal}
            activeOpacity={0.8}
          >
            <Text style={[styles.languageButtonText, { color: selectedLangData.textColor }]}>
              {selectedLanguage}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            onScrollBeginDrag={() => {
              // Stop auto-scroll when user starts dragging
              if (autoScrollTimer.current) {
                clearInterval(autoScrollTimer.current);
              }
            }}
            onScrollEndDrag={() => {
              // Resume auto-scroll after user stops dragging
              startAutoScroll();
            }}
            scrollEventThrottle={16}
          >
            {carouselData.map((item, index) => (
              <View key={index} style={styles.carouselItem}>
                <Image
                  source={item.image}
                  style={styles.carouselImage}
                  resizeMode="contain"
                />
                <Text style={styles.carouselTitle}>{item.title}</Text>
                <Text style={styles.carouselSubtitle}>{item.subtitle}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Dots Indicator */}
          <View style={styles.dotsContainer}>
            {carouselData.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleManualScroll(index)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.dot,
                    index === currentIndex && styles.activeDot,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => handleNavigate('SignIn')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Log in</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signUpButton}
            onPress={() => handleNavigate('SignUp')}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpButtonText}>I'm new, sign me up</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By logging in or registering, you agree to our{'\n'}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>.
          </Text>
        </View>

        {/* Language Modal */}
        <Modal
          visible={isLanguageModalVisible}
          transparent
          animationType="none"
          onRequestClose={closeLanguageModal}
        >
          <TouchableWithoutFeedback onPress={closeLanguageModal}>
            <Animated.View 
              style={[
                styles.modalOverlay,
                {
                  opacity: overlayAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                },
              ]}
            />
          </TouchableWithoutFeedback>

          <Animated.View
            style={[
              styles.languageModal,
              {
                transform: [
                  {
                    translateY: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Close Button - Right Aligned */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeLanguageModal}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={scaleSize(24)} color="#000000" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Change language</Text>
            <Text style={styles.modalSubtitle}>Which language do you prefer?</Text>

            <FlatList
              data={languages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              style={styles.languageList}
              scrollEnabled={false}
            />
          </Animated.View>
        </Modal>
      </View>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scaleSize(15),
    paddingTop: scaleSize(12),
    paddingBottom: scaleSize(12),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: scaleSize(24),
    height: scaleSize(24),
    marginRight: scaleSize(8),
    tintColor: COLORS.PRIMARY.MAIN,
  },
  logoText: {
    fontSize: FONT_SIZES.XL,
    fontFamily: getFontFamily('SEMIBOLD'),
    color: '#000000',
  },
  languageButton: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: scaleSize(22),
    justifyContent: 'center',
    alignItems: 'center',
  },
  languageButtonText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('SEMIBOLD'),
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: scaleSize(20), // Added space from top bar
  },
  carouselItem: {
    width: screenWidth,
    alignItems: 'center',
    paddingHorizontal: scaleSize(24),
  },
  carouselImage: {
    width: screenWidth * 0.85, // Increased width
    height: screenHeight * 0.35,
    marginBottom: scaleSize(8), // Significantly reduced gap
  },
  carouselTitle: {
    fontSize: FONT_SIZES['2XL'], // Reduced from 24
    fontFamily: getFontFamily('SEMIBOLD'),
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleSize(12),
  },
  carouselSubtitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('REGULAR'),
    color: '#666666',
    textAlign: 'center',
    lineHeight: scaleSize(20),
    paddingHorizontal: scaleSize(10),
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scaleSize(20),
    gap: scaleSize(8),
  },
  dot: {
    width: scaleSize(8),
    height: scaleSize(8),
    borderRadius: scaleSize(4),
    backgroundColor: '#D0D0D0',
  },
  activeDot: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    width: scaleSize(24),
  },
  bottomContainer: {
    paddingHorizontal: scaleSize(20),
    paddingBottom: scaleSize(30),
  },
  loginButton: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: scaleSize(8),
    paddingVertical: scaleSize(14),
    alignItems: 'center',
    marginBottom: scaleSize(12),
  },
  loginButtonText: {
    fontSize: FONT_SIZES.LG,
    fontFamily: getFontFamily('SEMIBOLD'),
    color: '#FFFFFF',
  },
  signUpButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: scaleSize(8),
    borderWidth: 1,
    borderColor: '#D0D0D0',
    paddingVertical: scaleSize(14),
    alignItems: 'center',
    marginBottom: scaleSize(20),
  },
  signUpButtonText: {
    fontSize: FONT_SIZES.LG,
    fontFamily: getFontFamily('MEDIUM'),
    color: COLORS.PRIMARY.MAIN,
  },
  termsText: {
    fontSize: FONT_SIZES.SM,
    fontFamily: getFontFamily('REGULAR'),
    color: '#666666',
    textAlign: 'center',
    lineHeight: scaleSize(18),
  },
  termsLink: {
    color: COLORS.PRIMARY.MAIN,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  languageModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: scaleSize(20),
    borderTopRightRadius: scaleSize(20),
    paddingTop: scaleSize(20),
    paddingHorizontal: scaleSize(20),
    paddingBottom: scaleSize(30),
    maxHeight: screenHeight * 0.5,
  },
  closeButton: {
    position: 'absolute',
    top: scaleSize(-50),
    right: scaleSize(20), // Right aligned
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: scaleSize(22),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZES.XL,
    fontFamily: getFontFamily('SEMIBOLD'),
    color: '#000000',
    marginBottom: scaleSize(8),
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('REGULAR'),
    color: '#666666',
    marginBottom: scaleSize(20),
  },
  languageList: {
    marginTop: scaleSize(8),
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scaleSize(16),
  },
  languageItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageCircle: {
    width: scaleSize(44),
    height: scaleSize(44),
    borderRadius: scaleSize(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleSize(16),
  },
  languageCode: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('SEMIBOLD'),
  },
  languageName: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: getFontFamily('MEDIUM'),
    color: '#000000',
  },
  languageNativeName: {
    fontSize: FONT_SIZES.SM,
    fontFamily: getFontFamily('REGULAR'),
    color: '#666666',
  },
  radioContainer: {
    marginRight: scaleSize(8),
  },
  radioOuter: {
    width: scaleSize(24),
    height: scaleSize(24),
    borderRadius: scaleSize(12),
    borderWidth: 2,
    borderColor: COLORS.PRIMARY.MAIN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: COLORS.PRIMARY.MAIN,
  },
  radioInner: {
    width: scaleSize(14),
    height: scaleSize(14),
    borderRadius: scaleSize(7),
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
});

export default InfoScreen;