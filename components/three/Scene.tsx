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
  playingTrackId?: string | null;
}

function SceneInner({
  tracks,
  clusters,
  onHover,
  onSelect,
  skipIntro,
  pointerLocked,
  playingTrackId,
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

      {/* Cluster-colored point lights — all clusters, boosted for new emissive materials */}
      {clusters.map((c) => (
        <pointLight
          key={c.id}
          position={c.centroid}
          intensity={1.2}
          color={c.color}
          distance={120}
        />
      ))}

      {/* NodeCloud needs no Suspense — no async resources */}
      <NodeCloud tracks={tracks} onHover={onHover} onSelect={onSelect} playingTrackId={playingTrackId} />

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
      <CrosshairRaycaster tracks={tracks} enabled={pointerLocked} onHover={onHover} onSelect={onSelect} />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.4}
          luminanceSmoothing={0.7}
          intensity={0.9}
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
  playingTrackId,
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
        playingTrackId={playingTrackId}
      />
    </Canvas>
  );
}
