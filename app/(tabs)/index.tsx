import PhoenixMap from '@/components/PhoenixMap';
import type { MapHandle } from '@/components/phoenix-map-types';
import { FadeInView } from '@/components/FadeIn';
import { Icon } from '@/components/Icon';
import { PlaceField, type PlaceFieldHandle } from '@/components/PlaceField';
import { AuthButton } from '@/components/auth/AuthButton';
import { FieldOverlay } from '@/components/ui/FieldOverlay';
import { Glass } from '@/components/ui/Glass';
import { ChipSelect } from '@/components/ui/ChipSelect';
import { PressScale } from '@/components/ui/PressScale';
import { colors } from '@/constants/theme';
import { useAppData } from '@/context/AppData';
import { useHistory } from '@/context/History';
import { useProfile } from '@/context/Profile';
import { DoseBar } from '@/components/DoseBar';
import { formatC, riskLevel } from '@/lib/heat';
import { API_URL } from '@/lib/config';
import { placeLabel } from '@/lib/places';
import {
  SYMPTOM_OPTIONS,
  toggleExclusive,
  tripIsHold,
  type Symptom,
} from '@/lib/profile';
import { alongPath } from '@/lib/walkProgress';
import type { BodyVerdict, MapOverlay, RoutePair } from '@/lib/types';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Phase = 'pick' | 'symptoms' | 'load' | 'brief' | 'run' | 'done';

const RUN_MS = 15_000;
const LOAD_HOLD_MS = 1_200;

