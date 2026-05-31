import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { cn } from '../../lib/utils';

export function StripeThreeJSGalaxy({ className }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // SCENE, CAMERA, RENDERER
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    camera.position.y = 1.5;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // PARTICLES / GALAXY
    const particleCount = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x38bdf8); // sky-400
    const color2 = new THREE.Color(0x8b5cf6); // violet-500
    const color3 = new THREE.Color(0xffffff); // white stars

    for (let i = 0; i < particleCount; i++) {
      // Distribución en espiral para formar una galaxia
      const radius = Math.random() * 8 + 0.1;
      const angle = Math.random() * Math.PI * 2;
      const spiralAngle = angle + radius * 1.2;
      
      const x = Math.cos(spiralAngle) * radius;
      const z = Math.sin(spiralAngle) * radius;
      const y = (Math.random() - 0.5) * 0.6 * (10 - radius);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color intermedio y algunas estrellas blancas
      let mixedColor;
      const rand = Math.random();
      if (rand > 0.95) {
        mixedColor = color3;
      } else {
        mixedColor = color1.clone().lerp(color2, Math.random());
      }

      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // MATERIAL CON TEXTURA REDONDA
    // Create a circular particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      map: texture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // MOUSE PARALLAX
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.001;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.001;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // RESIZE
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // ANIMATION LOOP
    const clock = new THREE.Clock();
    let animationFrameId;

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();

      // Rotación suave de la galaxia
      points.rotation.y = elapsedTime * 0.08;
      
      // Suavizado del ratón (Parallax)
      targetX = mouseX * 3;
      targetY = mouseY * 3;
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (-targetY - camera.position.y + 1.5) * 0.05; // +1.5 base height
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className={cn("pointer-events-none absolute inset-0 z-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.15),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.1),transparent_60%)]" />
      <div 
        ref={mountRef} 
        className="absolute inset-0 opacity-80 mix-blend-multiply dark:mix-blend-screen"
        style={{ transform: 'scale(1.2)' }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background" />
      <div className="absolute inset-0 bg-[mask-image:radial-gradient(ellipse_at_center,transparent_20%,black_100%)] bg-background/50" />
    </div>
  );
}
