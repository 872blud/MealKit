import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DeveloperLogLevel = 'info' | 'warn' | 'error';

export interface DeveloperLogEntry {
  id: string;
  level: DeveloperLogLevel;
  source: string;
  message: string;
  details?: string;
  createdAt: string;
}

interface DeveloperStore {
  enabled: boolean;
  logs: DeveloperLogEntry[];
  setEnabled: (enabled: boolean) => void;
  addLog: (entry: Omit<DeveloperLogEntry, 'id' | 'createdAt'>) => void;
  clearLogs: () => void;
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const useDeveloperStore = create<DeveloperStore>()(
  persist(
    (set) => ({
      enabled: false,
      logs: [],
      setEnabled: (enabled) => set({ enabled }),
      addLog: (entry) =>
        set((state) => ({
          logs: [
            {
              ...entry,
              id: makeId(),
              createdAt: new Date().toISOString(),
            },
            ...state.logs,
          ].slice(0, 50),
        })),
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: 'mealkit-developer',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function addDeveloperLog(entry: Omit<DeveloperLogEntry, 'id' | 'createdAt'>): void {
  const store = useDeveloperStore.getState();
  store.addLog(entry);
}
