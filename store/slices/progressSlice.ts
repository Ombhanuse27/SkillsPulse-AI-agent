import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

// --- GRAPHQL FETCHER ---
export async function fetchUserProgress(userId: string) {
  const query = `
    query {
      myProgress(userId: "${userId}") {
        stats {
          level
          totalXP
          currentStreak
          xpToNextLevel
          nextLevelXP
        }
        dailyGoal {
          minsCompleted
          targetMins
          quizzesSolved
          targetQuizzes
          progressPercentage
        }
        achievements {
          badgeId
          badgeName
          badgeIcon
          description
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
  return json.data?.myProgress;
}

// --- THUNKS ---
export const loadUserProgress = createAsyncThunk(
  'progress/loadUserProgress',
  async (userId: string) => {
    return await fetchUserProgress(userId);
  }
);

export const performProgressAction = createAsyncThunk(
  'progress/performProgressAction',
  async (
    { action, userId, data }: { action: string; userId: string; data: any },
    { dispatch }
  ) => {
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, userId, data }),
    });
    const result = await res.json();
    if (result.success) {
      const updatedProgress = await fetchUserProgress(userId);
      return { result, updatedProgress };
    }
    throw new Error('Progress action failed');
  }
);

interface UserProgress {
  stats: {
    level: number;
    totalXP: number;
    currentStreak: number;
    xpToNextLevel: number;
    nextLevelXP: number;
  };
  dailyGoal: {
    minsCompleted: number;
    targetMins: number;
    quizzesSolved: number;
    targetQuizzes: number;
    progressPercentage: number;
  };
  achievements: any[];
}

interface ProgressState {
  userProgress: UserProgress | null;
  showAchievements: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: ProgressState = {
  userProgress: null,
  showAchievements: false,
  loading: false,
  error: null,
};

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    setShowAchievements(state, action: PayloadAction<boolean>) {
      state.showAchievements = action.payload;
    },
    setUserProgress(state, action: PayloadAction<UserProgress>) {
      state.userProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadUserProgress.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadUserProgress.fulfilled, (state, action) => {
        state.userProgress = action.payload;
        state.loading = false;
      })
      .addCase(loadUserProgress.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load progress';
      });

    builder
      .addCase(performProgressAction.fulfilled, (state, action) => {
        if (action.payload?.updatedProgress) {
          state.userProgress = action.payload.updatedProgress;
        }
      });
  },
});

export const { setShowAchievements, setUserProgress } = progressSlice.actions;
export default progressSlice.reducer;