/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Zap, 
  Cpu, 
  Wifi, 
  Radio, 
  ShieldCheck, 
  AlertTriangle, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  XCircle,
  Activity,
  Layers,
  ArrowRight,
  Bluetooth,
  BluetoothOff,
  Timer
} from 'lucide-react';
import { AudioEngineConfig, AudioEngineMetrics } from '../types/carplay';
import { DiPlayAudioEngine } from '../services/audioEngine';

interface AudioStressLabProps {
  engine: DiPlayAudioEngine | null;
  config: AudioEngineConfig;
  onUpdateConfig: (cfg: Partial<AudioEngineConfig>) => void;
  metrics: AudioEngineMetrics;
}

export const AudioStressLab: React.FC<AudioStressLabProps> = ({
  engine,
  config,
  onUpdateConfig,
  metrics,
}) => {
  const oscilloscopeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Oscilloscope drawing loop
  useEffect(() => {
    const canvas = oscilloscopeCanvasRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const timeDomain = new Uint8Array(256);
    const freqDomain = new Uint8Array(128);

    const renderScope = () => {
      engine.getAnalyserData(timeDomain, freqDomain);
      const w = canvas.width;
      const h = canvas.height;

      // Dark background with technical oscilloscope grid
      ctx.fillStyle = '#0a0d13';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = '#15202b';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center reference line
      ctx.strokeStyle = '#223344';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      if (!metrics.isPlaying) {
        // Flatline
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        animId = requestAnimationFrame(renderScope);
        return;
      }

      // Draw real waveform
      const isOriginal = config.pipelineMode === 'original';
      const isGlitch = isOriginal && metrics.lastEventDescription.includes('Microcorte');

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isGlitch 
        ? '#ef4444' 
        : isOriginal 
        ? '#f59e0b' 
        : '#10b981';

      ctx.beginPath();
      const sliceWidth = w / timeDomain.length;
      let x = 0;

      for (let i = 0; i < timeDomain.length; i++) {
        const v = timeDomain[i] / 128.0; // 0 to 2
        const y = (v * h) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      // Glow effect for oscilloscope
      ctx.shadowBlur = 8;
      ctx.shadowColor = isGlitch ? '#ef4444' : isOriginal ? '#f59e0b' : '#10b981';
      ctx.stroke();
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(renderScope);
    };

    renderScope();
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

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Banner / A-B Comparator Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white tracking-wide">
                Laboratorio de Estrés y Diagnóstico de Audio CarPlay
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Prueba en tiempo real la estabilidad de la transmisión frente a pérdidas de paquetes Wi-Fi, picos de CPU y desfases de reloj entre 44.1 kHz y 48.0 kHz.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTogglePlayback}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                metrics.isPlaying
                  ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/40'
              }`}
            >
              {metrics.isPlaying ? (
                <>
                  <Pause className="w-4 h-4" /> Pausar Transmisión
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" /> Iniciar Audio de Prueba
                </>
              )}
            </button>

            <button
              onClick={() => engine?.resetCounters()}
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
              title="Reiniciar contadores de microcortes"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Pipeline Mode Toggle (Large A/B Switch) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Card: Original DiPlay */}
          <button
            onClick={() => onUpdateConfig({ pipelineMode: 'original' })}
            className={`p-4 rounded-xl text-left transition-all border ${
              config.pipelineMode === 'original'
                ? 'bg-rose-950/40 border-rose-600/80 ring-2 ring-rose-500/30'
                : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span className="font-bold text-white text-sm">DiPlay Original (Vulnerable)</span>
              </div>
              {config.pipelineMode === 'original' && (
                <span className="text-[11px] font-semibold text-rose-400 bg-rose-900/60 px-2 py-0.5 rounded">
                  ACTIVO
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Buffer AudioTrack mínimo (~16ms), hilo a prioridad normal (preemptive), sin resampleo nativo 48kHz (deslizamiento de reloj con iOS) y sin ocultación de pérdida de paquetes.
            </p>
            <div className="mt-3 flex items-center gap-4 text-[11px] font-mono text-rose-300">
              <span>Cortes sufridos: <strong className="text-white text-sm">{metrics.underrunCount}</strong></span>
              <span>Buffer: ~18 ms</span>
            </div>
          </button>

          {/* Card: Fork AudioFix */}
          <button
            onClick={() => onUpdateConfig({ pipelineMode: 'patched' })}
            className={`p-4 rounded-xl text-left transition-all border ${
              config.pipelineMode === 'patched'
                ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-sm">Fork DiPlay AudioFix (Solución)</span>
              </div>
              {config.pipelineMode === 'patched' && (
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded">
                  ACTIVO
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Buffer Jitter adaptativo con anillo circular (90-180ms), resampleo Sinc con PLL 44.1k/48k, hilo URGENT_AUDIO (-19) y PLC Overlap-Add. Cero cortes audibles.
            </p>
            <div className="mt-3 flex items-center gap-4 text-[11px] font-mono text-emerald-300">
              <span>Recuperados: <strong className="text-white text-sm">{metrics.packetsRecovered}</strong></span>
              <span>Buffer salud: 100%</span>
            </div>
          </button>
        </div>
      </div>

      {/* Real-time Oscilloscope & Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Oscilloscope (8 cols) */}
        <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-neutral-200 tracking-wider uppercase">
                Osciloscopio PCM en Vivo (Salida AudioTrack)
              </span>
            </div>

            <span className="text-[11px] font-mono text-neutral-400">
              {metrics.lastEventDescription}
            </span>
          </div>

          <div className="w-full h-56 rounded-xl overflow-hidden border border-neutral-800 relative bg-[#0a0d13]">
            <canvas
              ref={oscilloscopeCanvasRef}
              width={700}
              height={224}
              className="w-full h-full object-cover"
            />
            {/* Legend overlay */}
            <div className="absolute bottom-2 left-3 flex items-center gap-4 text-[10px] font-mono text-neutral-400 bg-black/60 px-2.5 py-1 rounded backdrop-blur-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Patched (Estable)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Microcorte (Gaps)
              </span>
              <span>Base de tiempo: 21.3 ms/div</span>
            </div>
          </div>

          {/* Stress Injection Triggers */}
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <div className="text-xs font-semibold text-neutral-300 mb-2.5">
              Inyectar Fallos de Entorno Automotriz (Pulsa para escuchar y observar la respuesta):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => engine?.triggerWifiJitterBurst(1200)}
                className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-amber-300 border border-amber-800/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Wifi className="w-4 h-4 text-amber-400" />
                Interferencia Wi-Fi
              </button>

              <button
                onClick={() => engine?.triggerCpuSpike(900)}
                className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-purple-300 border border-purple-800/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Cpu className="w-4 h-4 text-purple-400" />
                Pico CPU / GC
              </button>

              <button
                onClick={() => engine?.triggerClockDriftSlip()}
                className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-blue-300 border border-blue-800/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-blue-400" />
                Desfase 44.1k/48k
              </button>

              <button
                onClick={() => engine?.triggerBluetoothCollision()}
                className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-rose-300 border border-rose-800/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Radio className="w-4 h-4 text-rose-400" />
                Conflicto Bluetooth
              </button>
            </div>
          </div>
        </div>

        {/* Telemetry Gauge Cards (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Gauge 1: Underruns */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-400 font-medium">Microcortes Sufridos</div>
              <div className={`text-2xl font-black font-mono mt-1 ${metrics.underrunCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {metrics.underrunCount}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {config.pipelineMode === 'patched' ? '0 en modo Fork AudioFix' : 'Cortes audibles generados'}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${metrics.underrunCount > 0 ? 'bg-rose-950/60 text-rose-400' : 'bg-emerald-950/60 text-emerald-400'}`}>
              {metrics.underrunCount > 0 ? <XCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
          </div>

          {/* Gauge 2: Buffer Jitter */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-400 font-medium">Jitter de Red Medido</div>
              <div className="text-2xl font-black font-mono mt-1 text-white">
                {metrics.currentJitterMs.toFixed(1)} <span className="text-sm font-normal text-neutral-400">ms</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Tolerancia de buffer: {config.jitterBufferSizeMs} ms
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-neutral-800 text-neutral-300 flex items-center justify-center">
              <Wifi className="w-6 h-6" />
            </div>
          </div>

          {/* Gauge 3: Clock PLL Drift */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-400 font-medium">Compensación PLL de Reloj</div>
              <div className="text-2xl font-black font-mono mt-1 text-blue-400">
                {config.clockDriftCompensation ? 'Activo' : 'Desactivado'}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5 font-mono">
                {metrics.driftPpm > 0 ? `Desfase: +${metrics.driftPpm} PPM` : 'Sincronizado a 48,000 Hz'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-950/60 text-blue-400 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
          </div>

          {/* Gauge 4: Latency */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-400 font-medium">Latencia Extremo a Extremo</div>
              <div className="text-2xl font-black font-mono mt-1 text-emerald-400">
                {metrics.audioLatencyMs} <span className="text-sm font-normal text-neutral-400">ms</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                Imperceptible en música y GPS
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>

          {/* Gauge 5: Bluetooth Radio Auto-Disconnect Lifecycle */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-neutral-400 font-medium">Bluetooth de la Radio</div>
              <div className="text-lg font-black font-mono mt-1">
                {metrics.bluetoothState === 'disconnected_optimized' ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <BluetoothOff className="w-4 h-4" /> Apagado (0 dB RF)
                  </span>
                ) : metrics.bluetoothState === 'countdown_5s' ? (
                  <span className="text-amber-400 flex items-center gap-1.5 animate-pulse">
                    <Timer className="w-4 h-4" /> Apagando en {metrics.bluetoothCountdownSeconds}s
                  </span>
                ) : metrics.bluetoothState === 'restoring_bluetooth' ? (
                  <span className="text-blue-400 flex items-center gap-1.5 animate-pulse">
                    <Bluetooth className="w-4 h-4" /> Reactivando...
                  </span>
                ) : (
                  <span className="text-neutral-300 flex items-center gap-1.5">
                    <Bluetooth className="w-4 h-4 text-neutral-400" /> Activo (Conectado)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-neutral-500 mt-0.5">
                {metrics.bluetoothState === 'disconnected_optimized'
                  ? 'Se reactivará automáticamente al salir de CarPlay'
                  : 'Desconexión automática a los 5s de enlace'}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              metrics.bluetoothState === 'disconnected_optimized'
                ? 'bg-emerald-950/60 text-emerald-400'
                : metrics.bluetoothState === 'countdown_5s'
                ? 'bg-amber-950/60 text-amber-400'
                : 'bg-neutral-800 text-neutral-300'
            }`}>
              {metrics.bluetoothState === 'disconnected_optimized' ? (
                <BluetoothOff className="w-6 h-6" />
              ) : (
                <Bluetooth className="w-6 h-6" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Architecture Deep-Dive Diagram */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          Anatomía Técnica del Problema y Solución en Android Auto / DiPlay
        </h3>
        <p className="text-xs text-neutral-400 mb-6 max-w-3xl">
          ¿Por qué ocurren los microcortes en DiPlay original y cómo los resuelve el Fork? Comparativa directa del flujo de datos en el sistema operativo Android.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pipeline Original */}
          <div className="bg-neutral-950 p-5 rounded-xl border border-rose-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-rose-900/30">
                <span className="font-bold text-rose-400 text-sm flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Pipeline Original DiPlay (Fallos)
                </span>
                <span className="text-[11px] text-rose-400/80 font-mono">AudioTrack Estándar</span>
              </div>

              <div className="mt-4 space-y-3 text-xs text-neutral-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <div>
                    <strong className="text-white">Frecuencia 44.1kHz sin PLL:</strong> AirPlay emite a 44,100 Hz. El AudioFlinger de Android opera a 48,000 Hz. Los relojes de cristal no son idénticos; tras unos 40 segundos, la diferencia acumula una muestra faltante provocando un salto audible.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <div>
                    <strong className="text-white">Buffer Diminuto (1024 frames):</strong> Ante cualquier fluctuación de Wi-Fi o trama perdida, el buffer se vacía inmediatamente (underrun), expulsando silencio brusco.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <div>
                    <strong className="text-white">Prioridad de Hilo Normal:</strong> Cuando la pantalla decodifica un frame H.264/H.265 pesado o el Garbage Collector se activa, el hilo de audio se pausa durante 30-80ms.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-300 text-xs font-mono">
              Resultado: Cortes constantes cada 30-60 segundos y distorsión al cambiar de aplicación.
            </div>
          </div>

          {/* Pipeline Patched */}
          <div className="bg-neutral-950 p-5 rounded-xl border border-emerald-900/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/30">
                <span className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Pipeline Fork DiPlay AudioFix (Solución)
                </span>
                <span className="text-[11px] text-emerald-400/80 font-mono">Zero-Drop Architecture</span>
              </div>

              <div className="mt-4 space-y-3 text-xs text-neutral-300">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                  <div>
                    <strong className="text-white">Resampleo Sinc con PLL Activo:</strong> Se convierte 44.1k a 48.0k nativo calculando micro-ajustes en tiempo real para mantener el nivel del buffer siempre constante. Cero deslizamiento.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                  <div>
                    <strong className="text-white">Adaptive Jitter RingBuffer (100ms):</strong> Cola circular sin asignación de memoria (Zero-Allocation) con algoritmo PLC (Overlap-Add) que sintetiza la onda en caso de ráfagas Wi-Fi.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                  <div>
                    <strong className="text-white">THREAD_PRIORITY_URGENT_AUDIO (-19):</strong> Asignado al hilo de bombeo de audio, garantizando que el kernel Linux nunca lo interrumpa por renderizado gráfico o GC.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 text-xs font-mono">
              Resultado: Reproducción fluida y cristalina continua sin microcortes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
