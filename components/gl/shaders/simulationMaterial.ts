import * as THREE from "three";
import { periodicNoiseGLSL } from "./utils";

function getPlane(count: number, components: number, size = 256, scale = 1) {
  const data = new Float32Array(count * components);
  for (let i = 0; i < count; i++) {
    const i4 = i * components;
    const x = (i % size) / (size - 1);
    const z = Math.floor(i / size) / (size - 1);
    data[i4 + 0] = (x - 0.5) * 2 * scale;
    data[i4 + 1] = 0;
    data[i4 + 2] = (z - 0.5) * 2 * scale;
    data[i4 + 3] = 1;
  }
  return data;
}

export class SimulationMaterial extends THREE.ShaderMaterial {
  constructor(scale = 9) {
    const size = 256;
    const positionsTexture = new THREE.DataTexture(getPlane(size * size, 4, size, scale), size, size, THREE.RGBAFormat, THREE.FloatType);
    positionsTexture.needsUpdate = true;

    super({
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        uniform sampler2D positions;
        uniform float uTime;
        uniform float uNoiseScale;
        uniform float uNoiseIntensity;
        varying vec2 vUv;
        ${periodicNoiseGLSL}
        void main() {
          vec3 originalPos = texture2D(positions, vUv).rgb;
          float t = uTime * 0.4;
          float nx = periodicNoise(originalPos * uNoiseScale, t);
          float ny = periodicNoise(originalPos * uNoiseScale + vec3(20.0), t + 2.0);
          float nz = periodicNoise(originalPos * uNoiseScale + vec3(40.0), t + 4.0);
          vec3 finalPos = originalPos + vec3(nx, ny, nz) * uNoiseIntensity;
          gl_FragColor = vec4(finalPos, 1.0);
        }
      `,
      uniforms: {
        positions: { value: positionsTexture },
        uTime: { value: 0 },
        uNoiseScale: { value: 0.7 },
        uNoiseIntensity: { value: 0.5 },
      },
    });
  }
}
