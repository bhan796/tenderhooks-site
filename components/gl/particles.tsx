import * as THREE from "three";
import { useMemo, useState } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import { DofPointsMaterial } from "./shaders/pointMaterial";
import { SimulationMaterial } from "./shaders/simulationMaterial";

export function Particles({ introspect = false }: { introspect?: boolean }) {
  const size = 256;
  const simulationMaterial = useMemo(() => new SimulationMaterial(9.5), []);
  const target = useFBO(size, size, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat, type: THREE.FloatType });

  const dofPointsMaterial = useMemo(() => {
    const m = new DofPointsMaterial();
    m.uniforms.positions.value = target.texture;
    return m;
  }, [target.texture]);

  const [scene] = useState(() => new THREE.Scene());
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0.00001, 1));
  const [positions] = useState(() => new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, 1, 1, 0, -1, 1, 0]));
  const [uvs] = useState(() => new Float32Array([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0]));

  const particles = useMemo(() => {
    const length = size * size;
    const p = new Float32Array(length * 3);
    for (let i = 0; i < length; i++) {
      const i3 = i * 3;
      p[i3] = (i % size) / size;
      p[i3 + 1] = i / size / size;
    }
    return p;
  }, []);

  useFrame((state) => {
    state.gl.setRenderTarget(target);
    state.gl.render(scene, camera);
    state.gl.setRenderTarget(null);

    simulationMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    dofPointsMaterial.uniforms.uPointSize.value = introspect ? 4.8 : 3.0;
  });

  return (
    <>
      {createPortal(
        <mesh material={simulationMaterial}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
          </bufferGeometry>
        </mesh>,
        scene
      )}
      <points material={dofPointsMaterial}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
      </points>
    </>
  );
}
