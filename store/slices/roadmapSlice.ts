import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// --- GRAPHQL FETCHERS (moved from component) ---
export async function fetchRoadmaps(userId: string) {
  const query = `
    query {
      myRoadmaps(userId: "${userId}") {
        id
        title
        completionPercentage
        milestones {
          id
          title
          description
          week
          estimatedHours
          resources {
            id
            title
            url
            type
          }
          progress {
            status
            resourcesViewed
          }
        }
      }
    }
  `;
  const res = await fetch('/api/graphql-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  return json.data?.myRoadmaps || [];
}

// --- THUNKS ---
export const loadRoadmaps = createAsyncThunk(
  'roadmap/loadRoadmaps',
  async (userId: string) => {
    return await fetchRoadmaps(userId);
  }
);

export const generateRoadmap = createAsyncThunk(
  'roadmap/generateRoadmap',
  async ({ goal, userId }: { goal: string; userId: string }, { dispatch }) => {
    await fetch('/api/agent', {
      method: 'POST',
      body: JSON.stringify({ goal, userId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const updatedMaps = await fetchRoadmaps(userId);
    return updatedMaps;
  }
);

interface RoadmapState {
  roadmaps: any[];
  goal: string;
  loading: boolean;
  error: string | null;
}

const initialState: RoadmapState = {
  roadmaps: [],
  goal: '',
  loading: false,
  error: null,
};

const roadmapSlice = createSlice({
  name: 'roadmap',
  initialState,
  reducers: {
    setGoal(state, action: PayloadAction<string>) {
      state.goal = action.payload;
    },
    setRoadmaps(state, action: PayloadAction<any[]>) {
      state.roadmaps = action.payload;
    },
  },
  extraReducers: (builder) => {
    // loadRoadmaps
    builder
      .addCase(loadRoadmaps.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadRoadmaps.fulfilled, (state, action) => {
        state.roadmaps = action.payload;
        state.loading = false;
      })
      .addCase(loadRoadmaps.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load roadmaps';
      });

    // generateRoadmap
    builder
      .addCase(generateRoadmap.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateRoadmap.fulfilled, (state, action) => {
        state.roadmaps = action.payload;
        state.loading = false;
        state.goal = '';
      })
      .addCase(generateRoadmap.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate roadmap';
      });
  },
});

export const { setGoal, setRoadmaps } = roadmapSlice.actions;
export default roadmapSlice.reducer;