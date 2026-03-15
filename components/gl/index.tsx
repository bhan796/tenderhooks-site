import { Canvas } from "@react-three/fiber";
import { Effects } from "@react-three/drei";
import { useControls } from "leva";
import { Particles } from "./particles";
import { VignetteShader } from "./shaders/vignetteShader";

export const GL = ({ hovering }: { hovering: boolean }) => {
  const { vignetteDarkness, vignetteOffset } = useControls("Particles", {
    vignetteDarkness: { value: 1.4, min: 0, max: 2, step: 0.1 },
    vignetteOffset: { value: 0.35, min: 0, max: 1.5, step: 0.05 },
  });

  return (
    <div id="webgl">
      <Canvas camera={{ position: [1.2, 2.4, -2.0], fov: 50, near: 0.01, far: 300 }}>
        <color attach="background" args={["#000"]} />
        <Particles introspect={hovering} />
        <Effects disableGamma>
          {/* @ts-ignore */}
          <shaderPass args={[VignetteShader]} uniforms-darkness-value={vignetteDarkness} uniforms-offset-value={vignetteOffset} />
        </Effects>
      </Canvas>
    </div>
  );
};
