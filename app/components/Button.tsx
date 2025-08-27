import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Text from './Text';
import {COLORS, SPACING, BORDER_RADIUS, SHADOWS} from '../utils';

interface ButtonProps extends TouchableOpacityProps {
  // Button content
  title: string;
  
  // Visual variants
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  
  // State management
  loading?: boolean;
  disabled?: boolean;
  
  // Styling
  fullWidth?: boolean;
  style?: any;
  textStyle?: any;
  
  // Icon support (for future use)
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
  onPress,
  ...props
}) => {
  // Determine if button should be disabled
  const isDisabled = disabled || loading;
  
  // Get button styling based on variant
  const getButtonStyle = () => {
    const baseStyle: any[] = [styles.button];
    
    // Add size-specific styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.buttonSmall);
        break;
      case 'large':
        baseStyle.push(styles.buttonLarge);
        break;
      default:
        baseStyle.push(styles.buttonMedium);
    }
    
    // Add variant-specific styles
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.buttonPrimary);
        if (isDisabled) baseStyle.push(styles.buttonPrimaryDisabled);
        break;
      case 'secondary':
        baseStyle.push(styles.buttonSecondary);
        if (isDisabled) baseStyle.push(styles.buttonSecondaryDisabled);
        break;
      case 'outline':
        baseStyle.push(styles.buttonOutline);
        // Outline buttons should not have shadow; remove it to avoid grey padding
        baseStyle.push(styles.noShadow);
        if (isDisabled) baseStyle.push(styles.buttonOutlineDisabled);
        break;
      case 'text':
        baseStyle.push(styles.buttonText);
        // Text buttons should not have shadow; remove it to avoid grey padding
        baseStyle.push(styles.noShadow);
        if (isDisabled) baseStyle.push(styles.buttonTextDisabled);
        break;
      case 'danger':
        baseStyle.push(styles.buttonDanger);
        if (isDisabled) baseStyle.push(styles.buttonDangerDisabled);
        break;
    }
    
    // Add full width style
    if (fullWidth) {
      baseStyle.push(styles.buttonFullWidth);
    }
    
    return baseStyle;
  };
  
  // Get text styling based on variant
  const getTextStyle = () => {
    const baseStyle: any[] = [];
    
    // Add size-specific text styles
    switch (size) {
      case 'small':
        baseStyle.push(styles.textSmall);
        break;
      case 'large':
        baseStyle.push(styles.textLarge);
        break;
      default:
        baseStyle.push(styles.textMedium);
    }
    
    // Add variant-specific text styles
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.textPrimary);
        if (isDisabled) baseStyle.push(styles.textPrimaryDisabled);
        break;
      case 'secondary':
        baseStyle.push(styles.textSecondary);
        if (isDisabled) baseStyle.push(styles.textSecondaryDisabled);
        break;
      case 'outline':
        baseStyle.push(styles.textOutline);
        if (isDisabled) baseStyle.push(styles.textOutlineDisabled);
        break;
      case 'text':
        baseStyle.push(styles.textTextVariant);
        if (isDisabled) baseStyle.push(styles.textTextVariantDisabled);
        break;
      case 'danger':
        baseStyle.push(styles.textDanger);
        if (isDisabled) baseStyle.push(styles.textDangerDisabled);
        break;
    }
    
    return baseStyle;
  };
  
  // Get loading indicator color
  const getLoadingColor = () => {
    switch (variant) {
      case 'primary':
      case 'secondary':
      case 'danger':
        return COLORS.NEUTRAL.WHITE;
      case 'outline':
      case 'text':
        return COLORS.PRIMARY.MAIN;
      default:
        return COLORS.NEUTRAL.WHITE;
    }
  };
  
  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      {...props}
    >
      <View style={styles.buttonContent}>
        {/* Left icon */}
        {leftIcon && !loading && (
          <View style={styles.leftIcon}>{leftIcon}</View>
        )}
        
        {/* Loading indicator */}
        {loading && (
          <ActivityIndicator
            size="small"
            color={getLoadingColor()}
            style={styles.loadingIndicator}
          />
        )}
        
        {/* Button text */}
        <Text
          variant="label"
          weight="semibold"
          style={[...getTextStyle(), textStyle]}
        >
          {title}
        </Text>
        
        {/* Right icon */}
        {rightIcon && !loading && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base button styles
  button: {
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...SHADOWS.SM,
  },

  // Remove all shadow/elevation when needed (for outline/text variants)
  noShadow: {
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  
  // Size variants
  buttonSmall: {
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    minHeight: 36,
  },
  buttonMedium: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    minHeight: 48,
  },
  buttonLarge: {
    paddingHorizontal: SPACING.XL,
    paddingVertical: SPACING.LG,
    minHeight: 56,
  },
  
  // Width variants
  buttonFullWidth: {
    width: '100%',
  },
  
  // Visual variants
  buttonPrimary: {
    backgroundColor: COLORS.PRIMARY.MAIN,
  },
  buttonPrimaryDisabled: {
    backgroundColor: COLORS.NEUTRAL.GRAY[300],
  },
  
  buttonSecondary: {
    backgroundColor: COLORS.SECONDARY.MAIN,
  },
  buttonSecondaryDisabled: {
    backgroundColor: COLORS.NEUTRAL.GRAY[200],
  },
  
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.PRIMARY.MAIN,
  },
  buttonOutlineDisabled: {
    borderColor: COLORS.NEUTRAL.GRAY[300],
  },
  
  buttonText: {
    backgroundColor: 'transparent',
  },
  buttonTextDisabled: {
    backgroundColor: 'transparent',
  },
  
  buttonDanger: {
    backgroundColor: '#EF4444',
  },
  buttonDangerDisabled: {
    backgroundColor: COLORS.NEUTRAL.GRAY[300],
  },
  
  // Button content layout
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Icon styles
  leftIcon: {
    marginRight: SPACING.SM,
  },
  rightIcon: {
    marginLeft: SPACING.SM,
  },
  loadingIndicator: {
    marginRight: SPACING.SM,
  },
  
  // Text size variants
  textSmall: {
    fontSize: 14,
  },
  textMedium: {
    fontSize: 16,
  },
  textLarge: {
    fontSize: 18,
  },
  
  // Text color variants
  textPrimary: {
    color: COLORS.NEUTRAL.WHITE,
  },
  textPrimaryDisabled: {
    color: COLORS.NEUTRAL.GRAY[500],
  },
  
  textSecondary: {
    color: COLORS.PRIMARY.MAIN,
  },
  textSecondaryDisabled: {
    color: COLORS.NEUTRAL.GRAY[500],
  },
  
  textOutline: {
    color: COLORS.PRIMARY.MAIN,
  },
  textOutlineDisabled: {
    color: COLORS.NEUTRAL.GRAY[500],
  },
  
  textTextVariant: {
    color: COLORS.PRIMARY.MAIN,
  },
  textTextVariantDisabled: {
    color: COLORS.NEUTRAL.GRAY[500],
  },
  
  textDanger: {
    color: COLORS.NEUTRAL.WHITE,
  },
  textDangerDisabled: {
    color: COLORS.NEUTRAL.GRAY[500],
  },
});

export default Button;
