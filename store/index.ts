import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import roadmapReducer from './slices/roadmapSlice';
import progressReducer from './slices/progressSlice';
import mentorReducer from './slices/mentorSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    roadmap: roadmapReducer,
    progress: progressReducer,
    mentor: mentorReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;