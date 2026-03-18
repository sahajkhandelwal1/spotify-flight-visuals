"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { PositionedTrack } from "@/lib/tsne";

// ---------------------------------------------------------------------------
// Shared radial glow texture — soft white disk fading to transparent.
// Created once on the GPU, reused by every sprite instance.
// ---------------------------------------------------------------------------
let _glowTex: THREE.Texture | null = null;
function getGlowTexture(): THREE.Texture {
  if (_glowTex) return _glowTex;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0,    "rgba(255,255,255,1)");
  g.addColorStop(0.12, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,255,255,0.35)");
  g.addColorStop(0.65, "rgba(255,255,255,0.07)");
  g.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glowTex = new THREE.CanvasTexture(canvas);
  return _glowTex;
}

// ---------------------------------------------------------------------------
// Single track node: core sphere + diffuse shell + billboard halo sprite
// ---------------------------------------------------------------------------
function TrackNode({
  track,
  onHover,
  onSelect,
  isNowPlaying,
}: {
  track: PositionedTrack;
  onHover: (t: PositionedTrack | null, x: number, y: number) => void;
  onSelect: (t: PositionedTrack) => void;
  isNowPlaying: boolean;
}) {
  const coreRef       = useRef<THREE.Mesh>(null!);
  const shellRef      = useRef<THREE.Mesh>(null!);
  const haloRef       = useRef<THREE.Sprite>(null!);
  const nowPlayingRef = useRef<THREE.Sprite>(null!);
  const { camera } = useThree();

  const color = track.clusterColor || "#ff4444";
  const glowTex = getGlowTexture();

  // Unique phase offset per track so every star breathes at its own rhythm
  const phase = useMemo(() => {
    let h = 0;
    for (let i = 0; i < track.track.id.length; i++) h += track.track.id.charCodeAt(i) * (i + 1);
    return (h % 628) / 100; // 0 – 2π range
  }, [track.track.id]);

  useFrame(({ clock, camera: cam }) => {
    const t = clock.getElapsedTime();

    // Organic "breathing" pulse — unique phase makes every star independent
    const pulse = 1 + Math.sin(t * 1.6 + phase) * 0.13;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(pulse);
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.8 + Math.sin(t * 2.1 + phase) * 0.4;
      mat.color.set(isNowPlaying ? "#ffffff" : color);
      mat.emissive.set(isNowPlaying ? "#ffffff" : color);
    }

    if (shellRef.current) {
      shellRef.current.scale.setScalar(pulse * 1.1);
      const mat = shellRef.current.material as THREE.MeshStandardMaterial;
      mat.opacity = 0.10 + Math.sin(t * 1.4 + phase) * 0.03;
      mat.color.set(isNowPlaying ? "#ffffff" : color);
      mat.emissive.set(isNowPlaying ? "#ffffff" : color);
    }

    if (haloRef.current) {
      const dist = cam.position.distanceTo(haloRef.current.position);
      const distFactor = THREE.MathUtils.clamp(dist / 80, 0.6, 2.2);
      haloRef.current.scale.setScalar(pulse * 4.2 * distFactor);
      (haloRef.current.material as THREE.SpriteMaterial).color.set(isNowPlaying ? "#ffffff" : color);
    }

    if (nowPlayingRef.current && isNowPlaying) {
      const nowPulse = 1 + Math.sin(t * 3.5) * 0.25;
      const dist = cam.position.distanceTo(nowPlayingRef.current.position);
      const distFactor = THREE.MathUtils.clamp(dist / 80, 0.6, 2.2);
      nowPlayingRef.current.scale.setScalar(nowPulse * 6.5 * distFactor);
      const mat = nowPlayingRef.current.material as THREE.SpriteMaterial;
      mat.opacity = 0.55 + Math.sin(t * 3.5) * 0.2;
    }
  });

  return (
    <group position={track.position}>
      {/* ── Now-playing pulse: white glow, faster pulse, larger scale ───── */}
      {isNowPlaying && (
        <sprite ref={nowPlayingRef} scale={[6.5, 6.5, 6.5]}>
          <spriteMaterial
            map={glowTex}
            color="#ffffff"
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      )}

      {/* ── Billboard halo: radial glow sprite, additive blending ───────── */}
      <sprite ref={haloRef} scale={[2.4, 2.4, 2.4]}>
        <spriteMaterial
          map={glowTex}
          color={color}
          transparent
          opacity={0.38}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* ── Diffuse shell: translucent outer sphere, feeds bloom softly ─── */}
      <mesh ref={shellRef}>
        <sphereGeometry args={[0.52, 10, 10]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.25}
          transparent
          opacity={0.08}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* ── Core: small bright sphere — primary bloom source ────────────── */}
      <mesh
        ref={coreRef}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(track, e.clientX, e.clientY);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "default";
          onHover(null, 0, 0);
        }}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          onHover(track, e.clientX, e.clientY);
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(track);
        }}
      >
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2.0}
          roughness={0.15}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// NodeCloud: renders all track nodes
// ---------------------------------------------------------------------------
export function NodeCloud({
  tracks,
  onHover,
  onSelect,
  playingTrackId,
}: {
  tracks: PositionedTrack[];
  onHover: (track: PositionedTrack | null, x: number, y: number) => void;
  onSelect: (track: PositionedTrack) => void;
  playingTrackId?: string | null;
}) {
  return (
    <>
      {tracks.map((track) => (
        <TrackNode
          key={track.track.id}
          track={track}
          onHover={onHover}
          onSelect={onSelect}
          isNowPlaying={track.track.id === playingTrackId}
        />
      ))}
    </>
  );
}
