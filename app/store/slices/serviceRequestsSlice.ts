import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import ServiceRequestService, {
  ServiceRequest,
  CreateServiceRequestDto,
  AcceptServiceRequestDto,
  ServiceRequestsResponse,
  AcceptRequestResponse,
  ServiceRequestFilters,
} from '../../services/ServiceRequestService';

interface ServiceRequestsState {
  myRequests: ServiceRequest[];
  availableRequests: ServiceRequest[];
  currentRequest: ServiceRequest | null;
  loading: boolean;
  creating: boolean;
  accepting: boolean;
  error: string | null;
  filters: ServiceRequestFilters;
  totalMyRequests: number;
  totalAvailableRequests: number;
}

const initialState: ServiceRequestsState = {
  myRequests: [],
  availableRequests: [],
  currentRequest: null,
  loading: false,
  creating: false,
  accepting: false,
  error: null,
  filters: {},
  totalMyRequests: 0,
  totalAvailableRequests: 0,
};

// Async thunks
export const createServiceRequest = createAsyncThunk(
  'serviceRequests/create',
  async (data: CreateServiceRequestDto) => {
    const response = await ServiceRequestService.createRequest(data);
    return response;
  }
);

export const fetchMyRequests = createAsyncThunk(
  'serviceRequests/fetchMy',
  async (filters?: ServiceRequestFilters) => {
    const response = await ServiceRequestService.getMyRequests(filters);
    return response;
  }
);

export const fetchAvailableRequests = createAsyncThunk(
  'serviceRequests/fetchAvailable',
  async (filters?: ServiceRequestFilters) => {
    const response = await ServiceRequestService.getAvailableRequests(filters);
    return response;
  }
);

export const fetchRequestById = createAsyncThunk(
  'serviceRequests/fetchById',
  async (id: string) => {
    const response = await ServiceRequestService.getRequestById(id);
    return response;
  }
);

export const acceptServiceRequest = createAsyncThunk(
  'serviceRequests/accept',
  async ({ requestId, data }: { requestId: string; data: AcceptServiceRequestDto }) => {
    const response = await ServiceRequestService.acceptRequest(requestId, data);
    return response;
  }
);

export const updateServiceRequest = createAsyncThunk(
  'serviceRequests/update',
  async ({ requestId, data }: { requestId: string; data: Partial<CreateServiceRequestDto> }) => {
    const response = await ServiceRequestService.updateRequest(requestId, data);
    return response;
  }
);

export const cancelServiceRequest = createAsyncThunk(
  'serviceRequests/cancel',
  async ({ requestId, reason }: { requestId: string; reason?: string }) => {
    const response = await ServiceRequestService.cancelRequest(requestId, reason);
    return response;
  }
);

