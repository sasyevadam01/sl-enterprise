import { useRef, useEffect } from 'react';
import * as THREE from 'three';

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
  uniform float time;
  uniform vec2 resolution;
  uniform float glitchAmount;
  uniform float flickerAmount;
  uniform float scanlineIntensity;
  uniform float noiseAmp;
  uniform float brightness;
  uniform vec3 tint;
  uniform vec2 mouse;
  uniform float mouseStrength;
  uniform float scale;
  uniform vec2 gridMul;
  uniform float digitSize;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float character(vec2 p, float n) {
    p = floor(p * digitSize);
    if (clamp(p.x, 0., 2.) != p.x || clamp(p.y, 0., 4.) != p.y) return 0.;
    float v = mod(floor(n / pow(2., p.x + p.y * 3.)), 2.);
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * scale + 0.5;
    
    // Glitch effect
    float g = step(1.0 - glitchAmount * 0.1, hash(vec2(time * 10.0, floor(p.y * 20.0))));
    p.x += g * (hash(vec2(time, p.y)) - 0.5) * 0.1;

    // Grid coordinates
    vec2 gridP = p * resolution.xy * 0.1 * gridMul;
    vec2 ip = floor(gridP);
    vec2 fp = fract(gridP);

    // Random characters
    float charSeed = hash(ip + floor(time * 5.0));
    float charNum = floor(charSeed * 1000.0);
    float char = character(fp * 1.5 - 0.25, charNum);

    // Mouse interaction
    float d = length(uv - mouse);
    char *= 1.0 + mouseStrength * exp(-d * 10.0);

    // Scanlines
    float scanline = sin(p.y * resolution.y * 1.5) * scanlineIntensity;
    
    // Noise and flicker
    float n = (hash(p + time) - 0.5) * noiseAmp;
    float flicker = 1.0 - (hash(vec2(time)) * flickerAmount * 0.2);

    vec3 color = tint * char * flicker * brightness;
    color -= scanline * 0.1;
    color += n * 0.1;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const FaultyTerminal = ({
    scale = 1.5,
    gridMul = [2, 1],
    digitSize = 1.2,
    timeScale = 0.5,
    pause = false,
    scanlineIntensity = 0.5,
    glitchAmount = 1.0,
    flickerAmount = 1.0,
    noiseAmp = 1.0,
    chromaticAberration = 0.0,
    dither = 0.0,
    curvature = 0.1,
    tint = "#A7EF9E",
    mouseReact = true,
    mouseStrength = 0.5,
    pageLoadAnimation = true,
    brightness = 0.6,
}) => {
    const containerRef = useRef();
    const mouseRef = useRef([0.5, 0.5]);

    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        const updateSize = () => {
            if (containerRef.current) {
                const { width, height } = containerRef.current.getBoundingClientRect();
                renderer.setSize(width, height);
                uniforms.resolution.value.set(width, height);
            }
        };

        const uniforms = {
            time: { value: 0 },
            resolution: { value: new THREE.Vector2() },
            glitchAmount: { value: glitchAmount },
            flickerAmount: { value: flickerAmount },
            scanlineIntensity: { value: scanlineIntensity },
            noiseAmp: { value: noiseAmp },
            brightness: { value: brightness },
            tint: { value: new THREE.Color(tint) },
            mouse: { value: new THREE.Vector2(0.5, 0.5) },
            mouseStrength: { value: mouseStrength },
            scale: { value: scale },
            gridMul: { value: new THREE.Vector2(gridMul[0], gridMul[1]) },
            digitSize: { value: digitSize * 10 },
        };

        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            uniforms,
            vertexShader: VERTEX_SHADER,
            fragmentShader: FRAGMENT_SHADER,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        containerRef.current.appendChild(renderer.domElement);
        updateSize();
        window.addEventListener('resize', updateSize);

        const handleMouseMove = (e) => {
            if (!mouseReact || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            mouseRef.current = [
                (e.clientX - rect.left) / rect.width,
                1 - (e.clientY - rect.top) / rect.height
            ];
        };

        if (mouseReact) {
            window.addEventListener('mousemove', handleMouseMove);
        }

        let frame;
        const animate = (t) => {
            if (!pause) {
                uniforms.time.value = t * 0.001 * timeScale;
            }
            uniforms.mouse.value.set(mouseRef.current[0], mouseRef.current[1]);
            renderer.render(scene, camera);
            frame = requestAnimationFrame(animate);
        };

        animate(0);

        return () => {
            window.removeEventListener('resize', updateSize);
            window.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(frame);
            renderer.dispose();
            if (containerRef.current && renderer.domElement) {
                // Check if child still exists before removing
                if (containerRef.current.contains(renderer.domElement)) {
                    containerRef.current.removeChild(renderer.domElement);
                }
            }
        };
    }, [scale, gridMul, digitSize, timeScale, pause, scanlineIntensity, glitchAmount, flickerAmount, noiseAmp, tint, mouseReact, mouseStrength, brightness]);

    return <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />;
};

export default FaultyTerminal;
