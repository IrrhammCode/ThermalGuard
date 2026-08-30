import type { Coord, MapTile, Refuge } from '@/lib/types';

export type PhoenixMapProps = {
  overlay: boolean;
  tiles: MapTile[];
  heatMin: number;
  heatMax: number;
  colorKey: 'felt' | 't2m';
  coolCoords: Coord[];
  fastCoords: Coord[];
  emphasize: 'cool' | 'fast';
  origin?: Coord | null;
  dest?: Coord | null;
  walker?: Coord | null;
  trap?: { latitude: number; longitude: number; title: string } | null;
  refuges: Refuge[];
};

export type MapHandle = {
  fitToCoordinates?: (
    coordinates: Coord[],
    options: {
      edgePadding: { top: number; right: number; bottom: number; left: number };
      animated: boolean;
    },
  ) => void;
};
