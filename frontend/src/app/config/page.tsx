"use client";

/**
 * 3D Scene Configuration Page
 * 
 * A dedicated page to configure the 3D model positions,
 * rotations, and scales in real-time.
 */

import { ConfigurableArenaScene } from "@/components/game/configurable-arena-scene";

export default function ConfigPage() {
  return (
    <div className="w-full h-screen bg-black">
      <ConfigurableArenaScene 
        showCharacters={true} 
        showConfigurator={true} 
      />
      
      {/* Instructions */}
      <div className="fixed bottom-4 left-4 z-40 max-w-sm p-4 bg-slate-900/90 backdrop-blur-md rounded-lg border border-white/10">
        <h3 className="text-white font-bold mb-2">🎮 Scene Configurator</h3>
        <ul className="text-white/60 text-sm space-y-1">
          <li>• Use the panel on the right to adjust models</li>
          <li>• Drag to orbit the camera manually</li>
          <li>• Scroll to zoom in/out</li>
          <li>• Click &quot;Copy Config&quot; when done</li>
          <li>• Share the config JSON with me</li>
        </ul>
      </div>
    </div>
  );
}
