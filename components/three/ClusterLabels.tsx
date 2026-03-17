"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { ClusterInfo } from "@/lib/tsne";

interface ClusterLabelsProps {
  clusters: ClusterInfo[];
  visible: boolean;
}

function ClusterLabel({
  cluster,
  visible,
}: {
  cluster: ClusterInfo;
  visible: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  useFrame(() => {
    if (!groupRef.current) return;
    const dist = camera.position.distanceTo(
      new THREE.Vector3(...cluster.centroid)
    );

    // Fade out when very close or not visible
    const opacity = !visible ? 0 : dist < 30 ? (dist - 10) / 20 : 1;
    groupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial;
        if (mat && "opacity" in mat) {
          mat.opacity = Math.max(0, Math.min(1, opacity));
        }
      }
    });

    // Always face the camera
    groupRef.current.lookAt(camera.position);
  });

  return (
    <group ref={groupRef} position={cluster.centroid}>
      <Text
        fontSize={3}
        color={cluster.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.1}
        outlineColor="#000000"
        depthOffset={-1}
        position={[0, 2, 0]}
      >
        {cluster.label}
      </Text>
    </group>
  );
}

export function ClusterLabels({ clusters, visible }: ClusterLabelsProps) {
  return (
    <>
      {clusters.map((cluster) => (
        <ClusterLabel key={cluster.id} cluster={cluster} visible={visible} />
      ))}
    </>
  );
}
