/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioEngineConfig, AudioEngineMetrics } from '../types/carplay';

export class DiPlayAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isRunning: boolean = false;
  private config: AudioEngineConfig;
  private metrics: AudioEngineMetrics;
  private metricsCallbacks: Set<(m: AudioEngineMetrics) => void> = new Set();
  
  // Audio Nodes
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  
  // Synthetic Music Generator state
  private playbackTime: number = 0;
  private tempoBpm: number = 118;
  private sampleRate: number = 48000;
  
  // Audio Buffering simulation state
  private jitterBufferQueue: Float32Array[] = [];
  private currentBufferSamples: number = 0;
  private ringBufferSize: number = 48000; // 1 second buffer pool
  private targetBufferOccupancyMs: number = 100; // 100ms adaptive target
  
  // Drift & PLL state
  private clockDriftRatio: number = 1.0;
  private phaseAccumulator: number = 0;
  private lastInputSampleL: number = 0;
  private lastInputSampleR: number = 0;

  // Packet Loss Concealment (PLC) state
  private lastGoodSamplesL: Float32Array = new Float32Array(512);
  private lastGoodSamplesR: Float32Array = new Float32Array(512);
  private plcHistoryIndex: number = 0;
  private isConcealing: boolean = false;
  private concealFade: number = 1.0;

  // Stress injection flags
  private wifiBurstActive: boolean = false;
  private wifiBurstRemainingMs: number = 0;
  private cpuSpikeActive: boolean = false;
  private cpuSpikeRemainingMs: number = 0;
  private bluetoothCollisionActive: boolean = false;
  private bluetoothCollisionRemainingMs: number = 0;
  
  // Animation / metrics ticker
  private intervalId: number | null = null;

  // Bluetooth Auto-disconnect 5s timer state
  private bluetoothTimerId: number | null = null;
  private bluetoothCountdown: number = 5;

  public static readonly KNOWN_PHONES = [
    {
      id: 'phone_1',
      name: 'iPhone 15 Pro Max',
      model: 'A2849 (iOS 18.2)',
      owner: 'Juan Carlos (Conductor)',
      rssi: -52,
      battery: 89,
      isLastUsed: true,
      macAddress: 'E4:90:7E:11:22:33',
      isDriverPhone: true,
    },
    {
      id: 'phone_2',
      name: 'iPhone 14 Pro',
      model: 'A2659 (iOS 18.1)',
      owner: 'Elena (Copiloto)',
      rssi: -69,
      battery: 74,
      isLastUsed: false,
      macAddress: 'BC:D0:74:44:55:66',
      isDriverPhone: false,
    },
  ];

  constructor(initialConfig: AudioEngineConfig) {
    this.config = { ...initialConfig };
    this.metrics = {
      isPlaying: false,
      underrunCount: 0,
      packetsTotal: 0,
      packetsDropped: 0,
      packetsRecovered: 0,
      currentJitterMs: 4,
      bufferOccupancyMs: 100,
      driftPpm: 0,
      effectiveSampleRate: 48000,
      audioLatencyMs: 42,
      lastEventDescription: 'Pipeline inicializado en espera.',
      bluetoothState: 'handshake_connected',
      bluetoothCountdownSeconds: 5,
      connectedPhone: DiPlayAudioEngine.KNOWN_PHONES[0],
      detectedKnownPhones: DiPlayAudioEngine.KNOWN_PHONES,
      isConflictPromptOpen: false,
    };
  }

  /**
   * Simulates radio detecting 2 known phones at the same time in the car
   */
  public triggerDualPhoneDetection() {
    this.metrics.isConflictPromptOpen = true;
    this.metrics.detectedKnownPhones = [...DiPlayAudioEngine.KNOWN_PHONES];
    this.metrics.lastEventDescription = '⚠️ 2 teléfonos conocidos detectados. Selección obligatoria (Solo 1 permitido).';
    this.notifyMetrics();
  }

  /**
   * User selects which phone will exclusively connect to CarPlay
   */
  public async selectPhoneToConnect(phoneId: string) {
    const selected = DiPlayAudioEngine.KNOWN_PHONES.find((p) => p.id === phoneId) || DiPlayAudioEngine.KNOWN_PHONES[0];
    this.metrics.connectedPhone = selected;
    this.metrics.isConflictPromptOpen = false;
    this.metrics.lastEventDescription = `✅ Conectado exclusivamente a ${selected.name} (${selected.owner}). El segundo teléfono queda en espera.`;
    this.notifyMetrics();

    // Start playback and the 5-second countdown to disconnect Bluetooth
    await this.start();
  }

  public closeConflictPrompt() {
    this.metrics.isConflictPromptOpen = false;
    this.notifyMetrics();
  }

  public updateConfig(newConfig: Partial<AudioEngineConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.config.pipelineMode === 'original') {
      this.targetBufferOccupancyMs = 20; // Original tiny fixed buffer
    } else {
      this.targetBufferOccupancyMs = this.config.jitterBufferSizeMs;
    }
  }

  public subscribeMetrics(callback: (m: AudioEngineMetrics) => void): () => void {
    this.metricsCallbacks.add(callback);
    callback(this.metrics);
    return () => this.metricsCallbacks.delete(callback);
  }

  private notifyMetrics() {
    this.metricsCallbacks.forEach((cb) => cb({ ...this.metrics }));
  }

  public async start(): Promise<void> {
    if (this.isRunning && this.audioCtx) return;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new AudioContextClass({
      sampleRate: 48000,
      latencyHint: 'interactive',
    });

    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.sampleRate = this.audioCtx.sampleRate;
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.audioCtx.currentTime);

    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.8;

    const bufferSize = 1024;
    this.scriptProcessor = this.audioCtx.createScriptProcessor(bufferSize, 0, 2);
    this.scriptProcessor.onaudioprocess = (e) => this.processAudio(e);

    this.scriptProcessor.connect(this.analyserNode);
    this.analyserNode.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);

    this.isRunning = true;
    this.metrics.isPlaying = true;
    this.metrics.lastEventDescription = 'CarPlay conectado: enlace Wi-Fi verificado';

    // Start Bluetooth 5-second countdown timer if enabled
    this.startBluetoothAutoDisconnectTimer();

    this.notifyMetrics();

    // Start 100ms ticker for metrics
    this.intervalId = window.setInterval(() => {
      this.updatePeriodicMetrics();
    }, 100);
  }

  /**
   * 5-second timer after stable connection to disconnect Bluetooth radio
   */
  private startBluetoothAutoDisconnectTimer() {
    if (this.bluetoothTimerId) {
      clearInterval(this.bluetoothTimerId);
      this.bluetoothTimerId = null;
    }

    if (!this.config.autoDisconnectBluetoothAfter5s) {
      this.metrics.bluetoothState = 'handshake_connected';
      this.metrics.bluetoothCountdownSeconds = 0;
      return;
    }

    this.bluetoothCountdown = 5;
    this.metrics.bluetoothCountdownSeconds = 5;
    this.metrics.bluetoothState = 'countdown_5s';
    this.metrics.lastEventDescription = 'Enlace Wi-Fi estable: desconectando Bluetooth en 5s para evitar colisiones RF...';

    this.bluetoothTimerId = window.setInterval(() => {
      this.bluetoothCountdown -= 1;
      this.metrics.bluetoothCountdownSeconds = Math.max(0, this.bluetoothCountdown);

      if (this.bluetoothCountdown <= 0) {
        if (this.bluetoothTimerId) {
          clearInterval(this.bluetoothTimerId);
          this.bluetoothTimerId = null;
        }
        this.metrics.bluetoothState = 'disconnected_optimized';
        this.bluetoothCollisionActive = false; // No more BT collisions!
        this.metrics.lastEventDescription = '✅ Bluetooth de la radio desconectado. Antena 100% dedicada a Wi-Fi CarPlay (Cero interferencias RF)';
        this.notifyMetrics();
      } else {
        this.metrics.lastEventDescription = `Enlace Wi-Fi estable: desconectando Bluetooth en ${this.bluetoothCountdown}s...`;
        this.notifyMetrics();
      }
    }, 1000);
  }

  public stop(): void {
    if (this.bluetoothTimerId) {
      clearInterval(this.bluetoothTimerId);
      this.bluetoothTimerId = null;
    }

    // Auto-restore Bluetooth when CarPlay is disconnected/stopped!
    if (this.metrics.bluetoothState === 'disconnected_optimized' || this.metrics.bluetoothState === 'countdown_5s') {
      this.metrics.bluetoothState = 'restoring_bluetooth';
      this.metrics.lastEventDescription = '🔄 CarPlay desconectado: reactivando Bluetooth de la radio automáticamente...';
      this.notifyMetrics();

      setTimeout(() => {
        this.metrics.bluetoothState = 'handshake_connected';
        this.metrics.bluetoothCountdownSeconds = 5;
        this.metrics.lastEventDescription = '✅ Bluetooth de la radio reactivado para llamadas manos libres del coche.';
        this.notifyMetrics();
      }, 1000);
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
    this.isRunning = false;
    this.metrics.isPlaying = false;
    this.notifyMetrics();
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioCtx.currentTime);
    }
  }

  public getAnalyserData(timeDomainArray: Uint8Array, frequencyArray: Uint8Array) {
    if (this.analyserNode) {
      (this.analyserNode as unknown as { getByteTimeDomainData: (arr: Uint8Array) => void; getByteFrequencyData: (arr: Uint8Array) => void }).getByteTimeDomainData(timeDomainArray);
      (this.analyserNode as unknown as { getByteTimeDomainData: (arr: Uint8Array) => void; getByteFrequencyData: (arr: Uint8Array) => void }).getByteFrequencyData(frequencyArray);
    } else {
      timeDomainArray.fill(128);
      frequencyArray.fill(0);
    }
  }

  // Stress tests
  public triggerWifiJitterBurst(durationMs: number = 1200) {
    this.wifiBurstActive = true;
    this.wifiBurstRemainingMs = durationMs;
    this.metrics.lastEventDescription = `⚠️ Ráfaga de interferencia Wi-Fi 2.4GHz (${durationMs}ms)`;
    this.notifyMetrics();
  }

  public triggerCpuSpike(durationMs: number = 800) {
    this.cpuSpikeActive = true;
    this.cpuSpikeRemainingMs = durationMs;
    this.metrics.lastEventDescription = `⚠️ Bloqueo de hilo CPU / Garbage Collection (${durationMs}ms)`;
    this.notifyMetrics();
  }

  public triggerClockDriftSlip() {
    this.clockDriftRatio = 0.9985; // 1500 PPM drift
    this.metrics.driftPpm = 1500;
    this.metrics.lastEventDescription = '⚠️ Desfase de reloj 44.1kHz vs 48.0kHz (1500 PPM drift)';
    this.notifyMetrics();
    setTimeout(() => {
      this.clockDriftRatio = 1.0;
      this.metrics.driftPpm = 0;
    }, 4000);
  }

  public triggerBluetoothCollision() {
    this.bluetoothCollisionActive = true;
    this.bluetoothCollisionRemainingMs = 1500;
    this.metrics.lastEventDescription = '⚠️ Conflicto de audio Bluetooth A2DP del vehículo';
    this.notifyMetrics();
  }

  /**
   * Generates continuous automotive synth music (AirPlay PCM stream at 44.1kHz source rate)
   */
  private generateAirPlayPcmChunk(chunkSize: number): { left: Float32Array; right: Float32Array } {
    const left = new Float32Array(chunkSize);
    const right = new Float32Array(chunkSize);
    const dt = 1.0 / 44100; // AirPlay transmits raw 44.1 kHz PCM
    const bpm = this.tempoBpm;
    const beatSec = 60 / bpm;

    for (let i = 0; i < chunkSize; i++) {
      const t = this.playbackTime + i * dt;
      const beat = (t / beatSec) % 16; // 16-beat loop

      // Bassline (Groovy 80s synth bass)
      const bassNotes = [36, 36, 38, 41, 43, 41, 38, 36]; // MIDI note numbers
      const noteIdx = Math.floor(beat * 2) % bassNotes.length;
      const midiNote = bassNotes[noteIdx];
      const bassFreq = 440 * Math.pow(2, (midiNote - 69) / 12);
      
      const bassPhase = 2 * Math.PI * bassFreq * t;
      const bassEnv = Math.max(0, 1.0 - ((beat * 2) % 1) * 1.5);
      // Sawtooth-like bass harmonics
      const bassSample = (Math.sin(bassPhase) + 0.5 * Math.sin(bassPhase * 2) + 0.25 * Math.sin(bassPhase * 3)) * 0.28 * bassEnv;

      // Kick drum on beats 0, 1, 2, 3
      const kickBeat = beat % 1;
      const kickEnv = Math.exp(-kickBeat * 14);
      const kickFreq = 120 * Math.exp(-kickBeat * 20) + 45;
      const kickSample = Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * 0.35;

      // Snare on beats 1 and 3
      const snareBeat = (beat + 1) % 2;
      let snareSample = 0;
      if (snareBeat < 0.2) {
        const snareEnv = Math.exp(-snareBeat * 25);
        const noise = (Math.random() * 2 - 1);
        snareSample = noise * snareEnv * 0.2;
      }

      // Chord Pad / Lead melody
      const padFreq1 = 440 * Math.pow(2, (60 - 69) / 12); // C4
      const padFreq2 = 440 * Math.pow(2, (64 - 69) / 12); // E4
      const padFreq3 = 440 * Math.pow(2, (67 - 69) / 12); // G4
      const padSample = (
        Math.sin(2 * Math.PI * padFreq1 * t) +
        Math.sin(2 * Math.PI * padFreq2 * t) +
        Math.sin(2 * Math.PI * padFreq3 * t)
      ) * 0.06;

      // Stereo spread
      left[i] = bassSample + kickSample + snareSample + padSample * 0.9;
      right[i] = bassSample + kickSample + snareSample + padSample * 1.1;
    }

    this.playbackTime += chunkSize * dt;
    return { left, right };
  }

  /**
   * Main DSP Audio Process Callback
   */
  private processAudio(e: AudioProcessingEvent) {
    const outL = e.outputBuffer.getChannelData(0);
    const outR = e.outputBuffer.getChannelData(1);
    const frameCount = outL.length; // 1024
    const dtMs = (frameCount / this.sampleRate) * 1000;

    // Decay stress events
    let isWifiDrop = false;
    if (this.wifiBurstActive) {
      this.wifiBurstRemainingMs -= dtMs;
      if (this.wifiBurstRemainingMs <= 0) {
        this.wifiBurstActive = false;
      }
      isWifiDrop = true;
    }

    let isCpuDrop = false;
    if (this.cpuSpikeActive) {
      this.cpuSpikeRemainingMs -= dtMs;
      if (this.cpuSpikeRemainingMs <= 0) {
        this.cpuSpikeActive = false;
      }
      isCpuDrop = true;
    }

    let isBtDrop = false;
    if (this.bluetoothCollisionActive) {
      this.bluetoothCollisionRemainingMs -= dtMs;
      if (this.bluetoothCollisionRemainingMs <= 0) {
        this.bluetoothCollisionActive = false;
      }
      isBtDrop = true;
    }

    this.metrics.packetsTotal++;

    // Generate fresh incoming raw packet (AirPlay 44.1kHz chunk)
    // At 44.1kHz to 48kHz, 1024 output frames require approx 940 input frames
    const inputFramesNeeded = Math.round(frameCount * (44100 / 48000));
    const rawChunk = this.generateAirPlayPcmChunk(inputFramesNeeded);

    // =========================================================================
    // PIPELINE BRANCH 1: ORIGINAL DIPLAY (Suffers from Microcortes)
    // =========================================================================
    if (this.config.pipelineMode === 'original') {
      // 1. Thread priority is normal (0) -> CPU spikes cause audio starvation
      // 2. Wi-Fi has no high-perf lock and no WMM Voice QoS -> packet drops on bursts
      // 3. AudioTrack buffer is tiny (~16-20ms) -> underrun causes harsh silence/clicks
      // 4. No resampler or PLL -> 44.1k to 48k clock drift causes periodic frame drops

      const isPacketDropped = (isWifiDrop && Math.random() < 0.75) || 
                              (isCpuDrop && Math.random() < 0.85) || 
                              (isBtDrop && Math.random() < 0.90) ||
                              (this.clockDriftRatio !== 1.0 && Math.random() < 0.35);

      if (isPacketDropped) {
        // Hard microcut! Output silence or abrupt glitch
        this.metrics.underrunCount++;
        this.metrics.packetsDropped++;
        this.metrics.currentJitterMs = 65 + Math.random() * 40;
        this.metrics.bufferOccupancyMs = Math.max(0, this.metrics.bufferOccupancyMs - 15);
        this.metrics.lastEventDescription = isWifiDrop
          ? '❌ Microcorte: Pérdida de paquetes Wi-Fi 2.4GHz (Buffer Underrun)'
          : isCpuDrop
          ? '❌ Microcorte: Preemption por CPU/GC (Falta prioridad URGENT_AUDIO)'
          : isBtDrop
          ? '❌ Microcorte: Interferencia con perfil Bluetooth A2DP del auto'
          : '❌ Microcorte: Salto de sincronización de reloj (44.1k vs 48k)';

        // Produce audible click / dropout typical of Android AudioTrack underruns
        for (let i = 0; i < frameCount; i++) {
          outL[i] = 0;
          outR[i] = 0;
        }
        return;
      }

      // In original DiPlay, audio is resampled naively or dumped into AudioTrack at 44.1k
      // Simple linear expansion with clock slip
      for (let i = 0; i < frameCount; i++) {
        const inIdx = Math.min(inputFramesNeeded - 1, Math.floor(i * (inputFramesNeeded / frameCount)));
        outL[i] = rawChunk.left[inIdx];
        outR[i] = rawChunk.right[inIdx];
      }

      this.metrics.bufferOccupancyMs = 18 + Math.sin(Date.now() / 500) * 4;
      this.metrics.currentJitterMs = 12 + (isWifiDrop ? 35 : 0);
      return;
    }

    // =========================================================================
    // PIPELINE BRANCH 2: FORK AUDIOFIX (Zero-Drop Audio Engine)
    // =========================================================================
    // 1. Thread priority is THREAD_PRIORITY_URGENT_AUDIO (-19 nice) -> immune to CPU load
    // 2. Wi-Fi High Perf lock + DSCP 46 Voice Priority -> network drops reduced drastically
    // 3. Adaptive Jitter Buffer (RingBuffer 100ms-180ms) -> absorbs network bursts
    // 4. Packet Loss Concealment (PLC) -> if a packet is truly lost, smoothly extrapolates waveform
    // 5. Native Polyphase Sinc Resampler with PLL -> perfectly converts 44.1k to 48.0k with 0 drift

    // Even if Wi-Fi has extreme drop, our jitter buffer or PLC covers it
    const severePacketDrop = isWifiDrop && Math.random() < 0.25;

    if (severePacketDrop && this.config.packetLossConcealment) {
      // Zero-drop PLC in action: smooth overlap-add extrapolation from history
      this.metrics.packetsRecovered++;
      this.metrics.currentJitterMs = 38 + Math.random() * 15;
      this.metrics.lastEventDescription = '🛡️ PLC Activo: Paquete interpolado sin corte audible';

      for (let i = 0; i < frameCount; i++) {
        const histIdx = (this.plcHistoryIndex + i) % this.lastGoodSamplesL.length;
        // Fade smoothly to prevent abrupt DC clicks
        const fade = Math.max(0.2, 1.0 - (i / frameCount) * 0.4);
        outL[i] = this.lastGoodSamplesL[histIdx] * fade;
        outR[i] = this.lastGoodSamplesR[histIdx] * fade;
      }
      return;
    }

    // Native High-Quality Resampler with PLL Clock-Drift Compensation:
    // Ratio = (44100 / 48000) * driftCompensationFactor
    // We adjust phase dynamically to maintain stable buffer occupancy
    const bufferError = (this.targetBufferOccupancyMs - this.metrics.bufferOccupancyMs) / 1000;
    const pllAdjust = this.config.clockDriftCompensation ? Math.max(-0.005, Math.min(0.005, bufferError * 0.05)) : 0;
    const resampleRatio = (44100 / 48000) * (1.0 + pllAdjust);

    for (let i = 0; i < frameCount; i++) {
      this.phaseAccumulator += resampleRatio;
      const inIdx = Math.floor(this.phaseAccumulator);
      const frac = this.phaseAccumulator - inIdx;

      let sL = 0;
      let sR = 0;

      if (inIdx < inputFramesNeeded - 1) {
        // Cubic Hermite or Linear interpolation
        sL = rawChunk.left[inIdx] * (1 - frac) + rawChunk.left[inIdx + 1] * frac;
        sR = rawChunk.right[inIdx] * (1 - frac) + rawChunk.right[inIdx + 1] * frac;
      } else {
        sL = rawChunk.left[inputFramesNeeded - 1];
        sR = rawChunk.right[inputFramesNeeded - 1];
      }

      outL[i] = sL;
      outR[i] = sR;

      // Save into PLC circular history
      const histPos = (this.plcHistoryIndex + i) % this.lastGoodSamplesL.length;
      this.lastGoodSamplesL[histPos] = sL;
      this.lastGoodSamplesR[histPos] = sR;
    }

    this.phaseAccumulator %= inputFramesNeeded;
    this.plcHistoryIndex = (this.plcHistoryIndex + frameCount) % this.lastGoodSamplesL.length;

    // Buffer occupancy in Fork stays solid around target (e.g. 100ms - 120ms)
    this.metrics.bufferOccupancyMs = this.config.jitterBufferSizeMs + Math.sin(Date.now() / 800) * 5;
    this.metrics.currentJitterMs = isWifiDrop ? 18 : 3.5;
    this.metrics.audioLatencyMs = Math.round(this.config.jitterBufferSizeMs * 0.45 + 16);
  }

  private updatePeriodicMetrics() {
    this.notifyMetrics();
  }

  public resetCounters() {
    this.metrics.underrunCount = 0;
    this.metrics.packetsTotal = 0;
    this.metrics.packetsDropped = 0;
    this.metrics.packetsRecovered = 0;
    this.metrics.lastEventDescription = 'Contadores de diagnóstico reiniciados.';
    this.notifyMetrics();
  }
}
