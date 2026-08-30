import { ImageSourcePropType } from 'react-native';

/**
 * Maps landmark place IDs to thumbnail images.
 * Uses remote URLs from Unsplash (downtown Phoenix, urban heat, transit).
 * Generic street intersections get a shared image per street.
 */

// ── Landmark images (specific places) ──
const LANDMARK_IMAGES: Record<string, ImageSourcePropType> = {
  // Van Buren / Central — the light rail platform (exposed sun)
  'vanburen-central': {
    uri: 'https://images.unsplash.com/photo-1581281863883-2469417a1668?w=400&h=267&fit=crop',
  },
  // Arizona Center — indoor AC mall
  'vanburen-3rdst': {
    uri: 'https://images.unsplash.com/photo-1567449303183-ae0d6ed1498e?w=400&h=267&fit=crop',
  },
  // CityScape — downtown mixed-use
  'washington-1stave': {
    uri: 'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=400&h=267&fit=crop',
  },
  // Convention Center
  'washington-2ndst': {
    uri: 'https://images.unsplash.com/photo-1587825140708-dfaf18c41c21?w=400&h=267&fit=crop',
  },
  // Civic Space Park — canopy
  'fillmore-1stave': require('@/assets/images/civic-canopy.png'),
  // Roosevelt Row — arts district
  'roosevelt-central': {
    uri: 'https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=400&h=267&fit=crop',
  },
};

// ── Street-level images (shared per street row) ──
// Each street in the Phoenix grid gets a representative image.
const STREET_IMAGES: Record<string, ImageSourcePropType> = {
  // Jefferson — government buildings, city hall area
  jefferson: {
    uri: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=267&fit=crop',
  },
  // Washington — downtown core, office towers
  washington: {
    uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=267&fit=crop',
  },
  // Adams — mid-downtown, mixed use
  adams: {
    uri: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&h=267&fit=crop',
  },
  // Monroe — residential transition
  monroe: {
    uri: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=400&h=267&fit=crop',
  },
  // Van Buren — light rail corridor, transit heavy
  vanburen: {
    uri: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=267&fit=crop',
  },
  // Fillmore — parks and university area
  fillmore: {
    uri: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=267&fit=crop',
  },
  // McKinley — neighborhood area
  mckinley: {
    uri: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=400&h=267&fit=crop',
  },
  // Portland — quiet residential
  portland: {
    uri: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=400&h=267&fit=crop',
  },
  // Roosevelt — arts district, murals, galleries
  roosevelt: {
    uri: 'https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=400&h=267&fit=crop',
  },
};

export function placeImage(id: string): ImageSourcePropType | null {
  // Check landmark-specific image first
  if (LANDMARK_IMAGES[id]) return LANDMARK_IMAGES[id];

  // Fall back to street-level image based on the street prefix
  // IDs look like "vanburen-central", "fillmore-1stave", etc.
  const street = id.split('-')[0];
  if (street && STREET_IMAGES[street]) return STREET_IMAGES[street];

  return null;
}
