import { create } from 'zustand';
import { SystemSettings, UserSettings } from '@/types';

interface SettingsState {
  system: SystemSettings | null;
  user: UserSettings | null;
  loading: boolean;
  setSettings: (system: SystemSettings, user: UserSettings) => void;
  setLoading: (loading: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  system: null,
  user: null,
  loading: false,
  setSettings: (system, user) => set({ system, user }),
  setLoading: (loading) => set({ loading }),
}));
