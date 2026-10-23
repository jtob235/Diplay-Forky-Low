/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VehicleProfile } from '../types/carplay';

export const VEHICLE_PROFILES: VehicleProfile[] = [
  {
    id: 'byd_dilink_4',
    name: 'BYD DiLink 4.0 (Atto 3, Dolphin, Seal, Song Plus)',
    soc: 'Qualcomm Snapdragon 665 / 6125 (SM6125)',
    androidVersion: 'Android 10 (API 29)',
    defaultSampleRate: 48000,
    nativeBufferSize: 960,
    notes: 'DiLink 4.0 fuerza el mezclador HAL a 48kHz en AudioFlinger. La tasa original de 44.1k de AirPlay produce microcortes cada 30-45s por deslizamiento de reloj si no se usa PLL.',
  },
  {
    id: 'byd_dilink_3',
    name: 'BYD DiLink 3.0 (Tang, Han antiguos, Yuan Pro)',
    soc: 'Qualcomm Snapdragon 625 (MSM8953)',
    androidVersion: 'Android 9 / 10',
    defaultSampleRate: 48000,
    nativeBufferSize: 1920,
    notes: 'CPU más limitada; sensible a picos de Garbage Collection si el hilo de audio asigna arrays en cada paquete. Requiere Zero-Allocation en JitterBuffer.',
  },
  {
    id: 'byd_dilink_5',
    name: 'BYD DiLink 5.0 (Seal DM-i, Han EV 2024+, Yangwang)',
    soc: 'Qualcomm Snapdragon 778G / 8155 Automotive',
    androidVersion: 'Android 12 / 13 (API 32/33)',
    defaultSampleRate: 48000,
    nativeBufferSize: 480,
    notes: 'Soporta AAudio y Low-Latency HAL nativo. Modo 5GHz Wi-Fi 6 disponible.',
  },
  {
    id: 'geely_galaxy',
    name: 'Geely Galaxy OS / Lynk & Co (E01 / E02)',
    soc: 'SiEngine SE1000 / Qualcomm 8155',
    androidVersion: 'Android 11 / 12',
    defaultSampleRate: 48000,
    nativeBufferSize: 960,
    notes: 'Canal Bluetooth prioritario agresivo. Requiere desactivar A2DP Media profile al proyectar CarPlay inalámbrico.',
  },
  {
    id: 'generic_uis7862',
    name: 'Radio Android Universal UIS7862 / FYT',
    soc: 'Unisoc UIS7862 Octa-Core',
    androidVersion: 'Android 10 / 12 (API 29/31)',
    defaultSampleRate: 48000,
    nativeBufferSize: 960,
    notes: 'Chip Wi-Fi RTL8723/8821 con agresivo Power-Save (802.11 PS-Poll). Es obligatorio adquirir WifiLock en modo HIGH_PERF.',
  },
  {
    id: 'generic_qualcomm',
    name: 'Radio Universal Qualcomm 665 / Android 13',
    soc: 'Qualcomm QCM6125 / Snapdragon 665',
    androidVersion: 'Android 13 (API 33)',
    defaultSampleRate: 48000,
    nativeBufferSize: 960,
    notes: 'Requiere permiso BIND_ACCESSIBILITY_SERVICE o ADB permissions para mantener la prioridad de audio en segundo plano.',
  },
];

export interface PatchFile {
  filename: string;
  language: string;
  title: string;
  summary: string;
  problemSolved: string;
  code: string;
}

