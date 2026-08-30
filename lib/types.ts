export type Coord = { latitude: number; longitude: number };

export type AuthProvider = 'email' | 'apple' | 'google' | 'judge';

export type Session = {
  userId: string;
  email: string;
  name: string;
  role: 'operator' | 'judge';
  provider: AuthProvider;
  createdAt: string;
};

export type MapTile = {
  id: string;
  t2m: number;
  felt?: number;
  vegetation?: number | null;
  coordinates: Coord[];
};

export type MapLegend = {
  kind: string;
  label: string;
  min: number;
  max: number;
};

export type MapOverlay = {
  mode: 'felt' | 'tcm';
  region: Coord & { latitudeDelta: number; longitudeDelta: number };
  legend: MapLegend;
  tiles: MapTile[];
  tcm_refused: boolean;
};

export type RouteLeg = {
  node_ids: string[];
  coords: Coord[];
  meters: number;
  minutes: number;
  mean_c: number;
  peak_c: number;
  dose: number;
};

export type RoutePair = {
  from_id: string;
  to_id: string;
  cool: RouteLeg;
  fast: RouteLeg;
  paths_split: boolean;
  mean_delta_c: number;
  hold: { place: string; node_id: string; reason: string } | null;
};

export type Trip = {
  id: string;
  label: string;
  from_id: string;
  to_id: string;
  hold?: boolean;
};

export type Refuge = {
  id: string;
  name: string;
  kind: string;
  indoor: boolean;
  lat: number;
  lon: number;
  node_id: string;
  felt_c?: number;
};

export type HoldAssignment = {
  id: string;
  name: string;
  kind: string;
  indoor: boolean;
  people: number;
  walk_min: number;
  walk_m?: number;
  hold_temp_c: number;
  hold_dose: number;
  saved_dose: number;
  lat: number;
  lon: number;
};

export type BodyVerdict = {
  verdict: 'ok_with_hold' | 'indoor_only' | 'watch' | string;
  ok_on_platform: boolean;
  ok_if_indoor_hold: boolean;
  skip_park: boolean;
  max_platform_min?: number;
  preferred_refuge?: string;
  backup_refuge?: string;
  avoid?: string[];
  cite_layers: string[];
  meteo_read?: string;
  psych_read?: string;
  body_read?: string;
  infra_read?: string;
  if_worse?: string;
  reason: string;
  source: 'groq' | 'rules' | string;
  model: string | null;
};

export type HoldPlan = {
  trap_id: string;
  trap_name: string;
  trap_lat: number;
  trap_lon: number;
  wait_min: number;
  crowd: number;
  air_c: number;
  trap_felt_c: number;
  platform_dose: number;
  tcm_refused: boolean;
  assignments: HoldAssignment[];
  overflow_on_platform: number;
  assigned: number;
  mean_hold_dose: number | null;
  dose_saved_total: number;
  anti_bottleneck: boolean;
  body?: BodyVerdict;
};

export type NowPoint = {
  lat: number;
  lon: number;
  air_c: number;
  felt_c: number;
  vegetation: number;
  risk: string;
};

export type TcmLayer = {
  n_tiles: number;
  min_c: number;
  max_c: number;
  spread_c: number;
  can_route: boolean;
};

export type AppConfig = {
  city: string;
  demo_point: Coord;
  bounds: { south: number; north: number; west: number; east: number };
  region: Coord & { latitudeDelta: number; longitudeDelta: number };
  tcm_refused: boolean;
  study_date: string;
  study_hour: string;
};

export type Bootstrap = {
  config: AppConfig;
  layers: { tcm: TcmLayer; verdict: { refuse_air_routing: boolean } };
  now: NowPoint;
  hold: HoldPlan;
  trips: Trip[];
  refuges: Refuge[];
  map_felt: MapOverlay;
  default_route: RoutePair;
};

export type SwarmLine = {
  agent: 'meteo' | 'psych' | 'body' | 'infra' | string;
  tool: string;
  text: string;
};

export type SwarmResponse = {
  tcm: TcmLayer;
  lines: SwarmLine[];
  plan?: HoldPlan;
  payload: {
    action: string;
    tcm_refused: boolean;
    city: string;
    trap: string;
    assignments: { refuge: string; people: number; indoor: boolean }[];
    wait_min: number;
    release_min_before_vehicle: number;
    body?: BodyVerdict | null;
  };
};
