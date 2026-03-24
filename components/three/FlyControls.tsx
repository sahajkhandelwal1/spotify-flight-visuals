"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface FlyControlsProps {
  enabled: boolean;
  speed?: number;
}

export function FlyControls({ enabled, speed = 30 }: FlyControlsProps) {
  const { camera, gl } = useThree();
  const keysRef = useRef<Set<string>>(new Set());
  const pointerLocked = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  useEffect(() => {
    if (!enabled) return;

    const canvas = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);

      // F toggles fly mode (pointer lock)
      if (e.code === "KeyF") {
        if (pointerLocked.current) {
          document.exitPointerLock();
        } else {
          canvas.requestPointerLock().catch(() => {
            setTimeout(() => canvas.requestPointerLock().catch(() => {}), 800);
          });
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);

    const onMouseMove = (e: MouseEvent) => {
      if (!pointerLocked.current) return;
      const sensitivity = 0.002;
      euler.current.y -= e.movementX * sensitivity;
      euler.current.x -= e.movementY * sensitivity;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };

    const onPointerLockChange = () => {
      pointerLocked.current = document.pointerLockElement === canvas;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);

    euler.current.setFromQuaternion(camera.quaternion, "YXZ");

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    };
  }, [enabled, camera, gl]);

  useFrame((_, delta) => {
    if (!enabled || !pointerLocked.current) return;

    const keys = keysRef.current;
    const moveDir = new THREE.Vector3();

    if (keys.has("KeyW") || keys.has("ArrowUp")) moveDir.z -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) moveDir.z += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) moveDir.x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) moveDir.x += 1;
    if (keys.has("Space")) moveDir.y += 1;

    if (moveDir.length() > 0) {
      moveDir.normalize().applyQuaternion(camera.quaternion);
      const boost = (keys.has("ShiftLeft") || keys.has("ShiftRight")) ? 3 : 1;
      camera.position.addScaledVector(moveDir, speed * boost * delta);
    }
  });

  return null;
}
