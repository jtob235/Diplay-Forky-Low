/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Compass, 
  Navigation, 
  Music, 
  Phone, 
  Settings, 
  LayoutGrid, 
  Radio, 
  Zap, 
  Wifi, 
  Cpu, 
  ShieldCheck, 
  AlertTriangle,
  RotateCw,
  Sliders,
  Bluetooth,
  BluetoothOff,
  Timer,
  Smartphone,
  Users
} from 'lucide-react';
import { ActiveApp, AudioEngineConfig, AudioEngineMetrics, MusicTrack, VehicleProfile } from '../types/carplay';
import { DiPlayAudioEngine } from '../services/audioEngine';
import { PhoneSelectionModal } from './PhoneSelectionModal';

interface CarPlayDisplayProps {
  engine: DiPlayAudioEngine | null;
  config: AudioEngineConfig;
  onUpdateConfig: (cfg: Partial<AudioEngineConfig>) => void;
  metrics: AudioEngineMetrics;
  selectedVehicle: VehicleProfile;
  onSelectVehicle: (v: VehicleProfile) => void;
  onNavigateToTab: (tabId: string) => void;
}

const PLAYLIST: MusicTrack[] = [
  {
    id: '1',
    title: 'Midnight Highway 84',
    artist: 'Kavinsky & The Midnight',
    album: 'OutRun Synthwave Drive',
    duration: 215,
    coverColor: 'from-indigo-600 via-purple-700 to-pink-600',
    genre: 'Synthwave / Retrowave',
  },
  {
    id: '2',
    title: 'Coastal Chill Beats',
    artist: 'Lofi Automotive',
    album: 'Sunset Coastline Sessions',
    duration: 182,
    coverColor: 'from-amber-600 via-orange-600 to-rose-700',
    genre: 'Lo-Fi Chill',
  },
  {
    id: '3',
    title: 'Cyberpunk Skyline',
    artist: 'HyperDrive',
    album: 'Night City Radio',
    duration: 240,
    coverColor: 'from-cyan-600 via-blue-800 to-indigo-900',
    genre: 'Electronic',
  },
];

