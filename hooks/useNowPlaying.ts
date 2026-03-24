"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface NowPlaying {
  trackId: string;
  trackName: string;
  artistName: string;
  albumArt: string | null;
  albumName: string;
  durationMs: number;
  progressMs: number;
  isPlaying: boolean;
  spotifyUrl: string;
}

export function useNowPlaying(token: string | null, pollInterval = 5000) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNowPlaying = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(
        "https://api.spotify.com/v1/me/player/currently-playing",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // 204 = nothing playing
      if (res.status === 204 || !res.ok) {
        setNowPlaying(null);
        return;
      }
      const data = await res.json();
      if (!data.item || data.currently_playing_type !== "track") {
        setNowPlaying(null);
        return;
      }
      setNowPlaying({
        trackId: data.item.id,
        trackName: data.item.name,
        artistName: data.item.artists.map((a: { name: string }) => a.name).join(", "),
        albumArt: data.item.album.images?.[2]?.url || data.item.album.images?.[0]?.url || null,
        albumName: data.item.album.name,
        durationMs: data.item.duration_ms,
        progressMs: data.progress_ms ?? 0,
        isPlaying: data.is_playing,
        spotifyUrl: data.item.external_urls?.spotify ?? "",
      });
    } catch {
      // silently ignore network errors
    }
  }, [token]);

  // Poll the API
  useEffect(() => {
    if (!token) return;
    fetchNowPlaying();
    const id = setInterval(fetchNowPlaying, pollInterval);
    return () => clearInterval(id);
  }, [token, pollInterval, fetchNowPlaying]);

  // Tick progress locally between polls so the bar feels smooth
  useEffect(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    if (!nowPlaying?.isPlaying) return;

    progressTimer.current = setInterval(() => {
      setNowPlaying((prev) => {
        if (!prev || !prev.isPlaying) return prev;
        const next = prev.progressMs + 1000;
        if (next > prev.durationMs) return prev;
        return { ...prev, progressMs: next };
      });
    }, 1000);

    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [nowPlaying?.isPlaying, nowPlaying?.trackId]);

  return nowPlaying;
}
