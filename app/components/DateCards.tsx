import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Text from './Text';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONTS, FONT_SIZES } from '../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface DateCardsProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onMorePress: () => void;
}

export default function DateCards({ selectedDate, onDateSelect, onMorePress }: DateCardsProps) {
  // Generate next 5 days starting from tomorrow
  const getNextFiveDays = () => {
    const dates = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(tomorrow);
      date.setDate(tomorrow.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        day: date.getDate(),
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
      });
    }
    return dates;
  };



  const dates = getNextFiveDays();

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {dates.map((dateInfo, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dateCard,
              selectedDate === dateInfo.date && styles.selectedDateCard
            ]}
            onPress={() => onDateSelect(dateInfo.date)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.dayName,
              selectedDate === dateInfo.date && styles.selectedDayName
            ]}>
              {dateInfo.dayName}
            </Text>
            <Text style={[
              styles.dayNumber,
              selectedDate === dateInfo.date && styles.selectedDayNumber
            ]}>
              {dateInfo.day}
            </Text>
            <Text style={[
              styles.month,
              selectedDate === dateInfo.date && styles.selectedMonth
            ]}>
              {dateInfo.month}
            </Text>
          </TouchableOpacity>
        ))}
        
        {/* More button */}
        <TouchableOpacity
          style={styles.moreCard}
          onPress={onMorePress}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.TEXT.SECONDARY} />
          <Text style={styles.moreText}>More</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.SM,
  },
  scrollContent: {
    paddingHorizontal: SPACING.SM,
    gap: SPACING.SM,
  },
  dateCard: {
    width: 60,
    height: 80,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XS,
    ...SHADOWS.SM,
  },
  selectedDateCard: {
    backgroundColor: COLORS.PRIMARY.MAIN,
    ...SHADOWS.MD,
  },
  dayName: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginBottom: 2,
  },
  selectedDayName: {
    color: COLORS.NEUTRAL.WHITE,
  },
  dayNumber: {
    fontSize: FONT_SIZES.LG,
    fontFamily: FONTS.POPPINS.BOLD,
    color: COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  selectedDayNumber: {
    color: COLORS.NEUTRAL.WHITE,
  },
  month: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.REGULAR,
    color: COLORS.TEXT.SECONDARY,
  },
  selectedMonth: {
    color: COLORS.NEUTRAL.WHITE,
  },
  moreCard: {
    width: 60,
    height: 80,
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: BORDER_RADIUS.MD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.XS,
    ...SHADOWS.SM,
  },
  moreText: {
    fontSize: FONT_SIZES.XS,
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: COLORS.TEXT.SECONDARY,
    marginTop: 4,
  },
}); 