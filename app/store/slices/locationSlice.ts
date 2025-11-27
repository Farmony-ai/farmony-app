import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  radius: number | null; // Default search radius
}

const initialState: LocationState = {
  latitude: null,
  longitude: null,
  city: null,
  radius: null, // Default radius in kilometers
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setLocation: (state, action: PayloadAction<{ latitude: number; longitude: number; city?: string }>) => {
      state.latitude = action.payload.latitude;
      state.longitude = action.payload.longitude;
      state.city = action.payload.city || null;
    },
    setRadius: (state, action: PayloadAction<number>) => {
      state.radius = action.payload;
    },
    clearLocation: (state) => {
      state.latitude = null;
      state.longitude = null;
      state.city = null;
    },
  },
});

export const { setLocation, setRadius, clearLocation } = locationSlice.actions;
export default locationSlice.reducer;
