import { Icon } from '@/components/Icon';
import { colors } from '@/constants/theme';
import type { MapHandle, PhoenixMapProps } from '@/components/phoenix-map-types';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const PhoenixMap = forwardRef<MapHandle, PhoenixMapProps>(function PhoenixMap(_props, _ref) {
  return (
    <View style={styles.box}>
      <Icon name="map.fill" size={28} color={colors.cool} pulse />
      <Text style={styles.kicker}>ATA²</Text>
      <Text style={styles.title}>Open this on your iPhone</Text>
      <Text style={styles.body}>
        Scan the Expo Go QR code. The heat map is native Apple Maps — it does not run in the
        browser.
      </Text>
    </View>
  );
});

export default PhoenixMap;

const styles = StyleSheet.create({
  box: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    padding: 28,
    justifyContent: 'center',
  },
  kicker: { color: colors.cool, fontSize: 11, letterSpacing: 1.6, fontWeight: '700', marginTop: 16 },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginTop: 8 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 10 },
});
