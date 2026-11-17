import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState, FlatList, Modal, Platform, Pressable, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import FocusNative, { AppInfo } from './modules/focus-native';
import { State, emptyState, loadState, saveState } from './src/store';

const SESSION_OPTIONS = [15, 25, 45, 60];
const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export default function App() {
  const [state, setState] = useState<State>(emptyState);
  const [ready, setReady] = useState(false);
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(Date.now());
  const [perms, setPerms] = useState({ usage: false, a11y: false });
  const [usage, setUsage] = useState<Record<string, number>>({});
  const tickCount = useRef(0);

  const refreshNative = useCallback(() => {
    try {
      setPerms({ usage: FocusNative.hasUsageAccess(), a11y: FocusNative.isAccessibilityEnabled() });
      setUsage(FocusNative.getTodayUsage());
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      setState(await loadState());
      try { setApps(FocusNative.getLaunchableApps()); } catch {}
      refreshNative();
      setReady(true);
    })();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refreshNative());
    const id = setInterval(() => {
      setNow(Date.now());
      if (++tickCount.current % 5 === 0) refreshNative();
    }, 1000);
    return () => { sub.remove(); clearInterval(id); };
  }, [refreshNative]);

  // Persist and push config to the native service whenever state changes.
  useEffect(() => {
    if (!ready) return;
    saveState(state);
    try {
      FocusNative.setConfig(JSON.stringify({ limits: state.limits, sessionEnd: state.sessionEnd }));
    } catch {}
  }, [state, ready]);

  const sessionLeft = state.sessionEnd - now;
  const sessionActive = sessionLeft > 0;
  const selected = Object.keys(state.limits);

  const startSession = (min: number) => setState((s) => ({ ...s, sessionEnd: Date.now() + min * 60000 }));
  const stopSession = () => setState((s) => ({ ...s, sessionEnd: 0 }));

  const toggleApp = (a: AppInfo) =>
    setState((s) => {
      const limits = { ...s.limits };
      const names = { ...s.names };
      if (a.packageName in limits) { delete limits[a.packageName]; }
      else { limits[a.packageName] = 30; names[a.packageName] = a.label; }
      return { ...s, limits, names };
    });

  const adjustLimit = (pkg: string, delta: number) =>
    setState((s) => ({ ...s, limits: { ...s.limits, [pkg]: Math.max(0, (s.limits[pkg] ?? 0) + delta) } }));

  const filtered = useMemo(
    () => apps.filter((a) => a.label.toLowerCase().includes(query.toLowerCase())),
    [apps, query],
  );

  if (Platform.OS !== 'android') {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.h1}>Focus</Text>
        <Text style={styles.muted}>App blocking is only implemented for Android.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Text style={styles.h1}>Focus</Text>

        <View style={styles.card}>
          <Text style={styles.h2}>Focus session</Text>
          {sessionActive ? (
            <>
              <Text style={styles.timer}>{fmt(sessionLeft)}</Text>
              <Text style={styles.muted}>Selected apps are blocked until the timer ends.</Text>
              <Btn label="End session" onPress={stopSession} danger />
            </>
          ) : (
            <>
              <Text style={styles.muted}>Block all selected apps for a set time.</Text>
              <View style={styles.row}>
                {SESSION_OPTIONS.map((m) => (
                  <Btn key={m} label={`${m}m`} onPress={() => startSession(m)} disabled={selected.length === 0} />
                ))}
              </View>
              {selected.length === 0 && <Text style={styles.muted}>Pick at least one app below first.</Text>}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.h2}>Permissions</Text>
          <PermRow label="Usage access" ok={perms.usage} onPress={() => FocusNative.openUsageAccessSettings()} />
          <PermRow label="Focus app monitor (Accessibility)" ok={perms.a11y} onPress={() => FocusNative.openAccessibilitySettings()} />
        </View>

        <View style={styles.card}>
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <Text style={styles.h2}>Limited apps</Text>
            <Btn label="Add apps" onPress={() => setPickerOpen(true)} />
          </View>
          {selected.length === 0 && <Text style={styles.muted}>No apps selected yet.</Text>}
          {selected.map((pkg) => {
            const used = Math.round((usage[pkg] ?? 0) / 60000);
            const limit = state.limits[pkg];
            return (
              <View key={pkg} style={styles.appRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.text}>{state.names[pkg] ?? pkg}</Text>
                  <Text style={styles.muted}>
                    {used}m today · {limit > 0 ? `limit ${limit}m` : 'session only'}
                  </Text>
                </View>
                <Btn label="−" onPress={() => adjustLimit(pkg, -5)} />
                <Btn label="+" onPress={() => adjustLimit(pkg, 5)} />
              </View>
            );
          })}
        </View>

        <Text style={styles.footnote}>
          Foreground time is counted from accessibility events and can have gaps (battery management,
          force-stop, reboot, multi-window). The block screen is a deterrent, not tamper-proof.
        </Text>
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <SafeAreaView style={styles.root}>
          <View style={{ padding: 20, gap: 12, flex: 1 }}>
            <View style={[styles.row, { justifyContent: 'space-between' }]}>
              <Text style={styles.h2}>Choose apps</Text>
              <Btn label="Done" onPress={() => setPickerOpen(false)} />
            </View>
            <TextInput
              style={styles.input} placeholder="Search" placeholderTextColor="#667" value={query} onChangeText={setQuery}
            />
            <FlatList
              data={filtered}
              keyExtractor={(a) => a.packageName}
              renderItem={({ item }) => {
                const on = item.packageName in state.limits;
                return (
                  <Pressable style={styles.appRow} onPress={() => toggleApp(item)}>
                    <Text style={[styles.text, { flex: 1 }]}>{item.label}</Text>
                    <Text style={{ color: on ? '#4ade80' : '#667' }}>{on ? '✓ selected' : 'tap to add'}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Btn(p: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      onPress={p.onPress} disabled={p.disabled}
      style={[styles.btn, p.danger && { backgroundColor: '#7f1d1d' }, p.disabled && { opacity: 0.4 }]}
    >
      <Text style={styles.btnText}>{p.label}</Text>
    </Pressable>
  );
}

function PermRow(p: { label: string; ok: boolean; onPress: () => void }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between' }]}>
      <Text style={styles.text}>{p.ok ? '✅' : '⚠️'} {p.label}</Text>
      {!p.ok && <Btn label="Open" onPress={p.onPress} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0F14' },
  h1: { color: '#fff', fontSize: 32, fontWeight: '700' },
  h2: { color: '#fff', fontSize: 18, fontWeight: '600' },
  text: { color: '#e5e9ee', fontSize: 16 },
  muted: { color: '#9AA7B4', fontSize: 14 },
  footnote: { color: '#6b7785', fontSize: 12, lineHeight: 17 },
  timer: { color: '#fff', fontSize: 48, fontWeight: '700', textAlign: 'center' },
  card: { backgroundColor: '#151B23', borderRadius: 16, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  btn: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600' },
  input: { backgroundColor: '#151B23', color: '#fff', borderRadius: 10, padding: 12 },
});
