"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Minimal Spotify Web Playback SDK type declarations
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: {
      Player: new (options: SpotifyPlayerOptions) => SpotifyPlayer;
    };
  }
}

interface SpotifyPlayerOptions {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: "ready", cb: (state: { device_id: string }) => void): void;
  addListener(event: "player_state_changed", cb: (state: SpotifyPlaybackState | null) => void): void;
  addListener(event: string, cb: (state: unknown) => void): void;
  removeListener(event: string): void;
  togglePlay(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: { id: string; name: string };
  };
}

export interface SpotifyPlayerHook {
  isPremium: boolean;
  isReady: boolean;
  isPlaying: boolean;
  currentTrackId: string | null;
  play: (trackId: string) => void;
  toggle: () => void;
}

export function useSpotifyPlayer(token: string | null): SpotifyPlayerHook {
  const playerRef    = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef  = useRef<string | null>(null);
  const tokenRef     = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  const [isPremium, setIsPremium]           = useState(false);
  const [isReady, setIsReady]               = useState(false);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);

  // ── 1. Check premium ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data.product === "premium") setIsPremium(true); })
      .catch(() => {});
  }, [token]);

  // ── 2. Load SDK and initialise player (premium only) ────────────────────
  useEffect(() => {
    if (!isPremium || !token) return;

    const initPlayer = () => {
      const player = new window.Spotify.Player({
        name: "Spotify Flight Visuals",
        getOAuthToken: (cb) => cb(tokenRef.current!),
        volume: 0.7,
      });

      player.addListener("ready", ({ device_id }) => {
        deviceIdRef.current = device_id;
        setIsReady(true);
      });

      player.addListener("player_state_changed", (state) => {
        if (!state) return;
        setIsPlaying(!state.paused);
        setCurrentTrackId(state.track_window.current_track.id);
      });

      player.connect();
      playerRef.current = player;
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
      setIsReady(false);
    };
  }, [isPremium, token]);

  // ── 3. Actions ───────────────────────────────────────────────────────────
  const play = useCallback((trackId: string) => {
    const t = tokenRef.current;
    const deviceId = deviceIdRef.current;
    if (!t || !deviceId) return;
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [`spotify:track:${trackId}`] }),
    }).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    playerRef.current?.togglePlay().catch(() => {});
  }, []);

  return { isPremium, isReady, isPlaying, currentTrackId, play, toggle };
}
