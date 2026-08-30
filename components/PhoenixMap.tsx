import { Icon } from '@/components/Icon';
import type { MapHandle, PhoenixMapProps } from '@/components/phoenix-map-types';
import { colors, phoenixRegion } from '@/constants/theme';
import { heatColor } from '@/lib/heat';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import WebMapView, {
  Marker,
  Polygon,
  Polyline,
} from '@teovilla/react-native-web-maps';

// Dark-mode style for Google Maps to match the native iOS dark theme
const DARK_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
];

const PhoenixMap = forwardRef<MapHandle, PhoenixMapProps>(function PhoenixMap(
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
  const mapRef = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coords: any[], opts: any) => {
      mapRef.current?.fitToCoordinates?.(coords, opts);
    },
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebMapView
        ref={mapRef}
        provider="google"
        googleMapsApiKey=""
        style={StyleSheet.absoluteFill}
        initialRegion={phoenixRegion}
        rotateEnabled={false}
        customMapStyle={DARK_MAP_STYLE}
      >
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
          <Marker coordinate={origin} title="Start">
            <WebMapPin label="🚶" color={colors.cool} />
          </Marker>
        ) : null}
        {dest ? (
          <Marker coordinate={dest} title="End">
            <WebMapPin label="📍" color={colors.heat} />
          </Marker>
        ) : null}
        {walker ? (
          <Marker coordinate={walker} title="You">
            <WebMapPin label="🚶" color={colors.cool2} />
          </Marker>
        ) : null}
        {trap ? (
          <Marker coordinate={trap} title={trap.title}>
            <WebMapPin label="🌡️" color={colors.heat} />
          </Marker>
        ) : null}
        {refuges.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.lat, longitude: r.lon }}
            title={r.name}
          >
            <WebMapPin
              label={r.indoor ? '🏢' : '🌳'}
              color={r.indoor ? colors.cool2 : colors.warn}
            />
          </Marker>
        ))}
      </WebMapView>
    </View>
  );
});

function WebMapPin({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pin, { backgroundColor: color }]}>
      <Text style={styles.pinText}>{label}</Text>
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
  pinText: {
    fontSize: 13,
  },
});
