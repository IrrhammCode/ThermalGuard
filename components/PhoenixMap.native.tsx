import { Icon } from '@/components/Icon';
import type { MapHandle, PhoenixMapProps } from '@/components/phoenix-map-types';
import { colors, phoenixRegion } from '@/constants/theme';
import { heatColor } from '@/lib/heat';
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline } from 'react-native-maps';
import type { SFSymbol } from 'sf-symbols-typescript';

const PhoenixMap = forwardRef<MapView, PhoenixMapProps>(function PhoenixMap(
  {
    overlay,
    tiles,
    heatMin,
    heatMax,
    colorKey,
    coolCoords,
    fastCoords,
    emphasize,
    origin,
    dest,
    walker,
    trap,
    refuges,
  },
  ref,
) {
  return (
    <MapView
      ref={ref}
      style={StyleSheet.absoluteFill}
      initialRegion={phoenixRegion}
      userInterfaceStyle="dark"
      showsCompass={false}
      rotateEnabled={false}
      pitchEnabled={false}>
      {overlay
        ? tiles.map((tile) => {
            const value = colorKey === 'felt' ? (tile.felt ?? tile.t2m) : tile.t2m;
            return (
              <Polygon
                key={tile.id}
                coordinates={tile.coordinates}
                fillColor={heatColor(value, heatMin, heatMax)}
                strokeColor="transparent"
                strokeWidth={0}
              />
            );
          })
        : null}
      {fastCoords.length > 1 ? (
        <Polyline
          coordinates={fastCoords}
          strokeColor={colors.fast}
          strokeWidth={emphasize === 'fast' ? 7 : 4}
          lineDashPattern={emphasize === 'fast' ? undefined : [8, 6]}
        />
      ) : null}
      {coolCoords.length > 1 ? (
        <Polyline
          coordinates={coolCoords}
          strokeColor={colors.cool}
          strokeWidth={emphasize === 'cool' ? 8 : 5}
        />
      ) : null}
      {origin ? (
        <Marker coordinate={origin} title="Start" anchor={{ x: 0.5, y: 0.5 }}>
          <MapPin name="figure.walk" color={colors.cool} />
        </Marker>
      ) : null}
      {dest ? (
        <Marker coordinate={dest} title="End" anchor={{ x: 0.5, y: 0.5 }}>
          <MapPin name="location.fill" color={colors.heat} />
        </Marker>
      ) : null}
      {walker ? (
        <Marker
          coordinate={walker}
          title="You"
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges>
          <MapPin name="figure.walk" color={colors.cool2} />
        </Marker>
      ) : null}
      {trap ? (
        <Marker coordinate={trap} title={trap.title} anchor={{ x: 0.5, y: 0.5 }}>
          <MapPin name="thermometer.sun.fill" color={colors.heat} />
        </Marker>
      ) : null}
      {refuges.map((r) => (
        <Marker
          key={r.id}
          coordinate={{ latitude: r.lat, longitude: r.lon }}
          title={r.name}
          description={r.indoor ? 'AC' : 'Park'}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <MapPin name={r.indoor ? 'building.2.fill' : 'tree.fill'} color={r.indoor ? colors.cool2 : colors.warn} />
        </Marker>
      ))}
    </MapView>
  );
});

function MapPin({ name, color }: { name: SFSymbol; color: string }) {
  return (
    <View style={[styles.pin, { backgroundColor: color }]}>
      <Icon name={name} size={13} color={colors.bg} />
    </View>
  );
}

export default PhoenixMap;

const styles = StyleSheet.create({
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
});
