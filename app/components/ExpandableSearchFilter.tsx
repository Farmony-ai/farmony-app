import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Text from './Text';
import { COLORS, SPACING, BORDER_RADIUS, FONTS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateRangeCalendar from './DateRangeCalendar';
import DateCards from './DateCards';
import { useDispatch, useSelector } from 'react-redux';
import { setDateRange, setTomorrowAsDefault } from '../store/slices/dateRangeSlice';
import { RootState } from '../store';

export default function ExpandableSearchFilter({ onToggleExpand }: { onToggleExpand: (expanded: boolean, contentHeight: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [dateCardsHeight, setDateCardsHeight] = useState(0);
  const [datePickerHeight, setDatePickerHeight] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const contentOpacityAnim = useRef(new Animated.Value(0)).current;
  const dispatch = useDispatch();
  const { startDate, endDate } = useSelector((state: RootState) => state.date);
  const dotAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!startDate || !endDate) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnimation, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(dotAnimation, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      dotAnimation.setValue(1); // Keep dot solid when a date is selected
    }
  }, [startDate, endDate, dotAnimation]);

  // Reset showDatePicker when expanded state changes
  useEffect(() => {
    if (!expanded) {
      setShowDatePicker(false);
      // Force clean state when collapsed
      animatedHeight.setValue(0);
      contentOpacityAnim.setValue(0);
    }
  }, [expanded]);

  // Reset states when component unmounts
  useEffect(() => {
    return () => {
      animatedHeight.setValue(0);
      contentOpacityAnim.setValue(0);
    };
  }, []);

  const getCurrentContentHeight = () => {
    const height = showDatePicker ? datePickerHeight : dateCardsHeight;
    console.log('getCurrentContentHeight - showDatePicker:', showDatePicker, 'height:', height);
    return height;
  };

  const toggleExpand = () => {
    const currentHeight = getCurrentContentHeight();
    console.log('toggleExpand - currentHeight:', currentHeight, 'dateCardsHeight:', dateCardsHeight);
    
    const newExpandedState = !expanded;
    setExpanded(newExpandedState);

    if (newExpandedState) {
      // Ensure we start with date cards when expanding
      setShowDatePicker(false);
      // Reset height to 0 first to ensure clean animation
      animatedHeight.setValue(0);
      contentOpacityAnim.setValue(0); // Also reset opacity
      
      // Use a minimum height if measurement failed
      const targetHeight = dateCardsHeight > 0 ? dateCardsHeight : 200;
      console.log('Expanding to height:', targetHeight);
      
      Animated.parallel([
        Animated.timing(animatedHeight, { toValue: targetHeight, duration: 300, useNativeDriver: false }),
        Animated.timing(contentOpacityAnim, { toValue: 1, duration: 200, delay: 100, useNativeDriver: true }),
      ]).start(() => onToggleExpand(true, targetHeight));
    } else {
      Animated.sequence([
        Animated.timing(contentOpacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(animatedHeight, { toValue: 0, duration: 300, useNativeDriver: false }),
      ]).start(() => {
        // Force height to 0 after animation
        animatedHeight.setValue(0);
        onToggleExpand(false, 0);
        // Reset to date cards after collapse animation completes
        setShowDatePicker(false);
      });
    }
  };

  const handleDateSelect = (date: string) => {
    dispatch(setDateRange({ startDate: date, endDate: date }));
    if (expanded) {
      // Ensure clean collapse
      Animated.timing(contentOpacityAnim, { 
        toValue: 0, 
        duration: 150, 
        useNativeDriver: true 
      }).start(() => {
        toggleExpand();
      });
    }
  };

  const handleMorePress = () => {
    console.log('handleMorePress called - animating to date picker');
    
    // First fade out current content
    Animated.timing(contentOpacityAnim, { 
      toValue: 0, 
      duration: 150, 
      useNativeDriver: true 
    }).start(() => {
      // After fade out, switch content and animate height
      setShowDatePicker(true);
      
      // Animate to new height
      Animated.parallel([
        Animated.timing(animatedHeight, { 
          toValue: datePickerHeight, 
          duration: 300, 
          useNativeDriver: false 
        }),
        Animated.timing(contentOpacityAnim, { 
          toValue: 1, 
          duration: 150, 
          delay: 150,
          useNativeDriver: true 
        })
      ]).start(() => {
        // Update parent about new height
        onToggleExpand(true, datePickerHeight);
      });
    });
  };

  const handleConfirmDate = (start: string, end: string) => {
    dispatch(setDateRange({ startDate: start, endDate: end }));
    // Animate back to date cards view before collapsing
    Animated.timing(contentOpacityAnim, { 
      toValue: 0, 
      duration: 150, 
      useNativeDriver: true 
    }).start(() => {
      setShowDatePicker(false);
      if (expanded) {
        toggleExpand();
      }
    });
  };

  const handleClearDate = () => {
    dispatch(setTomorrowAsDefault());
    if (expanded) {
      // Ensure clean collapse
      Animated.timing(contentOpacityAnim, { 
        toValue: 0, 
        duration: 150, 
        useNativeDriver: true 
      }).start(() => {
        toggleExpand();
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDisplayText = () => {
    if (!startDate || !endDate) {
      return 'Tomorrow';
    }
    
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    
    if (startDate === tomorrowString && endDate === tomorrowString) {
      return 'Tomorrow';
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const renderDateCards = () => (
    <DateCards
      selectedDate={startDate || ''}
      onDateSelect={handleDateSelect}
      onMorePress={handleMorePress}
    />
  );

  const renderDatePicker = () => (
    <DateRangeCalendar 
      onConfirm={handleConfirmDate} 
      initialStartDate={startDate || undefined}
      initialEndDate={endDate || undefined}
    />
  );

  const renderContent = () => {
    return (
      <>
        {showDatePicker ? renderDatePicker() : renderDateCards()}
        <TouchableOpacity style={styles.immediateButton} onPress={handleClearDate}>
          <Text style={styles.immediateButtonText}>Set to Tomorrow</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={toggleExpand} activeOpacity={0.8}>
        <View style={styles.headerTextContainer}>
          <Animated.View style={[styles.flashingDot, { opacity: dotAnimation }]} />
          <Text style={styles.headerText}>
            {getDisplayText()}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={COLORS.TEXT.INVERSE} />
      </TouchableOpacity>
      
      <Animated.View style={[styles.content, { height: animatedHeight }]}>
        <Animated.View style={[styles.innerContent, { opacity: contentOpacityAnim }]}>
          {expanded && renderContent()}
        </Animated.View>
      </Animated.View>

      {/* Hidden containers for height measurement */}
      <View style={styles.hiddenContainer} pointerEvents="none">
        <View onLayout={(event) => {
          const height = event.nativeEvent.layout.height + SPACING.SM + 40; // Include button height
          console.log('DateCards total height measured:', height);
          setDateCardsHeight(height);
        }}>
          <DateCards
            selectedDate={startDate || ''}
            onDateSelect={() => {}}
            onMorePress={() => {}}
          />
          <TouchableOpacity style={styles.immediateButton}>
            <Text style={styles.immediateButtonText}>Set to Tomorrow</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.hiddenContainer} pointerEvents="none">
        <View onLayout={(event) => {
          const height = event.nativeEvent.layout.height + SPACING.SM + 40; // Include button height
          console.log('DatePicker total height measured:', height);
          setDatePickerHeight(height);
        }}>
          <DateRangeCalendar 
            onConfirm={() => {}} 
            initialStartDate={startDate || undefined}
            initialEndDate={endDate || undefined}
          />
          <TouchableOpacity style={styles.immediateButton}>
            <Text style={styles.immediateButtonText}>Set to Tomorrow</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.MD,
    marginTop: SPACING['XL'],
    marginBottom: -20, // Removed bottom margin completely
    marginHorizontal: SPACING.MD,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.SM,
    paddingVertical: SPACING.XS,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    color: COLORS.TEXT.INVERSE,
    fontSize: FONT_SIZES.BASE,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  flashingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.SECONDARY.LIGHT,
    marginRight: SPACING.XS,
  },
  content: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    minHeight: 0, // Ensure it can collapse to 0
  },
  innerContent: {
    flex: 1,
    padding: 0, // Ensure no extra padding
    margin: 0, // Ensure no extra margin
  },
  immediateButton: {
    alignItems: 'center',
    marginTop: SPACING.SM,
    backgroundColor: 'transparent',
    paddingVertical: SPACING.XS,
  },
  immediateButtonText: {
    color: COLORS.TEXT.INVERSE,
    fontSize: FONT_SIZES.SM,
    fontFamily: FONTS.POPPINS.MEDIUM,
  },
  hiddenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: -1,
    pointerEvents: 'none',
  },
});