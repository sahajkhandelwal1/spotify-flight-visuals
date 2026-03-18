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

// Labels for the feature dimension where a cluster scores highest vs. others (high/low).
// Index matches FEATURE_NAMES order: Energy, Valence, Dance, Acoustic, Instrumental, Tempo, Loudness, Speech
const LABEL_HIGH = ["Intense",        "Euphoric",     "Groove",          "Acoustic",   "Ambient",    "Frenetic",    "Hard-Hitting", "Hip-Hop"];
const LABEL_LOW  = ["Mellow",         "Melancholic",  "Introspective",   "Electronic", "Vocal",      "Slow Burn",   "Ethereal",     "Lyrical"];

// Compare all cluster centroids together so each cluster gets a UNIQUE label
// based on its most distinctive feature relative to the global mean.
export function getClusterLabels(centroids: number[][]): string[] {
  const k = centroids.length;
  const d = centroids[0].length;

  // Global mean per feature dimension
  const globalMean = new Array(d).fill(0);
  for (const c of centroids) c.forEach((v, i) => (globalMean[i] += v / k));

  // Generate (cluster, label, score) candidates for every feature × direction
  type Candidate = { ci: number; label: string; score: number };
  const candidates: Candidate[] = [];
  for (let ci = 0; ci < k; ci++) {
    for (let fi = 0; fi < d; fi++) {
      const dev = centroids[ci][fi] - globalMean[fi];
      candidates.push({
        ci,
        label: dev >= 0 ? LABEL_HIGH[fi] : LABEL_LOW[fi],
        score: Math.abs(dev),
      });
    }
  }

  // Greedy assignment: best score first, each cluster and each label used once
  candidates.sort((a, b) => b.score - a.score);
  const labels: string[] = new Array(k).fill("Eclectic");
  const usedClusters = new Set<number>();
  const usedLabels   = new Set<string>();
  for (const { ci, label } of candidates) {
    if (usedClusters.has(ci) || usedLabels.has(label)) continue;
    labels[ci] = label;
    usedClusters.add(ci);
    usedLabels.add(label);
    if (usedClusters.size === k) break;
  }
  return labels;
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
