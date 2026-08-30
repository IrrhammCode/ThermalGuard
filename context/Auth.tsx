import { createContext, use, useCallback, type PropsWithChildren } from 'react';

import {
  hashPassword,
  isEmail,
  loadUsers,
  makeSession,
  newId,
  saveUsers,
  type StoredUser,
} from '@/lib/authStore';
import type { AuthProvider, Session } from '@/lib/types';
import { useStorageState } from '@/lib/useStorageState';

type OAuthInput = {
  provider: Extract<AuthProvider, 'apple' | 'google'>;
  email?: string | null;
  name?: string | null;
  userId: string;
};

type AuthValue = {
  session: Session | null;
  isLoading: boolean;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  signInOAuth: (input: OAuthInput) => Promise<void>;
  signInJudge: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);
const SESSION_KEY = 'ata2.session';
const JUDGE_EMAIL = 'judge@ata2.demo';
const JUDGE_PASSWORD = 'hold-36';

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.userId || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [[isLoading, raw], setRaw] = useStorageState(SESSION_KEY);
  const session = parseSession(raw);

  const persist = useCallback(
    (next: Session | null) => {
      setRaw(next ? JSON.stringify(next) : null);
    },
    [setRaw],
  );

  const signInEmail = useCallback(
    async (email: string, password: string) => {
      const normalized = email.trim().toLowerCase();
      if (!isEmail(normalized)) throw new Error('Enter a valid email.');
      if (password.length < 8) throw new Error('Password must be at least 8 characters.');

      const users = await loadUsers();
      if (normalized === JUDGE_EMAIL && !users.some((u) => u.email === JUDGE_EMAIL)) {
        const hash = await hashPassword(JUDGE_EMAIL, JUDGE_PASSWORD);
        users.push({
          userId: 'judge',
          email: JUDGE_EMAIL,
          name: 'Hackathon judge',
          passwordHash: hash,
        });
        await saveUsers(users);
      }

      const hash = await hashPassword(normalized, password);
      const match = users.find((u) => u.email === normalized && u.passwordHash === hash);
      if (!match) throw new Error('Email or password doesn’t match.');

      persist(
        makeSession({
          userId: match.userId,
          email: match.email,
          name: match.name,
          role: match.email === JUDGE_EMAIL ? 'judge' : 'operator',
          provider: 'email',
        }),
      );
    },
    [persist],
  );

  const signUpEmail = useCallback(
    async (name: string, email: string, password: string) => {
      const trimmedName = name.trim();
      const normalized = email.trim().toLowerCase();
      if (trimmedName.length < 2) throw new Error('Enter your name.');
      if (!isEmail(normalized)) throw new Error('Enter a valid email.');
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        throw new Error('Use 8+ characters with a letter and a number.');
      }
      const users = await loadUsers();
      if (users.some((u) => u.email === normalized)) {
        throw new Error('An account with this email already exists.');
      }
      const user: StoredUser = {
        userId: newId(),
        email: normalized,
        name: trimmedName,
        passwordHash: await hashPassword(normalized, password),
      };
      await saveUsers([...users, user]);
      persist(
        makeSession({
          userId: user.userId,
          email: user.email,
          name: user.name,
          role: 'operator',
          provider: 'email',
        }),
      );
    },
    [persist],
  );

  const signInOAuth = useCallback(
    async (input: OAuthInput) => {
      const email =
        input.email?.trim().toLowerCase() ||
        `${input.provider}.${input.userId.replace(/[^a-z0-9]/gi, '').slice(0, 12)}@ata2.local`;
      const name = input.name?.trim() || (input.provider === 'apple' ? 'Apple' : 'Google');
      persist(
        makeSession({
          userId: `${input.provider}_${input.userId}`,
          email,
          name,
          role: 'operator',
          provider: input.provider,
        }),
      );
    },
    [persist],
  );

  const signInJudge = useCallback(async () => {
    persist(
      makeSession({
        userId: 'judge',
        email: JUDGE_EMAIL,
        name: 'Hackathon judge',
        role: 'judge',
        provider: 'judge',
      }),
    );
  }, [persist]);

  const signOut = useCallback(() => persist(null), [persist]);

  return (
    <AuthContext.Provider
      value={{ session, isLoading, signInEmail, signUpEmail, signInOAuth, signInJudge, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
