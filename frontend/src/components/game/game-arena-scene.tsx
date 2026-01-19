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
import { 
  type Character3D, 
  AVAILABLE_CHARACTERS
} from '@/stores/character-assignment-store'

// ============================================
// TYPE DEFINITIONS
// ============================================
export interface SelectedModelWithCharacter {
  modelId: string;
  modelName: string;
  characterId: Character3D;
}

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
interface CharacterProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

function LizardWizard({ position, rotation, scale }: CharacterProps) {
  const gltf = useLoader(GLTFLoader, '/models/lizard_wizard.glb')

  return (
    <group position={position} rotation={rotation}>
      <primitive object={gltf.scene.clone()} scale={scale} />
    </group>
  )
}

// ============================================
// CHARACTER: SKULL KNIGHT (Static)
// ============================================
function SkullKnight({ position, rotation, scale }: CharacterProps) {
  const gltf = useLoader(GLTFLoader, '/models/skull_knight.glb')

  return (
    <group position={position} rotation={rotation}>
      <primitive object={gltf.scene.clone()} scale={scale} />
    </group>
  )
}

// ============================================
// DYNAMIC CHARACTER RENDERER
// ============================================
interface DynamicCharacterProps {
  characterId: Character3D;
  positionIndex: number; // 0 = left, 1 = right
}

// Character positions for battle arena
const CHARACTER_POSITIONS: Array<{
  position: [number, number, number];
  rotation: [number, number, number];
}> = [
  // Left character (faces right)
  { position: [-4, 0.5, 7], rotation: [0, 0.87, 0] },
  // Right character (faces left)
  { position: [7, 0.5, 5], rotation: [0, -0.5, 0] },
]

const DEFAULT_POSITION = CHARACTER_POSITIONS[0]!

function DynamicCharacter({ characterId, positionIndex }: DynamicCharacterProps) {
  const posConfig = CHARACTER_POSITIONS[positionIndex] ?? DEFAULT_POSITION
  
  if (characterId === 'lizard_wizard') {
    return (
      <LizardWizard
        position={posConfig.position}
        rotation={posConfig.rotation}
        scale={0.5}
      />
    )
  }
  
  if (characterId === 'skull_knight') {
    // Skull knight needs different Y position due to model origin
    const adjustedPosition: [number, number, number] = [
      posConfig.position[0],
      posConfig.position[1] - 2.5,
      posConfig.position[2],
    ]
    return (
      <SkullKnight
        position={adjustedPosition}
        rotation={posConfig.rotation}
        scale={0.02}
      />
    )
  }
  
  return null
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
  selectedModels?: SelectedModelWithCharacter[]
}

export function GameArenaScene({
  className = '',
  showCharacters = true,
  enableOrbitControls = false,
  selectedModels = [],
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

        {/* Characters - render based on selected models and their assigned characters */}
        {showCharacters && (
          <Suspense fallback={null}>
            {selectedModels.length > 0 ? (
              // Render user-assigned characters
              selectedModels.slice(0, 2).map((model, index) => (
                <DynamicCharacter
                  key={model.modelId}
                  characterId={model.characterId}
                  positionIndex={index}
                />
              ))
            ) : (
              // Default: show both characters for preview
              <>
                <DynamicCharacter characterId="lizard_wizard" positionIndex={0} />
                <DynamicCharacter characterId="skull_knight" positionIndex={1} />
              </>
            )}
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
// Uses character assignments from the store
// ============================================
interface BattleArenaProps {
  className?: string
  selectedModels?: SelectedModelWithCharacter[]
  onReady?: () => void
}

export function BattleArena({
  className = '',
  selectedModels = [],
}: BattleArenaProps) {
  // Get character names for display
  const getCharacterName = (index: number): string => {
    const model = selectedModels[index]
    if (!model) return index === 0 ? 'Champion 1' : 'Champion 2'
    const charInfo = AVAILABLE_CHARACTERS.find(c => c.id === model.characterId)
    return charInfo?.name || model.modelName
  }

  const getModelName = (index: number): string => {
    const model = selectedModels[index]
    return model?.modelName || (index === 0 ? 'Model 1' : 'Model 2')
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 3D Scene */}
      <GameArenaScene 
        showCharacters={true} 
        enableOrbitControls={false}
        selectedModels={selectedModels}
      />
      
      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gradient for readability */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/30 to-transparent" />
        
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Character name plates */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          {/* Left character */}
          {selectedModels[0] && (
            <div className="pointer-events-auto">
              <div className="px-5 py-2.5 bg-sky-500/20 backdrop-blur-md rounded-lg border border-sky-400/30">
                <p className="text-sky-300 text-xs uppercase tracking-wider mb-0.5">{getCharacterName(0)}</p>
                <h3 className="text-white text-lg font-bold">{getModelName(0)}</h3>
              </div>
            </div>
          )}
          
          {/* VS indicator */}
          {selectedModels.length >= 2 && (
            <div className="text-3xl font-black text-white/30 tracking-widest">VS</div>
          )}
          
          {/* Right character */}
          {selectedModels[1] && (
            <div className="pointer-events-auto">
              <div className="px-5 py-2.5 bg-amber-500/20 backdrop-blur-md rounded-lg border border-amber-400/30">
                <p className="text-amber-300 text-xs uppercase tracking-wider mb-0.5">{getCharacterName(1)}</p>
                <h3 className="text-white text-lg font-bold">{getModelName(1)}</h3>
              </div>
            </div>
          )}
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
