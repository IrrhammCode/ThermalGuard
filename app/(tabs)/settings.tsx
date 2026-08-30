import { FadeInView } from '@/components/FadeIn';
import { Icon } from '@/components/Icon';
import { AuthButton } from '@/components/auth/AuthButton';
import { PressScale } from '@/components/ui/PressScale';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/Auth';
import { useProfile } from '@/context/Profile';
import {
  ALLERGY_OPTIONS,
  CONDITION_OPTIONS,
  ageLabel,
  triageProfile,
  type Allergy,
  type Condition,
} from '@/lib/profile';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function joinLabels<T extends string>(ids: T[], options: { id: T; label: string }[]): string {
  const real = ids.filter((id) => id !== 'none');
  if (!real.length) return 'None';
  return real.map((id) => options.find((o) => o.id === id)?.label ?? id).join(', ');
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { profile, clear } = useProfile();
  const triage = profile ? triageProfile(profile) : null;

  const initials = (session?.name || 'O')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 40,
        }}>
        {/* ── Header ── */}
        <FadeInView>
          <Text style={styles.kicker}>ATA²</Text>
          <Text style={styles.title}>Settings</Text>
        </FadeInView>

        {/* ── Profile Card ── */}
        <FadeInView delay={60}>
          <View style={styles.profileCard}>
            <LinearGradient
              colors={['rgba(46,196,182,0.12)', 'rgba(18,23,30,0.8)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{session?.name || 'Operator'}</Text>
              <Text style={styles.profileEmail}>{session?.email || '—'}</Text>
              <View style={styles.roleBadge}>
                <Icon
                  name={session?.role === 'judge' ? 'star.fill' : 'person.fill'}
                  size={10}
                  color={colors.cool2}
                />
                <Text style={styles.roleText}>
                  {session?.role === 'judge' ? 'Judge' : 'Operator'}
                </Text>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* ── Operator File ── */}
        <FadeInView delay={120}>
          <Text style={styles.section}>OPERATOR FILE</Text>
          {profile ? (
            <View style={styles.group}>
              {/* Status indicator */}
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor: triage?.acute
                        ? colors.heat
                        : triage?.vulnerable
                          ? colors.warn
                          : colors.cool2,
                    },
                  ]}
                />
                <Text style={styles.statusText}>
                  {triage?.acute
                    ? 'Acute signs — indoor only'
                    : triage?.vulnerable
                      ? 'Vulnerable — prefer indoor hold'
                      : 'No acute signs'}
                </Text>
              </View>

              <Row icon="calendar" label="Age" value={ageLabel(profile.ageBand)} />
              <Row
                icon="heart.fill"
                label="Conditions"
                value={joinLabels<Condition>(profile.conditions, CONDITION_OPTIONS)}
              />
              <Row
                icon="allergens"
                label="Allergies"
                value={joinLabels<Allergy>(profile.allergies, ALLERGY_OPTIONS)}
                last
              />

              <PressScale
                onPress={() => {
                  void Haptics.selectionAsync();
                  router.push('/body-edit');
                }}
                style={styles.editBtn}>
                <Icon name="pencil" size={14} color={colors.cool} />
                <Text style={styles.editText}>Edit health profile</Text>
                <Icon name="chevron.right" size={12} color={colors.muted} />
              </PressScale>
            </View>
          ) : (
            <View style={styles.group}>
              <View style={styles.noProfile}>
                <Icon name="person.crop.circle.badge.exclamationmark" size={28} color={colors.muted} />
                <Text style={styles.noProfileTitle}>No operator file</Text>
                <Text style={styles.noProfileDeck}>
                  Create your body file so the swarm agents can read your heat profile.
                </Text>
                <AuthButton
                  label="Create file"
                  icon="plus"
                  variant="outline"
                  style={{ marginTop: 12, width: '100%' }}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    router.push('/body-edit');
                  }}
                />
              </View>
            </View>
          )}
        </FadeInView>

        {/* ── About ── */}
        <FadeInView delay={180}>
          <Text style={styles.section}>ABOUT ATA²</Text>
          <View style={styles.group}>
            <View style={styles.aboutContent}>
              <View style={styles.aboutRow}>
                <Icon name="thermometer.sun.fill" size={16} color={colors.heat} />
                <Text style={styles.aboutText}>
                  ATA² does not cool the street. Downtown Phoenix 2 m air is almost flat.
                </Text>
              </View>
              <View style={styles.aboutRow}>
                <Icon name="building.2.fill" size={16} color={colors.cool2} />
                <Text style={styles.aboutText}>
                  We refuse that layer, then move the wait into indoor AC.
                </Text>
              </View>
              <View style={styles.aboutRow}>
                <Icon name="exclamationmark.triangle.fill" size={16} color={colors.warn} />
                <Text style={styles.aboutText}>
                  Not a diagnosis. Not medical advice. Research prototype only.
                </Text>
              </View>
            </View>
          </View>
        </FadeInView>

        {/* ── Version ── */}
        <FadeInView delay={220}>
          <View style={styles.versionRow}>
            <Text style={styles.versionText}>ATA² v1.0.0</Text>
            <Text style={styles.versionText}>Expo SDK 54</Text>
          </View>
        </FadeInView>

        {/* ── Sign Out ── */}
        <FadeInView delay={260}>
          <View style={styles.actionRow}>
            <Pressable
              onPress={() => {
                Alert.alert('Wipe Profile', 'Are you sure you want to delete your health profile?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Wipe & Sign Out',
                    style: 'destructive',
                    onPress: () => {
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      clear();
                      signOut();
                    },
                  },
                ]);
              }}
              style={[styles.signOut, { borderColor: colors.border, backgroundColor: 'transparent' }]}>
              <Icon name="trash" size={16} color={colors.muted} />
              <Text style={[styles.signOutText, { color: colors.muted }]}>Wipe Data</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                signOut();
              }}
              style={styles.signOut}>
              <Icon name="rectangle.portrait.and.arrow.right" size={16} color={colors.heat} />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </View>
        </FadeInView>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <Icon name={icon as any} size={14} color={colors.muted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  kicker: { color: colors.cool, fontSize: 11, fontWeight: '600', letterSpacing: 1.2 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginTop: 4 },

  // ── Profile Card ──
  profileCard: {
    marginTop: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cool2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.bg, fontSize: 18, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  profileEmail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(46,196,182,0.10)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: { color: colors.cool2, fontSize: 11, fontWeight: '700' },

  // ── Section ──
  section: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  // ── Status ──
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(18,23,30,0.5)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1 },

  // ── Row ──
  row: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLine: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.muted, fontSize: 14, width: 90 },
  rowValue: { color: colors.text, fontSize: 14, flex: 1, fontWeight: '600', textAlign: 'right' },

  // ── Edit Button ──
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  editText: { color: colors.cool, fontSize: 14, fontWeight: '600', flex: 1 },

  // ── No Profile ──
  noProfile: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  noProfileTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  noProfileDeck: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },

  // ── About ──
  aboutContent: { padding: 14, gap: 14 },
  aboutRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  aboutText: { color: colors.muted, fontSize: 13, lineHeight: 19, flex: 1 },

  // ── Version ──
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  versionText: { color: colors.border, fontSize: 11, fontWeight: '600' },

  // ── Actions ──
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.25)',
    backgroundColor: 'rgba(255,107,53,0.06)',
  },
  signOutText: { color: colors.heat, fontSize: 15, fontWeight: '700' },
});
