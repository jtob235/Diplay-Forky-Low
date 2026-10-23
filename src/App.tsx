/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  Activity, 
  FileCode, 
  BookOpen, 
  Download, 
  Volume2, 
  ShieldCheck, 
  Car, 
  Play, 
  Pause, 
  Sliders,
  ExternalLink,
  Layers,
  Sparkles,
  Smartphone,
  Users
} from 'lucide-react';

import { AudioEngineConfig, AudioEngineMetrics, VehicleProfile } from './types/carplay';
import { VEHICLE_PROFILES } from './data/patchData';
import { DiPlayAudioEngine } from './services/audioEngine';
import { CarPlayDisplay } from './components/CarPlayDisplay';
import { AudioStressLab } from './components/AudioStressLab';
import { CodePatchViewer } from './components/CodePatchViewer';
import { InstallationGuide } from './components/InstallationGuide';
import { ExportModal } from './components/ExportModal';
import { PhoneSelectionModal } from './components/PhoneSelectionModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'carplay' | 'lab' | 'code' | 'guide'>('carplay');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleProfile>(VEHICLE_PROFILES[0]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Audio Engine Configuration
  const [config, setConfig] = useState<AudioEngineConfig>({
    pipelineMode: 'patched', // Default to patched fork!
    targetSampleRate: 48000,
    sourceSampleRate: 44100,
    jitterBufferSizeMs: 90,
    adaptiveJitterEnabled: true,
    packetLossConcealment: true,
    clockDriftCompensation: true,
    threadPriorityUrgent: true,
    wifiHighPerfLock: true,
    wifiQosDscpVoice: true,
    bluetoothA2dpSuppression: true,
    autoDisconnectBluetoothAfter5s: true,
    hardwareBufferMultiplier: 3,
  });

  // Real-time audio engine instance
  const engine = useMemo(() => new DiPlayAudioEngine(config), []);
  
  const [metrics, setMetrics] = useState<AudioEngineMetrics>({
    isPlaying: false,
    underrunCount: 0,
    packetsTotal: 0,
    packetsDropped: 0,
    packetsRecovered: 0,
    currentJitterMs: 3.5,
    bufferOccupancyMs: 90,
    driftPpm: 0,
    effectiveSampleRate: 48000,
    audioLatencyMs: 42,
    lastEventDescription: 'Pipeline de audio inicializado y listo.',
    bluetoothState: 'handshake_connected',
    bluetoothCountdownSeconds: 5,
    connectedPhone: DiPlayAudioEngine.KNOWN_PHONES[0],
    detectedKnownPhones: DiPlayAudioEngine.KNOWN_PHONES,
    isConflictPromptOpen: false,
  });

  useEffect(() => {
    const unsubscribe = engine.subscribeMetrics(setMetrics);
    return () => {
      unsubscribe();
      engine.stop();
    };
  }, [engine]);

  const handleUpdateConfig = (newCfg: Partial<AudioEngineConfig>) => {
    const updated = { ...config, ...newCfg };
    setConfig(updated);
    engine.updateConfig(newCfg);
  };

  const handleToggleAudio = async () => {
    if (metrics.isPlaying) {
      engine.stop();
    } else {
      await engine.start();
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-800 selection:text-white">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Vehicle Selector */}
          <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 font-black text-base">
                D
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-extrabold text-white text-base tracking-tight">
                    DiPlay AudioFix
                  </h1>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 font-medium">
                    Fork CarPlay
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                  <span>Solución para Android Headunits</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-medium">Sin Microcortes</span>
                </div>
              </div>
            </div>

            {/* Vehicle Profile Pill (Dropdown on mobile/desktop) */}
            <div className="flex items-center gap-2">
              <select
                value={selectedVehicle.id}
                onChange={(e) => {
                  const found = VEHICLE_PROFILES.find((v) => v.id === e.target.value);
                  if (found) setSelectedVehicle(found);
                }}
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
                aria-label="Seleccionar vehículo"
              >
                {VEHICLE_PROFILES.map((vp) => (
                  <option key={vp.id} value={vp.id}>
                    {vp.name.split('(')[0].trim()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Navigation Segmented Controls (Rule: functional button elements) */}
          <div className="flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setActiveTab('carplay')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'carplay'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Simulador CarPlay
            </button>

            <button
              onClick={() => setActiveTab('lab')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'lab'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Laboratorio A/B
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'code'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-purple-400" />
              Código y Parches
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'guide'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Guía ADB
            </button>
          </div>

          {/* Actions & Export */}
          <div className="flex items-center gap-2.5">
            {/* 1 Phone Exclusive Policy & Multi-device trigger button */}
            <button
              onClick={() => engine.triggerDualPhoneDetection()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 transition-colors shadow-sm"
              title="Detectar teléfonos conocidos (Solo 1 conexión permitida)"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline truncate max-w-[140px]">
                {metrics.connectedPhone ? metrics.connectedPhone.name : '1 Dispositivo'}
              </span>
            </button>

            <button
              onClick={handleToggleAudio}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                metrics.isPlaying
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
              }`}
              title="Activar audio de simulación"
            >
              {metrics.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Pausar Audio</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span className="hidden sm:inline">Probar Audio</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsExportOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descargas</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'carplay' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quick overview alert banner */}
            <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 border border-emerald-900/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Simulación Activa: CarPlay con Motor DiPlay AudioFix
                  </h2>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    El audio reproduce un flujo AirPlay PCM con el resampleador Sinc 48.0kHz y buffer adaptativo de 90ms. Pulsa "Inyectar Jitter" para comprobar cómo el fork elimina por completo los microcortes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('lab')}
                  className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-semibold text-neutral-200 transition-colors flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Ver en Osciloscopio
                </button>
              </div>
            </div>

            {/* CarPlay Automotive Console Display */}
            <CarPlayDisplay
              engine={engine}
              config={config}
              onUpdateConfig={handleUpdateConfig}
              metrics={metrics}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              onNavigateToTab={(t) => setActiveTab(t as 'carplay' | 'lab' | 'code' | 'guide')}
            />
          </div>
        )}

        {activeTab === 'lab' && (
          <div className="animate-in fade-in duration-300">
            <AudioStressLab
              engine={engine}
              config={config}
              onUpdateConfig={handleUpdateConfig}
              metrics={metrics}
            />
          </div>
        )}

        {activeTab === 'code' && (
          <div className="animate-in fade-in duration-300">
            <CodePatchViewer />
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="animate-in fade-in duration-300">
            <InstallationGuide
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
            />
          </div>
        )}
      </main>

      {/* Footer (Rule: Clean unboxed metadata, no static pills) */}
      <footer className="mt-auto border-t border-neutral-900 bg-neutral-950 px-4 sm:px-6 py-6 text-xs text-neutral-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-3 gap-y-1">
            <span className="font-semibold text-neutral-300">DiPlay AudioFix Fork</span>
            <span aria-hidden="true">·</span>
            <span>Zero-Drop AudioTrack</span>
            <span aria-hidden="true">·</span>
            <span>Sinc Resampler 48kHz PLL</span>
            <span aria-hidden="true">·</span>
            <span>Adaptive Jitter Buffer</span>
            <span aria-hidden="true">·</span>
            <span>Optimizado para BYD DiLink 3.0 / 4.0 / 5.0</span>
          </div>

          <div className="flex items-center gap-4 text-neutral-400">
            <a
              href="https://github.com/shihabal3amri/DiPlay"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-200 transition-colors flex items-center gap-1"
            >
              <span>Repositorio DiPlay Original</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Export & Download Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        config={config}
        selectedVehicle={selectedVehicle}
      />

      {/* Single Phone Exclusive Connection Arbiter Dialog */}
      <PhoneSelectionModal
        isOpen={metrics.isConflictPromptOpen}
        phones={metrics.detectedKnownPhones}
        currentConnectedId={metrics.connectedPhone?.id}
        onSelectPhone={(phoneId) => engine.selectPhoneToConnect(phoneId)}
        onClose={() => engine.closeConflictPrompt()}
      />
    </div>
  );
}
