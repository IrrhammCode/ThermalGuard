import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { apiGet, apiPost } from '@/lib/api';
import { bodySwarmLines, mergeSwarmLines } from '@/lib/bodyAgent';
import type { Bootstrap, HoldPlan, MapOverlay, RoutePair, SwarmResponse } from '@/lib/types';
import { useProfile } from '@/context/Profile';
import { operatorPayload, type Symptom } from '@/lib/profile';

type TripData = { fromId: string; toId: string; symptoms: Symptom[] };

type AppDataValue = {
  bootstrap: Bootstrap | null;
  hold: HoldPlan | null;
  mapTcm: MapOverlay | null;
  swarm: SwarmResponse | null;
  crowd: number;
  waitMin: number;
  setCrowd: (n: number) => void;
  setWaitMin: (n: number) => void;
  loading: boolean;
  error: string | null;
  reload: () => void;
  fetchRoute: (fromId: string, toId: string) => Promise<RoutePair>;
  fetchMap: (mode: 'felt' | 'tcm') => Promise<MapOverlay>;
  fetchSwarm: (trip: TripData) => Promise<SwarmResponse>;
};

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren) {
  const { profile } = useProfile();
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [hold, setHold] = useState<HoldPlan | null>(null);
  const [mapTcm, setMapTcm] = useState<MapOverlay | null>(null);
  const [swarm, setSwarm] = useState<SwarmResponse | null>(null);
  const [crowd, setCrowdState] = useState(36);
  const [waitMin, setWaitState] = useState(11);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextCrowd = crowd, nextWait = waitMin) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<Bootstrap>(`/v1/bootstrap?crowd=${nextCrowd}&wait_min=${nextWait}`);
      setBootstrap(data);
      setHold(data.hold);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the API.');
    } finally {
      setLoading(false);
    }
  }, [crowd, waitMin]);

  useEffect(() => {
    void load(36, 11);
    // First paint only — later stepper changes refetch hold, not full bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!bootstrap) return;
    const timer = setTimeout(() => {
      // Hold refetch uses profile health only (no per-trip symptoms needed for hold calc)
      const op = profile ? operatorPayload(profile, { symptoms: ['none'], fromId: '', toId: '' }) : null;
      const req = op
        ? apiPost<HoldPlan>('/v1/hold', { crowd, wait_min: waitMin, operator: op })
        : apiGet<HoldPlan>(`/v1/hold?crowd=${crowd}&wait_min=${waitMin}`);
      req.then(setHold).catch((err: Error) => setError(err.message));
    }, 280);
    return () => clearTimeout(timer);
  }, [crowd, waitMin, bootstrap, profile]);

  const fetchRoute = useCallback(async (fromId: string, toId: string) => {
    return apiGet<RoutePair>(`/v1/route?from_id=${encodeURIComponent(fromId)}&to_id=${encodeURIComponent(toId)}`);
  }, []);

  const fetchMap = useCallback(async (mode: 'felt' | 'tcm') => {
    const overlay = await apiGet<MapOverlay>(`/v1/map?mode=${mode}`);
    if (mode === 'tcm') setMapTcm(overlay);
    return overlay;
  }, []);

  const fetchSwarm = useCallback(async (trip: TripData) => {
    const op = profile ? operatorPayload(profile, trip) : null;
    const data = op
      ? await apiPost<SwarmResponse>(
          '/v1/swarm',
          { crowd, wait_min: waitMin, operator: op },
          35000,
        )
      : await apiGet<SwarmResponse>(`/v1/swarm?crowd=${crowd}&wait_min=${waitMin}`);
    if (data.plan) setHold(data.plan);
    // Build a full BodyProfile for client-side body lines
    const fullProfile = profile ? { ...profile, ...trip } : null;
    const hasBody = data.lines.some((l) => l.agent === 'body');
    const extra = !hasBody && fullProfile ? bodySwarmLines(fullProfile, data.plan ?? hold) : [];
    const merged = extra.length ? { ...data, lines: mergeSwarmLines(data.lines, extra) } : data;
    setSwarm(merged);
    return merged;
  }, [crowd, waitMin, profile, hold]);

  const value = useMemo<AppDataValue>(
    () => ({
      bootstrap,
      hold,
      mapTcm,
      swarm,
      crowd,
      waitMin,
      setCrowd: (n) => setCrowdState(Math.max(12, Math.min(80, Math.round(n)))),
      setWaitMin: (n) => setWaitState(Math.max(5, Math.min(20, Math.round(n)))),
      loading,
      error,
      reload: () => void load(crowd, waitMin),
      fetchRoute,
      fetchMap,
      fetchSwarm,
    }),
    [bootstrap, hold, mapTcm, swarm, crowd, waitMin, loading, error, load, fetchRoute, fetchMap, fetchSwarm],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = use(AppDataContext);
  if (!value) throw new Error('useAppData must be used inside AppDataProvider');
  return value;
}
