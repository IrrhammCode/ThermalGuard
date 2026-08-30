import { colors } from '@/constants/theme';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Line, Path, Rect } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export type FieldMode = 'tcm' | 'hold' | 'swarm' | 'quiet';

type Props = {
  mode?: FieldMode;
  /** Keep this low — overlay must never compete with chrome. */
  opacity?: number;
};

/**
 * Geometry only. No labels — UI copy owns the words.
 * Apple Weather overlay + FortyGuard 60 m grid.
 */
export function FieldOverlay({ mode = 'quiet', opacity = 0.14 }: Props) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
        <Frame />
        <StreetGrid />
        {mode === 'tcm' || mode === 'quiet' ? <FlatIsopleths draw={mode === 'tcm'} /> : null}
        {mode === 'hold' ? <HoldDiagram /> : null}
        {mode === 'swarm' ? <SwarmWire /> : null}
      </Svg>
    </View>
  );
}

function Frame() {
  return (
    <G stroke={colors.border} strokeWidth={1} fill="none">
      <Path d="M24 40 H52 M24 40 V68" />
      <Path d="M366 40 H338 M366 40 V68" />
      <Path d="M24 804 H52 M24 804 V776" />
      <Path d="M366 804 H338 M366 804 V776" />
    </G>
  );
}

function StreetGrid() {
  const v = [48, 96, 144, 192, 240, 288, 336];
  const h = [120, 188, 256, 324, 392, 460, 528, 596];
  return (
    <G>
      {v.map((x) => (
        <Line key={`v${x}`} x1={x} y1={96} x2={x} y2={660} stroke={colors.border} strokeWidth={0.7} />
      ))}
      {h.map((y) => (
        <Line key={`h${y}`} x1={36} y1={y} x2={354} y2={y} stroke={colors.border} strokeWidth={0.7} />
      ))}
    </G>
  );
}

function FlatIsopleths({ draw }: { draw: boolean }) {
  const offset = useSharedValue(120);
  useEffect(() => {
    if (!draw) return;
    offset.value = withRepeat(withTiming(0, { duration: 9000, easing: Easing.linear }), -1, false);
  }, [draw, offset]);

  const drawn = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  const bands = [
    'M36 160 C 110 152 170 168 240 158 S 320 150 354 162',
    'M36 230 C 100 238 180 222 250 232 S 318 240 354 228',
    'M36 310 C 120 302 190 318 260 308 S 322 300 354 314',
    'M36 400 C 108 412 176 392 248 404 S 316 414 354 398',
    'M36 488 C 118 480 186 498 258 486 S 324 478 354 492',
  ];

  return (
    <G fill="none" stroke={colors.heat} strokeWidth={1}>
      {bands.map((d, i) =>
        i === 2 && draw ? (
          <AnimatedPath key={d} d={d} opacity={0.7} strokeDasharray="6 8" animatedProps={drawn} />
        ) : (
          <Path key={d} d={d} opacity={0.35} />
        ),
      )}
    </G>
  );
}

function HoldDiagram() {
  return (
    <G opacity={0.85}>
      <Rect x={168} y={520} width={54} height={28} rx={2} stroke={colors.heat} strokeWidth={1.2} fill="rgba(255,107,53,0.10)" />
      <Path d="M195 548 L 108 620" stroke={colors.cool2} strokeWidth={1} strokeDasharray="3 4" fill="none" />
      <Path d="M195 548 L 282 620" stroke={colors.cool2} strokeWidth={1} strokeDasharray="3 4" fill="none" />
      <Rect x={72} y={620} width={88} height={36} rx={3} stroke={colors.cool2} strokeWidth={1.2} fill="rgba(46,196,182,0.10)" />
      <Rect x={230} y={620} width={88} height={36} rx={3} stroke={colors.cool2} strokeWidth={1.2} fill="rgba(46,196,182,0.10)" />
    </G>
  );
}

function SwarmWire() {
  return (
    <G opacity={0.8}>
      <Rect x={48} y={560} width={64} height={22} rx={2} stroke={colors.cool} strokeWidth={1} fill="none" />
      <Rect x={163} y={640} width={64} height={22} rx={2} stroke={colors.warn} strokeWidth={1} fill="none" />
      <Rect x={278} y={560} width={64} height={22} rx={2} stroke={colors.cool2} strokeWidth={1} fill="none" />
      <Path d="M112 571 H 278 M80 582 L 195 640 M310 582 L 227 640" stroke={colors.border} strokeWidth={1} fill="none" />
    </G>
  );
}
