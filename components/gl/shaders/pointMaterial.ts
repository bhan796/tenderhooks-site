import * as THREE from "three";

export class DofPointsMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: `
        uniform sampler2D positions;
        uniform float uPointSize;
        varying float vFade;
        void main() {
          vec3 pos = texture2D(positions, position.xy).xyz;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          vFade = smoothstep(0.0, 8.0, -mvPosition.z);
          gl_PointSize = max(uPointSize * (1.0 + vFade), 2.0);
        }
      `,
      fragmentShader: `
        uniform float uOpacity;
        void main() {
          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          if (dot(cxy, cxy) > 1.0) discard;
          gl_FragColor = vec4(vec3(1.0, 0.86, 0.24), uOpacity);
        }
      `,
      uniforms: {
        positions: { value: null },
        uPointSize: { value: 3.0 },
        uOpacity: { value: 0.9 },
      },
      transparent: true,
      depthWrite: false,
    });
  }
}
