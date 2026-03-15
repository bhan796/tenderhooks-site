import { Canvas } from "@react-three/fiber";
import { Particles } from "./particles";

export const GL = ({ hovering }: { hovering: boolean }) => {
  return (
    <div id="webgl">
      <Canvas camera={{ position: [0, 0, 8], fov: 55, near: 0.1, far: 100 }}>
        <color attach="background" args={["#000"]} />
        <ambientLight intensity={0.25} />
        <Particles introspect={hovering} />
      </Canvas>
    </div>
  );
};
