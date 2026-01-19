'use client'

import { Suspense } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Environment, Sky, ContactShadows } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ============================================
// SCENE CONFIG (user configured values)
// ============================================
const SCENE_CONFIG = {
  island: {
    positionX: 0,
    positionY: -2,
    positionZ: -1.1,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    scale: 100,
  },
  camera: {
    positionX: 5,
    positionY: 3,
    positionZ: 15,
    fov: 45,
  },
}

// ============================================
// FLOATING ISLAND (Static)
// ============================================
function FloatingIsland() {
  const gltf = useLoader(GLTFLoader, '/models/floating_island_stage.glb')
  const { island } = SCENE_CONFIG

  return (
    <group>
      <primitive
        object={gltf.scene}
        scale={island.scale}
        position={[island.positionX, island.positionY, island.positionZ]}
        rotation={[island.rotationX, island.rotationY, island.rotationZ]}
      />
      <ContactShadows
        position={[0, island.positionY + 0.1, 0]}
        opacity={0.3}
        scale={50}
        blur={2}
        far={20}
      />
    </group>
  )
}

// ============================================
// LOADING FALLBACK
// ============================================
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#3B82F6" wireframe />
    </mesh>
  )
}

// ============================================
// FLOATING ISLAND SCENE (Blue Sky Theme)
// ============================================
interface FloatingIslandSceneProps {
  className?: string
  showIsland?: boolean
  intensity?: 'low' | 'medium' | 'high'
}

export function FloatingIslandScene({
  className = '',
  showIsland = true,
}: FloatingIslandSceneProps) {
  const { camera } = SCENE_CONFIG

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ 
          position: [camera.positionX, camera.positionY, camera.positionZ], 
          fov: camera.fov 
        }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Blue sky background */}
        <color attach="background" args={['#87CEEB']} />
        
        {/* Realistic sky */}
        <Sky
          distance={450000}
          sunPosition={[100, 50, 100]}
          inclination={0.5}
          azimuth={0.25}
          rayleigh={0.5}
        />

        {/* Stable lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[50, 100, 50]}
          intensity={1.2}
          color="#FFFAF0"
        />
        <directionalLight
          position={[-30, 40, -30]}
          intensity={0.3}
          color="#B0E2FF"
        />
        <hemisphereLight args={['#87CEEB', '#8B7355', 0.4]} />

        {/* Island */}
        {showIsland && (
          <Suspense fallback={<LoadingFallback />}>
            <FloatingIsland />
          </Suspense>
        )}

        {/* Static camera */}
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
        />

        <Environment preset="dawn" />
      </Canvas>
    </div>
  )
}

// ============================================
// SIMPLE BLUE SKY BACKGROUND (No 3D models)
// ============================================
export function SpaceBackground({ className = '' }: { className?: string }) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
      >
        {/* Blue sky */}
        <color attach="background" args={['#87CEEB']} />
        
        <Sky
          distance={450000}
          sunPosition={[100, 50, 100]}
          inclination={0.5}
          azimuth={0.25}
          rayleigh={0.5}
        />

        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 100, 50]} intensity={1} color="#FFFAF0" />
        <hemisphereLight args={['#87CEEB', '#8B7355', 0.4]} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={false}
        />
      </Canvas>
    </div>
  )
}
