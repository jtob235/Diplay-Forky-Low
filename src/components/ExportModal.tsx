/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileCode, 
  FileJson, 
  Terminal, 
  Check, 
  Copy,
  FolderArchive
} from 'lucide-react';
import { AudioEngineConfig, VehicleProfile } from '../types/carplay';
import { PATCH_FILES } from '../data/patchData';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AudioEngineConfig;
  selectedVehicle: VehicleProfile;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  selectedVehicle,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const patchFile = PATCH_FILES.find((f) => f.filename.endsWith('.patch'))?.code || '';

  const configJson = JSON.stringify(
    {
      version: '2.4.0-audiofix',
      vehicle: {
        id: selectedVehicle.id,
        name: selectedVehicle.name,
        soc: selectedVehicle.soc,
        halSampleRate: selectedVehicle.defaultSampleRate,
      },
      audioSettings: {
        pipeline: config.pipelineMode,
        jitterBufferSizeMs: config.jitterBufferSizeMs,
        adaptiveJitterEnabled: config.adaptiveJitterEnabled,
        packetLossConcealment: config.packetLossConcealment,
        clockDriftCompensationPLL: config.clockDriftCompensation,
        threadPriorityUrgent: config.threadPriorityUrgent,
        wifiHighPerfLock: config.wifiHighPerfLock,
        wifiQosDscpVoice: config.wifiQosDscpVoice,
        bluetoothA2dpSuppression: config.bluetoothA2dpSuppression,
        autoDisconnectBluetoothAfter5s: config.autoDisconnectBluetoothAfter5s,
        hardwareBufferMultiplier: config.hardwareBufferMultiplier,
      },
    },
    null,
    2
  );

  const adbScript = `#!/bin/bash
# DiPlay AudioFix - Automated Android Headunit Optimization Script
# Target Vehicle: ${selectedVehicle.name}

echo "=== Conectando con la pantalla del vehículo Android ==="
echo "Asegúrate de que la depuración ADB inalámbrica o USB esté activada."

adb devices
echo "Aplicando permisos de hilo prioritario, Bluetooth y bloqueo de Wi-Fi..."

adb shell dumpsys deviceidle whitelist +com.github.shihabal3amri.diplay
adb shell pm grant com.github.shihabal3amri.diplay android.permission.CHANGE_WIFI_MULTICAST_STATE
adb shell pm grant com.github.shihabal3amri.diplay android.permission.SYSTEM_ALERT_WINDOW
adb shell pm grant com.github.shihabal3amri.diplay android.permission.WRITE_SECURE_SETTINGS
adb shell pm grant com.github.shihabal3amri.diplay android.permission.BLUETOOTH_ADMIN
adb shell pm grant com.github.shihabal3amri.diplay android.permission.BLUETOOTH_CONNECT

# AudioFlinger latency tuning
adb shell setprop vendor.audio.deepbuffer.media false
adb shell setprop media.stagefright.audio.sink 1

echo "=== Optimización completada con éxito. Reinicia DiPlay. ==="
`;

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(id);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderArchive className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">
              Descargar Archivos del Fork y Ajustes
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Item 1: Patch Diff */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileCode className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-white">diplay_audio_fix.patch</div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Parche Git unificado con las correcciones completas de AudioTrack, resampleo y JitterBuffer.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(patchFile, 'patch')}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                title="Copiar parche"
              >
                {copiedType === 'patch' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => downloadFile('diplay_audio_fix.patch', patchFile, 'text/x-diff')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" /> Descargar
              </button>
            </div>
          </div>

          {/* Item 2: Config JSON */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileJson className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-white">diplay_audio_config.json</div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Configuración ajustada para {selectedVehicle.name} ({config.jitterBufferSizeMs}ms buffer, 48kHz PLL).
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(configJson, 'json')}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                title="Copiar JSON"
              >
                {copiedType === 'json' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => downloadFile('diplay_audio_config.json', configJson, 'application/json')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" /> Descargar
              </button>
            </div>
          </div>

          {/* Item 3: ADB script */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Terminal className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-white">adb_tune_carplay.sh</div>
                <div className="text-xs text-neutral-400 mt-0.5">
                  Script de terminal bash con todos los comandos de optimización automática para Android headunit.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyToClipboard(adbScript, 'sh')}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                title="Copiar Script"
              >
                {copiedType === 'sh' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => downloadFile('adb_tune_carplay.sh', adbScript, 'application/x-sh')}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center gap-1.5 border border-neutral-700"
              >
                <Download className="w-3.5 h-3.5" /> Descargar
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
