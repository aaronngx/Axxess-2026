// src/features/hearing/storage/hearingStorage.ts
// AsyncStorage-backed hearing session persistence. Max 50 sessions.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HearingSessionResult } from '../models/types';

const STORAGE_KEY = '@hearing_sessions_v1';
const MAX_SESSIONS = 50;

let _cache: HearingSessionResult[] | null = null;

async function prefetch(): Promise<void> {
  if (_cache !== null) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : [];
  } catch {
    _cache = [];
  }
}

async function persist(sessions: HearingSessionResult[]): Promise<void> {
  _cache = sessions;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export const hearingStorage = {
  /** Call once at app start for instant sync access later */
  async prefetch(): Promise<void> {
    await prefetch();
  },

  /** Save a new session (prepend, keep max 50) */
  async saveSession(session: HearingSessionResult): Promise<void> {
    await prefetch();
    const existing = _cache ?? [];
    const updated = [session, ...existing.filter(s => s.session_id !== session.session_id)];
    await persist(updated.slice(0, MAX_SESSIONS));
  },

  /** Async load — use in useFocusEffect */
  async getAllSessions(): Promise<HearingSessionResult[]> {
    await prefetch();
    return _cache ?? [];
  },

  /** Sync read from in-memory cache — use in render (after prefetch) */
  getAllSessionsSync(): HearingSessionResult[] {
    return _cache ?? [];
  },

  async clearAll(): Promise<void> {
    _cache = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};
