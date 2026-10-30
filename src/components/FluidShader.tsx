import React, { useEffect, useRef } from 'react';

export interface FluidShaderPalette {
  bg: [number, number, number];
  c1: [number, number, number];
  c2: [number, number, number];
  c3: [number, number, number];
}

interface FluidShaderProps {
  className?: string;
  /** Base + accent colors as linear 0..1 RGB triples. Defaults to the cream/pastel note palette. */
  palette?: FluidShaderPalette;
  /** 0..1 — how strongly the color clouds read against the base. Default 1. */
  intensity?: number;
  /** Device-pixel-ratio ceiling for the drawing buffer. Default 1.5. */
  dprCap?: number;
  /** u_time value painted for prefers-reduced-motion users. Default 8. */
  staticTime?: number;
}

/** Warm cream palette fitted to the Developers Note section. */
export const NOTE_FLUID_PALETTE: FluidShaderPalette = {
  bg: [0.953, 0.922, 0.867], // #F3EBDD
  c1: [0.929, 0.729, 0.541], // warm peach drift
  c2: [0.725, 0.843, 1.0], // dc-blue drift
  c3: [0.812, 0.769, 0.969], // soft lavender drift
};

const VERTEX_SHADER = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_intensity;
uniform vec3 u_bg;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x),
             mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.;
  float a = .5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= .5; }
  return v;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * u_res) / u_res.y;
  vec2 m = (u_mouse - .5) * 2.;
  m.y *= -1.;
  float t = u_time * .1;
  vec2 q = vec2(fbm(uv * 2.1 + t), fbm(uv * 2.1 + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(uv * 2.1 + 2.7 * q + vec2(1.7, 9.2) + t * .7 + m * .4),
                fbm(uv * 2.1 + 2.7 * q + vec2(8.3, 2.8) - t * .6 - m * .35));
  float f = fbm(uv * 2.1 + 2.9 * r);
  // Cream stays dominant; accents drift in as soft pastel clouds.
  vec3 col = mix(u_bg, u_c1, smoothstep(.35, .82, f) * .55 * u_intensity);
  col = mix(col, u_c2, smoothstep(.48, .95, r.y) * .5 * u_intensity);
  col = mix(col, u_c3, smoothstep(.6, 1., q.x) * .45 * u_intensity);
  float vig = smoothstep(1.25, .3, length(uv));
  col *= mix(.9, 1., vig);
  gl_FragColor = vec4(col, 1.);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * Raw WebGL/GLSL fluid background: layered fractal noise with domain warping,
 * eased pointer reactivity, and an interpolated palette. Pauses off-screen and
 * when the tab is hidden; paints a single static frame for reduced-motion users.
 * Fails silently (canvas hides) when WebGL is unavailable so the section's own
 * background shows through.
 */
export const FluidShader: React.FC<FluidShaderProps> = ({
  className = '',
  palette = NOTE_FLUID_PALETTE,
  intensity = 1,
  dprCap = 1.5,
  staticTime = 8,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) {
      canvas.style.display = 'none';
      return;
    }

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      canvas.style.display = 'none';
      return;
    }
    const program = gl.createProgram();
    if (!program) {
      canvas.style.display = 'none';
      return;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.style.display = 'none';
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const positionLoc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const loc = (name: string) => gl.getUniformLocation(program, name);
    const uRes = loc('u_res');
    const uTime = loc('u_time');
    const uMouse = loc('u_mouse');
    const uIntensity = loc('u_intensity');
    const uBg = loc('u_bg');
    const uC1 = loc('u_c1');
    const uC2 = loc('u_c2');
    const uC3 = loc('u_c3');

    // Current palette eases toward the target each frame, so palette prop
    // changes (e.g. a future theme switch) crossfade inside the shader.
    const current: FluidShaderPalette = {
      bg: [...paletteRef.current.bg] as [number, number, number],
      c1: [...paletteRef.current.c1] as [number, number, number],
      c2: [...paletteRef.current.c2] as [number, number, number],
      c3: [...paletteRef.current.c3] as [number, number, number],
    };
    const easeTriple = (cur: [number, number, number], tgt: [number, number, number], k: number) => {
      cur[0] += (tgt[0] - cur[0]) * k;
      cur[1] += (tgt[1] - cur[1]) * k;
      cur[2] += (tgt[2] - cur[2]) * k;
    };

    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        mouse.tx = 0.5;
        mouse.ty = 0.5;
      } else if (rect.width > 0 && rect.height > 0) {
        mouse.tx = (e.clientX - rect.left) / rect.width;
        mouse.ty = (e.clientY - rect.top) / rect.height;
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    let visible = true;
    let reducedMotion = false;

    const paint = (time: number) => {
      const target = paletteRef.current;
      const k = 0.06;
      easeTriple(current.bg, target.bg, k);
      easeTriple(current.c1, target.c1, k);
      easeTriple(current.c2, target.c2, k);
      easeTriple(current.c3, target.c3, k);
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uIntensity, intensityRef.current);
      gl.uniform3f(uBg, current.bg[0], current.bg[1], current.bg[2]);
      gl.uniform3f(uC1, current.c1[0], current.c1[1], current.c1[2]);
      gl.uniform3f(uC2, current.c2[0], current.c2[1], current.c2[2]);
      gl.uniform3f(uC3, current.c3[0], current.c3[1], current.c3[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        if (reducedMotion) paint(staticTime);
      }
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        visible = entries[0] ? entries[0].isIntersecting : true;
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(canvas);

    let raf = 0;
    let running = false;
    const t0 = performance.now();
    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      paint((now - t0) / 1000);
    };
    const start = () => {
      if (running || reducedMotion) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMotionPreference = () => {
      reducedMotion = mediaQuery.matches;
      if (reducedMotion) {
        stop();
        paint(staticTime);
      } else {
        start();
      }
    };
    mediaQuery.addEventListener('change', applyMotionPreference);
    applyMotionPreference();

    // If the GPU drops the context mid-life (rare), fall back to the
    // section's own background instead of freezing on a dead canvas.
    const onContextLost = (e: Event) => {
      e.preventDefault();
      stop();
      canvas.style.display = 'none';
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    return () => {
      stop();
      mediaQuery.removeEventListener('change', applyMotionPreference);
      window.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      // NOTE: intentionally no loseContext() here. The canvas keeps its
      // WebGL context across unmounts so a remount (StrictMode, HMR,
      // reconciliation) re-initializes on the same live context instead of
      // receiving a lost one from getContext(). The context is reclaimed
      // with the canvas element itself.
    };
    // Palette/intensity flow through refs so the GL program is created once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={canvasRef} className={`pointer-events-none block ${className}`} aria-hidden="true" />;
};

export { hexToRgb };
