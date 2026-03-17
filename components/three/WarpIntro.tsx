"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";

interface WarpIntroProps {
  targetPosition: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  onComplete: () => void;
  skip: boolean;
}

export function WarpIntro({
  targetPosition,
  targetLookAt,
  onComplete,
  skip,
}: WarpIntroProps) {
  const { camera } = useThree();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Start position: far back along Z
    camera.position.set(0, 10, 300);
    camera.lookAt(targetLookAt);

    if (skip) {
      camera.position.copy(targetPosition);
      camera.lookAt(targetLookAt);
      onComplete();
      return;
    }

    const dummy = { t: 0 };

    // Phase 1: warp rush (fast)
    gsap.timeline()
      .to(camera.position, {
        x: targetPosition.x * 0.3,
        y: targetPosition.y * 0.3 + 10,
        z: 250,
        duration: 1.2,
        ease: "power2.in",
      })
      // Phase 2: decelerate into position
      .to(camera.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: 1.5,
        ease: "power3.out",
        onUpdate() {
          camera.lookAt(targetLookAt);
        },
        onComplete() {
          onComplete();
        },
      });

    // Animate FOV for zoom-rush effect
    const origFov = (camera as THREE.PerspectiveCamera).fov;
    gsap.to(camera as THREE.PerspectiveCamera, {
      fov: origFov + 30,
      duration: 1.2,
      ease: "power2.in",
      onUpdate() {
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      },
    });
    gsap.to(camera as THREE.PerspectiveCamera, {
      fov: origFov,
      duration: 1.5,
      delay: 1.2,
      ease: "power3.out",
      onUpdate() {
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      },
    });
  }, [camera, targetPosition, targetLookAt, onComplete, skip]);

  return null;
}
