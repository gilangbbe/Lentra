'use client'

import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Environment, Float, Stars } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Group, Points } from 'three'

function FloatingIsland() {
  const gltf = useLoader(GLTFLoader, '/models/floating_island_stage.glb')
  const meshRef = useRef<Group>(null)

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2
      // Slow rotation
      meshRef.current.rotation.y += 0.001
    }
  })

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.5}>
      <primitive
        ref={meshRef}
        object={gltf.scene}
        scale={2}
        position={[0, -1, 0]}
      />
    </Float>
  )
}

function ParticleField() {
  const particlesRef = useRef<Points>(null)
  const count = 200

  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20

    // Random colors between purple and cyan
    colors[i * 3] = 0.5 + Math.random() * 0.5
    colors[i * 3 + 1] = 0.2 + Math.random() * 0.3
    colors[i * 3 + 2] = 0.8 + Math.random() * 0.2
  }

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.02
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.01
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8B5CF6" wireframe />
    </mesh>
  )
}

interface FloatingIslandSceneProps {
  className?: string
  showIsland?: boolean
  intensity?: 'low' | 'medium' | 'high'
}

export function FloatingIslandScene({
  className = '',
  showIsland = true,
  intensity = 'medium',
}: FloatingIslandSceneProps) {
  const starCount = intensity === 'high' ? 5000 : intensity === 'medium' ? 2500 : 1000

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 2, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#8B5CF6" />
        <pointLight position={[5, -5, 5]} intensity={0.5} color="#06B6D4" />

        {/* Stars background */}
        <Stars
          radius={100}
          depth={50}
          count={starCount}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />

        {/* Floating particles */}
        <ParticleField />

        {/* The floating island */}
        {showIsland && (
          <Suspense fallback={<LoadingFallback />}>
            <FloatingIsland />
          </Suspense>
        )}

        {/* Subtle orbit controls for interactivity */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 2}
          minPolarAngle={Math.PI / 4}
          autoRotate
          autoRotateSpeed={0.3}
        />

        {/* Environment for reflections */}
        <Environment preset="night" />

        {/* Fog for atmosphere */}
        <fog attach="fog" args={['#0a0a1f', 5, 30]} />
      </Canvas>
    </div>
  )
}

// Lightweight version without the island (just particles and stars)
export function SpaceBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.2} />
        <Stars
          radius={100}
          depth={50}
          count={3000}
          factor={4}
          saturation={0}
          fade
          speed={0.5}
        />
        <ParticleField />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
          autoRotate
          autoRotateSpeed={0.1}
        />
      </Canvas>
    </div>
  )
}
