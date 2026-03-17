"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { PositionedTrack } from "@/lib/tsne";

interface CrosshairRaycasterProps {
  tracks: PositionedTrack[];
  enabled: boolean;
  onHover: (track: PositionedTrack | null, x: number, y: number) => void;
}

export function CrosshairRaycaster({ tracks, enabled, onHover }: CrosshairRaycasterProps) {
  const { camera, size } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const lastHit = useRef<string | null>(null);

  // Build sphere array once — updated when tracks change
  const spheres = useRef<{ mesh: THREE.Sphere; track: PositionedTrack }[]>([]);
  spheres.current = tracks.map((t) => ({
    mesh: new THREE.Sphere(new THREE.Vector3(...t.position), 0.7),
    track: t,
  }));

  useFrame(() => {
    if (!enabled) return;

    // Raycast from center of screen (where crosshair is)
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
    const ray = raycaster.current.ray;

    let closest: PositionedTrack | null = null;
    let closestDist = Infinity;

    for (const { mesh, track } of spheres.current) {
      const target = new THREE.Vector3();
      if (ray.intersectSphere(mesh, target)) {
        const dist = camera.position.distanceTo(target);
        if (dist < closestDist) {
          closestDist = dist;
          closest = track;
        }
      }
    }

    const hitId = closest?.track.id ?? null;
    if (hitId !== lastHit.current) {
      lastHit.current = hitId;
      onHover(closest, size.width / 2, size.height / 3);
    }
  });

  return null;
}
