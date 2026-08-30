import { DoseBar } from '@/components/DoseBar';
import { FadeInView } from '@/components/FadeIn';
import { Icon } from '@/components/Icon';
import { PressScale } from '@/components/ui/PressScale';
import { colors } from '@/constants/theme';
import { useHistory } from '@/context/History';
import { formatC, riskLevel } from '@/lib/heat';
import {
  feelLabel,
  formatMeters,
  formatWalkMin,
  formatWhen,
  healthResult,
  verdictLabel,
  walkTitle,
  type WalkRecord,
} from '@/lib/history';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { walks, clear, requestResume } = useHistory();

  function openWalk(row: WalkRecord) {
    void Haptics.selectionAsync();
    requestResume(row.fromId, row.toId);
    router.navigate('/');
  }

  function onClear() {
    Alert.alert('Clear history', 'Remove every saved walk from this operator?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          clear();
        },
      },
    ]);
  }

  // Aggregate stats
  const totalWalks = walks.length;
  const totalMeters = walks.reduce((sum, w) => sum + (w.walkMeters ?? 0), 0);
  const avgPeak =
    walks.filter((w) => w.peakC != null).length > 0
      ? walks.reduce((sum, w) => sum + (w.peakC ?? 0), 0) / walks.filter((w) => w.peakC != null).length
      : null;
  const totalDose = walks.reduce((sum, w) => sum + (w.dose ?? 0), 0);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
        }}>
        {/* ── Header ── */}
        <FadeInView>
          <Text style={styles.kicker}>ThermalGuard · HISTORY</Text>
          <Text style={styles.title}>Walk log</Text>
        </FadeInView>

        {!walks.length ? (
          /* ── Empty State ── */
          <FadeInView delay={100} style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Icon name="clock.arrow.circlepath" size={36} color={colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>No walks yet</Text>
            <Text style={styles.emptyDeck}>
              Finish a walk on the Walk tab and tap Done.{'\n'}Your route, dose, and body log land here.
            </Text>
          </FadeInView>
        ) : (
          <>
            {/* ── Summary Cards ── */}
            <FadeInView delay={60}>
              <View style={styles.summaryRow}>
                <SummaryCard
                  icon="figure.walk"
                  iconColor={colors.cool}
                  label="Walks"
                  value={`${totalWalks}`}
                />
                <SummaryCard
                  icon="point.topleft.down.to.point.bottomright.curvepath.fill"
                  iconColor={colors.cool2}
                  label="Distance"
                  value={formatMeters(totalMeters)}
                />
                <SummaryCard
                  icon="sun.max.fill"
                  iconColor={colors.heat}
                  label="Avg peak"
                  value={avgPeak != null ? formatC(avgPeak) : '—'}
                />
              </View>
            </FadeInView>

            {/* ── Total Dose Bar ── */}
            {totalDose > 0 ? (
              <FadeInView delay={100}>
                <View style={styles.doseCard}>
                  <View style={styles.doseHeader}>
                    <Text style={styles.doseLabel}>Total thermal dose</Text>
                    <Text style={styles.doseValue}>{Math.round(totalDose)} °C·min</Text>
                  </View>
                  <DoseBar value={totalDose} max={totalDose * 1.5} color={colors.heat} />
                </View>
              </FadeInView>
            ) : null}

            {/* ── Walk Cards ── */}
            <View style={{ gap: 12, marginTop: 16 }}>
              {walks.map((row, i) => (
                <FadeInView key={row.id} delay={140 + i * 60}>
                  <ResultCard row={row} onPress={() => openWalk(row)} />
                </FadeInView>
              ))}
            </View>

            {/* ── Clear ── */}
            <FadeInView delay={140 + walks.length * 60}>
              <Pressable onPress={onClear} hitSlop={8} style={styles.clear}>
                <Icon name="trash.fill" size={13} color={colors.muted} />
                <Text style={styles.clearText}>Clear history</Text>
              </Pressable>
            </FadeInView>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ── Summary Card ── */
function SummaryCard({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Icon name={icon as any} size={16} color={iconColor} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

/* ── Result Card ── */
function ResultCard({ row, onPress }: { row: WalkRecord; onPress: () => void }) {
  const health = healthResult(row);
  const tone =
    health.tone === 'heat' ? colors.heat : health.tone === 'hold' ? colors.cool2 : colors.cool;
  const risk = row.peakC != null ? riskLevel(row.peakC) : null;
  const verdict = verdictLabel(row);

  return (
    <PressScale onPress={onPress} style={styles.card}>
      {/* Accent gradient strip */}
      <LinearGradient
        colors={[tone, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardAccent}
      />

      <View style={styles.cardTop}>
        <View style={styles.cardTitleRow}>
          <Icon
            name={row.hold ? 'building.2.fill' : 'figure.walk'}
            size={14}
            color={tone}
          />
          <Text style={styles.cardTitle} numberOfLines={1}>
            {walkTitle(row)}
          </Text>
        </View>
        <Icon name="chevron.right" size={12} color={colors.muted} />
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.when}>{formatWhen(row.at)}</Text>
        {risk ? (
          <View style={[styles.riskBadge, { borderColor: tone }]}>
            <Text style={[styles.riskText, { color: tone }]}>{verdict}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.stats}>
        <Stat label="Duration" value={formatWalkMin(row.walkMin)} icon="clock.fill" />
        <Stat label="Distance" value={formatMeters(row.walkMeters)} icon="point.topleft.down.to.point.bottomright.curvepath.fill" />
        <Stat
          label="Peak felt"
          value={row.peakC != null ? formatC(row.peakC) : '—'}
          icon="sun.max.fill"
          accent={row.peakC != null && row.peakC > 44}
        />
      </View>

      {/* Health verdict */}
      <View style={styles.healthRow}>
        <View style={[styles.healthDot, { backgroundColor: tone }]} />
        <Text style={styles.healthDetail}>{health.detail}</Text>
      </View>

      {/* After walk symptoms */}
      <View style={styles.afterRow}>
        <Icon name="heart.text.clipboard" size={12} color={colors.muted} />
        <Text style={styles.afterText}>After: {feelLabel(row.symptomsAfter)}</Text>
      </View>

      {row.dose != null ? (
        <View style={styles.doseMini}>
          <Text style={styles.doseMiniLabel}>Dose</Text>
          <Text style={styles.doseMiniValue}>{Math.round(row.dose)} °C·min</Text>
        </View>
      ) : null}
    </PressScale>
  );
}

/* ── Stat Chip ── */
function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.stat}>
      <Icon name={icon as any} size={10} color={accent ? colors.heat : colors.muted} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: colors.heat }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  kicker: { color: colors.cool, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 4 },

  // ── Empty ──
  emptyWrap: { marginTop: 64, alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  emptyDeck: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },

  // ── Summary ──
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 2 },
  summaryLabel: { color: colors.muted, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },

  // ── Dose Card ──
  doseCard: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  doseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  doseLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  doseValue: { color: colors.heat, fontSize: 14, fontWeight: '700' },

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  when: { color: colors.muted, fontSize: 12 },
  riskBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  riskText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  stats: { flexDirection: 'row', gap: 6, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    gap: 3,
  },
  statLabel: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  statValue: { color: colors.text, fontSize: 14, fontWeight: '700' },

  // ── Health ──
  healthRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 12 },
  healthDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  healthDetail: { color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 },

  // ── After ──
  afterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  afterText: { color: colors.muted, fontSize: 12, flex: 1 },

  // ── Dose Mini ──
  doseMini: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  doseMiniLabel: { color: colors.muted, fontSize: 11 },
  doseMiniValue: { color: colors.heat, fontSize: 11, fontWeight: '700' },

  // ── Clear ──
  clear: {
    marginTop: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
