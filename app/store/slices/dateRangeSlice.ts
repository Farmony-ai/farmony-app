
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DateState {
  date: string | null;
  startDate: string | null;
  endDate: string | null;
}

// Get tomorrow's date as default
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const initialState: DateState = {
  date: null,
  startDate: getTomorrowDate(),
  endDate: getTomorrowDate(),
};

const dateRangeSlice = createSlice({
  name: 'date',
  initialState,
  reducers: {
    setDate: (state, action: PayloadAction<string>) => {
      state.date = action.payload;
    },
    clearDate: (state) => {
      state.date = null;
    },
    setDateRange: (state, action: PayloadAction<{ startDate: string; endDate: string }>) => {
      state.startDate = action.payload.startDate;
      state.endDate = action.payload.endDate;
    },
    clearDateRange: (state) => {
      state.startDate = null;
      state.endDate = null;
    },
    setTomorrowAsDefault: (state) => {
      const tomorrow = getTomorrowDate();
      state.startDate = tomorrow;
      state.endDate = tomorrow;
    },
  },
});

export const { setDateRange, clearDateRange, setTomorrowAsDefault } = dateRangeSlice.actions;
export default dateRangeSlice.reducer;