const serviceRequestsSlice = createSlice({
  name: 'serviceRequests',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ServiceRequestFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
    updateRequestStatus: (state, action: PayloadAction<{ id: string; status: string }>) => {
      const { id, status } = action.payload;

      // Update in myRequests
      const myRequestIndex = state.myRequests.findIndex((r) => r._id === id);
      if (myRequestIndex !== -1) {
        state.myRequests[myRequestIndex].status = status as any;
      }

      // Update in availableRequests
      const availableIndex = state.availableRequests.findIndex((r) => r._id === id);
      if (availableIndex !== -1) {
        state.availableRequests[availableIndex].status = status as any;
      }

      // Update current request
      if (state.currentRequest?._id === id) {
        state.currentRequest.status = status as any;
      }
    },
    clearCurrentRequest: (state) => {
      state.currentRequest = null;
    },
    updateRequestInStore: (state, action: PayloadAction<ServiceRequest>) => {
      const request = action.payload;
      // Update in myRequests
      const myIndex = state.myRequests.findIndex(r => r._id === request._id);
      if (myIndex !== -1) {
        state.myRequests[myIndex] = request;
      }
      // Update in availableRequests
      const availIndex = state.availableRequests.findIndex(r => r._id === request._id);
      if (availIndex !== -1) {
        state.availableRequests[availIndex] = request;
      }
      // Update currentRequest if it's the same
      if (state.currentRequest?._id === request._id) {
        state.currentRequest = request;
      }
    },
    addToMyRequests: (state, action: PayloadAction<ServiceRequest>) => {
      const exists = state.myRequests.some(r => r._id === action.payload._id);
      if (!exists) {
        state.myRequests.unshift(action.payload);
        state.totalMyRequests++;
      }
    },
    addToAvailableRequests: (state, action: PayloadAction<ServiceRequest>) => {
      const exists = state.availableRequests.some(r => r._id === action.payload._id);
      if (!exists) {
        state.availableRequests.unshift(action.payload);
        state.totalAvailableRequests++;
      }
    },
    removeFromAvailableRequests: (state, action: PayloadAction<string>) => {
      state.availableRequests = state.availableRequests.filter(r => r._id !== action.payload);
      state.totalAvailableRequests = Math.max(0, state.totalAvailableRequests - 1);
    },
  },
  extraReducers: (builder) => {
    // Create service request
    builder
      .addCase(createServiceRequest.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createServiceRequest.fulfilled, (state, action) => {
        state.creating = false;
        state.myRequests.unshift(action.payload);
        state.currentRequest = action.payload;
      })
      .addCase(createServiceRequest.rejected, (state, action) => {
        state.creating = false;
        state.error = action.error.message || 'Failed to create request';
      });

    // Fetch my requests
    builder
      .addCase(fetchMyRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.myRequests = action.payload.requests;
        state.totalMyRequests = action.payload.total;
      })
      .addCase(fetchMyRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch requests';
      });

    // Fetch available requests
    builder
      .addCase(fetchAvailableRequests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableRequests.fulfilled, (state, action) => {
        state.loading = false;
        state.availableRequests = action.payload.requests;
        state.totalAvailableRequests = action.payload.total;
      })
      .addCase(fetchAvailableRequests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch available requests';
      });

    // Fetch request by ID
    builder
      .addCase(fetchRequestById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRequestById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRequest = action.payload;
      })
      .addCase(fetchRequestById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch request';
      });

    // Accept service request
    builder
      .addCase(acceptServiceRequest.pending, (state) => {
        state.accepting = true;
        state.error = null;
      })
      .addCase(acceptServiceRequest.fulfilled, (state, action) => {
        state.accepting = false;

        // Update the request in available requests
        const index = state.availableRequests.findIndex(
          (r) => r._id === action.payload.request._id
        );
        if (index !== -1) {
          state.availableRequests[index] = action.payload.request;
        }

        // Update current request if it matches
        if (state.currentRequest?._id === action.payload.request._id) {
          state.currentRequest = action.payload.request;
        }
      })
      .addCase(acceptServiceRequest.rejected, (state, action) => {
        state.accepting = false;
        state.error = action.error.message || 'Failed to accept request';
      });

    // Update service request
    builder
      .addCase(updateServiceRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateServiceRequest.fulfilled, (state, action) => {
        state.loading = false;

        // Update in myRequests
        const index = state.myRequests.findIndex((r) => r._id === action.payload._id);
        if (index !== -1) {
          state.myRequests[index] = action.payload;
        }

        // Update current request
        if (state.currentRequest?._id === action.payload._id) {
          state.currentRequest = action.payload;
        }
      })
      .addCase(updateServiceRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to update request';
      });

    // Cancel service request
    builder
      .addCase(cancelServiceRequest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelServiceRequest.fulfilled, (state, action) => {
        state.loading = false;

        // Update in myRequests
        const index = state.myRequests.findIndex((r) => r._id === action.payload._id);
        if (index !== -1) {
          state.myRequests[index] = action.payload;
        }

        // Update current request
        if (state.currentRequest?._id === action.payload._id) {
          state.currentRequest = action.payload;
        }
      })
      .addCase(cancelServiceRequest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to cancel request';
      });
  },
});

export const {
  setFilters,
  clearFilters,
  clearError,
  updateRequestStatus,
  clearCurrentRequest,
  updateRequestInStore,
  addToMyRequests,
  addToAvailableRequests,
  removeFromAvailableRequests,
} = serviceRequestsSlice.actions;

export default serviceRequestsSlice.reducer;