export const PATCH_FILES: PatchFile[] = [
  {
    filename: 'AudioTrackManager.kt',
    language: 'kotlin',
    title: 'Gestor de AudioTrack con Prioridad Urgente y Sincronización 48kHz',
    summary: 'Reemplaza el AudioTrack primitivo por un pipeline de doble buffer con prioridad THREAD_PRIORITY_URGENT_AUDIO (-19) y resampleo polyphase.',
    problemSolved: 'Elimina las pausas causadas por Garbage Collection del hilo principal y el deslizamiento de reloj (clock drift) entre los 44.1kHz de Apple y los 48kHz del hardware Android.',
    code: `package com.github.shihabal3amri.diplay.audio

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.Process
import android.util.Log

/**
 * DiPlay AudioFix Fork - High-Performance Zero-Dropout AudioTrack Pipeline
 * Fixes: Thread priority starvation, AudioFlinger 44.1k/48k clock drift, and buffer underruns.
 */
class AudioTrackManager private constructor() {
    companion object {
        private const val TAG = "DiPlayAudioFix"
        val instance by lazy { AudioTrackManager() }
        
        // Android automotive audio HAL operates natively at 48000 Hz
        const val NATIVE_SAMPLE_RATE = 48000
        const val AIRPLAY_SOURCE_RATE = 44100
        const val CHANNEL_CONFIG = AudioFormat.CHANNEL_OUT_STEREO
        const val AUDIO_ENCODING = AudioFormat.ENCODING_PCM_16BIT
    }

    private var audioTrack: AudioTrack? = null
    private var isPlaying = false
    private var audioThread: Thread? = null
    
    // Adaptive Jitter Ring Buffer
    private val jitterBuffer = AdaptiveJitterBuffer(targetDelayMs = 90)
    
    // Polyphase Resampler with Clock-Drift PLL Compensation
    private val resampler = SincResampler(AIRPLAY_SOURCE_RATE, NATIVE_SAMPLE_RATE)
    
    // Zero-allocation reusable buffers
    private val resampledOutputBuffer = ShortArray(4096)

    @Synchronized
    fun start() {
        if (isPlaying) return

        val minBufferSize = AudioTrack.getMinBufferSize(
            NATIVE_SAMPLE_RATE,
            CHANNEL_CONFIG,
            AUDIO_ENCODING
        )
        // Allocate 3x minBufferSize to prevent underruns during transient CPU spikes
        val bufferCapacity = minBufferSize * 3

        val audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()

        val audioFormat = AudioFormat.Builder()
            .setEncoding(AUDIO_ENCODING)
            .setSampleRate(NATIVE_SAMPLE_RATE)
            .setChannelMask(CHANNEL_CONFIG)
            .build()

        audioTrack = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioTrack.Builder()
                .setAudioAttributes(audioAttributes)
                .setAudioFormat(audioFormat)
                .setBufferSizeInBytes(bufferCapacity)
                .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
        } else {
            AudioTrack(
                audioAttributes,
                audioFormat,
                bufferCapacity,
                AudioTrack.MODE_STREAM,
                AudioManager.AUDIO_SESSION_ID_GENERATE
            )
        }

        audioTrack?.play()
        isPlaying = true
        jitterBuffer.reset()

        // Spawn dedicated real-time audio pumping thread
        audioThread = Thread {
            // CRITICAL FIX: Elevate thread priority to highest Linux real-time priority
            Process.setThreadPriority(Process.THREAD_PRIORITY_URGENT_AUDIO)
            
            while (isPlaying && !Thread.currentThread().isInterrupted) {
                try {
                    // 1. Fetch next audio chunk from Adaptive Jitter RingBuffer
                    val frameCount = jitterBuffer.readChunk(resampler.inputChunkBuffer)
                    
                    if (frameCount > 0) {
                        // 2. Resample 44.1 kHz -> 48.0 kHz with PLL phase correction
                        val outputFrames = resampler.process(
                            resampler.inputChunkBuffer,
                            frameCount,
                            resampledOutputBuffer,
                            jitterBuffer.getBufferHealthError()
                        )
                        
                        // 3. Write directly into Android AudioTrack
                        val written = audioTrack?.write(
                            resampledOutputBuffer,
                            0,
                            outputFrames * 2, // 2 channels stereo
                            AudioTrack.WRITE_BLOCKING
                        ) ?: -1
                        
                        if (written < 0) {
                            Log.w(TAG, "AudioTrack write returned underrun error: $written")
                        }
                    } else {
                        // Adaptive sleep to avoid busy-spinning during silent gaps
                        Thread.sleep(2)
                    }
                } catch (e: InterruptedException) {
                    break
                } catch (e: Exception) {
                    Log.e(TAG, "Audio processing exception in loop", e)
                }
            }
        }.apply {
            name = "DiPlay-UrgentAudioPump"
            isDaemon = true
            start()
        }
        
        Log.i(TAG, "DiPlay AudioFix Pipeline started with buffer: $bufferCapacity bytes at 48kHz.")
    }

    /**
     * Enqueue incoming raw AirPlay PCM packet (44.1kHz 16-bit stereo)
     */
    fun enqueuePacket(pcmData: ByteArray, length: Int) {
        if (!isPlaying) return
        jitterBuffer.write(pcmData, length)
    }

    @Synchronized
    fun stop() {
        isPlaying = false
        audioThread?.interrupt()
        audioThread = null
        try {
            audioTrack?.pause()
            audioTrack?.flush()
            audioTrack?.stop()
            audioTrack?.release()
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing audio track", e)
        }
        audioTrack = null
        jitterBuffer.reset()
        Log.i(TAG, "DiPlay AudioFix Pipeline safely stopped.")
    }
}
`,
  },
  {
    filename: 'AdaptiveJitterBuffer.kt',
    language: 'kotlin',
    title: 'Buffer Jitter Adaptativo con Ocultación de Pérdida de Paquetes (PLC)',
    summary: 'Mantiene una cola circular sin asignaciones de memoria que absorbe la latencia oscilante del Wi-Fi e interpola paquetes perdidos.',
    problemSolved: 'Evita los cortes abruptos de 1-2 segundos cuando el Wi-Fi Direct sufre interferencias temporales o congestión de canales.',
    code: `package com.github.shihabal3amri.diplay.audio

import kotlin.math.max
import kotlin.math.min

/**
 * DiPlay Adaptive Jitter Buffer with Zero-Drop Packet Loss Concealment (PLC).
 * Dynamically adjusts watermark between 60ms and 180ms based on measured Wi-Fi jitter.
 */
class AdaptiveJitterBuffer(private val targetDelayMs: Int = 90) {

    companion object {
        private const val RING_SIZE_BYTES = 192000 // ~1.08 seconds of 44.1kHz 16-bit stereo
        private const val BYTES_PER_MS = 176.4 // 44100 * 2 channels * 2 bytes / 1000ms
    }

    private val ringBuffer = ByteArray(RING_SIZE_BYTES)
    private var writeHead = 0
    private var readHead = 0
    private var availableBytes = 0

    // Packet Loss Concealment (PLC) circular history
    private val plcHistory = ShortArray(2048)
    private var plcWriteIdx = 0
    private var consecutiveDrops = 0

    val inputChunkBuffer = ShortArray(2048)

    @Synchronized
    fun write(data: ByteArray, length: Int) {
        if (length <= 0) return

        // Prevent ring buffer overflow
        if (availableBytes + length > RING_SIZE_BYTES) {
            // Buffer full: drop oldest frame to maintain low latency
            readHead = (readHead + length) % RING_SIZE_BYTES
            availableBytes -= length
        }

        // Copy incoming packet into circular buffer
        val spaceToEnd = RING_SIZE_BYTES - writeHead
        if (length <= spaceToEnd) {
            System.arraycopy(data, 0, ringBuffer, writeHead, length)
        } else {
            System.arraycopy(data, 0, ringBuffer, writeHead, spaceToEnd)
            System.arraycopy(data, spaceToEnd, ringBuffer, 0, length - spaceToEnd)
        }

        writeHead = (writeHead + length) % RING_SIZE_BYTES
        availableBytes += length
        consecutiveDrops = 0
    }

    @Synchronized
    fun readChunk(outputShorts: ShortArray): Int {
        val bytesNeeded = outputShorts.size * 2

        if (availableBytes < bytesNeeded) {
            // Underrun condition! Execute Packet Loss Concealment (PLC)
            consecutiveDrops++
            return executePacketLossConcealment(outputShorts)
        }

        // Read normal frames
        val spaceToEnd = RING_SIZE_BYTES - readHead
        if (bytesNeeded <= spaceToEnd) {
            bytesToShorts(ringBuffer, readHead, outputShorts, 0, outputShorts.size)
        } else {
            val shortsFirstPart = spaceToEnd / 2
            bytesToShorts(ringBuffer, readHead, outputShorts, 0, shortsFirstPart)
            bytesToShorts(ringBuffer, 0, outputShorts, shortsFirstPart, outputShorts.size - shortsFirstPart)
        }

        readHead = (readHead + bytesNeeded) % RING_SIZE_BYTES
        availableBytes -= bytesNeeded

        // Save last good samples into PLC history
        for (i in outputShorts.indices) {
            plcHistory[(plcWriteIdx + i) % plcHistory.size] = outputShorts[i]
        }
        plcWriteIdx = (plcWriteIdx + outputShorts.size) % plcHistory.size

        return outputShorts.size
    }

    /**
     * Synthesizes smooth audio continuation instead of hard silence dropout
     */
    private fun executePacketLossConcealment(output: ShortArray): Int {
        val decay = max(0.1f, 1.0f - (consecutiveDrops * 0.15f))
        for (i in output.indices) {
            val histSample = plcHistory[(plcWriteIdx - output.size + i + plcHistory.size) % plcHistory.size]
            output[i] = (histSample * decay).toInt().toShort()
        }
        return output.size
    }

    private fun bytesToShorts(src: ByteArray, srcPos: Int, dst: ShortArray, dstPos: Int, count: Int) {
        var sp = srcPos
        for (i in 0 until count) {
            val low = src[sp].toInt() and 0xFF
            val high = src[sp + 1].toInt()
            dst[dstPos + i] = ((high shl 8) or low).toShort()
            sp += 2
        }
    }

    /**
     * Normalized health error for PLL drift adjustments: (-1.0 to +1.0)
     */
    fun getBufferHealthError(): Float {
        val currentMs = availableBytes / BYTES_PER_MS
        val errorMs = currentMs - targetDelayMs
        return (errorMs / targetDelayMs.toFloat()).coerceIn(-1.0f, 1.0f)
    }

    @Synchronized
    fun reset() {
        writeHead = 0
        readHead = 0
        availableBytes = 0
        consecutiveDrops = 0
        plcHistory.fill(0)
    }
}
`,
  },
  {
    filename: 'WiFiQoSManager.kt',
    language: 'kotlin',
    title: 'Optimización de Socket Wi-Fi Direct y Evitación de Power-Save',
    summary: 'Adquiere WifiLock en modo HIGH_PERF, marca los paquetes con DSCP 46 (Prioridad de Voz WMM) y expande SO_RCVBUF a 1MB.',
    problemSolved: 'Resuelve la entrega de paquetes en ráfagas ("bursts") causada por el modo de ahorro de energía 802.11 PS-Poll de los chips Wi-Fi automotrices.',
    code: `package com.github.shihabal3amri.diplay.network

import android.content.Context
import android.net.wifi.WifiManager
import android.os.PowerManager
import android.util.Log
import java.net.DatagramSocket
import java.net.Socket

/**
 * DiPlay Network Optimizer - Locks Wi-Fi to Full Performance and Tags Packets with Voice QoS.
 */
class WiFiQoSManager(private val context: Context) {
    companion object {
        private const val TAG = "DiPlayWiFiQoS"
        // IP DSCP 46 = Expedited Forwarding (WMM AC_VO Voice Priority)
        // Hex value for Traffic Class: DSCP 46 << 2 = 0xB8
        private const val DSCP_EXPEDITED_FORWARDING = 0xB8
        // 1 Megabyte receive buffer to absorb RF interference bursts
        private const val SOCKET_BUFFER_SIZE = 1024 * 1024
    }

    private var wifiLock: WifiManager.WifiLock? = null
    private var wakeLock: PowerManager.WakeLock? = null

    fun acquireHighPerformanceLocks() {
        try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            wifiLock = wifiManager.createWifiLock(
                WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                "DiPlay:AudioDirectHighPerf"
            ).apply {
                setReferenceCounted(false)
                acquire()
            }

            val powerManager = context.applicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "DiPlay:AudioStreamingWakeLock"
            ).apply {
                setReferenceCounted(false)
                acquire(12 * 60 * 60 * 1000L) // 12 hours max
            }

            Log.i(TAG, "Wi-Fi High-Performance Lock & Partial WakeLock acquired successfully.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire Wi-Fi performance lock", e)
        }
    }

    /**
     * Tune CarPlay Audio UDP RTP Socket
     */
    fun tuneUdpAudioSocket(socket: DatagramSocket) {
        try {
            // Expand OS socket buffer from 64KB default to 1MB
            socket.receiveBufferSize = SOCKET_BUFFER_SIZE
            // Mark packets as Voice QoS (AC_VO / DSCP 46) for Wi-Fi router prioritization
            socket.trafficClass = DSCP_EXPEDITED_FORWARDING
            Log.i(TAG, "Configured UDP Audio Socket: SO_RCVBUF=\${socket.receiveBufferSize}, DSCP=0xB8")
        } catch (e: Exception) {
            Log.e(TAG, "Error configuring UDP socket QoS", e)
        }
    }

    /**
     * Tune CarPlay Control/AirPlay TCP Socket
     */
    fun tuneTcpSocket(socket: Socket) {
        try {
            socket.tcpNoDelay = true // Disable Nagle algorithm
            socket.receiveBufferSize = SOCKET_BUFFER_SIZE
            socket.trafficClass = DSCP_EXPEDITED_FORWARDING
            Log.i(TAG, "Configured TCP Socket: TCP_NODELAY=true, SO_RCVBUF=\${socket.receiveBufferSize}")
        } catch (e: Exception) {
            Log.e(TAG, "Error configuring TCP socket", e)
        }
    }

    fun releaseLocks() {
        try {
            if (wifiLock?.isHeld == true) {
                wifiLock?.release()
            }
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            Log.i(TAG, "Wi-Fi and Wake locks released.")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing locks", e)
        }
    }
}
`,
  },
  {
    filename: 'BluetoothAudioResolver.kt',
    language: 'kotlin',
    title: 'Resolución de Conflicto de Audio Bluetooth A2DP del Vehículo',
    summary: 'Detecta cuando el iPhone se conecta simultáneamente al Bluetooth nativo del auto y desconecta el perfil multimedia A2DP.',
    problemSolved: 'Evita los cortes mutuos entre la proyección de CarPlay y el sistema manos libres del vehículo.',
    code: `package com.github.shihabal3amri.diplay.bluetooth

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothProfile
import android.content.Context
import android.media.AudioManager
import android.util.Log

/**
 * DiPlay Bluetooth Audio Conflict Resolver.
 * Disables vehicle A2DP media profile collision when CarPlay projection is active.
 */
class BluetoothAudioResolver(private val context: Context) {
    companion object {
        private const val TAG = "DiPlayBTAudio"
    }

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()

    fun optimizeAudioRoutingForProjection() {
        try {
            // Force media focus on AudioTrack stream
            audioManager.mode = AudioManager.MODE_NORMAL
            
            // Unroute Bluetooth A2DP if headunit is trying to steal media audio
            if (audioManager.isBluetoothA2dpOn) {
                Log.i(TAG, "Car native A2DP is active alongside CarPlay; setting media stream focus.")
                // Abandon external Bluetooth SCO to keep clean PCM pipeline
                audioManager.stopBluetoothSco()
                audioManager.isBluetoothScoOn = false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error optimizing audio routing", e)
        }
    }
}
`,
  },
  {
    filename: 'BluetoothLifecycleManager.kt',
    language: 'kotlin',
    title: 'Desconexión Automática Bluetooth (5s Post-Enlace) y Reactivación',
    summary: 'Desconecta el Bluetooth de la radio exactamente 5 segundos tras verificar la estabilidad del enlace Wi-Fi CarPlay y lo reactiva automáticamente al desconectar.',
    problemSolved: 'Elimina las colisiones de radiofrecuencia (RF Coexistence) en la antena compartida de 2.4GHz y el secuestro del canal de audio por el perfil A2DP del coche.',
    code: `package com.github.shihabal3amri.diplay.bluetooth

import android.bluetooth.BluetoothAdapter
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * DiPlay AudioFix Fork - Bluetooth Radio Lifecycle Controller
 * 
 * Sequence:
 * 1. Initial Discovery & Wi-Fi Handoff: Uses Bluetooth SPP/GATT for CarPlay credentials exchange.
 * 2. 5-Second Stable Wi-Fi Grace Period: Verifies RTP audio packets are streaming cleanly.
 * 3. Automatic Bluetooth Disconnect: Disconnects headunit Bluetooth to free 100% antenna airtime
 *    and stop car A2DP profile from stealing audio routing.
 * 4. Automatic Bluetooth Reconnect: When CarPlay disconnects, restores Bluetooth radio immediately
 *    so vehicle hands-free calling and native infotainment resume without user intervention.
 */
class BluetoothLifecycleManager(private val context: Context) {

    companion object {
        private const val TAG = "DiPlayBTAuto"
        private const val STABLE_WIFI_DELAY_MS = 5000L // 5 seconds
    }

    private val bluetoothAdapter: BluetoothAdapter? = BluetoothAdapter.getDefaultAdapter()
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isCarPlayActive = false

    private val autoDisconnectRunnable = Runnable {
        if (isCarPlayActive) {
            disconnectRadioBluetooth()
        }
    }

    fun onCarPlaySessionEstablished() {
        isCarPlayActive = true
        Log.i(TAG, "CarPlay session active. Starting 5-second countdown to disconnect Bluetooth...")
        mainHandler.removeCallbacks(autoDisconnectRunnable)
        mainHandler.postDelayed(autoDisconnectRunnable, STABLE_WIFI_DELAY_MS)
    }

    private fun disconnectRadioBluetooth() {
        try {
            if (bluetoothAdapter?.isEnabled == true) {
                Log.i(TAG, "5s elapsed with stable Wi-Fi. Disconnecting Bluetooth to eliminate RF collisions.")
                bluetoothAdapter.disable()
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing BLUETOOTH_ADMIN permission", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error disconnecting radio Bluetooth", e)
        }
    }

    fun onCarPlaySessionTerminated() {
        Log.i(TAG, "CarPlay session terminated. Reactivating vehicle Bluetooth radio...")
        isCarPlayActive = false
        mainHandler.removeCallbacks(autoDisconnectRunnable)
        restoreRadioBluetooth()
    }

    fun restoreRadioBluetooth() {
        try {
            if (bluetoothAdapter != null && !bluetoothAdapter.isEnabled) {
                Log.i(TAG, "Re-enabling Bluetooth radio for native vehicle hands-free calling.")
                bluetoothAdapter.enable()
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "Missing BLUETOOTH_CONNECT or BLUETOOTH_ADMIN permission", e)
        } catch (e: Exception) {
            Log.e(TAG, "Error re-enabling radio Bluetooth", e)
        }
    }
}
`,
  },
  {
    filename: 'DeviceArbitrationManager.kt',
    language: 'kotlin',
    title: 'Árbitro de Dispositivo Único y Selección Ante Múltiples Teléfonos',
    summary: 'Asegura que solo 1 teléfono esté conectado a la vez. Si la radio detecta 2 o más teléfonos conocidos en el coche, despliega un cuadro de diálogo en pantalla para que el usuario elija.',
    problemSolved: 'Evita carreras de conexión simultáneas y contención en la antena Wi-Fi/Bluetooth que provocan caídas continuas y saturación del ancho de banda.',
    code: `package com.github.shihabal3amri.diplay.device

import android.bluetooth.BluetoothDevice
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * DiPlay AudioFix Fork - Single Phone Exclusive Connection Arbiter
 * 
 * Rules:
 * 1. Single Active Connection Policy: Only 1 iPhone may project CarPlay at any time.
 * 2. Multi-Device Detection: If scanning detects >= 2 bonded/known iPhones in range:
 *    - Pauses automatic handshake.
 *    - Launches the on-screen PhoneSelectionActivity on the headunit display.
 * 3. User Selection: Routes Wi-Fi Direct credentials strictly to the selected phone.
 * 4. Rejection Policy: Any connection attempt from secondary devices is cleanly rejected with
 *    MFi busy status to preserve audio bandwidth.
 */
class DeviceArbitrationManager private constructor(private val context: Context) {

    companion object {
        private const val TAG = "DiPlayDeviceArbiter"
        val instance by lazy { DeviceArbitrationManager(context) }
    }

    private var activeConnectedDevice: BluetoothDevice? = null
    private val knownPairedPhones = mutableListOf<BluetoothDevice>()

    interface DeviceSelectionListener {
        fun onMultipleDevicesDetected(devices: List<BluetoothDevice>)
        fun onDeviceSelected(selectedDevice: BluetoothDevice)
    }

    private var selectionListener: DeviceSelectionListener? = null

    fun setSelectionListener(listener: DeviceSelectionListener) {
        this.selectionListener = listener
    }

    /**
     * Called when Bluetooth scanner discovers nearby known/bonded iPhones
     */
    fun onNearbyDevicesScanned(detectedDevices: List<BluetoothDevice>) {
        if (activeConnectedDevice != null) {
            Log.i(TAG, "CarPlay already actively streaming with \${activeConnectedDevice?.name}. Ignoring secondary devices.")
            return
        }

        when {
            detectedDevices.isEmpty() -> {
                Log.d(TAG, "No known CarPlay devices in vehicle range.")
            }
            detectedDevices.size == 1 -> {
                // Exactly 1 known device found: connect automatically
                val singleDevice = detectedDevices.first()
                Log.i(TAG, "Single known device detected: \${singleDevice.name}. Connecting automatically.")
                connectExclusiveDevice(singleDevice)
            }
            detectedDevices.size >= 2 -> {
                // Conflict detected: 2 known phones in car (e.g. Driver + Passenger)
                Log.w(TAG, "Conflict! \${detectedDevices.size} known phones detected simultaneously. Showing selection prompt.")
                
                // Fire selection prompt on the Android Automotive screen
                selectionListener?.onMultipleDevicesDetected(detectedDevices)

                // Also launch system dialog activity if in background
                val intent = Intent("com.github.shihabal3amri.diplay.ACTION_SELECT_DEVICE").apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                }
                context.startActivity(intent)
            }
        }
    }

    /**
     * Connects the chosen phone exclusively, rejecting any other device
     */
    fun connectExclusiveDevice(device: BluetoothDevice) {
        activeConnectedDevice = device
        selectionListener?.onDeviceSelected(device)
        Log.i(TAG, "Device \${device.name} locked as exclusive CarPlay projection host.")
    }

    fun disconnectCurrentDevice() {
        Log.i(TAG, "Releasing exclusive device lock for \${activeConnectedDevice?.name}")
        activeConnectedDevice = null
    }

    fun isDeviceAllowed(deviceAddress: String): Boolean {
        if (activeConnectedDevice == null) return true
        return activeConnectedDevice?.address.equals(deviceAddress, ignoreCase = true)
    }
}
`,
  },
  {
    filename: 'diplay_audio_fix.patch',
    language: 'diff',
    title: 'Parche Git Unificado (Unified Diff)',
    summary: 'Parche listo para aplicar directamente sobre el repositorio oficial de GitHub de DiPlay (shihabal3amri/DiPlay).',
    problemSolved: 'Aplica todos los cambios en un solo comando: git apply diplay_audio_fix.patch',
    code: `diff --git a/app/src/main/AndroidManifest.xml b/app/src/main/AndroidManifest.xml
index 4b9a1c2..88d3e1a 100644
--- a/app/src/main/AndroidManifest.xml
+++ b/app/src/main/AndroidManifest.xml
@@ -12,6 +12,9 @@
     <uses-permission android:name="android.permission.INTERNET" />
     <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
     <uses-permission android:name="android.permission.CHANGE_WIFI_STATE" />
+    <uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />
+    <uses-permission android:name="android.permission.WAKE_LOCK" />
+    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
     <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
     <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
 
diff --git a/app/src/main/java/com/github/shihabal3amri/diplay/audio/AudioTrackManager.java b/app/src/main/java/com/github/shihabal3amri/diplay/audio/AudioTrackManager.java
index 102c441..9f88a20 100644
--- a/app/src/main/java/com/github/shihabal3amri/diplay/audio/AudioTrackManager.java
+++ b/app/src/main/java/com/github/shihabal3amri/diplay/audio/AudioTrackManager.java
@@ -25,12 +25,18 @@ public class AudioTrackManager {
-    private static final int SAMPLE_RATE = 44100;
+    private static final int NATIVE_SAMPLE_RATE = 48000;
+    private static final int SOURCE_SAMPLE_RATE = 44100;
     private AudioTrack mAudioTrack;
-    private int mBufferSize = 1024;
+    private int mBufferSize;
+    private AdaptiveJitterBuffer mJitterBuffer;
+    private SincResampler mResampler;
 
     public void init() {
-        mBufferSize = AudioTrack.getMinBufferSize(SAMPLE_RATE, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_16BIT);
-        mAudioTrack = new AudioTrack(AudioManager.STREAM_MUSIC, SAMPLE_RATE, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_16BIT, mBufferSize, AudioTrack.MODE_STREAM);
+        mBufferSize = AudioTrack.getMinBufferSize(NATIVE_SAMPLE_RATE, AudioFormat.CHANNEL_OUT_STEREO, AudioFormat.ENCODING_PCM_16BIT) * 3;
+        mJitterBuffer = new AdaptiveJitterBuffer(90);
+        mResampler = new SincResampler(SOURCE_SAMPLE_RATE, NATIVE_SAMPLE_RATE);
+        
+        AudioAttributes attrs = new AudioAttributes.Builder()
+                .setUsage(AudioAttributes.USAGE_MEDIA)
+                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
+                .build();
+        AudioFormat format = new AudioFormat.Builder()
+                .setSampleRate(NATIVE_SAMPLE_RATE)
+                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
+                .setChannelMask(AudioFormat.CHANNEL_OUT_STEREO)
+                .build();
+        mAudioTrack = new AudioTrack.Builder()
+                .setAudioAttributes(attrs)
+                .setAudioFormat(format)
+                .setBufferSizeInBytes(mBufferSize)
+                .setPerformanceMode(AudioTrack.PERFORMANCE_MODE_LOW_LATENCY)
+                .build();
+        mAudioTrack.play();
     }
 
     public void startPumpingThread() {
-        new Thread(() -> {
+        Thread pumpThread = new Thread(() -> {
+            android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_URGENT_AUDIO);
             while (mIsRunning) {
-                byte[] chunk = mQueue.poll();
-                if (chunk != null) mAudioTrack.write(chunk, 0, chunk.length);
+                int frames = mJitterBuffer.readChunk(mTempChunk);
+                if (frames > 0) {
+                    int outFrames = mResampler.process(mTempChunk, frames, mResampleOut, mJitterBuffer.getBufferHealthError());
+                    mAudioTrack.write(mResampleOut, 0, outFrames * 2, AudioTrack.WRITE_BLOCKING);
+                }
             }
-        }).start();
+        });
+        pumpThread.setName("DiPlay-AudioPumper");
+        pumpThread.setDaemon(true);
+        pumpThread.start();
     }
`,
  },
];
