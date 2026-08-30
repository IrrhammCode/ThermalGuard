import { Icon } from '@/components/Icon';
import { colors } from '@/constants/theme';
import type { SwarmLine } from '@/lib/types';
import { StyleSheet, Text, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

export const AGENT: Record<
  string,
  { name: string; short: string; role: string; color: string; icon: SFSymbol }
> = {
  meteo: {
    name: 'Meteorological agent',
    short: 'Meteo',
    role: 'Layer arbiter',
    color: colors.cool,
    icon: 'cloud.sun.fill',
  },
  psych: {
    name: 'Spatial psychology agent',
    short: 'Psych',
    role: 'Dwell / bottleneck',
    color: colors.warn,
    icon: 'person.2.fill',
  },
  body: {
    name: 'Body agent',
    short: 'Body',
    role: 'Symptoms / file',
    color: colors.heat,
    icon: 'heart.fill',
  },
  infra: {
    name: 'Infrastructure actuator',
    short: 'Infra',
    role: 'Thermal Hold',
    color: colors.cool2,
    icon: 'building.2.fill',
  },
};

export function LineRow({ line }: { line: SwarmLine }) {
  const meta = AGENT[line.agent] ?? AGENT.infra;
  return (
    <View style={styles.msg}>
      <View style={styles.msgHead}>
        <Icon name={meta.icon} size={14} color={meta.color} />
        <Text style={[styles.msgAgent, { color: meta.color }]}>{meta.name}</Text>
        {line.tool ? (
          <View style={[styles.tool, { borderColor: meta.color }]}>
            <Text style={[styles.toolText, { color: meta.color }]}>{line.tool}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.msgText}>{line.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  msg: { gap: 6 },
  msgHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  msgAgent: { fontSize: 11, fontWeight: '700' },
  tool: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, height: 20, justifyContent: 'center' },
  toolText: { fontSize: 10, fontWeight: '600', fontFamily: 'Menlo' },
  msgText: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
