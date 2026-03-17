"use client";

import { useEffect, useState } from "react";
import { fetchAllTopTracksWithFeatures } from "@/lib/spotify";
import { runTSNEAndCluster, PositionedTrack, ClusterInfo } from "@/lib/tsne";

export interface TrackDataState {
  tracks: PositionedTrack[];
  clusters: ClusterInfo[];
  loading: boolean;
  error: string | null;
  progressStep: string;
  progressPct: number;
}

export function useTrackData(token: string | null): TrackDataState {
  const [state, setState] = useState<TrackDataState>({
    tracks: [],
    clusters: [],
    loading: false,
    error: null,
    progressStep: "",
    progressPct: 0,
  });

  useEffect(() => {
    if (!token) return;

    setState((s) => ({ ...s, loading: true, error: null }));

    const run = async () => {
      try {
        const onProgress = (step: string, pct: number) => {
          setState((s) => ({ ...s, progressStep: step, progressPct: pct }));
        };

        console.log("[useTrackData] fetching tracks…");
        const enriched = await fetchAllTopTracksWithFeatures(token, onProgress);
        console.log(`[useTrackData] fetchAllTopTracksWithFeatures resolved with ${enriched.length} tracks`);

        if (enriched.length === 0) {
          throw new Error("No tracks found. Listen to more music on Spotify first!");
        }

        console.log("[useTrackData] running PCA + clustering…");
        const { positioned, clusters } = await runTSNEAndCluster(enriched, onProgress);
        console.log(`[useTrackData] done — ${positioned.length} positioned, ${clusters.length} clusters`);

        setState({
          tracks: positioned,
          clusters,
          loading: false,
          error: null,
          progressStep: "Ready!",
          progressPct: 100,
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    };

    run();
  }, [token]);

  return state;
}
