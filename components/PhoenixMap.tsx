/**
 * PhoenixMap — Web version using Leaflet + OpenStreetMap (100% free, no API key).
 * The .native.tsx version handles iOS via react-native-maps / Apple Maps.
 */
import type { MapHandle, PhoenixMapProps } from '@/components/phoenix-map-types';
import { colors, phoenixRegion } from '@/constants/theme';
import { heatColor } from '@/lib/heat';
import L from 'leaflet';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// ── Inject Leaflet CSS into <head> once ──────────────────────────────────────
let cssInjected = false;
function ensureLeafletCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);
}

// ── Dark tile layer (CartoDB Dark Matter — free, no key) ─────────────────────
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_ATTR =
  '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://osm.org/copyright">OSM</a>';

// ── Simple circle marker icon builder ────────────────────────────────────────
function circleIcon(color: string, size = 14): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    html: `<div style="
      width:${size * 2}px;height:${size * 2}px;border-radius:50%;
      background:${color};border:2px solid ${colors.bg};
      display:flex;align-items:center;justify-content:center;
    "></div>`,
  });
}

function emojiIcon(emoji: string, color: string, size = 14): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
    html: `<div style="
      width:${size * 2}px;height:${size * 2}px;border-radius:50%;
      background:${color};border:2px solid ${colors.bg};
      display:flex;align-items:center;justify-content:center;
      font-size:${size}px;
    ">${emoji}</div>`,
  });
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  useImperativeHandle(ref, () => ({
    fitToCoordinates: (coords: any[], opts: any) => {
      if (!mapRef.current || !coords.length) return;
      const bounds = L.latLngBounds(
        coords.map((c: any) => [c.latitude, c.longitude]),
      );
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    },
  }));

  // ── Initialize map once ──────────────────────────────────────────────────
  useEffect(() => {
    ensureLeafletCSS();
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [phoenixRegion.latitude, phoenixRegion.longitude],
      zoom: 15,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer(DARK_TILES, { attribution: DARK_ATTR, maxZoom: 19 }).addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Fix Leaflet container size after mount
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  // ── Sync overlays to props ───────────────────────────────────────────────
  useEffect(() => {
    const group = layersRef.current;
    if (!group) return;
    group.clearLayers();

    // Heat polygons
    if (overlay && tiles.length) {
      for (const tile of tiles) {
        const value = colorKey === 'felt' ? (tile.felt ?? tile.t2m) : tile.t2m;
        const latlngs = tile.coordinates.map((c: any) => [c.latitude, c.longitude] as [number, number]);
        L.polygon(latlngs, {
          fillColor: heatColor(value, heatMin, heatMax, 0.65),
          fillOpacity: 1,
          stroke: false,
        }).addTo(group);
      }
    }

    // Fast route (dashed gray)
    if (fastCoords.length > 1) {
      const ll = fastCoords.map((c: any) => [c.latitude, c.longitude] as [number, number]);
      L.polyline(ll, {
        color: colors.fast,
        weight: emphasize === 'fast' ? 7 : 4,
        dashArray: emphasize === 'fast' ? undefined : '8 6',
        opacity: 0.9,
      }).addTo(group);
    }

    // Cool route (solid cyan)
    if (coolCoords.length > 1) {
      const ll = coolCoords.map((c: any) => [c.latitude, c.longitude] as [number, number]);
      L.polyline(ll, {
        color: colors.cool,
        weight: emphasize === 'cool' ? 8 : 5,
        opacity: 0.9,
      }).addTo(group);
    }

    // Origin marker
    if (origin) {
      L.marker([origin.latitude, origin.longitude], {
        icon: emojiIcon('🚶', colors.cool),
        title: 'Start',
      }).addTo(group);
    }

    // Destination marker
    if (dest) {
      L.marker([dest.latitude, dest.longitude], {
        icon: emojiIcon('📍', colors.heat),
        title: 'End',
      }).addTo(group);
    }

    // Walker marker
    if (walker) {
      L.marker([walker.latitude, walker.longitude], {
        icon: emojiIcon('🚶', colors.cool2),
        title: 'You',
      }).addTo(group);
    }

    // Trap marker
    if (trap) {
      L.marker([trap.latitude, trap.longitude], {
        icon: emojiIcon('🌡️', colors.heat),
        title: trap.title,
      }).addTo(group);
    }

    // Refuges
    for (const r of refuges) {
      L.marker([r.lat, r.lon], {
        icon: emojiIcon(r.indoor ? '🏢' : '🌳', r.indoor ? colors.cool2 : colors.warn),
        title: r.name,
      })
        .bindPopup(`<b>${r.name}</b><br/>${r.indoor ? 'Indoor AC' : 'Park'}`)
        .addTo(group);
    }
  }, [overlay, tiles, heatMin, heatMax, colorKey, coolCoords, fastCoords, emphasize, origin, dest, walker, trap, refuges]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.bg,
      }}
    />
  );
});

export default PhoenixMap;
