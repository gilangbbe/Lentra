'use client'

import { Suspense, useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { 
  OrbitControls, 
  Environment, 
  Stars, 
  ContactShadows,
  Sparkles
} from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Group, Mesh, Vector3 } from 'three'
import { SceneConfigurator, type SceneConfig, type ModelConfig, defaultConfig } from './scene-configurator'

// ============================================
// CONFIGURABLE FLOATING ISLAND
// ============================================
function ConfigurableIsland({ config }: { config: ModelConfig }) {
  const gltf = useLoader(GLTFLoader, '/models/floating_island_stage.glb')
  const islandRef = useRef<Group>(null)
  const baseY = config.positionY

  useFrame((state) => {
    if (islandRef.current) {
      // Very subtle floating motion
      islandRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 0.3) * 0.15
    }
  })

  return (
    <group ref={islandRef}>
      <primitive
        object={gltf.scene}
        scale={config.scale}
        position={[config.positionX, config.positionY, config.positionZ]}
        rotation={[config.rotationX, config.rotationY, config.rotationZ]}
      />
      <ContactShadows
        position={[config.positionX, config.positionY + 0.1, config.positionZ]}
        opacity={0.6}
        scale={20}
        blur={2}
        far={10}
      />
    </group>
  )
}

// ============================================
// CONFIGURABLE LIZARD WIZARD
// ============================================
function ConfigurableLizardWizard({ config }: { config: ModelConfig }) {
  const gltf = useLoader(GLTFLoader, '/models/lizard_wizard.glb')
  const characterRef = useRef<Group>(null)
  const baseY = config.positionY

  useFrame((state) => {
    if (characterRef.current) {
      // Idle breathing animation
      const breathe = Math.sin(state.clock.elapsedTime * 2) * 0.02
      characterRef.current.position.y = baseY + breathe
    }
  })

  return (
    <group 
      ref={characterRef} 
      position={[config.positionX, config.positionY, config.positionZ]}
      rotation={[config.rotationX, config.rotationY, config.rotationZ]}
    >
      <primitive
        object={gltf.scene}
        scale={config.scale}
      />
      <Sparkles
        count={20}
        scale={2}
        size={2}
        speed={0.3}
        color="#22D3EE"
        opacity={0.5}
      />
      <pointLight
        position={[0, 1.5, 0]}
        intensity={0.8}
        color="#22D3EE"
        distance={4}
      />
    </group>
  )
}

// ============================================
// CONFIGURABLE SKULL KNIGHT
// ============================================
function ConfigurableSkullKnight({ config }: { config: ModelConfig }) {
  const gltf = useLoader(GLTFLoader, '/models/skull_knight.glb')
  const characterRef = useRef<Group>(null)
  const baseY = config.positionY

  useFrame((state) => {
    if (characterRef.current) {
      // Idle breathing animation
      const breathe = Math.sin(state.clock.elapsedTime * 1.8 + 1) * 0.02
      characterRef.current.position.y = baseY + breathe
    }
  })

  return (
    <group 
      ref={characterRef} 
      position={[config.positionX, config.positionY, config.positionZ]}
      rotation={[config.rotationX, config.rotationY, config.rotationZ]}
    >
      <primitive
        object={gltf.scene}
        scale={config.scale}
      />
      <Sparkles
        count={20}
        scale={2}
        size={2}
        speed={0.3}
        color="#EF4444"
        opacity={0.5}
      />
      <pointLight
        position={[0, 1.5, 0]}
        intensity={0.8}
        color="#EF4444"
        distance={4}
      />
    </group>
  )
}

// ============================================
// FLOATING ROCKS
// ============================================
function FloatingRock({ position, scale, speed }: { position: [number, number, number], scale: number, speed: number }) {
  const rockRef = useRef<Mesh>(null)
  const offset = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame((state) => {
    if (rockRef.current) {
      rockRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed + offset) * 0.5
      rockRef.current.rotation.y += 0.002
      rockRef.current.rotation.x += 0.001
    }
  })

  return (
    <mesh ref={rockRef} position={position} scale={scale}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#4a3f5c"
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  )
}

