import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  text?: string;
  quiz?: QuizData;
  userAnswer?: number;
}

interface MentorState {
  activeMilestone: any | null;
  chatHistory: ChatMessage[];
  chatInput: string;
  isStreaming: boolean;
  isThinking: boolean;
  showWelcome: boolean;
}

const initialState: MentorState = {
  activeMilestone: null,
  chatHistory: [],
  chatInput: '',
  isStreaming: false,
  isThinking: false,
  showWelcome: true,
};

const mentorSlice = createSlice({
  name: 'mentor',
  initialState,
  reducers: {
    setActiveMilestone(state, action: PayloadAction<any | null>) {
      state.activeMilestone = action.payload;
    },
    setChatHistory(state, action: PayloadAction<ChatMessage[]>) {
      state.chatHistory = action.payload;
    },
    appendChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.chatHistory.push(action.payload);
    },
    updateLastAiMessage(state, action: PayloadAction<string>) {
      const history = state.chatHistory;
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === 'ai') {
          history[i].text = action.payload;
          break;
        }
      }
    },
    setQuizAnswer(state, action: PayloadAction<{ index: number; answer: number }>) {
      const msg = state.chatHistory[action.payload.index];
      if (msg && msg.quiz) {
        msg.userAnswer = action.payload.answer;
      }
    },
    setChatInput(state, action: PayloadAction<string>) {
      state.chatInput = action.payload;
    },
    setIsStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },
    setIsThinking(state, action: PayloadAction<boolean>) {
      state.isThinking = action.payload;
    },
    setShowWelcome(state, action: PayloadAction<boolean>) {
      state.showWelcome = action.payload;
    },
    openMilestone(state, action: PayloadAction<any>) {
      state.activeMilestone = action.payload;
      state.chatHistory = [];
      state.showWelcome = true;
      state.chatInput = '';
    },
    closeMentor(state) {
      state.activeMilestone = null;
      state.chatHistory = [];
      state.showWelcome = true;
      state.chatInput = '';
      state.isStreaming = false;
      state.isThinking = false;
    },
  },
});

export const {
  setActiveMilestone,
  setChatHistory,
  appendChatMessage,
  updateLastAiMessage,
  setQuizAnswer,
  setChatInput,
  setIsStreaming,
  setIsThinking,
  setShowWelcome,
  openMilestone,
  closeMentor,
} = mentorSlice.actions;

export default mentorSlice.reducer;