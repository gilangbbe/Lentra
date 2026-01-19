'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, Copy, X, RotateCcw } from 'lucide-react'

interface ModelConfig {
  positionX: number
  positionY: number
  positionZ: number
  rotationX: number
  rotationY: number
  rotationZ: number
  scale: number
}

interface SceneConfig {
  island: ModelConfig
  lizardWizard: ModelConfig
  skullKnight: ModelConfig
  camera: {
    positionX: number
    positionY: number
    positionZ: number
    fov: number
  }
}

const defaultConfig: SceneConfig = {
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
    positionY: -1.7,
    positionZ: 5,
    rotationX: 0,
    rotationY: 0.87,
    rotationZ: 0,
    scale: 0.5,
  },
  skullKnight: {
    positionX: 2,
    positionY: -4.3,
    positionZ: -0.1,
    rotationX: 0,
    rotationY: 0.27,
    rotationZ: 0,
    scale: 0.02,
  },
  camera: {
    positionX: 8,
    positionY: -1,
    positionZ: 15,
    fov: 45,
  },
}

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
}

function Slider({ label, value, onChange, min, max, step }: SliderProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-white/60 w-8">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
      />
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        className="w-16 px-1 py-0.5 text-xs bg-white/10 border border-white/20 rounded text-white text-center"
      />
    </div>
  )
}

interface ModelConfigPanelProps {
  title: string
  config: ModelConfig
  onChange: (config: ModelConfig) => void
  color: string
}

function ModelConfigPanel({ title, config, onChange, color }: ModelConfigPanelProps) {
  const update = (key: keyof ModelConfig, value: number) => {
    onChange({ ...config, [key]: value })
  }

  return (
    <div className="border-l-2 pl-3 mb-4" style={{ borderColor: color }}>
      <h4 className="text-sm font-medium text-white mb-2">{title}</h4>
      <div className="space-y-1.5">
        <Slider label="X" value={config.positionX} onChange={(v) => update('positionX', v)} min={-20} max={20} step={0.1} />
        <Slider label="Y" value={config.positionY} onChange={(v) => update('positionY', v)} min={-20} max={20} step={0.1} />
        <Slider label="Z" value={config.positionZ} onChange={(v) => update('positionZ', v)} min={-20} max={20} step={0.1} />
        <div className="border-t border-white/10 my-2" />
        <Slider label="RX" value={config.rotationX} onChange={(v) => update('rotationX', v)} min={-3.14} max={3.14} step={0.01} />
        <Slider label="RY" value={config.rotationY} onChange={(v) => update('rotationY', v)} min={-3.14} max={3.14} step={0.01} />
        <Slider label="RZ" value={config.rotationZ} onChange={(v) => update('rotationZ', v)} min={-3.14} max={3.14} step={0.01} />
        <div className="border-t border-white/10 my-2" />
        <Slider label="S" value={config.scale} onChange={(v) => update('scale', v)} min={0.1} max={10} step={0.1} />
      </div>
    </div>
  )
}

interface SceneConfiguratorProps {
  onConfigChange: (config: SceneConfig) => void
  initialConfig?: SceneConfig
}

export function SceneConfigurator({ onConfigChange, initialConfig }: SceneConfiguratorProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [config, setConfig] = useState<SceneConfig>(initialConfig || defaultConfig)
  const [activeTab, setActiveTab] = useState<'island' | 'lizardWizard' | 'skullKnight' | 'camera'>('island')

  const updateConfig = (newConfig: SceneConfig) => {
    setConfig(newConfig)
    onConfigChange(newConfig)
  }

  const copyConfig = () => {
    const output = JSON.stringify(config, null, 2)
    navigator.clipboard.writeText(output)
    alert('Config copied to clipboard!')
  }

  const resetConfig = () => {
    setConfig(defaultConfig)
    onConfigChange(defaultConfig)
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 p-3 bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg transition-colors"
      >
        <Settings className="w-5 h-5 text-white" />
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-4 right-4 z-50 w-80 max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4" />
          3D Scene Configurator
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={resetConfig}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4 text-white/60" />
          </button>
          <button
            onClick={copyConfig}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
            title="Copy config"
          >
            <Copy className="w-4 h-4 text-white/60" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {[
          { key: 'island', label: '🏝️ Island', color: '#A855F7' },
          { key: 'lizardWizard', label: '🦎 Wizard', color: '#22D3EE' },
          { key: 'skullKnight', label: '💀 Knight', color: '#EF4444' },
          { key: 'camera', label: '📷 Cam', color: '#FBBF24' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-white bg-white/10 border-b-2'
                : 'text-white/50 hover:text-white/80'
            }`}
            style={{ borderColor: activeTab === tab.key ? tab.color : 'transparent' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3">
        {activeTab === 'island' && (
          <ModelConfigPanel
            title="Floating Island"
            config={config.island}
            onChange={(c) => updateConfig({ ...config, island: c })}
            color="#A855F7"
          />
        )}

        {activeTab === 'lizardWizard' && (
          <ModelConfigPanel
            title="Lizard Wizard"
            config={config.lizardWizard}
            onChange={(c) => updateConfig({ ...config, lizardWizard: c })}
            color="#22D3EE"
          />
        )}

        {activeTab === 'skullKnight' && (
          <ModelConfigPanel
            title="Skull Knight"
            config={config.skullKnight}
            onChange={(c) => updateConfig({ ...config, skullKnight: c })}
            color="#EF4444"
          />
        )}

        {activeTab === 'camera' && (
          <div className="border-l-2 border-yellow-500 pl-3">
            <h4 className="text-sm font-medium text-white mb-2">Camera</h4>
            <div className="space-y-1.5">
              <Slider
                label="X"
                value={config.camera.positionX}
                onChange={(v) => updateConfig({ ...config, camera: { ...config.camera, positionX: v } })}
                min={-30}
                max={30}
                step={0.5}
              />
              <Slider
                label="Y"
                value={config.camera.positionY}
                onChange={(v) => updateConfig({ ...config, camera: { ...config.camera, positionY: v } })}
                min={-30}
                max={30}
                step={0.5}
              />
              <Slider
                label="Z"
                value={config.camera.positionZ}
                onChange={(v) => updateConfig({ ...config, camera: { ...config.camera, positionZ: v } })}
                min={-30}
                max={30}
                step={0.5}
              />
              <div className="border-t border-white/10 my-2" />
              <Slider
                label="FOV"
                value={config.camera.fov}
                onChange={(v) => updateConfig({ ...config, camera: { ...config.camera, fov: v } })}
                min={20}
                max={120}
                step={1}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <p className="text-xs text-white/40 mb-2">
          Adjust values and copy config when done.
        </p>
        <button
          onClick={copyConfig}
          className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium text-white transition-colors"
        >
          📋 Copy Config to Clipboard
        </button>
      </div>
    </motion.div>
  )
}

export type { SceneConfig, ModelConfig }
export { defaultConfig }
