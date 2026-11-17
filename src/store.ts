import AsyncStorage from '@react-native-async-storage/async-storage';

export type State = {
  limits: Record<string, number>; // package -> daily minutes (0 = session-only)
  names: Record<string, string>;  // package -> label
  sessionEnd: number;             // epoch ms, 0 = none
};

const KEY = 'focus_state_v1';
export const emptyState: State = { limits: {}, names: {}, sessionEnd: 0 };

export async function loadState(): Promise<State> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...emptyState, ...JSON.parse(raw) } : emptyState;
  } catch {
    return emptyState;
  }
}

export async function saveState(s: State) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
