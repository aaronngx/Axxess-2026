// src/features/eye/storage/eyeStorage.ts
// Persistent session storage using AsyncStorage.
// Falls back to in-memory on first load if AsyncStorage fails.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EyeSessionResult } from '../models/types';

const STORAGE_KEY = '@eye_sessions_v1';
const MAX_SESSIONS = 50;

// In-memory cache (stays in sync with AsyncStorage)
let _cache: EyeSessionResult[] | null = null;

async function load(): Promise<EyeSessionResult[]> {
  if (_cache != null) return _cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : [];
  } catch {
    _cache = [];
  }
  return _cache!;
}

async function persist(sessions: EyeSessionResult[]): Promise<void> {
  _cache = sessions;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // silent — in-memory still works
  }
}

export const eyeStorage = {
  async saveSession(session: EyeSessionResult): Promise<void> {
    const all = await load();
    const idx = all.findIndex(s => s.session_id === session.session_id);
    if (idx >= 0) {
      all[idx] = session;
    } else {
      all.unshift(session);
    }
    const trimmed = all.slice(0, MAX_SESSIONS);
    await persist(trimmed);
  },

  async getAllSessions(): Promise<EyeSessionResult[]> {
    const all = await load();
    return [...all].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  },

  // Sync version — uses cache only (fast, call after first async load)
  getAllSessionsSync(): EyeSessionResult[] {
    return (_cache ?? []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  },

  async getSession(id: string): Promise<EyeSessionResult | undefined> {
    const all = await load();
    return all.find(s => s.session_id === id);
  },

  async clearAll(): Promise<void> {
    await persist([]);
  },

  // Pre-warm cache on app start
  async prefetch(): Promise<void> {
    await load();
  },
};
