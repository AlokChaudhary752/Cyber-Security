import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedSphere = () => {
  const sphereRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    sphereRef.current.rotation.x = t * 0.1;
    sphereRef.current.rotation.y = t * 0.15;
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={1}>
      <Sphere ref={sphereRef} args={[1, 64, 64]} scale={2.2}>
        <MeshDistortMaterial
          color="#06b6d4"
          speed={2}
          distort={0.3}
          radius={1}
          wireframe
          transparent
          opacity={0.4}
        />
      </Sphere>
    </Float>
  );
};

const CyberScene = () => {
  return (
    <div className="absolute inset-0 -z-10 w-full h-full overflow-hidden pointer-events-none">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3b82f6" />
        <AnimatedSphere />
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
    </div>
  );
};

export default CyberScene;