export default function WalkScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapHandle>(null);
  const phaseRef = useRef<Phase>('pick');
  const analyzeGen = useRef(0);
  const finishedRef = useRef(false);
  const fromRef = useRef<PlaceFieldHandle>(null);
  const toRef = useRef<PlaceFieldHandle>(null);
  const { profile } = useProfile();
  const { record, resume, clearResume } = useHistory();
  const { bootstrap, hold, loading, error, reload, fetchRoute, fetchSwarm, swarm } = useAppData();

  const [phase, setPhase] = useState<Phase>('pick');
  const [fromId, setFromId] = useState('vanburen-central');
  const [toId, setToId] = useState('vanburen-3rdst');
  const [route, setRoute] = useState<RoutePair | null>(null);
  const [feltMap, setFeltMap] = useState<MapOverlay | null>(null);
  const [sheetH, setSheetH] = useState(280);
  const [runError, setRunError] = useState<string | null>(null);
  const [walkT, setWalkT] = useState(0);
  const [currentSymptoms, setCurrentSymptoms] = useState<Symptom[]>(['none']);
  const [loadStep, setLoadStep] = useState(0);

  phaseRef.current = phase;

  useEffect(() => {
    if (bootstrap?.map_felt) setFeltMap(bootstrap.map_felt);
  }, [bootstrap]);

  useEffect(() => {
    if (!resume) return;
    analyzeGen.current += 1;
    setFromId(resume.fromId);
    setToId(resume.toId);
    setPhase('pick');
    setRoute(null);
    setWalkT(0);
    setRunError(null);
    clearResume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume?.nonce]);

  /** After FROM/TO are set, move to the symptoms form */
  async function goToSymptoms() {
    const from = (await fromRef.current?.resolve()) ?? fromId;
    const to = (await toRef.current?.resolve()) ?? toId;
    if (!from || !to) {
      setRunError('Type a downtown stop or Phoenix address for both ends.');
      return;
    }
    if (from === to) {
      setRunError('From and To have to be different stops.');
      return;
    }
    void Haptics.selectionAsync();
    setFromId(from);
    setToId(to);
    setRunError(null);
    setCurrentSymptoms(['none']);
    setPhase('symptoms');
  }

  /** Symptoms selected → run analysis */
  async function analyze() {
    const gen = ++analyzeGen.current;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('load');
    setRunError(null);
    setRoute(null);
    setWalkT(0);
    setLoadStep(0);
    try {
      // Step 1: Reading heat map
      setLoadStep(1);
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (gen !== analyzeGen.current) return;

      // Step 2: Checking body file
      setLoadStep(2);
      const nextRoute = await fetchRoute(fromId, toId);
      if (gen !== analyzeGen.current) return;
      setRoute(nextRoute);

      // Step 3: Finding safest route
      setLoadStep(3);
      const nextSwarm = await fetchSwarm({ fromId, toId, symptoms: currentSymptoms });
      if (gen !== analyzeGen.current) return;

      // Step 4: Done
      setLoadStep(4);
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (gen !== analyzeGen.current) return;
      setPhase('brief');
    } catch (err) {
      if (gen !== analyzeGen.current) return;
      setPhase('symptoms');
      setRunError(err instanceof Error ? err.message : 'Walk failed.');
    }
  }

  function backToPick() {
    analyzeGen.current += 1;
    void Haptics.selectionAsync();
    setPhase('pick');
    setRoute(null);
    setWalkT(0);
    setRunError(null);
  }

  function backToSymptoms() {
    analyzeGen.current += 1;
    void Haptics.selectionAsync();
    setPhase('symptoms');
    setRoute(null);
    setWalkT(0);
    setRunError(null);
  }

  function startWalk() {
    finishedRef.current = false;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setWalkT(0);
    setPhase('run');
  }

  function finishWalk() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWalkT(1);

    // Auto-save to history
    const body = hold?.body ?? swarm?.payload.body;
    record({
      fromId: route?.from_id ?? fromId,
      toId: route?.to_id ?? toId,
      walkMin: route?.cool?.minutes ?? null,
      walkMeters: route?.cool?.meters ?? null,
      peakC: route?.cool?.peak_c ?? null,
      meanC: route?.cool?.mean_c ?? null,
      dose: route?.cool?.dose ?? null,
      hold: Boolean(route?.hold || tripIsHold(fromId, toId)),
      verdict: body?.verdict ?? null,
      preferred: body?.preferred_refuge ?? null,
      maxPlatformMin: body?.max_platform_min ?? null,
      source: body?.source ?? null,
      symptomsBefore: currentSymptoms,
      symptomsAfter: currentSymptoms,
    });

    setPhase('done');
  }

  function newWalk() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('pick');
    setRoute(null);
    setWalkT(0);
    setRunError(null);
  }

  useEffect(() => {
    if (phase !== 'run') return;
    const coords = route?.cool.coords;
    if (!coords?.length) return;
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / RUN_MS);
      setWalkT(t);
      if (t >= 1) {
        clearInterval(id);
        finishWalk();
      }
    }, 50);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, route]);

  useEffect(() => {
    if (phase === 'pick' || phase === 'symptoms') return;
    const coords = route?.cool.coords?.length ? route.cool.coords : route?.fast.coords;
    if (!coords?.length) return;
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates?.(coords, {
        edgePadding: { top: 200, right: 36, bottom: sheetH + 24, left: 36 },
        animated: true,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [route, sheetH, phase]);

  const overlay = feltMap;
  const legend = overlay?.legend;
  const holdTrip = Boolean(route?.hold || tripIsHold(fromId, toId));
  const body = hold?.body ?? swarm?.payload.body;
  const heatCall = body?.verdict === 'indoor_only';
  const trail = useMemo(() => {
    const coords = route?.cool.coords ?? [];
    if (phase !== 'run' || !coords.length) {
      return { prefix: phase === 'pick' || phase === 'symptoms' ? [] : coords, walker: null as ReturnType<typeof alongPath>['point'] | null };
    }
    const step = alongPath(coords, walkT);
    return { prefix: step.prefix, walker: step.point };
  }, [phase, route, walkT]);

  const showMap = phase !== 'pick' && phase !== 'symptoms';

  if (loading && !bootstrap) {
    return (
      <View style={styles.center}>
        <Icon name="sun.max.fill" size={28} color={colors.heat} pulse />
        <Text style={styles.muted}>Loading Phoenix layers…</Text>
      </View>
    );
  }

  if (error && !bootstrap) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Icon name="exclamationmark.triangle.fill" size={28} color={colors.heat} />
        <Text style={styles.errKicker}>BACKEND UNREACHABLE</Text>
        <Text style={styles.hero}>No live heat</Text>
        <Text style={styles.muted}>ATA² will not invent FortyGuard numbers.</Text>
        <Text style={styles.url}>{API_URL}</Text>
        <Text style={styles.muted}>{error}</Text>
        <Pressable onPress={reload} style={styles.retry}>
          <Icon name="arrow.clockwise" size={14} color={colors.bg} />
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const head = headerCopy(phase, heatCall);

  return (
    <View style={styles.root}>
      {showMap ? (
        <PhoenixMap
          ref={mapRef}
          overlay
          tiles={overlay?.tiles ?? []}
          heatMin={legend?.min ?? 39}
          heatMax={legend?.max ?? 47}
          colorKey="felt"
          coolCoords={trail.prefix}
          fastCoords={phase === 'run' ? (route?.cool.coords ?? []) : []}
          emphasize="cool"
          origin={trail.walker ? null : route?.cool.coords[0]}
          dest={route?.cool.coords.at(-1)}
          walker={trail.walker}
          trap={
            holdTrip && bootstrap?.hold
              ? {
                  latitude: bootstrap.hold.trap_lat,
                  longitude: bootstrap.hold.trap_lon,
                  title: bootstrap.hold.trap_name,
                }
              : null
          }
          refuges={holdTrip ? (bootstrap?.refuges ?? []) : []}
        />
      ) : (
        <FieldOverlay mode="quiet" opacity={0.1} />
      )}

      {phase === 'pick' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + 12,
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 24,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled">
            {/* ── Hero Section ── */}
            <FadeInView>
              <Text style={styles.kicker}>{head.kicker}</Text>
              <Text style={styles.title}>{head.title}</Text>
            </FadeInView>

            {/* ── Live Conditions Card ── */}
            {bootstrap?.now ? (
              <FadeInView delay={80}>
                <View style={styles.condCard}>
                  <LinearGradient
                    colors={[
                      riskLevel(bootstrap.now.felt_c) === 'Extreme'
                        ? 'rgba(193,18,31,0.18)'
                        : riskLevel(bootstrap.now.felt_c) === 'Very Strong'
                          ? 'rgba(255,107,53,0.14)'
                          : 'rgba(76,201,240,0.10)',
                      'rgba(18,23,30,0.8)',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.condHeader}>
                    <Icon name="sun.max.fill" size={18} color={colors.heat} pulse />
                    <Text style={styles.condTitle}>Live Conditions</Text>
                    <Text style={styles.condRisk}>{riskLevel(bootstrap.now.felt_c)}</Text>
                  </View>
                  <View style={styles.condRow}>
                    <View style={styles.condItem}>
                      <Text style={styles.condValue}>{formatC(bootstrap.now.air_c)}</Text>
                      <Text style={styles.condLabel}>Air</Text>
                    </View>
                    <View style={styles.condDivider} />
                    <View style={styles.condItem}>
                      <Text style={[styles.condValue, { color: colors.heat }]}>{formatC(bootstrap.now.felt_c)}</Text>
                      <Text style={styles.condLabel}>Felt</Text>
                    </View>
                    <View style={styles.condDivider} />
                    <View style={styles.condItem}>
                      <Text style={[styles.condValue, { color: colors.cool2 }]}>
                        {(bootstrap.now.vegetation * 100).toFixed(0)}%
                      </Text>
                      <Text style={styles.condLabel}>Canopy</Text>
                    </View>
                  </View>
                  <DoseBar value={bootstrap.now.felt_c} max={50} color={colors.heat} />
                </View>
              </FadeInView>
            ) : null}

            {/* ── Description ── */}
            <FadeInView delay={120}>
              <Text style={styles.deck}>{head.deck}</Text>
            </FadeInView>

            {/* ── FROM / TO Fields ── */}
            <FadeInView delay={180}>
              <View style={{ marginTop: 16, gap: 10 }}>
                <PlaceField
                  ref={fromRef}
                  kicker="FROM"
                  placeId={fromId}
                  excludeId={toId}
                  onChange={setFromId}
                />
                {/* Swap button */}
                <View style={styles.swapRow}>
                  <View style={styles.swapLine} />
                  <Pressable
                    onPress={() => {
                      void Haptics.selectionAsync();
                      const tmp = fromId;
                      setFromId(toId);
                      setToId(tmp);
                    }}
                    style={styles.swapBtn}>
                    <Icon name="arrow.up.arrow.down" size={14} color={colors.cool} />
                  </Pressable>
                  <View style={styles.swapLine} />
                </View>
                <PlaceField
                  ref={toRef}
                  kicker="TO"
                  placeId={toId}
                  excludeId={fromId}
                  onChange={setToId}
                />
              </View>
            </FadeInView>

            {runError ? <Text style={[styles.heat, { marginTop: 12 }]}>{runError}</Text> : null}

            {/* ── Quick Trips ── */}
            {bootstrap?.trips?.length ? (
              <FadeInView delay={240}>
                <Text style={[styles.condTitle, { marginTop: 20, marginBottom: 8 }]}>Quick trips</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20, paddingHorizontal: 20 }}>
                  <View style={styles.tripRow}>
                    {bootstrap.trips.slice(0, 5).map((trip) => (
                      <PressScale
                        key={trip.id}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setFromId(trip.from_id);
                          setToId(trip.to_id);
                        }}
                        style={[
                          styles.tripChip,
                          trip.from_id === fromId && trip.to_id === toId && styles.tripChipActive,
                        ]}>
                        <Icon
                          name={trip.hold ? 'building.2.fill' : 'figure.walk'}
                          size={12}
                          color={trip.from_id === fromId && trip.to_id === toId ? colors.cool2 : colors.muted}
                        />
                        <Text
                          style={[
                            styles.tripLabel,
                            trip.from_id === fromId && trip.to_id === toId && { color: colors.cool2 },
                          ]}
                          numberOfLines={1}>
                          {trip.label}
                        </Text>
                      </PressScale>
                    ))}
                  </View>
                </ScrollView>
              </FadeInView>
            ) : null}

            <View style={{ flex: 1, minHeight: 16 }} />

            {/* ── CTA ── */}
            <FadeInView delay={300}>
              <AuthButton
                label="Continue"
                icon="arrow.right"
                style={{ marginTop: 12 }}
                disabled={fromId === toId}
                onPress={() => void goToSymptoms()}
              />
              {bootstrap?.config ? (
                <Text style={styles.studyNote}>
                  {bootstrap.config.city} · {bootstrap.config.study_date} · {bootstrap.config.study_hour}
                </Text>
              ) : null}
            </FadeInView>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : phase === 'symptoms' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={{
              paddingTop: insets.top + 12,
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 24,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled">
            <FadeInView>
              <Text style={styles.kicker}>{head.kicker}</Text>
              <Text style={styles.title}>{head.title}</Text>
              <Text style={styles.pathLine}>
                {placeLabel(fromId)} → {placeLabel(toId)}
              </Text>
            </FadeInView>

            <FadeInView delay={80}>
              <Text style={styles.deck}>{head.deck}</Text>
              <View style={{ marginTop: 20 }}>
                <ChipSelect
                  options={SYMPTOM_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
                  selected={currentSymptoms}
                  onToggle={(id) =>
                    setCurrentSymptoms((cur) => toggleExclusive(cur, id as Symptom, 'none'))
                  }
                />
              </View>
            </FadeInView>

            {runError ? <Text style={[styles.heat, { marginTop: 12 }]}>{runError}</Text> : null}

            <View style={{ flex: 1, minHeight: 16 }} />

            <FadeInView delay={160}>
              <AuthButton
                label="Find best route"
                icon="heart.fill"
                style={{ marginTop: 12 }}
                onPress={() => void analyze()}
              />
              <PressScale onPress={backToPick} style={styles.ghostBtn}>
                <Text style={styles.ghostText}>Change route</Text>
              </PressScale>
            </FadeInView>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <>
          <LinearGradient
            colors={['rgba(7,9,12,0.92)', 'transparent']}
            style={[styles.top, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.kicker}>{head.kicker}</Text>
            <Text style={styles.title}>{head.title}</Text>
            <Text style={styles.pathLine}>
              {placeLabel(route?.from_id ?? fromId)} → {placeLabel(route?.to_id ?? toId)}
            </Text>
          </LinearGradient>

          <FadeInView key={phase} from="up" style={styles.sheet}>
            <Glass intensity={54} style={styles.sheetGlass}>
              <View onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}>
                <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                  {phase === 'load' ? (
                    <LoadSheet step={loadStep} error={runError} onRetry={() => void analyze()} />
                  ) : null}
                  {phase === 'brief' ? (
                    <BriefSheet
                      route={route}
                      holdTrip={holdTrip}
                      heatCall={heatCall}
                      body={body}
                      fromLabel={placeLabel(route?.from_id ?? fromId)}
                      toLabel={placeLabel(route?.to_id ?? toId)}
                      onStart={startWalk}
                      onBack={backToSymptoms}
                    />
                  ) : null}
                  {phase === 'run' ? (
                    <RunSheet
                      t={walkT}
                      holdTrip={holdTrip}
                      goTo={holdTrip ? (body?.preferred_refuge ?? null) : placeLabel(route?.to_id ?? toId)}
                      platformMin={holdTrip ? (body?.max_platform_min ?? 0) : 0}
                      onDone={finishWalk}
                    />
                  ) : null}
                  {phase === 'done' ? (
                    <DoneSheet onNewWalk={newWalk} />
                  ) : null}
                </ScrollView>
              </View>
            </Glass>
          </FadeInView>
        </>
      )}
    </View>
  );
}

function headerCopy(phase: Phase, heatCall: boolean) {
  if (phase === 'pick') {
    return {
      kicker: 'ATA² · WALK',
      title: 'Plan your walk',
      deck: 'Pick your start and end — we read live 2 m air, satellite canopy, and your body file, then route for real.',
    };
  }
  if (phase === 'symptoms') {
    return {
      kicker: 'ATA² · BODY CHECK',
      title: 'How do you feel?',
      deck: 'Current symptoms help the AI agents find the safest route for you right now. Not a diagnosis.',
    };
  }
  if (phase === 'load') {
    return {
      kicker: 'ATA² · ANALYZE',
      title: 'Agents reading this walk',
      deck: '',
    };
  }
  if (phase === 'brief') {
    return {
      kicker: heatCall ? 'ATA² · INDOOR' : 'ATA² · BRIEFING',
      title: 'What this walk does to you',
      deck: '',
    };
  }
  if (phase === 'run') {
    return {
      kicker: 'ATA² · ON PATH',
      title: 'Dwell is the dose',
      deck: '',
    };
  }
  return {
    kicker: 'ATA² · COMPLETE',
    title: 'Walk saved',
    deck: '',
  };
}

const LOAD_STEPS = [
  { icon: 'sun.max.fill', label: 'Reading live heat map…', color: colors.heat },
  { icon: 'heart.fill', label: 'Checking your health file…', color: colors.cool },
  { icon: 'map.fill', label: 'Finding safest route…', color: colors.cool2 },
  { icon: 'person.crop.circle', label: 'AI agents consulting…', color: colors.warn },
];

function LoadSheet({
  step,
  error,
  onRetry,
}: {
  step: number;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <View>
        <Text style={styles.heat}>{error}</Text>
        <Text style={styles.mutedLeft}>ATA² will not invent FortyGuard numbers.</Text>
        <AuthButton label="Retry" icon="arrow.clockwise" style={{ marginTop: 16 }} onPress={onRetry} />
      </View>
    );
  }
  return (
    <View>
      <View style={styles.loadHeader}>
        <Icon name="sparkles" size={20} color={colors.cool2} pulse />
        <Text style={styles.loadTitle}>Analyzing best route</Text>
      </View>
      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${Math.min(100, step * 25)}%`, backgroundColor: colors.cool2 }]} />
      </View>
      {/* Steps */}
      <View style={{ gap: 10, marginTop: 14 }}>
        {LOAD_STEPS.map((s, i) => {
          const done = step > i + 1;
          const active = step === i + 1;
          return (
            <View key={s.label} style={styles.stepRow}>
              <View style={[styles.stepDot, done && { backgroundColor: colors.cool2 }, active && { backgroundColor: s.color }]}>
                {done ? (
                  <Icon name="checkmark" size={10} color={colors.bg} />
                ) : active ? (
                  <Icon name={s.icon as any} size={10} color={colors.bg} pulse />
                ) : null}
              </View>
              <Text style={[styles.stepLabel, done && { color: colors.text }, active && { color: colors.text, fontWeight: '600' }]}>
                {done ? s.label.replace('…', ' ✓') : s.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function BriefSheet({
  route,
  holdTrip,
  heatCall,
  body,
  fromLabel,
  toLabel,
  onStart,
  onBack,
}: {
  route: RoutePair | null;
  holdTrip: boolean;
  heatCall: boolean;
  body: BodyVerdict | null | undefined;
  fromLabel: string;
  toLabel: string;
  onStart: () => void;
  onBack: () => void;
}) {
  const cool = route?.cool;
  const fast = route?.fast;
  const saved = cool && fast ? Math.max(0, fast.mean_c - cool.mean_c).toFixed(1) : null;
  const goTo = holdTrip ? (body?.preferred_refuge ?? null) : toLabel;

  return (
    <View>
      {/* Alert for heat emergencies */}
      {heatCall ? (
        <View style={styles.alertBox}>
          <Icon name="exclamationmark.triangle.fill" size={16} color={colors.heat} />
          <Text style={styles.alertText}>Indoor shelter recommended. Avoid staying in the sun.</Text>
        </View>
      ) : null}

      {/* Route summary */}
      <Text style={styles.briefRoute}>{fromLabel} → {goTo ?? toLabel}</Text>

      {/* Stats row */}
      <View style={styles.stats}>
        <Stat
          label="Walk time"
          value={cool ? `${cool.minutes.toFixed(0)} min` : '—'}
          sub={cool ? `${Math.round(cool.meters)} m` : '—'}
        />
        <Stat
          label="Peak temp"
          value={cool ? formatC(cool.peak_c) : '—'}
          sub="felt on skin"
        />
        <Stat
          label={holdTrip ? 'Shelter' : 'Arrive at'}
          value={goTo ? goTo.split(' ')[0] : '—'}
          sub={holdTrip ? (body?.verdict === 'indoor_only' ? 'indoor AC' : 'recommended') : 'destination'}
        />
      </View>

      {/* Why this route */}
      <View style={styles.whyBox}>
        <Text style={styles.whyTitle}>Why this route?</Text>
        {saved && parseFloat(saved) > 0 ? (
          <Text style={styles.whyText}>
            🌡️ {saved}°C cooler on average than the direct path.
          </Text>
        ) : (
          <Text style={styles.whyText}>
            🌡️ This is the coolest available path on the grid.
          </Text>
        )}
        {cool && cool.dose > 0 ? (
          <Text style={styles.whyText}>
            ⏱️ Heat dose: {cool.dose.toFixed(0)} °C·min — lower is better.
          </Text>
        ) : null}
        {holdTrip && body?.preferred_refuge ? (
          <Text style={styles.whyText}>
            🏢 AI recommends {body.preferred_refuge} as your shelter point.
          </Text>
        ) : null}
        {body?.verdict === 'indoor_only' ? (
          <Text style={[styles.whyText, { color: colors.heat }]}>
            ⚠️ Based on your profile, stay indoors with AC only.
          </Text>
        ) : body?.verdict === 'watch' ? (
          <Text style={[styles.whyText, { color: colors.warn }]}>
            👁️ You have higher heat sensitivity — prefer indoor shelter.
          </Text>
        ) : null}
      </View>

      <AuthButton label="Start walk" icon="figure.walk" style={{ marginTop: 14 }} onPress={onStart} />
      <PressScale onPress={onBack} style={styles.ghostBtn}>
        <Text style={styles.ghostText}>Go back</Text>
      </PressScale>
    </View>
  );
}

function RunSheet({
  t,
  holdTrip,
  goTo,
  platformMin,
  onDone,
}: {
  t: number;
  holdTrip: boolean;
  goTo: string | null;
  platformMin: number;
  onDone: () => void;
}) {
  const pct = Math.round(t * 100);
  return (
    <View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <View style={styles.runRow}>
        <Icon name="figure.walk" size={20} color={colors.cool2} pulse />
        <View style={{ flex: 1 }}>
          <Text style={styles.runPct}>{pct}%</Text>
          <Text style={styles.mutedLeft}>
            {holdTrip
              ? goTo
                ? `Head to ${goTo}. Max ${platformMin} min in the sun.`
                : `Find indoor AC. Max ${platformMin} min in the sun.`
              : `Walking to ${goTo ?? 'destination'}…`}
          </Text>
        </View>
      </View>
      <AuthButton label="I've arrived" icon="checkmark.seal.fill" style={{ marginTop: 14 }} onPress={onDone} />
    </View>
  );
}

function DoneSheet({ onNewWalk }: { onNewWalk: () => void }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.doneIcon}>
        <Icon name="checkmark.seal.fill" size={32} color={colors.cool2} />
      </View>
      <Text style={styles.doneTitle}>Walk complete!</Text>
      <Text style={[styles.mutedLeft, { textAlign: 'center', marginTop: 4 }]}>
        Route, heat dose, and AI verdict saved to your history.
      </Text>
      <AuthButton label="Plan new walk" icon="figure.walk" style={{ marginTop: 16, width: '100%' }} onPress={onNewWalk} />
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statSub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  mutedLeft: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  url: { color: colors.cool, fontSize: 12 },
  errKicker: { color: colors.heat, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  hero: { color: colors.text, fontSize: 22, fontWeight: '600' },
  heat: { color: colors.heat, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  retry: {
    marginTop: 8,
    backgroundColor: colors.cool2,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: { color: colors.bg, fontWeight: '600' },
  kicker: { color: colors.cool, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 4 },
  deck: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 12 },
  pathLine: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: 8 },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 28 },
  sheet: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  sheetGlass: { padding: 14, borderRadius: 20 },
  loadRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  stat: { flex: 1, backgroundColor: colors.surface2, borderRadius: 14, padding: 10 },
  statLabel: { color: colors.muted, fontSize: 11, marginBottom: 4 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  beat: { marginTop: 8 },
  beatKicker: { color: colors.cool, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  beatText: { color: colors.text, fontSize: 14, lineHeight: 20, marginTop: 3, flex: 1 },
  ghostBtn: { height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ghostText: { color: colors.cool2, fontSize: 15, fontWeight: '600' },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barFill: { height: 6, backgroundColor: colors.cool2, borderRadius: 3 },
  // ── Pick Phase Styles ──
  condCard: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  condHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  condTitle: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  condRisk: {
    color: colors.heat,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  condRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  condItem: { alignItems: 'center', flex: 1 },
  condValue: { color: colors.text, fontSize: 20, fontWeight: '700' },
  condLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  condDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: -2,
    paddingHorizontal: 4,
  },
  swapLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  tripChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tripChipActive: {
    borderColor: colors.cool2,
    backgroundColor: 'rgba(46,196,182,0.08)',
  },
  tripLabel: { color: colors.muted, fontSize: 12, fontWeight: '600', maxWidth: 120 },
  studyNote: {
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  // ── Load Phase Styles ──
  loadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    color: colors.muted,
    fontSize: 13,
    flex: 1,
  },
  // ── Brief Phase Styles ──
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(193,18,31,0.12)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(193,18,31,0.25)',
  },
  alertText: {
    color: colors.heat,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  briefRoute: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  whyBox: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 6,
  },
  whyTitle: {
    color: colors.cool,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  whyText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  // ── Run Phase Styles ──
  runRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  runPct: {
    color: colors.cool2,
    fontSize: 22,
    fontWeight: '800',
  },
  // ── Done Phase Styles ──
  doneIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(46,196,182,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  doneTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
