
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
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
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

  const getPeriodMarkedDates = (start: Date, end: Date) => {
    const dates: Record<string, any> = {};
    let currentDate = new Date(start);
    const stopDate = new Date(end);

    while (currentDate <= stopDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      dates[dateString] = {
        color: COLORS.PRIMARY.LIGHT,
        textColor: COLORS.PRIMARY.DARK,
        customTextStyle: styles.periodDayText,
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const startString = start.toISOString().split('T')[0];
    const endString = end.toISOString().split('T')[0];

    dates[startString] = {
      startingDay: true,
      color: COLORS.PRIMARY.MAIN,
      textColor: 'white',
      customTextStyle: styles.singleDayText,
    };
    dates[endString] = {
      endingDay: true,
      color: COLORS.PRIMARY.MAIN,
      textColor: 'white',
      customTextStyle: styles.singleDayText,
    };

    return dates;
  };

  const getSingleMarkedDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return {
      [dateString]: {
        selected: true,
        startingDay: true,
        endingDay: true,
        color: COLORS.PRIMARY.MAIN,
        textColor: '#FFFFFF',
        customContainerStyle: styles.singleDayContainer,
        customTextStyle: styles.singleDayText,
      },
    };
  };

  const updateMarkedDates = (start: Date, end: Date) => {
    if (start.toDateString() === end.toDateString()) {
      setMarkedDates(getSingleMarkedDate(start));
    } else {
      setMarkedDates(getPeriodMarkedDates(start, end));
    }
  };

  const onDayPress = (day: any) => {
    const selectedDate = new Date(day.dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) return;

    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate('');
      setMarkedDates(getSingleMarkedDate(selectedDate));
    } else {
      const newEndDate = day.dateString;
      if (new Date(newEndDate) < new Date(startDate)) {
        setStartDate(day.dateString);
        setEndDate('');
        setMarkedDates(getSingleMarkedDate(selectedDate));
      } else {
        setEndDate(newEndDate);
        updateMarkedDates(new Date(startDate), new Date(newEndDate));
      }
    }
  };

  const handleConfirm = () => {
    if (startDate) {
      if (endDate) {
        onConfirm(startDate, endDate);
      } else {
        onConfirm(startDate, startDate);
      }
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
        style={[
          styles.confirmButton,
          !startDate && styles.disabledButton,
        ]}
        onPress={handleConfirm}
        disabled={!startDate}
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
  singleDayContainer: {
    borderRadius: BORDER_RADIUS.FULL,
    backgroundColor: COLORS.PRIMARY.MAIN,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    width: 38,
    height: 38,
    alignSelf: 'center',
  },
  singleDayText: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  periodDayText: {
    fontWeight: '500',
    color: COLORS.PRIMARY.DARK,
  },
});
