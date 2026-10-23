/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  Terminal, 
  CheckCircle2, 
  Smartphone, 
  Wifi, 
  Radio, 
  Cpu, 
  Copy, 
  Check, 
  Car, 
  HelpCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { VEHICLE_PROFILES } from '../data/patchData';
import { VehicleProfile } from '../types/carplay';

interface InstallationGuideProps {
  selectedVehicle: VehicleProfile;
  onSelectVehicle: (v: VehicleProfile) => void;
}

export const InstallationGuide: React.FC<InstallationGuideProps> = ({
  selectedVehicle,
  onSelectVehicle,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const adbCommands = [
    {
      title: 'Desactivar optimización de batería (Evita que Android pause el hilo de audio)',
      cmd: 'adb shell dumpsys deviceidle whitelist +com.github.shihabal3amri.diplay',
    },
    {
      title: 'Permitir bloqueo de Wi-Fi de alto rendimiento (High-Perf Wi-Fi Lock)',
      cmd: 'adb shell pm grant com.github.shihabal3amri.diplay android.permission.CHANGE_WIFI_MULTICAST_STATE',
    },
    {
      title: 'Asegurar prioridad de ventana y servicio en primer plano',
      cmd: 'adb shell pm grant com.github.shihabal3amri.diplay android.permission.SYSTEM_ALERT_WINDOW',
    },
    {
      title: 'Permitir desconexión y reactivación automática de Bluetooth (BLUETOOTH_ADMIN)',
      cmd: 'adb shell pm grant com.github.shihabal3amri.diplay android.permission.BLUETOOTH_ADMIN',
    },
    {
      title: 'Permitir reconexión de dispositivos Bluetooth en Android 12+ (BLUETOOTH_CONNECT)',
      cmd: 'adb shell pm grant com.github.shihabal3amri.diplay android.permission.BLUETOOTH_CONNECT',
    },
    {
      title: 'Deshabilitar Deep Buffer en AudioFlinger (Solo Qualcomm / BYD DiLink)',
      cmd: 'adb shell setprop vendor.audio.deepbuffer.media false',
    },
  ];

  const handleCopyAdb = (cmd: string, idx: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            Guía de Instalación y Ajustes de Vehículo para DiPlay
          </h2>
        </div>
        <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
          Sigue esta guía paso a paso para compilar e instalar el fork con la solución de microcortes en la pantalla multimedia de tu vehículo (BYD DiLink, Geely o radio Android).
        </p>

        {/* Vehicle Selector Selector Tabs */}
        <div className="mt-5 pt-4 border-t border-neutral-800">
          <div className="text-xs font-semibold text-neutral-300 mb-2.5 flex items-center gap-1.5">
            <Car className="w-4 h-4 text-emerald-400" />
            Selecciona el modelo de pantalla de tu coche para ver ajustes específicos:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {VEHICLE_PROFILES.map((profile) => (
              <button
                key={profile.id}
                onClick={() => onSelectVehicle(profile)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  selectedVehicle.id === profile.id
                    ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/30'
                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="text-xs font-bold text-white truncate">{profile.name}</div>
                <div className="text-[11px] font-mono text-neutral-400 mt-0.5">{profile.soc}</div>
              </button>
            ))}
          </div>

          {/* Active vehicle notes */}
          <div className="mt-4 p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-start gap-3">
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white">Perfil Activo: {selectedVehicle.name}</strong>
              <div className="text-neutral-400 mt-0.5 leading-relaxed">{selectedVehicle.notes}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Step by step guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Compilation & Installation Steps (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Step 1 */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-7 h-7 rounded-full bg-emerald-900/60 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-700/50">
                1
              </span>
              <h3 className="font-bold text-white text-sm">
                Clonar el repositorio de DiPlay y aplicar el parche
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              En tu ordenador, clona el repositorio oficial de DiPlay y aplica el archivo de parche unificado <code className="text-emerald-400 font-mono">diplay_audio_fix.patch</code> provisto en la pestaña de código:
            </p>
            <div className="mt-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-xs text-emerald-300 overflow-x-auto">
              git clone https://github.com/shihabal3amri/DiPlay.git<br />
              cd DiPlay<br />
              git apply diplay_audio_fix.patch
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-7 h-7 rounded-full bg-emerald-900/60 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-700/50">
                2
              </span>
              <h3 className="font-bold text-white text-sm">
                Compilar el APK con Gradle
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Genera el binario APK firmado o en modo Release optimizado con ProGuard/R8 para que el motor de audio funcione con mínima latencia y sin sobrecarga de depuración:
            </p>
            <div className="mt-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-xs text-emerald-300 overflow-x-auto">
              ./gradlew assembleRelease<br />
              # El APK se genera en: app/build/outputs/apk/release/app-release.apk
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-7 h-7 rounded-full bg-emerald-900/60 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-700/50">
                3
              </span>
              <h3 className="font-bold text-white text-sm">
                Instalar el APK en la pantalla del vehículo
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Puedes instalar el APK copiándolo a un pendrive USB formateado en FAT32 y conectándolo al puerto USB de la consola central, o mediante conexión inalámbrica ADB conectándote a la IP del coche:
            </p>
            <div className="mt-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-xs text-neutral-300 overflow-x-auto">
              adb connect 192.168.X.X:5555<br />
              adb install -r app-release.apk
            </div>
          </div>
        </div>

        {/* Right Column: ADB Commands & Critical Radio Tuning (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* ADB Tuning Box */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Comandos ADB Esenciales (Sin Root)
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Android Automotive puede suspender los hilos de audio en segundo plano. Ejecuta estos comandos una sola vez por ADB para blindar la reproducción:
            </p>

            <div className="space-y-3">
              {adbCommands.map((item, idx) => (
                <div key={idx} className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  <div className="text-[11px] font-medium text-neutral-300 mb-1.5">{item.title}</div>
                  <div className="flex items-center justify-between gap-2 bg-neutral-900 p-2 rounded-lg font-mono text-[11px] text-emerald-400 overflow-hidden">
                    <span className="truncate">{item.cmd}</span>
                    <button
                      onClick={() => handleCopyAdb(item.cmd, idx)}
                      className="p-1 rounded text-neutral-400 hover:text-white shrink-0"
                      title="Copiar comando"
                    >
                      {copiedIndex === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wi-Fi & Bluetooth Crucial Checklist */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Checklist Anti-Interferencias en el Vehículo
              </h3>
            </div>

            <ul className="space-y-2.5 text-xs text-neutral-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Forzar Wi-Fi a 5 GHz:</strong> En los ajustes de punto de acceso del coche, selecciona banda de 5GHz (Canales 36-48). El canal de 2.4GHz sufre microcortes por saturación con el Bluetooth y cámaras de salpicadero.
                </span>
              </li>

              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Desvincular Audio Multimedia Bluetooth:</strong> En tu iPhone, ve a <em>Ajustes &gt; Bluetooth &gt; [Nombre de tu coche] &gt; Tipo de dispositivo</em> y desactiva la reproducción multimedia nativa para evitar que dos sistemas luchen por la salida de sonido.
                </span>
              </li>

              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Evitar cargadores USB baratos:</strong> Los transformadores de mechero sin apantallamiento electromagnético causan ruido de radiofrecuencia que degrada la antena Wi-Fi del headunit.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
