"use client";

import { Suspense, useState, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { PositionedTrack, ClusterInfo } from "@/lib/tsne";
import { NodeCloud } from "./NodeCloud";
import { ClusterLabels } from "./ClusterLabels";
import { WarpIntro } from "./WarpIntro";
import { FlyControls } from "./FlyControls";
import { StarField } from "./StarField";
import { CrosshairRaycaster } from "./CrosshairRaycaster";

interface SceneProps {
  tracks: PositionedTrack[];
  clusters: ClusterInfo[];
  onHover: (track: PositionedTrack | null, x: number, y: number) => void;
  onSelect: (track: PositionedTrack) => void;
  skipIntro: boolean;
  pointerLocked: boolean;
}

function SceneInner({
  tracks,
  clusters,
  onHover,
  onSelect,
  skipIntro,
  pointerLocked,
}: SceneProps) {
  const [introComplete, setIntroComplete] = useState(skipIntro);
  const [labelsVisible, setLabelsVisible] = useState(skipIntro);

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
    setTimeout(() => setLabelsVisible(true), 500);
  }, []);

  // Target camera resting position: back and slightly above center
  const targetPosition = useMemo(() => new THREE.Vector3(0, 20, 180), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  return (
    <>
      <StarField />

      {/* Ambient light */}
      <ambientLight intensity={0.1} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#ffffff" distance={300} />

      {/* Cluster-colored point lights */}
      {clusters.slice(0, 3).map((c) => (
        <pointLight
          key={c.id}
          position={c.centroid}
          intensity={0.5}
          color={c.color}
          distance={80}
        />
      ))}

      {/* NodeCloud needs no Suspense — no async resources */}
      <NodeCloud tracks={tracks} onHover={onHover} onSelect={onSelect} />

      {/* ClusterLabels loads a font async — isolated Suspense so it never blocks NodeCloud */}
      <Suspense fallback={null}>
        <ClusterLabels clusters={clusters} visible={labelsVisible} />
      </Suspense>

      <WarpIntro
        targetPosition={targetPosition}
        targetLookAt={targetLookAt}
        onComplete={handleIntroComplete}
        skip={skipIntro}
      />

      <FlyControls enabled={introComplete} />
      <CrosshairRaycaster tracks={tracks} enabled={pointerLocked} onHover={onHover} />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.8}
          luminanceSmoothing={0.3}
          intensity={0.6}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export function Scene({
  tracks,
  clusters,
  onHover,
  onSelect,
  skipIntro,
  pointerLocked,
}: SceneProps) {
  return (
    <Canvas
      camera={{ fov: 75, near: 0.1, far: 2000, position: [0, 20, 180] }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ background: "#020408" }}
    >
      <SceneInner
        tracks={tracks}
        clusters={clusters}
        onHover={onHover}
        onSelect={onSelect}
        skipIntro={skipIntro}
        pointerLocked={pointerLocked}
      />
    </Canvas>
  );
}
