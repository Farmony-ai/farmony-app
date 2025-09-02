export const COLORS = {
  PRIMARY: {
    MAIN: '#1A7F5A', // Main green
    LIGHT: '#D6F5E6', // Card background green
    DARK: '#145C41',
    CONTRAST: '#FFFFFF',
  },
  SECONDARY: {
    MAIN: '#A3D9C9', // Lighter green for highlights
    LIGHT: '#DDF6D2',
    DARK: '#6FCF97',
    CONTRAST: '#1A7F5A',
  },
  SUCCESS: {
    MAIN: '#28A745', // A standard green for success
    LIGHT: '#D4EDDA', // Lighter shade for backgrounds
    DARK: '#1E7E34', // Darker shade for text/icons
  },
  DANGER: {
    MAIN: '#DC3545', // A standard red for errors and warnings
    LIGHT: '#F8D7DA', // Lighter shade for backgrounds
    DARK: '#721C24', // Darker shade for text/icons
  },
  NEUTRAL: {
    WHITE: '#FFFFFF',
    BLACK: '#222222',
    GRAY: {
      50: '#F8F9FA', // App background
      100: '#F3F4F6', // Card backgrounds
      200: '#E5E7EB', // Borders
      300: '#D1D5DB',
      400: '#9CA3AF', // Placeholder text
      500: '#6B7280', // Secondary text
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  TEXT: {
    PRIMARY: '#222222', // Main text
    SECONDARY: '#6B7280', // Subtext
    ACCENT: '#1A7F5A', // Green accent text
    LINK: '#1A7F5A', // Links
    PLACEHOLDER: '#9CA3AF',
    INVERSE: '#FFFFFF',
    DISABLED: '#D1D5DB',
  },
  BACKGROUND: {
    PRIMARY: '#F8F9FA', // App background
    CARD: '#F3F4F6', // Card backgrounds
    SECONDARY: '#FFFFFF', // Secondary background
    HIGHLIGHT: '#ECFAE5', // Highlighted card
    NAV: '#E9F9F2', // Bottom nav background
  },
  BORDER: {
    PRIMARY: '#E5E7EB',
    SECONDARY: '#D1D5DB',
    FOCUS: '#1A7F5A',
  },
  SHADOW: {
    PRIMARY: 'rgba(26, 127, 90, 0.08)',
    SECONDARY: 'rgba(0, 0, 0, 0.05)',
  },
};

export const getColorWithOpacity = (color: string, opacity: number) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}; 