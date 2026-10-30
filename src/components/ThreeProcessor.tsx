import React, { useEffect, useRef } from 'react';
import type * as THREE from 'three';

export const ThreeProcessor: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let renderer: any = null;
    let animationFrameId = 0;
    let handleMouseMove: ((e: MouseEvent) => void) | null = null;
    let handleResize: (() => void) | null = null;

    // Load the heavy Three.js runtime only after the page itself has mounted.
    // This keeps Three.js out of the initial JavaScript bundle while preserving
    // the exact existing 3D scene and animation.
    const initializeScene = async () => {
      const THREE = await import('three');
      if (disposed) return;

      const width = container.clientWidth || 500;
      const height = container.clientHeight || 500;

      // Scene
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.z = 10;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
      scene.add(ambientLight);

      const mainLight = new THREE.DirectionalLight(0x4f46e5, 1.8);
      mainLight.position.set(5, 5, 5);
      scene.add(mainLight);

      const purpleLight = new THREE.PointLight(0x8b5cf6, 2.5, 20);
      purpleLight.position.set(-5, 2, 5);
      scene.add(purpleLight);

      const cyanLight = new THREE.PointLight(0x06b6d4, 2, 15);
      cyanLight.position.set(0, -5, 2);
      scene.add(cyanLight);

      // Processor Group
      const chipGroup = new THREE.Group();
      scene.add(chipGroup);

      // Chip Base
      const baseGeo = new THREE.BoxGeometry(2.5, 2.5, 0.2);
      const baseMat = new THREE.MeshPhongMaterial({
        color: 0x15151d,
        shininess: 100,
        specular: 0x4f46e5,
      });
      const chipBase = new THREE.Mesh(baseGeo, baseMat);
      chipGroup.add(chipBase);

      // Chip Core
      const coreGeo = new THREE.BoxGeometry(1.2, 1.2, 0.25);
      const coreMat = new THREE.MeshPhongMaterial({
        color: 0x4f46e5,
        emissive: 0x4f46e5,
        emissiveIntensity: 0.6,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      chipGroup.add(core);

      // Chip Pins
      const pinMat = new THREE.MeshPhongMaterial({ color: 0x39393c });
      for (let i = 0; i < 4; i++) {
        const pinHorizontal = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 0.1), pinMat);
        pinHorizontal.position.y = (i - 1.5) * 0.6;
        chipBase.add(pinHorizontal);

        const pinVertical = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.1), pinMat);
        pinVertical.position.x = (i - 1.5) * 0.6;
        chipBase.add(pinVertical);
      }

      // Orbiting Cubes & Connection Lines
      const orbitGroup = new THREE.Group();
      scene.add(orbitGroup);

      const cubes: { mesh: THREE.Mesh; angle: number; radius: number; speed: number }[] = [];
      const cubeCount = 8;
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.4 });

      for (let i = 0; i < cubeCount; i++) {
        const cubeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const cubeMat = new THREE.MeshPhongMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.8 });
        const cube = new THREE.Mesh(cubeGeo, cubeMat);

        const angle = (i / cubeCount) * Math.PI * 2;
        const radius = 3.5 + Math.random() * 1.5;
        cube.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, (Math.random() - 0.5) * 2);

        orbitGroup.add(cube);
        cubes.push({ mesh: cube, angle, radius, speed: 0.003 + Math.random() * 0.003 });
      }

      const lineGeometry = new THREE.BufferGeometry();
      const linePositions = new Float32Array(cubeCount * 2 * 3);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
      const connections = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(connections);

      // Floating UI Cards
      const cardsGroup = new THREE.Group();
      scene.add(cardsGroup);

      function createCard(w: number, h: number, color: number) {
        const cardGroup = new THREE.Group();
        const geo = new THREE.BoxGeometry(w, h, 0.02);
        const mat = new THREE.MeshPhongMaterial({
          color: 0x15151d,
          transparent: true,
          opacity: 0.9,
          shininess: 50,
        });
        const mesh = new THREE.Mesh(geo, mat);
        cardGroup.add(mesh);

        const lineGeo = new THREE.BoxGeometry(w, 0.05, 0.021);
        const lineMat = new THREE.MeshPhongMaterial({ color });
        const accent = new THREE.Mesh(lineGeo, lineMat);
        accent.position.y = h / 2 - 0.025;
        cardGroup.add(accent);

        return cardGroup;
      }

      const cards = [
        { card: createCard(1.8, 1.2, 0x4f46e5), pos: new THREE.Vector3(-3.2, 2, 1.5), offset: 0 },
        { card: createCard(1.5, 1, 0x06b6d4), pos: new THREE.Vector3(3.2, 2.2, 1), offset: 1.5 },
        { card: createCard(1.6, 1.1, 0x22c55e), pos: new THREE.Vector3(-3.5, -2.2, 2), offset: 3 },
        { card: createCard(1.4, 0.9, 0xf59e0b), pos: new THREE.Vector3(3.5, -1.8, 1.5), offset: 4.5 },
      ];

      cards.forEach((c) => {
        c.card.position.copy(c.pos);
        cardsGroup.add(c.card);
      });

      // Particles
      const partCount = 120;
      const partGeo = new THREE.BufferGeometry();
      const partPos = new Float32Array(partCount * 3);
      for (let i = 0; i < partCount * 3; i++) partPos[i] = (Math.random() - 0.5) * 18;
      partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
      const partMat = new THREE.PointsMaterial({ color: 0x4f46e5, size: 0.06, transparent: true, opacity: 0.6 });
      const particles = new THREE.Points(partGeo, partMat);
      scene.add(particles);

      // Mouse Interaction
      let mouseX = 0;
      let mouseY = 0;

      handleMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        mouseX = (e.clientX - rect.left) / rect.width - 0.5;
        mouseY = (e.clientY - rect.top) / rect.height - 0.5;
      };

      window.addEventListener('mousemove', handleMouseMove);

      // Resize handler
      handleResize = () => {
        if (!container) return;
        const w = container.clientWidth || 500;
        const h = container.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };

      window.addEventListener('resize', handleResize);

      // Animation Loop
      const animate = () => {
        if (disposed) return;
        animationFrameId = requestAnimationFrame(animate);
        const time = Date.now() * 0.001;

        chipGroup.rotation.y += 0.006;
        chipGroup.rotation.z = Math.sin(time * 0.5) * 0.1;
        chipGroup.position.y = Math.sin(time) * 0.15;

        const positions = connections.geometry.attributes.position.array as Float32Array;
        cubes.forEach((c, i) => {
          c.angle += c.speed;
          c.mesh.position.x = Math.cos(c.angle) * c.radius;
          c.mesh.position.y = Math.sin(c.angle) * c.radius;
          c.mesh.rotation.x += 0.02;

          const next = cubes[(i + 1) % cubes.length];
          positions[i * 6] = c.mesh.position.x;
          positions[i * 6 + 1] = c.mesh.position.y;
          positions[i * 6 + 2] = c.mesh.position.z;
          positions[i * 6 + 3] = next.mesh.position.x;
          positions[i * 6 + 4] = next.mesh.position.y;
          positions[i * 6 + 5] = next.mesh.position.z;
        });
        connections.geometry.attributes.position.needsUpdate = true;

        cards.forEach((c) => {
          c.card.position.y = c.pos.y + Math.sin(time * 0.8 + c.offset) * 0.12;
          c.card.rotation.x = mouseY * 0.2;
          c.card.rotation.y = mouseX * 0.2;
        });

        scene.rotation.y += (mouseX * 0.15 - scene.rotation.y) * 0.05;
        scene.rotation.x += (mouseY * 0.15 - scene.rotation.x) * 0.05;

        renderer.render(scene, camera);
      };

      animate();
    };

    void initializeScene();

    return () => {
      disposed = true;
      if (handleMouseMove) window.removeEventListener('mousemove', handleMouseMove);
      if (handleResize) window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (renderer) {
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full min-h-[450px] relative bg-transparent" />;
};
