import {
  DEMO_HEALTH,
  type HealthProfile,
} from '@/lib/profile';
import { useStorageState } from '@/lib/useStorageState';
import { useAuth } from '@/context/Auth';
import { createContext, use, useCallback, useMemo, type PropsWithChildren } from 'react';

type ProfileValue = {
  profile: HealthProfile | null;
  ready: boolean;
  save: (next: HealthProfile) => void;
  saveDemo: () => void;
  patch: (partial: Partial<HealthProfile>) => void;
  clear: () => void;
};

const ProfileContext = createContext<ProfileValue | null>(null);
const KEY = 'ata2.bodyProfile.v3';

function parse(raw: string | null, userId: string | undefined): HealthProfile | null {
  if (!raw || !userId) return null;
  try {
    const bag = JSON.parse(raw) as Record<string, HealthProfile>;
    const row = bag[userId];
    if (!row?.ageBand) return null;
    return row;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [[loading, raw], setRaw] = useStorageState(KEY);
  const userId = session?.userId;
  const profile = parse(raw, userId);

  const write = useCallback(
    (next: HealthProfile | null) => {
      if (!userId) return;
      let bag: Record<string, HealthProfile> = {};
      try {
        bag = raw ? (JSON.parse(raw) as Record<string, HealthProfile>) : {};
      } catch {
        bag = {};
      }
      if (next) bag[userId] = next;
      else delete bag[userId];
      setRaw(JSON.stringify(bag));
    },
    [raw, setRaw, userId],
  );

  const save = useCallback(
    (next: HealthProfile) => {
      write({ ...next, completedAt: new Date().toISOString() });
    },
    [write],
  );

  const saveDemo = useCallback(() => {
    save({ ...DEMO_HEALTH, completedAt: new Date().toISOString() });
  }, [save]);

  const patch = useCallback(
    (partial: Partial<HealthProfile>) => {
      if (!profile) return;
      save({ ...profile, ...partial });
    },
    [profile, save],
  );

  const clear = useCallback(() => {
    write(null);
  }, [write]);

  const value = useMemo<ProfileValue>(
    () => ({
      profile,
      ready: !loading,
      save,
      saveDemo,
      patch,
      clear,
    }),
    [profile, loading, save, saveDemo, patch, clear],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = use(ProfileContext);
  if (!value) throw new Error('useProfile must be used inside ProfileProvider');
  return value;
}
