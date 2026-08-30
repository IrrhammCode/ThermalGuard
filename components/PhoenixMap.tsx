/**
 * PhoenixMap — Web version using Leaflet + OpenStreetMap (100% free, no API key).
 * The .native.tsx version handles iOS via react-native-maps / Apple Maps.
 */
import type { MapHandle, PhoenixMapProps } from '@/components/phoenix-map-types';
import { colors, phoenixRegion } from '@/constants/theme';
import { heatColor } from '@/lib/heat';
import L from 'leaflet';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// ── Inject Leaflet CSS and Dark Mode Filter into <head> once ─────────────────
let cssInjected = false;
function ensureLeafletCSS() {
  if (cssInjected) return;
  cssInjected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.innerHTML = `
    /* Invert colors to create a free dark mode from standard OSM tiles */
    .leaflet-layer,
    .leaflet-control-zoom-in,
    .leaflet-control-zoom-out,
    .leaflet-control-attribution {
      filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
    }
  `;
  document.head.appendChild(style);
}

// ── Default OSM tiles (100% free, no key) ────────────────────────────────────
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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
  const heatGroupRef = useRef<L.LayerGroup | null>(null);
  const routeGroupRef = useRef<L.LayerGroup | null>(null);
  const walkerRef = useRef<L.Marker | null>(null);

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

    L.tileLayer(OSM_TILES, { attribution: OSM_ATTR, maxZoom: 19 }).addTo(map);
    heatGroupRef.current = L.layerGroup().addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Fix Leaflet container size after mount
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      heatGroupRef.current = null;
      routeGroupRef.current = null;
    };
  }, []);

  // ── Sync Heatmap (Static) ────────────────────────────────────────────────
  useEffect(() => {
    const group = heatGroupRef.current;
    if (!group) return;
    group.clearLayers();

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
  }, [overlay, tiles, heatMin, heatMax, colorKey]);

  // ── Sync Routes and Markers (Changes when walker moves) ──────────────────
  useEffect(() => {
    const group = routeGroupRef.current;
    if (!group) return;
    group.clearLayers();

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
  }, [coolCoords, fastCoords, emphasize, origin, dest, trap, refuges]);

  // ── Sync dynamic walker (runs 60fps without clearing map) ───────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (walker) {
      if (!walkerRef.current) {
        walkerRef.current = L.marker([walker.latitude, walker.longitude], {
          icon: emojiIcon('🚶', colors.cool2),
          title: 'You',
          zIndexOffset: 1000,
        }).addTo(mapRef.current);
      } else {
        walkerRef.current.setLatLng([walker.latitude, walker.longitude]);
      }
    } else {
      if (walkerRef.current) {
        walkerRef.current.remove();
        walkerRef.current = null;
      }
    }
  }, [walker]);

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
        zIndex: 0,
      }}
    />
  );
});

export default PhoenixMap;
