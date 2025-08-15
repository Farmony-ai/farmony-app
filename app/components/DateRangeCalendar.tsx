
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { COLORS, SPACING, BORDER_RADIUS } from '../utils';
import Text from './Text';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface DateRangeCalendarProps {
  onConfirm: (startDate: string, endDate: string) => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

export default function DateRangeCalendar({ onConfirm, initialStartDate, initialEndDate }: DateRangeCalendarProps) {
  const [markedDates, setMarkedDates] = useState({});
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');

  useEffect(() => {
    if (initialStartDate) {
      const start = new Date(initialStartDate);
      const end = initialEndDate ? new Date(initialEndDate) : start;
      updateMarkedDates(start, end);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStartDate, initialEndDate]);

  const updateMarkedDates = (start: Date, end: Date) => {
    let dates = {};
    let currentDate = new Date(start);
    const stopDate = new Date(end);

    while (currentDate <= stopDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      dates[dateString] = { color: COLORS.PRIMARY.LIGHT, textColor: 'white' };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const startString = start.toISOString().split('T')[0];
    const endString = end.toISOString().split('T')[0];

    setMarkedDates({
      ...dates,
      [startString]: { startingDay: true, color: COLORS.PRIMARY.MAIN, textColor: 'white' },
      [endString]: { endingDay: true, color: COLORS.PRIMARY.MAIN, textColor: 'white' },
    });
  };

  const onDayPress = (day: any) => {
    const selectedDate = new Date(day.dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate('');
      setMarkedDates({ [day.dateString]: { startingDay: true, color: COLORS.PRIMARY.MAIN, textColor: 'white' } });
    } else {
      const newEndDate = day.dateString;
      if (new Date(newEndDate) < new Date(startDate)) {
        setStartDate(day.dateString);
        setEndDate('');
        setMarkedDates({ [day.dateString]: { startingDay: true, color: COLORS.PRIMARY.MAIN, textColor: 'white' } });
      } else {
        setEndDate(newEndDate);
        updateMarkedDates(new Date(startDate), new Date(newEndDate));
      }
    }
  };

  const handleConfirm = () => {
    if (startDate && endDate) {
      onConfirm(startDate, endDate);
    }
  };

  return (
    <View style={styles.container}>
      <Calendar
        minDate={new Date().toISOString().split('T')[0]}
        onDayPress={onDayPress}
        markingType={'period'}
        markedDates={markedDates}
        theme={calendarTheme}
      />
      <TouchableOpacity 
        style={[styles.confirmButton, (!startDate || !endDate) && styles.disabledButton]}
        onPress={handleConfirm} 
        disabled={!startDate || !endDate}
      >
        <Text weight="semibold" color={'white'}>
          Confirm
        </Text>
        <Ionicons name="checkmark-circle-outline" size={20} color={'white'} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
    </View>
  );
}

const calendarTheme = {
  backgroundColor: COLORS.BACKGROUND.CARD,
  calendarBackground: COLORS.BACKGROUND.CARD,
  textSectionTitleColor: COLORS.TEXT.SECONDARY,
  selectedDayBackgroundColor: COLORS.PRIMARY.MAIN,
  selectedDayTextColor: '#ffffff',
  todayTextColor: COLORS.PRIMARY.MAIN,
  dayTextColor: COLORS.TEXT.PRIMARY,
  textDisabledColor: COLORS.TEXT.PLACEHOLDER,
  arrowColor: COLORS.PRIMARY.MAIN,
  monthTextColor: COLORS.TEXT.PRIMARY,
  indicatorColor: COLORS.PRIMARY.MAIN,
  textDayFontFamily: 'Poppins-Regular',
  textMonthFontFamily: 'Poppins-SemiBold',
  textDayHeaderFontFamily: 'Poppins-Medium',
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.BACKGROUND.CARD,
    borderRadius: BORDER_RADIUS.LG,
    padding: SPACING.MD,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY.MAIN,
    borderRadius: BORDER_RADIUS.MD,
    paddingVertical: SPACING.SM,
    marginTop: SPACING.MD,
  },
  disabledButton: {
    backgroundColor: COLORS.TEXT.PLACEHOLDER,
  },
});