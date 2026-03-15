import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export function Particles({ introspect = false }: { introspect?: boolean }) {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 1800;

  const { positions, base } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const b = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * 14;
      const y = (Math.random() - 0.5) * 8;
      const z = (Math.random() - 0.5) * 14;
      p[i3] = x; p[i3 + 1] = y; p[i3 + 2] = z;
      b[i3] = x; b[i3 + 1] = y; b[i3 + 2] = z;
    }
    return { positions: p, base: b };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const arr = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const bx = base[i3];
      const by = base[i3 + 1];
      const bz = base[i3 + 2];

      arr[i3] = bx + Math.sin(t * 0.6 + bx * 0.35) * 0.22;
      arr[i3 + 1] = by + Math.cos(t * 0.8 + bz * 0.4) * 0.24;
      arr[i3 + 2] = bz + Math.sin(t * 0.5 + by * 0.5) * 0.2;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    (pointsRef.current.material as THREE.PointsMaterial).size = introspect ? 0.07 : 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffc700" size={0.05} sizeAttenuation transparent opacity={0.8} depthWrite={false} />
    </points>
  );
}
