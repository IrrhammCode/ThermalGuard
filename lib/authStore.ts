import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Session } from './types';

const USERS_KEY = 'ata2.users';

export type StoredUser = {
  userId: string;
  email: string;
  name: string;
  passwordHash: string;
};

async function readRaw(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function writeRaw(key: string, value: string) {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function hashPassword(email: string, password: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${email.trim().toLowerCase()}:${password}`,
  );
}

export async function loadUsers(): Promise<StoredUser[]> {
  const raw = await readRaw(USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveUsers(users: StoredUser[]) {
  await writeRaw(USERS_KEY, JSON.stringify(users));
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function newId() {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function makeSession(
  partial: Omit<Session, 'createdAt'> & { createdAt?: string },
): Session {
  return { ...partial, createdAt: partial.createdAt ?? new Date().toISOString() };
}
