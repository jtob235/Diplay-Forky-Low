/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type HeadUnitPlatform = 
  | 'byd_dilink_4'
  | 'byd_dilink_3'
  | 'byd_dilink_5'
  | 'geely_galaxy'
  | 'generic_qualcomm'
  | 'generic_uis7862';

export interface VehicleProfile {
  id: HeadUnitPlatform;
  name: string;
  soc: string;
  androidVersion: string;
  defaultSampleRate: number; // usually 48000 Hz
  nativeBufferSize: number; // e.g. 960 or 1920 frames
  notes: string;
}

export type AudioPipelineMode = 'original' | 'patched';

export type BluetoothAutoState = 
  | 'idle_disabled'
  | 'handshake_connected'
  | 'countdown_5s'
  | 'disconnected_optimized'
  | 'restoring_bluetooth';

export interface AudioEngineConfig {
  pipelineMode: AudioPipelineMode;
  targetSampleRate: number; // 48000
  sourceSampleRate: number; // 44100 (AirPlay default)
  jitterBufferSizeMs: number; // 60 - 250 ms
  adaptiveJitterEnabled: boolean;
  packetLossConcealment: boolean; // Overlap-Add PLC
  clockDriftCompensation: boolean; // PLL Resampling
  threadPriorityUrgent: boolean; // THREAD_PRIORITY_URGENT_AUDIO (-19)
  wifiHighPerfLock: boolean; // WIFI_MODE_FULL_HIGH_PERF
  wifiQosDscpVoice: boolean; // DSCP 46 / AC_VO
  bluetoothA2dpSuppression: boolean; // Suppress car Bluetooth audio collision
  autoDisconnectBluetoothAfter5s: boolean; // Desconectar BT 5s tras conexión estable y reactivar al salir
  hardwareBufferMultiplier: number; // 2x or 3x minBufferSize
}

export interface KnownPhone {
  id: string;
  name: string;
  model: string;
  owner: string;
  rssi: number; // e.g. -52 dBm (signal strength)
  battery: number; // percentage
  isLastUsed: boolean;
  macAddress: string;
  isDriverPhone?: boolean;
}

export interface AudioEngineMetrics {
  isPlaying: boolean;
  underrunCount: number;
  packetsTotal: number;
  packetsDropped: number;
  packetsRecovered: number;
  currentJitterMs: number;
  bufferOccupancyMs: number;
  driftPpm: number;
  effectiveSampleRate: number;
  audioLatencyMs: number;
  lastEventDescription: string;
  bluetoothState: BluetoothAutoState;
  bluetoothCountdownSeconds: number;
  connectedPhone: KnownPhone | null;
  detectedKnownPhones: KnownPhone[];
  isConflictPromptOpen: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  coverColor: string;
  coverImage?: string;
  genre: string;
}

export type ActiveApp = 'dashboard' | 'maps' | 'music' | 'phone' | 'settings' | 'lab';
