import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export type AppInfo = { packageName: string; label: string };

type Native = {
  getLaunchableApps(): AppInfo[];
  hasUsageAccess(): boolean;
  isAccessibilityEnabled(): boolean;
  openUsageAccessSettings(): void;
  openAccessibilitySettings(): void;
  setConfig(json: string): void;
  getTodayUsage(): Record<string, number>; // package -> ms counted by service
};

const stub: Native = {
  getLaunchableApps: () => [],
  hasUsageAccess: () => false,
  isAccessibilityEnabled: () => false,
  openUsageAccessSettings: () => {},
  openAccessibilitySettings: () => {},
  setConfig: () => {},
  getTodayUsage: () => ({}),
};

const FocusNative: Native =
  Platform.OS === 'android' ? requireNativeModule('FocusNative') : stub;

export default FocusNative;
