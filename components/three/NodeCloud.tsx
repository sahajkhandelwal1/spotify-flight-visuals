"use client";

import { useRef } from "react";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { PositionedTrack } from "@/lib/tsne";

function TrackNode({
  track,
  onHover,
  onSelect,
}: {
  track: PositionedTrack;
  onHover: (t: PositionedTrack | null, x: number, y: number) => void;
  onSelect: (t: PositionedTrack) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const { camera } = useThree();

  useFrame(() => {
    if (!meshRef.current) return;
    const dist = camera.position.distanceTo(meshRef.current.position);
    const pulse = 1 + Math.sin(Date.now() * 0.002 + track.track.id.charCodeAt(0)) * 0.15;
    meshRef.current.scale.setScalar(dist > 30 ? pulse : 1);
  });

  // Fallback to red if clusterColor is somehow missing
  const color = track.clusterColor || "#ff0000";

  return (
    <mesh
      ref={meshRef}
      position={track.position}
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
      <sphereGeometry args={[0.7, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

export function NodeCloud({ tracks, onHover, onSelect }: {
  tracks: PositionedTrack[];
  onHover: (track: PositionedTrack | null, x: number, y: number) => void;
  onSelect: (track: PositionedTrack) => void;
}) {
  if (tracks.length > 0) {
    console.log("[NodeCloud] first track clusterColor:", tracks[0].clusterColor, "position:", tracks[0].position);
  }

  return (
    <>
      {tracks.map((track) => (
        <TrackNode
          key={track.track.id}
          track={track}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
