import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { setDate } from '../store/slices/dateRangeSlice';
import { FONTS, COLORS, SPACING, BORDER_RADIUS } from '../utils';

const SmartDatePicker = ({ onMoreDatesPress, selectedDate, onDateSelect }) => {
  const dispatch = useDispatch();

  const dates = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  const handleDateSelect = (date) => {
    onDateSelect(date);
  };

  const getDayLabel = (date) => {
    const today = new Date();
    if (date.getDate() === today.getDate()) {
      return 'Today';
    }
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    if (date.getDate() === tomorrow.getDate()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollViewContent}>
        {dates.map((date, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dateButton,
              selectedDate && selectedDate.getDate() === date.getDate() && styles.selectedDateButton,
            ]}
            onPress={() => handleDateSelect(date)}
          >
            <Text style={[styles.dayText, selectedDate && selectedDate.getDate() === date.getDate() && styles.selectedDateText]}>
              {getDayLabel(date)}
            </Text>
            <Text style={[styles.dateText, selectedDate && selectedDate.getDate() === date.getDate() && styles.selectedDateText]}>
              {date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.moreDatesButton} onPress={onMoreDatesPress}>
          <Text style={styles.moreDatesText}>More Dates</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.SM,
  },
  scrollViewContent: {
    paddingHorizontal: SPACING.MD,
  },
  dateButton: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    marginHorizontal: SPACING.XS,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedDateButton: {
    backgroundColor: 'white',
  },
  dayText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: 'white',
    fontSize: 14,
  },
  dateText: {
    fontFamily: FONTS.POPPINS.REGULAR,
    color: 'white',
    fontSize: 12,
    marginTop: SPACING.XS,
  },
  selectedDateText: {
    color: COLORS.PRIMARY.MAIN,
  },
  moreDatesButton: {
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: BORDER_RADIUS.LG,
    marginHorizontal: SPACING.XS,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  moreDatesText: {
    fontFamily: FONTS.POPPINS.MEDIUM,
    color: 'white',
    fontSize: 14,
  },
});

export default SmartDatePicker;