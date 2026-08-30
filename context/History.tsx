import { useAuth } from '@/context/Auth';
import { useStorageState } from '@/lib/useStorageState';
import type { WalkRecord } from '@/lib/history';
import { createContext, use, useCallback, useMemo, useRef, useState, type PropsWithChildren } from 'react';

type Resume = { fromId: string; toId: string; nonce: number };

type HistoryValue = {
  walks: WalkRecord[];
  ready: boolean;
  record: (row: Omit<WalkRecord, 'id' | 'at'> & { at?: string }) => void;
  clear: () => void;
  resume: Resume | null;
  requestResume: (fromId: string, toId: string) => void;
  clearResume: () => void;
};

const HistoryContext = createContext<HistoryValue | null>(null);
const KEY = 'ata2.walks.v1';
const MAX = 40;

function parse(raw: string | null, userId: string | undefined): WalkRecord[] {
  if (!raw || !userId) return [];
  try {
    const bag = JSON.parse(raw) as Record<string, WalkRecord[]>;
    const rows = bag[userId];
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      ...r,
      walkMeters: r.walkMeters ?? null,
      meanC: r.meanC ?? null,
      dose: r.dose ?? null,
      maxPlatformMin: r.maxPlatformMin ?? null,
      symptomsBefore: r.symptomsBefore ?? null,
      symptomsAfter: r.symptomsAfter ?? null,
    }));
  } catch {
    return [];
  }
}

export function HistoryProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [[loading, raw], setRaw] = useStorageState(KEY);
  const userId = session?.userId;
  const walks = parse(raw, userId);

  const write = useCallback(
    (next: WalkRecord[]) => {
      if (!userId) return;
      let bag: Record<string, WalkRecord[]> = {};
      try {
        bag = raw ? (JSON.parse(raw) as Record<string, WalkRecord[]>) : {};
      } catch {
        bag = {};
      }
      bag[userId] = next;
      setRaw(JSON.stringify(bag));
    },
    [raw, setRaw, userId],
  );

  const record = useCallback(
    (row: Omit<WalkRecord, 'id' | 'at'> & { at?: string }) => {
      const at = row.at ?? new Date().toISOString();
      const next: WalkRecord = {
        id: `${at}-${row.fromId}-${row.toId}`,
        at,
        fromId: row.fromId,
        toId: row.toId,
        walkMin: row.walkMin,
        walkMeters: row.walkMeters ?? null,
        peakC: row.peakC,
        meanC: row.meanC ?? null,
        dose: row.dose ?? null,
        hold: row.hold,
        verdict: row.verdict,
        preferred: row.preferred,
        maxPlatformMin: row.maxPlatformMin ?? null,
        source: row.source,
        symptomsBefore: row.symptomsBefore ?? null,
        symptomsAfter: row.symptomsAfter ?? null,
      };
      write([next, ...walks].slice(0, MAX));
    },
    [walks, write],
  );

  const clear = useCallback(() => write([]), [write]);
  const nonce = useRef(0);
  const [resume, setResume] = useState<Resume | null>(null);

  const requestResume = useCallback((fromId: string, toId: string) => {
    nonce.current += 1;
    setResume({ fromId, toId, nonce: nonce.current });
  }, []);

  const clearResume = useCallback(() => setResume(null), []);

  const value = useMemo<HistoryValue>(
    () => ({ walks, ready: !loading, record, clear, resume, requestResume, clearResume }),
    [walks, loading, record, clear, resume, requestResume, clearResume],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const value = use(HistoryContext);
  if (!value) throw new Error('useHistory must be used inside HistoryProvider');
  return value;
}
