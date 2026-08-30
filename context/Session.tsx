import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { TRIPS, type Trip } from '@/lib/phoenix';
import { planRoutes, type RouteMode, type RouteResult } from '@/lib/routing';

type SessionValue = {
  trip: Trip;
  tripId: string;
  setTripId: (id: string) => void;
  overlay: boolean;
  setOverlay: (v: boolean) => void;
  mode: RouteMode;
  setMode: (m: RouteMode) => void;
  cool: RouteResult;
  fast: RouteResult;
  active: RouteResult;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [tripId, setTripId] = useState(TRIPS[0].id);
  const [overlay, setOverlay] = useState(true);
  const [mode, setMode] = useState<RouteMode>('cool');

  const value = useMemo(() => {
    const trip = TRIPS.find((t) => t.id === tripId) ?? TRIPS[0];
    const { cool, fast } = planRoutes(trip.fromId, trip.toId);
    return {
      trip,
      tripId: trip.id,
      setTripId,
      overlay,
      setOverlay,
      mode,
      setMode,
      cool,
      fast,
      active: mode === 'cool' ? cool : fast,
    };
  }, [tripId, overlay, mode]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
