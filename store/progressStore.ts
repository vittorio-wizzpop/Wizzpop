import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressState, LevelResult, RankKey } from '../types/game';
import { getRankFromXP, pointsToXP, RANK_THRESHOLDS } from '../utils/scoring';

interface ProgressStore extends ProgressState {
  saveLevel: (levelId: string, result: LevelResult) => void;
  addXP: (points: number) => void;
  updateStreak: () => void;
  resetProgress: () => void;
}

const DEFAULT_STATE: ProgressState = {
  xp: 0,
  rank: 'curioso',
  completedLevels: {},
  unlockedWorlds: ['origini'],
  badges: [],
  streak: 0,
  lastPlayedDate: '',
  settings: {
    difficulty: 1,
    soundEnabled: true,
    hapticsEnabled: true,
    language: 'it',
  },
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      saveLevel: (levelId, result) => {
        const existing = get().completedLevels[levelId];
        // Tieni solo il best score
        if (existing && existing.bestScore >= result.bestScore) return;
        set(state => ({
          completedLevels: { ...state.completedLevels, [levelId]: result },
        }));
      },

      addXP: (points) => {
        const gained = pointsToXP(points);
        const newXP  = get().xp + gained;
        const rank   = getRankFromXP(newXP) as RankKey;
        set({ xp: newXP, rank });
      },

      updateStreak: () => {
        const today     = new Date().toISOString().slice(0, 10);
        const last      = get().lastPlayedDate;
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

        if (last === today) return; // già aggiornato oggi

        const newStreak = last === yesterday ? get().streak + 1 : 1;
        set({ streak: newStreak, lastPlayedDate: today });
      },

      resetProgress: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: 'wizzpop-progress',
      storage: createJSONStorage(() => AsyncStorage),
      // Persiste solo i dati utente, non le funzioni
      partialize: (state) => ({
        xp: state.xp,
        rank: state.rank,
        completedLevels: state.completedLevels,
        unlockedWorlds: state.unlockedWorlds,
        badges: state.badges,
        streak: state.streak,
        lastPlayedDate: state.lastPlayedDate,
        settings: state.settings,
      }),
    },
  ),
);