function FloatingRocks() {
  const rocks = useMemo(() => [
    { position: [-8, -3, -5] as [number, number, number], scale: 0.8, speed: 0.4 },
    { position: [10, -4, -8] as [number, number, number], scale: 1.2, speed: 0.3 },
    { position: [-12, -2, 3] as [number, number, number], scale: 0.5, speed: 0.5 },
    { position: [8, -5, 6] as [number, number, number], scale: 0.7, speed: 0.35 },
    { position: [-6, -6, -10] as [number, number, number], scale: 1.0, speed: 0.45 },
    { position: [12, -3, -3] as [number, number, number], scale: 0.6, speed: 0.38 },
  ], [])

  return (
    <>
      {rocks.map((rock, i) => (
        <FloatingRock key={i} {...rock} />
      ))}
    </>
  )
}

// ============================================
// PARTICLES
// ============================================
function BattleParticles() {
  return (
    <>
      <Sparkles
        count={100}
        scale={15}
        size={3}
        speed={0.2}
        color="#A855F7"
        opacity={0.3}
        position={[0, 2, 0]}
      />
      <Sparkles
        count={50}
        scale={30}
        size={1}
        speed={0.1}
        color="#FBBF24"
        opacity={0.2}
        position={[0, 0, 0]}
      />
    </>
  )
}

// ============================================
// LOADING FALLBACK
// ============================================
function LoadingFallback() {
  const meshRef = useRef<Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8B5CF6" wireframe />
    </mesh>
  )
}

// ============================================
// DYNAMIC CAMERA
// ============================================
function DynamicCamera({ config }: { config: SceneConfig['camera'] }) {
  const { camera } = useThree()

  useFrame(() => {
    camera.position.lerp(
      new Vector3(config.positionX, config.positionY, config.positionZ),
      0.05
    )
    camera.lookAt(0, 0, 0)
  })

  return null
}

// ============================================
// CONFIGURABLE ARENA SCENE
// ============================================
interface ConfigurableArenaSceneProps {
  className?: string
  showCharacters?: boolean
  showConfigurator?: boolean
}

export function ConfigurableArenaScene({
  className = '',
  showCharacters = true,
  showConfigurator = true,
}: ConfigurableArenaSceneProps) {
  const [config, setConfig] = useState<SceneConfig>(defaultConfig)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className={`absolute inset-0 bg-slate-950 ${className}`} />
  }

  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Configurator Panel */}
      {showConfigurator && (
        <SceneConfigurator
          onConfigChange={setConfig}
          initialConfig={config}
        />
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ 
          position: [config.camera.positionX, config.camera.positionY, config.camera.positionZ], 
          fov: config.camera.fov 
        }}
        shadows
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance'
        }}
        style={{ background: 'linear-gradient(to bottom, #0f0a1e 0%, #1a1033 50%, #0d0618 100%)' }}
      >
        <color attach="background" args={['#0a0515']} />
        <fog attach="fog" args={['#0a0515', 20, 80]} />
        
        <Stars
          radius={150}
          depth={100}
          count={5000}
          factor={5}
          saturation={0.5}
          fade
          speed={0.5}
        />

        {/* Lighting */}
        <ambientLight intensity={0.15} />
        <directionalLight
          position={[10, 15, 5]}
          intensity={1.5}
          color="#FFB86C"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight
          position={[-8, 8, -5]}
          intensity={0.4}
          color="#60A5FA"
        />
        <directionalLight
          position={[0, 5, -15]}
          intensity={0.6}
          color="#A855F7"
        />
        <hemisphereLight args={['#4338CA', '#1E1B4B', 0.3]} />

        {/* Floating rocks */}
        <FloatingRocks />

        {/* Particles */}
        <BattleParticles />

        {/* Island */}
        <Suspense fallback={<LoadingFallback />}>
          <ConfigurableIsland config={config.island} />
        </Suspense>

        {/* Characters */}
        {showCharacters && (
          <Suspense fallback={null}>
            <ConfigurableLizardWizard config={config.lizardWizard} />
            <ConfigurableSkullKnight config={config.skullKnight} />
          </Suspense>
        )}

        {/* Camera updates */}
        <DynamicCamera config={config.camera} />

        {/* Orbit controls for manual inspection */}
        <OrbitControls
          enableZoom={true}
          enablePan={true}
          minDistance={5}
          maxDistance={50}
          target={[0, 0, 0]}
        />

        <Environment preset="night" />
      </Canvas>
    </div>
  )
}
