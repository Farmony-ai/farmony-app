import { Dimensions, PixelRatio, Platform } from 'react-native';

// Get device dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 16 Pro as reference - matching your ideal sizes)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

// Scale factors
const widthScale = SCREEN_WIDTH / BASE_WIDTH;
const heightScale = SCREEN_HEIGHT / BASE_HEIGHT;

// Use the smaller scale to ensure content fits on all screens
const scale = Math.min(widthScale, heightScale);

/**
 * Scales a size based on device dimensions
 * @param size - The base size to scale
 * @param factor - Optional scaling factor (default: 1)
 */
export const scaleSize = (size: number, factor: number = 1): number => {
  const newSize = size * scale * factor;
  
  // Apply platform-specific adjustments
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  
  // Android: Apply slightly more conservative scaling for smaller devices
  const androidScale = SCREEN_WIDTH < 380 ? 0.95 : 1;
  return Math.round(PixelRatio.roundToNearestPixel(newSize * androidScale));
};

/**
 * Scales font size with limits to maintain readability
 * @param fontSize - The base font size
 */
export const scaleFontSize = (fontSize: number): number => {
  const scaledSize = scaleSize(fontSize);
  
  // Set minimum and maximum font sizes for readability
  const MIN_FONT_SIZE = 9;
  const MAX_SCALE = 1.3; // Maximum 30% larger than base
  
  const maxSize = fontSize * MAX_SCALE;
  
  return Math.max(MIN_FONT_SIZE, Math.min(scaledSize, maxSize));
};

/**
 * Get device size category
 */
export const getDeviceSize = (): 'small' | 'medium' | 'large' | 'xlarge' => {
  if (SCREEN_WIDTH < 360) return 'small';
  if (SCREEN_WIDTH < 400) return 'medium';
  if (SCREEN_WIDTH < 450) return 'large';
  return 'xlarge';
};

// Font family constants
export const FONTS = {
  POPPINS: {
    REGULAR: 'Poppins-Regular',
    MEDIUM: 'Poppins-Medium',
    SEMIBOLD: 'Poppins-SemiBold',
    BOLD: 'Poppins-Bold',
    LIGHT: 'Poppins-Light',
    THIN: 'Poppins-Thin',
    EXTRALIGHT: 'Poppins-ExtraLight',
    EXTRABOLD: 'Poppins-ExtraBold',
    BLACK: 'Poppins-Black',
  },
} as const;

export const FONT_WEIGHTS = {
  THIN: '100',
  EXTRALIGHT: '200',
  LIGHT: '300',
  REGULAR: '400',
  MEDIUM: '500',
  SEMIBOLD: '600',
  BOLD: '700',
  EXTRABOLD: '800',
  BLACK: '900',
} as const;

// Base font sizes (based on your iPhone 16 Pro ideal sizes)
const BASE_FONT_SIZES = {
  // Extra small sizes
  '2XS': 10,    // Date text, selected full date
  XS: 11,       // Location subtext, day text, service desc, more dates text
  SM: 12,       // Date label, service name
  
  // Medium sizes  
  BASE_SM: 13,  // CTA subtext, view all text, category pill text
  BASE: 14,     // Weather temp, CTA button text
  BASE_LG: 15,  // Search placeholder
  
  // Large sizes
  LG: 16,       // CTA title
  XL: 18,       // Location text, section title, modal title
  
  // Display sizes (for other screens)
  '2XL': 20,
  '3XL': 24,
  '4XL': 30,
  '5XL': 36,
  '6XL': 48,
} as const;

// Responsive font sizes
export const FONT_SIZES = {
  '2XS': scaleFontSize(BASE_FONT_SIZES['2XS']),
  XS: scaleFontSize(BASE_FONT_SIZES.XS),
  SM: scaleFontSize(BASE_FONT_SIZES.SM),
  BASE_SM: scaleFontSize(BASE_FONT_SIZES.BASE_SM),
  BASE: scaleFontSize(BASE_FONT_SIZES.BASE),
  BASE_LG: scaleFontSize(BASE_FONT_SIZES.BASE_LG),
  LG: scaleFontSize(BASE_FONT_SIZES.LG),
  XL: scaleFontSize(BASE_FONT_SIZES.XL),
  '2XL': scaleFontSize(BASE_FONT_SIZES['2XL']),
  '3XL': scaleFontSize(BASE_FONT_SIZES['3XL']),
  '4XL': scaleFontSize(BASE_FONT_SIZES['4XL']),
  '5XL': scaleFontSize(BASE_FONT_SIZES['5XL']),
  '6XL': scaleFontSize(BASE_FONT_SIZES['6XL']),
} as const;

// Helper function to get font family with weight
export const getFontFamily = (weight: keyof typeof FONT_WEIGHTS = 'REGULAR') => {
  const fontWeights = {
    THIN: FONTS.POPPINS.THIN,
    EXTRALIGHT: FONTS.POPPINS.EXTRALIGHT,
    LIGHT: FONTS.POPPINS.LIGHT,
    REGULAR: FONTS.POPPINS.REGULAR,
    MEDIUM: FONTS.POPPINS.MEDIUM,
    SEMIBOLD: FONTS.POPPINS.SEMIBOLD,
    BOLD: FONTS.POPPINS.BOLD,
    EXTRABOLD: FONTS.POPPINS.EXTRABOLD,
    BLACK: FONTS.POPPINS.BLACK,
  };
  
  return fontWeights[weight];
};

// Typography presets based on your HomeScreen usage
export const typography = {
  // Headers
  locationText: {
    fontSize: FONT_SIZES.XL,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  modalTitle: {
    fontSize: FONT_SIZES.XL,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  
  // Body text variations
  ctaTitle: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  searchPlaceholder: {
    fontSize: FONT_SIZES.BASE_LG,
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  weatherTemp: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  ctaButtonText: {
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.SEMIBOLD,
  },
  ctaSubtext: {
    fontSize: FONT_SIZES.BASE_SM,
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  viewAllText: {
    fontSize: FONT_SIZES.BASE_SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  categoryPillText: {
    fontSize: FONT_SIZES.BASE_SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  
  // Small text
  dateLabel: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  serviceName: {
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  locationSubtext: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  dayText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  serviceDesc: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  moreDatesText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  
  // Extra small text
  dateText: {
    fontSize: FONT_SIZES['2XS'],
    fontFamily: FONTS.POPPINS.REGULAR,
  },
  selectedFullDate: {
    fontSize: FONT_SIZES['2XS'],
    fontFamily: FONTS.POPPINS.REGULAR,
  },
};

// Spacing helper (also responsive)
export const spacing = {
  xs: scaleSize(4),
  sm: scaleSize(8),
  md: scaleSize(16),
  lg: scaleSize(24),
  xl: scaleSize(32),
  '2xl': scaleSize(48),
  '3xl': scaleSize(64),
};

// Export device info for debugging
export const deviceInfo = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  scale: scale,
  deviceSize: getDeviceSize(),
  pixelRatio: PixelRatio.get(),
  fontScale: PixelRatio.getFontScale(),
  platform: Platform.OS,
};