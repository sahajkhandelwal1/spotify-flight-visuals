import { AudioFeatures } from "./spotify";

const safe = (v: number, fallback = 0.5) => (isNaN(v) || v == null ? fallback : v);

// All features are already normalized [0,1] since they're derived from genres
export function normalizeFeatures(f: AudioFeatures): number[] {
  return [
    safe(f.energy),
    safe(f.valence),
    safe(f.danceability),
    safe(f.acousticness),
    safe(f.instrumentalness),
    safe(f.tempo),
    safe(f.loudness),
    safe(f.speechiness),
  ];
}

export const FEATURE_NAMES = [
  "Energy",
  "Valence",
  "Danceability",
  "Acousticness",
  "Instrumentalness",
  "Tempo",
  "Loudness",
  "Speechiness",
];

// Cluster color palette — 6 distinct sci-fi hues
export const CLUSTER_COLORS = [
  "#ff4466", // Dark & Intense — red-pink
  "#44ffcc", // Euphoric — cyan
  "#66ff44", // Chill & Happy — lime
  "#4466ff", // Melancholic — blue
  "#ff9944", // Groove — orange
  "#cc44ff", // Ambient / Acoustic — purple
];

export function getClusterLabel(centroid: number[]): string {
  const [energy, valence, dance, acoustic, instrumental] = centroid;
  if (instrumental > 0.5 && acoustic > 0.4) return "Ambient / Acoustic";
  if (energy > 0.65 && valence > 0.55) return "Euphoric";
  if (energy > 0.65 && valence < 0.45) return "Dark & Intense";
  if (energy < 0.45 && valence > 0.55) return "Chill & Happy";
  if (energy < 0.45 && valence < 0.45) return "Melancholic";
  if (dance > 0.65) return "Groove";
  return "Mixed Vibes";
}

export function getDominantFeatures(normalized: number[]): string[] {
  const labels = FEATURE_NAMES;
  const pairs = normalized.map((v, i) => ({ label: labels[i], value: v }));
  return pairs
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((p) => {
      const pct = p.value;
      if (pct > 0.75) return `Very High ${p.label}`;
      if (pct > 0.55) return `High ${p.label}`;
      if (pct < 0.25) return `Low ${p.label}`;
      return p.label;
    });
}
