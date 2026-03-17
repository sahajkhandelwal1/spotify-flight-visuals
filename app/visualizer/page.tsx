"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
import { useTrackData } from "@/hooks/useTrackData";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { HoverTooltip } from "@/components/ui/HoverTooltip";
import { TrackPanel } from "@/components/ui/TrackPanel";
import { PositionedTrack } from "@/lib/tsne";

// Dynamically import the 3D scene to avoid SSR issues
const Scene = dynamic(
  () => import("@/components/three/Scene").then((m) => m.Scene),
  { ssr: false }
);

function euclidean3D(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export default function VisualizerPage() {
  const router = useRouter();
  const { token, loading: authLoading, logout } = useSpotifyAuth();
  const { tracks, clusters, loading, error, progressStep, progressPct } =
    useTrackData(token);

  const [hoveredTrack, setHoveredTrack] = useState<PositionedTrack | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [pointerLocked, setPointerLocked] = useState(false);

  useEffect(() => {
    const onLockChange = () => setPointerLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => document.removeEventListener("pointerlockchange", onLockChange);
  }, []);
  const [selectedTrack, setSelectedTrack] = useState<PositionedTrack | null>(null);
  const [skipIntro, setSkipIntro] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Redirect to login if no token
  useEffect(() => {
    if (!authLoading && !token) {
      router.replace("/");
    }
  }, [authLoading, token, router]);

  // Hide controls hint after 5s
  useEffect(() => {
    if (!loading && tracks.length > 0) {
      const t = setTimeout(() => setShowControls(false), 6000);
      return () => clearTimeout(t);
    }
  }, [loading, tracks.length]);

  const handleHover = useCallback((track: PositionedTrack | null, x: number, y: number) => {
    setHoveredTrack(track);
    setHoverPos({ x, y });
  }, []);

  const handleSelect = useCallback((track: PositionedTrack) => {
    setSelectedTrack(track);
    setHoveredTrack(null);
  }, []);

  // Find 3 nearest neighbors in t-SNE space
  const similarTracks = useMemo(() => {
    if (!selectedTrack) return [];
    return tracks
      .filter((t) => t.track.id !== selectedTrack.track.id)
      .map((t) => ({
        track: t,
        dist: euclidean3D(t.position, selectedTrack.position),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map((x) => x.track);
  }, [selectedTrack, tracks]);

  if (authLoading) {
    return <LoadingScreen step="Checking auth…" pct={0} />;
  }

  if (loading || tracks.length === 0) {
    return <LoadingScreen step={progressStep || "Starting…"} pct={progressPct} />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="text-[#1DB954] hover:underline"
            >
              Retry
            </button>
            <button
              onClick={() => { logout(); router.replace("/"); }}
              className="text-gray-400 hover:underline"
            >
              Log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* 3D Scene */}
      <div className="w-full h-full">
        <Scene
          tracks={tracks}
          clusters={clusters}
          onHover={handleHover}
          onSelect={handleSelect}
          skipIntro={skipIntro}
          pointerLocked={pointerLocked}
        />
      </div>

      {/* Skip intro button */}
      {!skipIntro && (
        <button
          onClick={() => setSkipIntro(true)}
          className="fixed top-4 right-4 z-30 text-gray-400 hover:text-white text-sm bg-black/40 px-3 py-1.5 rounded-full border border-gray-700 hover:border-gray-500 transition-colors backdrop-blur-sm"
        >
          Skip intro
        </button>
      )}

      {/* Track count + logout */}
      <div className="fixed top-4 left-4 z-30 flex flex-col gap-1">
        <div className="text-gray-500 text-xs bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
          {tracks.length} tracks • {clusters.length} clusters
        </div>
        <button
          onClick={() => { logout(); router.replace("/"); }}
          className="text-gray-600 hover:text-gray-400 text-xs bg-black/40 px-3 py-1.5 rounded-full border border-gray-800 hover:border-gray-700 transition-colors backdrop-blur-sm w-fit"
        >
          Log out
        </button>
      </div>

      {/* Crosshair — shown when pointer is locked for flying */}
      {pointerLocked && (
        <div className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="relative w-6 h-6">
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/60 -translate-y-1/2" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-white/60 -translate-x-1/2" />
            <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-white/80 -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      )}

      {/* Controls hint */}
      {!pointerLocked && showControls && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-black/60 text-gray-400 text-xs px-4 py-2 rounded-full backdrop-blur-sm border border-gray-800 flex gap-3">
          <span>Press <kbd className="bg-gray-700 px-1 rounded">F</kbd> to fly</span>
          <span>·</span>
          <span>Click nodes to inspect</span>
        </div>
      )}
      {pointerLocked && showControls && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-black/60 text-gray-400 text-xs px-4 py-2 rounded-full backdrop-blur-sm border border-gray-800">
          WASD · Space/Shift · Ctrl boost · <kbd className="bg-gray-700 px-1 rounded">F</kbd> to unlock
        </div>
      )}

      {/* Hover tooltip — free cursor OR crosshair aim */}
      {hoveredTrack && !selectedTrack && (
        <HoverTooltip track={hoveredTrack} x={hoverPos.x} y={hoverPos.y} />
      )}

      {/* Track panel */}
      <TrackPanel
        track={selectedTrack}
        similar={similarTracks}
        onClose={() => setSelectedTrack(null)}
        onSelect={handleSelect}
      />
    </div>
  );
}