export const CarPlayDisplay: React.FC<CarPlayDisplayProps> = ({
  engine,
  config,
  onUpdateConfig,
  metrics,
  selectedVehicle,
  onSelectVehicle,
  onNavigateToTab,
}) => {
  const [activeApp, setActiveApp] = useState<ActiveApp>('dashboard');
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  
  const mapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const carAnimRef = useRef<number>(0);

  const currentTrack = PLAYLIST[currentTrackIndex];

  // Digital clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Map Animation Canvas
  useEffect(() => {
    const canvas = mapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      t += 0.012;
      const w = canvas.width;
      const h = canvas.height;

      // Dark automotive map theme
      ctx.fillStyle = '#11161d';
      ctx.fillRect(0, 0, w, h);

      // Grid/Road lines
      ctx.strokeStyle = '#1e2836';
      ctx.lineWidth = 1.5;

      // Secondary roads
      for (let x = -50; x < w + 50; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x + Math.sin(t * 0.3) * 10, 0);
        ctx.lineTo(x + 40 + Math.sin(t * 0.3) * 10, h);
        ctx.stroke();
      }

      for (let y = 0; y < h; y += 45) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + 20);
        ctx.stroke();
      }

      // Main Navigation Highway (Curved glowing path)
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const startX = w * 0.2;
      const startY = h * 0.9;
      const cp1X = w * 0.45;
      const cp1Y = h * 0.6;
      const cp2X = w * 0.35;
      const cp2Y = h * 0.35;
      const endX = w * 0.75;
      const endY = h * 0.15;

      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
      ctx.stroke();

      // Highway border highlight
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 3;
      ctx.stroke();

      // GPS Car Location marker
      const carProg = (t * 0.15) % 1.0;
      // Parametric bezier approx
      const u = carProg;
      const carX = Math.pow(1 - u, 3) * startX + 3 * Math.pow(1 - u, 2) * u * cp1X + 3 * (1 - u) * Math.pow(u, 2) * cp2X + Math.pow(u, 3) * endX;
      const carY = Math.pow(1 - u, 3) * startY + 3 * Math.pow(1 - u, 2) * u * cp1Y + 3 * (1 - u) * Math.pow(u, 2) * cp2Y + Math.pow(u, 3) * endY;

      // Pulsing radar ring
      const pulse = (Math.sin(t * 5) + 1) / 2;
      ctx.beginPath();
      ctx.arc(carX, carY, 14 + pulse * 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.fill();

      // Solid blue marker with white chevron
      ctx.beginPath();
      ctx.arc(carX, carY, 9, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [activeApp]);

  // Audio spectrum visualizer canvas
  useEffect(() => {
    const canvas = audioCanvasRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const timeDomain = new Uint8Array(128);
    const freqDomain = new Uint8Array(64);

    const drawAudio = () => {
      engine.getAnalyserData(timeDomain, freqDomain);
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      if (!metrics.isPlaying) {
        // Flatline
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        animId = requestAnimationFrame(drawAudio);
        return;
      }

      // Draw mini frequency bars
      const barCount = 18;
      const barWidth = (w / barCount) - 2;

      for (let i = 0; i < barCount; i++) {
        const val = freqDomain[i * 2] || 0;
        const barHeight = Math.max(3, (val / 255) * h);
        const x = i * (barWidth + 2);
        const y = h - barHeight;

        const isGlitch = config.pipelineMode === 'original' && metrics.lastEventDescription.includes('Microcorte');

        ctx.fillStyle = isGlitch 
          ? '#ef4444' 
          : config.pipelineMode === 'patched' 
          ? '#10b981' 
          : '#3b82f6';

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }

      animId = requestAnimationFrame(drawAudio);
    };

    drawAudio();
    return () => cancelAnimationFrame(animId);
  }, [engine, metrics.isPlaying, config.pipelineMode, metrics.lastEventDescription]);

  const handleTogglePlayback = async () => {
    if (!engine) return;
    if (metrics.isPlaying) {
      engine.stop();
    } else {
      await engine.start();
    }
  };

  const handleNextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
  };

  const handlePrevTrack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (engine) engine.setVolume(newVol);
    if (newVol > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => {
    if (!engine) return;
    if (isMuted) {
      engine.setVolume(volume);
      setIsMuted(false);
    } else {
      engine.setVolume(0);
      setIsMuted(true);
    }
  };

  return (
    <div className="w-full flex flex-col bg-neutral-950 text-white rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden select-none">
      {/* Headunit Hardware Bezel Header */}
      <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
          <span className="font-semibold tracking-wide text-neutral-200">
            {selectedVehicle.name.split('(')[0].trim()}
          </span>
          <span className="hidden sm:inline text-neutral-500">·</span>
          <span className="hidden sm:inline text-neutral-400 font-mono text-[11px]">
            {selectedVehicle.soc}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Bluetooth Radio Lifecycle Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono">
            {metrics.bluetoothState === 'countdown_5s' ? (
              <span className="flex items-center gap-1 text-amber-400 font-semibold animate-pulse">
                <Bluetooth className="w-3.5 h-3.5" />
                BT desconectando en {metrics.bluetoothCountdownSeconds}s...
              </span>
            ) : metrics.bluetoothState === 'disconnected_optimized' ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <BluetoothOff className="w-3.5 h-3.5 text-emerald-400" />
                BT Radio Off (0 RF Jitter)
              </span>
            ) : metrics.bluetoothState === 'restoring_bluetooth' ? (
              <span className="flex items-center gap-1 text-blue-400 font-medium animate-pulse">
                <Bluetooth className="w-3.5 h-3.5" />
                Reactivando BT...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-neutral-400">
                <Bluetooth className="w-3.5 h-3.5" />
                BT Conectado
              </span>
            )}
          </div>

          {/* Pipeline Switcher Shortcut */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
            <button
              onClick={() => onUpdateConfig({ pipelineMode: 'original' })}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all ${
                config.pipelineMode === 'original'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Pipeline con microcortes y buffer básico"
            >
              Original (Con Cortes)
            </button>
            <button
              onClick={() => onUpdateConfig({ pipelineMode: 'patched' })}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-all flex items-center gap-1.5 ${
                config.pipelineMode === 'patched'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Fork DiPlay optimizado: Zero-Drop AudioTrack"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Fork AudioFix (Patched)
            </button>
          </div>

          {/* Exclusive Single Connected Phone Indicator & Trigger */}
          <button
            onClick={() => engine?.triggerDualPhoneDetection()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-blue-950/50 text-blue-300 border border-blue-800/50 hover:bg-blue-900/60 transition-colors"
            title="Pulsa para cambiar o simular 2 teléfonos en el coche"
          >
            <Smartphone className="w-3 h-3 text-blue-400" />
            <span className="truncate max-w-[120px]">{metrics.connectedPhone?.name || 'iPhone'}</span>
          </button>

          {/* Quick Dual Phone Detection Simulation Button */}
          <button
            onClick={() => engine?.triggerDualPhoneDetection()}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-amber-950/40 text-amber-300 border border-amber-800/40 hover:bg-amber-900/60 transition-colors"
            title="Simula la detección simultánea de 2 iPhones conocidos en el vehículo"
          >
            <Users className="w-3 h-3 text-amber-400" />
            Simular 2 Teléfonos
          </button>

          {/* Quick Stress injection button */}
          <button
            onClick={() => engine?.triggerWifiJitterBurst(1000)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800 transition-colors"
            title="Inyecta pérdida de paquetes Wi-Fi 2.4GHz para probar el buffer"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            Inyectar Jitter
          </button>
        </div>
      </div>

      {/* Main CarPlay Display Screen (Simulating 16:9 / 8:3 Automotive Screen) */}
      <div className="relative flex flex-col md:flex-row h-[520px] bg-black">
        {/* CarPlay Side Dock (Apple CarPlay standard left navigation bar) */}
        <aside className="w-full md:w-20 bg-neutral-950/90 border-r border-neutral-800/80 flex md:flex-col items-center justify-between p-3.5 z-20">
          {/* Top: Status indicators */}
          <div className="flex md:flex-col items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-neutral-100 font-mono">
              {currentTimeStr || '12:00'}
            </span>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-400 font-medium">5G</span>
            </div>
            {/* Mini Bluetooth Indicator */}
            {metrics.bluetoothState === 'countdown_5s' ? (
              <span className="text-[9px] font-mono text-amber-400 font-bold flex items-center gap-0.5" title="Desconectando en 5s">
                <Bluetooth className="w-3 h-3" /> {metrics.bluetoothCountdownSeconds}s
              </span>
            ) : metrics.bluetoothState === 'disconnected_optimized' ? (
              <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-0.5" title="Bluetooth desconectado para evitar cortes">
                <BluetoothOff className="w-3 h-3" /> Off
              </span>
            ) : (
              <Bluetooth className="w-3 h-3 text-neutral-500" />
            )}
          </div>

          {/* Center: App Icons */}
          <div className="flex md:flex-col items-center gap-3">
            <button
              onClick={() => setActiveApp('dashboard')}
              aria-label="CarPlay Dashboard"
              className={`p-2.5 rounded-xl transition-all ${
                activeApp === 'dashboard'
                  ? 'bg-neutral-800 text-white shadow-lg shadow-black/40 scale-105'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <LayoutGrid className="w-6 h-6" />
            </button>

            <button
              onClick={() => setActiveApp('maps')}
              aria-label="Navigation Maps"
              className={`p-2.5 rounded-xl transition-all ${
                activeApp === 'maps'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <Navigation className="w-6 h-6" />
            </button>

            <button
              onClick={() => setActiveApp('music')}
              aria-label="Music Player"
              className={`p-2.5 rounded-xl transition-all ${
                activeApp === 'music'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20 scale-105'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <Music className="w-6 h-6" />
            </button>

            <button
              onClick={() => setActiveApp('phone')}
              aria-label="Phone Calls"
              className={`p-2.5 rounded-xl transition-all ${
                activeApp === 'phone'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 scale-105'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <Phone className="w-6 h-6" />
            </button>

            <button
              onClick={() => setActiveApp('settings')}
              aria-label="DiPlay Settings"
              className={`p-2.5 rounded-xl transition-all ${
                activeApp === 'settings'
                  ? 'bg-neutral-700 text-white shadow-lg scale-105'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom: Home Button */}
          <div className="flex md:flex-col items-center">
            <button
              onClick={() => setActiveApp('dashboard')}
              aria-label="Home"
              className="w-8 h-8 rounded-full border-2 border-neutral-600 flex items-center justify-center hover:border-neutral-300 transition-colors"
            >
              <div className="w-3.5 h-3.5 rounded-sm border border-neutral-400" />
            </button>
          </div>
        </aside>

        {/* CarPlay Viewport Content */}
        <main className="flex-1 relative overflow-hidden bg-neutral-950 p-4">
          {/* ========================================================= */}
          {/* 1. SPLIT DASHBOARD VIEW (Apple CarPlay Multi-Widget View) */}
          {/* ========================================================= */}
          {activeApp === 'dashboard' && (
            <div className="h-full grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Left Widget (Navigation Map Canvas) */}
              <div className="md:col-span-7 rounded-2xl overflow-hidden relative border border-neutral-800 bg-[#11161d] flex flex-col shadow-inner">
                <canvas
                  ref={mapCanvasRef}
                  width={600}
                  height={440}
                  className="w-full h-full object-cover"
                />

                {/* Floating Turn Card */}
                <div className="absolute top-3 left-3 right-3 bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-xl p-3 flex items-center gap-3.5 shadow-xl">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                    <Navigation className="w-5 h-5 rotate-45" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-blue-400 font-semibold tracking-wide uppercase">
                      En 350 metros
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                      Giro a la derecha por Av. de la Castellana
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-extrabold text-neutral-100 font-mono">18:42</div>
                    <div className="text-[11px] text-neutral-400">14 km · 19 min</div>
                  </div>
                </div>

                {/* Speed Limit & Compass overlay */}
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white border-4 border-red-600 flex items-center justify-center text-black font-extrabold text-sm shadow-md">
                    90
                  </div>
                  <div className="bg-neutral-900/90 backdrop-blur-sm border border-neutral-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs text-neutral-300">
                    <Compass className="w-4 h-4 text-blue-400" />
                    <span>68 km/h SO</span>
                  </div>
                </div>

                {/* Expand Map button */}
                <button
                  onClick={() => setActiveApp('maps')}
                  className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-300 backdrop-blur-sm"
                >
                  Ver Mapa Completo
                </button>
              </div>

              {/* Right Column: Audio & Telemetry Widgets */}
              <div className="md:col-span-5 flex flex-col gap-3.5 justify-between">
                {/* Now Playing Widget */}
                <div className="flex-1 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                  <div className="flex items-start gap-3.5">
                    {/* Album Art with glowing badge */}
                    <div className={`w-18 h-18 rounded-xl bg-gradient-to-tr ${currentTrack.coverColor} flex items-center justify-center shrink-0 shadow-md relative overflow-hidden`}>
                      <Music className="w-8 h-8 text-white/90" />
                      {metrics.isPlaying && (
                        <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-neutral-400 font-medium truncate">
                        {currentTrack.artist}
                      </div>
                      <div className="text-base font-bold text-white truncate leading-tight mt-0.5">
                        {currentTrack.title}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate mt-1">
                        {currentTrack.album}
                      </div>
                    </div>
                  </div>

                  {/* Real-time Visualizer Strip */}
                  <div className="my-2 bg-neutral-950/70 border border-neutral-800/80 rounded-xl px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <canvas
                        ref={audioCanvasRef}
                        width={120}
                        height={24}
                        className="rounded"
                      />
                      <span className="text-[10px] font-mono text-neutral-400">
                        {config.pipelineMode === 'patched' ? '48kHz · Sinc PLL' : '44.1kHz · Sin PLL'}
                      </span>
                    </div>

                    <div className="text-right">
                      {config.pipelineMode === 'patched' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                          <ShieldCheck className="w-3 h-3" />
                          Zero-Drop
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Riesgo Corte
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevTrack}
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                        aria-label="Pista anterior"
                      >
                        <SkipBack className="w-5 h-5" />
                      </button>

                      <button
                        onClick={handleTogglePlayback}
                        className="w-11 h-11 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center transition-all shadow-md active:scale-95"
                        aria-label={metrics.isPlaying ? 'Pausar' : 'Reproducir'}
                      >
                        {metrics.isPlaying ? (
                          <Pause className="w-5 h-5 fill-black" />
                        ) : (
                          <Play className="w-5 h-5 fill-black ml-0.5" />
                        )}
                      </button>

                      <button
                        onClick={handleNextTrack}
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                        aria-label="Siguiente pista"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Volume slider */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="text-neutral-400 hover:text-neutral-200"
                        aria-label="Mute"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-16 accent-white h-1 bg-neutral-700 rounded-lg cursor-pointer"
                        aria-label="Control de volumen"
                      />
                    </div>
                  </div>
                </div>

                {/* DiPlay Engine Live Diagnostic Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-neutral-200">
                        Estado del Buffer CarPlay
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {metrics.bufferOccupancyMs.toFixed(0)} ms
                    </span>
                  </div>

                  {/* Buffer gauge bar */}
                  <div className="w-full bg-neutral-950 h-2.5 rounded-full overflow-hidden border border-neutral-800 relative">
                    <div
                      className={`h-full transition-all duration-200 ${
                        config.pipelineMode === 'patched'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : metrics.underrunCount > 0
                          ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(5, (metrics.bufferOccupancyMs / 200) * 100))}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 font-mono">
                    <span>Cortes evitados: <strong className="text-emerald-400">{metrics.packetsRecovered}</strong></span>
                    <span>Microcortes sufridos: <strong className={metrics.underrunCount > 0 ? 'text-rose-400' : 'text-neutral-400'}>{metrics.underrunCount}</strong></span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 truncate max-w-[200px]">
                      {metrics.lastEventDescription}
                    </span>
                    <button
                      onClick={() => onNavigateToTab('lab')}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      Laboratorio A/B
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 2. FULL NAVIGATION MAPS VIEW */}
          {/* ========================================================= */}
          {activeApp === 'maps' && (
            <div className="h-full rounded-2xl overflow-hidden relative border border-neutral-800 bg-[#11161d] flex flex-col">
              <canvas
                ref={mapCanvasRef}
                width={900}
                height={500}
                className="w-full h-full object-cover"
              />

              {/* Top Navigation banner */}
              <div className="absolute top-4 left-4 right-4 bg-neutral-900/95 backdrop-blur-md border border-neutral-700 rounded-xl p-4 flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                    <Navigation className="w-6 h-6 rotate-45" />
                  </div>
                  <div>
                    <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">
                      En 350 m — Salida 8B
                    </div>
                    <div className="text-base font-bold text-white">
                      Av. de la Castellana hacia Centro Ciudad
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-white font-mono">18:42</div>
                  <div className="text-xs text-neutral-400 font-medium">14 km restantes · 19 min</div>
                </div>
              </div>

              {/* Bottom Car Status bar */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white border-4 border-red-600 flex items-center justify-center text-black font-black text-base shadow-lg">
                    90
                  </div>
                  <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700 px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm text-neutral-200 shadow-lg">
                    <Compass className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold">68 km/h</span>
                    <span className="text-neutral-500">·</span>
                    <span className="text-neutral-400">Ruta óptima sin atascos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveApp('music')}
                    className="px-4 py-2.5 rounded-xl bg-neutral-900/95 hover:bg-neutral-800 border border-neutral-700 text-sm font-medium text-neutral-200 flex items-center gap-2 shadow-lg"
                  >
                    <Music className="w-4 h-4 text-rose-400" />
                    <span>{currentTrack.title}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 3. FULL MUSIC PLAYER VIEW */}
          {/* ========================================================= */}
          {activeApp === 'music' && (
            <div className="h-full rounded-2xl bg-neutral-900/90 border border-neutral-800 p-6 flex flex-col md:flex-row items-center gap-8 justify-center">
              {/* Cover Art */}
              <div className={`w-56 h-56 rounded-2xl bg-gradient-to-tr ${currentTrack.coverColor} flex items-center justify-center shadow-2xl relative overflow-hidden shrink-0 border border-white/10`}>
                <Music className="w-20 h-20 text-white/90" />
                <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-mono text-white/90">
                  AirPlay PCM 48kHz
                </div>
              </div>

              {/* Track Info & Controls */}
              <div className="flex-1 max-w-md w-full flex flex-col gap-4">
                <div>
                  <div className="text-xs font-semibold text-rose-400 tracking-wider uppercase">
                    Reproduciendo en CarPlay
                  </div>
                  <h2 className="text-2xl font-bold text-white mt-1">
                    {currentTrack.title}
                  </h2>
                  <div className="text-neutral-400 font-medium">
                    {currentTrack.artist} — {currentTrack.album}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full">
                  <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-white h-full w-2/5 rounded-full" />
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500 font-mono mt-1.5">
                    <span>1:24</span>
                    <span>3:35</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6 py-2">
                  <button
                    onClick={handlePrevTrack}
                    className="p-3 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <SkipBack className="w-7 h-7" />
                  </button>

                  <button
                    onClick={handleTogglePlayback}
                    className="w-16 h-16 rounded-full bg-white hover:bg-neutral-200 text-black flex items-center justify-center shadow-xl active:scale-95 transition-all"
                  >
                    {metrics.isPlaying ? (
                      <Pause className="w-7 h-7 fill-black" />
                    ) : (
                      <Play className="w-7 h-7 fill-black ml-1" />
                    )}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    className="p-3 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                  >
                    <SkipForward className="w-7 h-7" />
                  </button>
                </div>

                {/* Quality Specs */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs flex items-center justify-between text-neutral-400 font-mono">
                  <span>Modo: <strong className={config.pipelineMode === 'patched' ? 'text-emerald-400' : 'text-amber-400'}>{config.pipelineMode === 'patched' ? 'Fork AudioFix' : 'Original'}</strong></span>
                  <span>Buffer: <strong>{metrics.bufferOccupancyMs.toFixed(0)} ms</strong></span>
                  <span>Pérdidas: <strong className={metrics.underrunCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>{metrics.underrunCount}</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 4. PHONE / CALLS VIEW */}
          {/* ========================================================= */}
          {activeApp === 'phone' && (
            <div className="h-full rounded-2xl bg-neutral-900 border border-neutral-800 p-6 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/30">
                <Phone className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-white">Canal de Voz y Llamadas CarPlay</h3>
              <p className="text-sm text-neutral-400 max-w-md mt-2">
                En el DiPlay original, la mezcla entre la música y el canal de llamadas producía chasquidos debido a la falta de atenuación automática (audio ducking). En el Fork AudioFix se utiliza <code className="text-neutral-200 font-mono">AudioAttributes.USAGE_VOICE_COMMUNICATION</code> con prioridad separada.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={() => setActiveApp('dashboard')}
                  className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm font-semibold text-white transition-colors"
                >
                  Volver al Salpicadero
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 5. SETTINGS VIEW */}
          {/* ========================================================= */}
          {activeApp === 'settings' && (
            <div className="h-full rounded-2xl bg-neutral-900 border border-neutral-800 p-5 overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-neutral-400" />
                Configuración del Pipeline de Audio DiPlay
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pipeline Selection */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <div className="text-sm font-semibold text-white mb-2">Modo del Motor de Audio</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-2.5 rounded-lg border border-neutral-800 hover:bg-neutral-900 cursor-pointer">
                      <input
                        type="radio"
                        name="pipeline"
                        checked={config.pipelineMode === 'patched'}
                        onChange={() => onUpdateConfig({ pipelineMode: 'patched' })}
                        className="accent-emerald-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          Fork AudioFix (Recomendado)
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          Buffer dinámico, resampleo 48kHz con PLL, prioridad urgente y sin microcortes.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-2.5 rounded-lg border border-neutral-800 hover:bg-neutral-900 cursor-pointer">
                      <input
                        type="radio"
                        name="pipeline"
                        checked={config.pipelineMode === 'original'}
                        onChange={() => onUpdateConfig({ pipelineMode: 'original' })}
                        className="accent-rose-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-rose-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" />
                          DiPlay Original
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          Buffer estático pequeño (16ms), propenso a microcortes con Wi-Fi o CPU.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Buffer Size */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-white">Tamaño del Jitter Buffer</span>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {config.jitterBufferSizeMs} ms
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="220"
                    step="10"
                    value={config.jitterBufferSizeMs}
                    onChange={(e) => onUpdateConfig({ jitterBufferSizeMs: parseInt(e.target.value) })}
                    className="w-full accent-emerald-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-500 font-mono mt-1">
                    <span>50ms (Ultra-baja)</span>
                    <span>100ms (Óptimo)</span>
                    <span>220ms (Alta tolerancia)</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-3">
                    En 100ms el retraso es imperceptible para la navegación y la música, pero absorbe el 99.8% de las fluctuaciones de red.
                  </p>
                </div>

                {/* Advanced Audio Options */}
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 md:col-span-2">
                  <div className="text-sm font-semibold text-white mb-3">Optimizaciones Activas del Fork</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.packetLossConcealment}
                        onChange={(e) => onUpdateConfig({ packetLossConcealment: e.target.checked })}
                        className="accent-emerald-500 rounded"
                      />
                      <span>Ocultación de Pérdida de Paquetes (PLC Overlap-Add)</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.clockDriftCompensation}
                        onChange={(e) => onUpdateConfig({ clockDriftCompensation: e.target.checked })}
                        className="accent-emerald-500 rounded"
                      />
                      <span>Compensación de Reloj PLL (44.1k AirPlay -&gt; 48k Android)</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.threadPriorityUrgent}
                        onChange={(e) => onUpdateConfig({ threadPriorityUrgent: e.target.checked })}
                        className="accent-emerald-500 rounded"
                      />
                      <span>Prioridad de Hilo URGENT_AUDIO (-19 nice)</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.wifiHighPerfLock}
                        onChange={(e) => onUpdateConfig({ wifiHighPerfLock: e.target.checked })}
                        className="accent-emerald-500 rounded"
                      />
                      <span>Bloqueo Wi-Fi FULL_HIGH_PERF &amp; DSCP 46 Voz</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-emerald-300 font-medium cursor-pointer sm:col-span-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                      <input
                        type="checkbox"
                        checked={config.autoDisconnectBluetoothAfter5s}
                        onChange={(e) => onUpdateConfig({ autoDisconnectBluetoothAfter5s: e.target.checked })}
                        className="accent-emerald-500 rounded"
                      />
                      <span className="flex items-center gap-1.5">
                        <BluetoothOff className="w-4 h-4 text-emerald-400" />
                        Desconectar Bluetooth 5 segundos tras conexión estable y reactivar al salir (Evita microcortes RF)
                      </span>
                    </label>
                  </div>

                  {/* Manual session toggle for testing Bluetooth auto-reconnect */}
                  <div className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>Prueba de Ciclo Bluetooth:</span>
                        {metrics.bluetoothState === 'disconnected_optimized' ? (
                          <span className="text-emerald-400 font-mono">Desconectado (Óptimo)</span>
                        ) : metrics.bluetoothState === 'countdown_5s' ? (
                          <span className="text-amber-400 font-mono">Desconectando en {metrics.bluetoothCountdownSeconds}s</span>
                        ) : (
                          <span className="text-neutral-400 font-mono">Conectado / Activo</span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Pulsa el botón para simular apagar CarPlay y comprobar cómo el Bluetooth se reactiva de inmediato.
                      </div>
                    </div>

                    <button
                      onClick={handleTogglePlayback}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        metrics.isPlaying
                          ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-200'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {metrics.isPlaying ? (
                        <>
                          <Bluetooth className="w-3.5 h-3.5" /> Desconectar CarPlay (Reactivar BT)
                        </>
                      ) : (
                        <>
                          <RotateCw className="w-3.5 h-3.5" /> Conectar CarPlay (Iniciar 5s)
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
