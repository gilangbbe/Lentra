'use client'

import { Suspense } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { 
  OrbitControls, 
  Environment, 
  Sky,
  ContactShadows
} from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// ============================================
// SCENE CONFIG (from user configuration)
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
  lizardWizard: {
    positionX: -1.4,
    positionY: 0.5,
    positionZ: 5,
    rotationX: 0,
    rotationY: 0.87,
    rotationZ: 0,
    scale: 0.5,
  },
  skullKnight: {
    positionX: 2,
    positionY: -2,
    positionZ: -0.1,
    rotationX: 0,
    rotationY: 0.27,
    rotationZ: 0,
    scale: 0.02,
  },
  camera: {
    positionX: 5,
    positionY: 3,
    positionZ: 15,
    fov: 45,
  },
}

// ============================================
// FLOATING ISLAND (Static, no animation)
// ============================================
function FloatingIslandArena() {
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
        opacity={0.4}
        scale={50}
        blur={2}
        far={20}
      />
    </group>
  )
}

// ============================================
// CHARACTER: LIZARD WIZARD (Static)
// ============================================
function LizardWizard() {
  const gltf = useLoader(GLTFLoader, '/models/lizard_wizard.glb')
  const { lizardWizard } = SCENE_CONFIG

  return (
    <group 
      position={[lizardWizard.positionX, lizardWizard.positionY, lizardWizard.positionZ]}
      rotation={[lizardWizard.rotationX, lizardWizard.rotationY, lizardWizard.rotationZ]}
    >
      <primitive
        object={gltf.scene}
        scale={lizardWizard.scale}
      />
    </group>
  )
}

// ============================================
// CHARACTER: SKULL KNIGHT (Static)
// ============================================
function SkullKnight() {
  const gltf = useLoader(GLTFLoader, '/models/skull_knight.glb')
  const { skullKnight } = SCENE_CONFIG

  return (
    <group 
      position={[skullKnight.positionX, skullKnight.positionY, skullKnight.positionZ]}
      rotation={[skullKnight.rotationX, skullKnight.rotationY, skullKnight.rotationZ]}
    >
      <primitive
        object={gltf.scene}
        scale={skullKnight.scale}
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
// MAIN ARENA SCENE COMPONENT
// ============================================
interface GameArenaSceneProps {
  className?: string
  showCharacters?: boolean
  enableOrbitControls?: boolean
}

export function GameArenaScene({
  className = '',
  showCharacters = true,
  enableOrbitControls = false,
}: GameArenaSceneProps) {
  const { camera } = SCENE_CONFIG

  return (
    <div className={`absolute inset-0 ${className}`}>
      <Canvas
        camera={{ 
          position: [camera.positionX, camera.positionY, camera.positionZ], 
          fov: camera.fov 
        }}
        shadows
        gl={{ 
          antialias: true, 
          alpha: false,
          powerPreference: 'high-performance'
        }}
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

        {/* Stable lighting setup - no flickering */}
        <ambientLight intensity={0.6} />
        
        {/* Main sun light */}
        <directionalLight
          position={[50, 100, 50]}
          intensity={1.2}
          color="#FFFAF0"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={200}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-bias={-0.0001}
        />
        
        {/* Fill light from opposite side */}
        <directionalLight
          position={[-30, 40, -30]}
          intensity={0.3}
          color="#B0E2FF"
        />

        {/* Hemisphere light for natural sky/ground lighting */}
        <hemisphereLight
          args={['#87CEEB', '#8B7355', 0.4]}
        />

        {/* The floating island arena */}
        <Suspense fallback={<LoadingFallback />}>
          <FloatingIslandArena />
        </Suspense>

        {/* Characters */}
        {showCharacters && (
          <Suspense fallback={null}>
            <LizardWizard />
            <SkullKnight />
          </Suspense>
        )}

        {/* Camera control */}
        {enableOrbitControls ? (
          <OrbitControls
            enableZoom={true}
            enablePan={true}
            minDistance={5}
            maxDistance={100}
            target={[0, 0, 0]}
          />
        ) : (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
            target={[0, 0, 0]}
          />
        )}

        {/* Environment for reflections */}
        <Environment preset="dawn" />
      </Canvas>
    </div>
  )
}

// ============================================
// BATTLE READY SCENE (with UI overlay support)
// ============================================
interface BattleArenaProps {
  className?: string
  leftCharacterName?: string
  rightCharacterName?: string
  onReady?: () => void
}

export function BattleArena({
  className = '',
  leftCharacterName = 'Lizard Wizard',
  rightCharacterName = 'Skull Knight',
}: BattleArenaProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 3D Scene */}
      <GameArenaScene showCharacters={true} enableOrbitControls={false} />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gradient for readability */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />
        
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Character name plates */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          {/* Left character */}
          <div className="pointer-events-auto">
            <div className="px-5 py-2.5 bg-sky-500/20 backdrop-blur-md rounded-lg border border-sky-400/30">
              <p className="text-sky-300 text-xs uppercase tracking-wider mb-0.5">Champion</p>
              <h3 className="text-white text-lg font-bold">{leftCharacterName}</h3>
            </div>
          </div>
          
          {/* VS indicator */}
          <div className="text-3xl font-black text-white/30 tracking-widest">VS</div>
          
          {/* Right character */}
          <div className="pointer-events-auto">
            <div className="px-5 py-2.5 bg-amber-500/20 backdrop-blur-md rounded-lg border border-amber-400/30">
              <p className="text-amber-300 text-xs uppercase tracking-wider mb-0.5">Champion</p>
              <h3 className="text-white text-lg font-bold">{rightCharacterName}</h3>
            </div>
          </div>
        </div>
        
        {/* Arena title */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2">
          <div className="text-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-400 via-blue-400 to-sky-400 bg-clip-text text-transparent tracking-wider">
              PROMPT ARENA
            </h2>
            <p className="text-white/50 text-sm mt-0.5">Floating Island Stage</p>
          </div>
        </div>
      </div>
    </div>
  )
}
