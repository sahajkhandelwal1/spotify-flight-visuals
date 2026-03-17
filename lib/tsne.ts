import { EnrichedTrack } from "./spotify";
import { normalizeFeatures, getClusterLabel, CLUSTER_COLORS } from "./features";

export interface PositionedTrack extends EnrichedTrack {
  position: [number, number, number];
  normalizedFeatures: number[];
  clusterId: number;
  clusterColor: string;
}

export interface ClusterInfo {
  id: number;
  color: string;
  label: string;
  centroid: [number, number, number];
  featureCentroid: number[];
}

// ─── PCA (replaces t-SNE — instant, no iteration, same quality for this use case) ───

function dot(a: number[], b: number[]): number {
  return a.reduce((s, v, i) => s + v * b[i], 0);
}

function vecScale(v: number[], s: number): number[] {
  return v.map((x) => x * s);
}

function vecSub(a: number[], b: number[]): number[] {
  return a.map((v, i) => v - b[i]);
}

function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

function normalize(v: number[]): number[] {
  const n = norm(v) || 1;
  return v.map((x) => x / n);
}

// Power iteration to find top eigenvector of covariance matrix
function topEigenvector(cov: number[][], iters = 200): number[] {
  const d = cov.length;
  let v: number[] = new Array(d).fill(0).map((_: number, i: number) => (i === 0 ? 1 : 0));
  for (let i = 0; i < iters; i++) {
    const next = new Array(d).fill(0);
    for (let r = 0; r < d; r++)
      for (let c = 0; c < d; c++)
        next[r] += cov[r][c] * v[c];
    v = normalize(next);
  }
  return v;
}

// Deflate covariance matrix by removing contribution of eigenvector
function deflate(cov: number[][], eigenvec: number[]): number[][] {
  const d = cov.length;
  const eigenval = dot(
    eigenvec,
    cov.map((row) => dot(row, eigenvec))
  );
  return cov.map((row, r) =>
    row.map((val, c) => val - eigenval * eigenvec[r] * eigenvec[c])
  );
}

function pca3D(data: number[][]): number[][] {
  const n = data.length;
  const d = data[0].length;

  // Center data
  const mean = new Array(d).fill(0);
  data.forEach((row) => row.forEach((v, i) => (mean[i] += v / n)));
  const centered = data.map((row) => row.map((v, i) => v - mean[i]));

  // Covariance matrix d×d
  const cov: number[][] = Array.from({ length: d }, () => new Array(d).fill(0));
  for (let r = 0; r < d; r++)
    for (let c = 0; c < d; c++)
      centered.forEach((row) => (cov[r][c] += (row[r] * row[c]) / n));

  // Top 3 eigenvectors via power iteration + deflation
  const ev1 = topEigenvector(cov);
  const cov2 = deflate(cov, ev1);
  const ev2 = topEigenvector(cov2);
  const cov3 = deflate(cov2, ev2);
  const ev3 = topEigenvector(cov3);

  // Project each point onto the 3 eigenvectors
  return centered.map((row) => [dot(row, ev1), dot(row, ev2), dot(row, ev3)]);
}

// ─── K-Means ───

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

function kMeans(
  points: number[][],
  k: number,
  maxIter = 100
): { assignments: number[]; centroids: number[][] } {
  const n = points.length;
  const dim = points[0].length;

  // k-means++ init
  const centroids: number[][] = [points[Math.floor(Math.random() * n)]];
  while (centroids.length < k) {
    const dists = points.map((p) =>
      Math.min(...centroids.map((c) => euclidean(p, c))) ** 2
    );
    const total = dists.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let idx = n - 1;
    for (let j = 0; j < n; j++) {
      rand -= dists[j];
      if (rand <= 0) { idx = j; break; }
    }
    centroids.push([...points[idx]]);
  }

  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    const newAssign = points.map((p) => {
      let best = 0, bestDist = Infinity;
      centroids.forEach((c, ci) => {
        const d = euclidean(p, c);
        if (d < bestDist) { bestDist = d; best = ci; }
      });
      return best;
    });

    if (newAssign.every((a, i) => a === assignments[i])) break;
    assignments = newAssign;

    for (let ci = 0; ci < k; ci++) {
      const members = points.filter((_, i) => assignments[i] === ci);
      if (!members.length) continue;
      for (let d = 0; d < dim; d++)
        centroids[ci][d] = members.reduce((s, p) => s + p[d], 0) / members.length;
    }
  }

  return { assignments, centroids };
}

// ─── Main export ───

export async function runTSNEAndCluster(
  tracks: EnrichedTrack[],
  onProgress?: (step: string, pct: number) => void
): Promise<{ positioned: PositionedTrack[]; clusters: ClusterInfo[] }> {
  onProgress?.("Normalizing features…", 72);
  const featureVectors = tracks.map((t) => normalizeFeatures(t.features));

  onProgress?.("Projecting to 3D (PCA)…", 78);
  // Yield once so the UI can paint the progress message before the sync work
  await new Promise<void>((r) => setTimeout(r, 0));

  const coords3D = pca3D(featureVectors);

  onProgress?.("Clustering tracks…", 88);
  await new Promise<void>((r) => setTimeout(r, 0));

  const K = 6;
  const { assignments, centroids } = kMeans(featureVectors, K);

  // Place each cluster at a distinct anchor in 3D space so they're well separated.
  // Tracks are then scattered around their cluster anchor using PCA as a local offset.
  const CLUSTER_ANCHORS: [number, number, number][] = [
    [   0,   0,    0],
    [ 160,  130,  -80],
    [-140,  -120,   70],
    [  40, -160,  150],
    [ -80,  170, -150],
    [ 130, -140,  100],
  ];

  // Normalize PCA coords to [-1, 1] then scale to local spread around anchor
  const localSpread = 55;
  const maxCoord = Math.max(...coords3D.flat().map(Math.abs), 1);

  const positioned: PositionedTrack[] = tracks.map((track, i) => {
    const clusterId = assignments[i];
    const anchor = CLUSTER_ANCHORS[clusterId % CLUSTER_ANCHORS.length];
    const lx = (coords3D[i][0] / maxCoord) * localSpread;
    const ly = (coords3D[i][1] / maxCoord) * localSpread;
    const lz = (coords3D[i][2] / maxCoord) * localSpread;

    // Deterministic per-track jitter so stacked tracks scatter like a nebula.
    // Uses track ID characters as a cheap hash — same result every render.
    const h = track.track.id.split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 1);
    const jitterR = 50 + (h % 55);              // radius 50–104
    const theta = ((h * 2654435761) >>> 0) / 0xffffffff * Math.PI * 2;
    const phi   = ((h * 2246822519) >>> 0) / 0xffffffff * Math.PI;
    const jx = jitterR * Math.sin(phi) * Math.cos(theta);
    const jy = jitterR * Math.sin(phi) * Math.sin(theta);
    const jz = jitterR * Math.cos(phi);

    return {
      ...track,
      position: [anchor[0] + lx + jx, anchor[1] + ly + jy, anchor[2] + lz + jz],
      normalizedFeatures: featureVectors[i],
      clusterId,
      clusterColor: CLUSTER_COLORS[clusterId % CLUSTER_COLORS.length],
    };
  });

  const clusters: ClusterInfo[] = [];
  for (let ci = 0; ci < K; ci++) {
    const members = positioned.filter((t) => t.clusterId === ci);
    if (!members.length) continue;
    clusters.push({
      id: ci,
      color: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
      label: getClusterLabel(centroids[ci]),
      centroid: [
        members.reduce((s, t) => s + t.position[0], 0) / members.length,
        members.reduce((s, t) => s + t.position[1], 0) / members.length,
        members.reduce((s, t) => s + t.position[2], 0) / members.length,
      ],
      featureCentroid: centroids[ci],
    });
  }

  onProgress?.("Ready!", 100);
  return { positioned, clusters };
}
