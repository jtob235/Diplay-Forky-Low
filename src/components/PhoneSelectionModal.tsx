/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Smartphone, 
  Wifi, 
  Battery, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  Radio, 
  Clock, 
  User, 
  X,
  Signal
} from 'lucide-react';
import { KnownPhone } from '../types/carplay';

interface PhoneSelectionModalProps {
  isOpen: boolean;
  phones: KnownPhone[];
  currentConnectedId?: string;
  onSelectPhone: (phoneId: string) => void;
  onClose: () => void;
}

export const PhoneSelectionModal: React.FC<PhoneSelectionModalProps> = ({
  isOpen,
  phones,
  currentConnectedId,
  onSelectPhone,
  onClose,
}) => {
  const [countdown, setCountdown] = useState(15);

  // Auto-selection countdown if driver is driving and doesn't touch the screen
  useEffect(() => {
    if (!isOpen) {
      setCountdown(15);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Default to the driver's phone or first phone
          const driverPhone = phones.find((p) => p.isDriverPhone) || phones[0];
          if (driverPhone) {
            onSelectPhone(driverPhone.id);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, phones, onSelectPhone]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="bg-neutral-950 p-6 border-b border-neutral-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg tracking-tight">
                  Dispositivos Detectados en el Vehículo
                </h3>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60 font-semibold">
                  Solo 1 Conexión Activa
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Para evitar contención en la antena Wi-Fi y microcortes de audio, solo 1 teléfono puede conectarse a la vez a DiPlay CarPlay.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Cerrar selección"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Phones list */}
        <div className="p-6 space-y-4 bg-neutral-900">
          <div className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
            <span>Selecciona qué teléfono debe proyectar CarPlay:</span>
            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Auto-conexión conductor en: {countdown}s
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {phones.map((phone) => {
              const isSelected = currentConnectedId === phone.id;
              const isStrongSignal = phone.rssi > -60;

              return (
                <div
                  key={phone.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Top Phone Info */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Smartphone className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-neutral-400'}`} />
                        <div>
                          <div className="text-sm font-bold text-white leading-tight">
                            {phone.name}
                          </div>
                          <div className="text-[11px] text-neutral-400 font-medium">
                            {phone.model}
                          </div>
                        </div>
                      </div>

                      {phone.isDriverPhone && (
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/50 shrink-0">
                          Conductor
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-neutral-300 flex items-center gap-1.5 mt-2">
                      <User className="w-3.5 h-3.5 text-neutral-500" />
                      <span>{phone.owner}</span>
                    </div>

                    {/* Telemetry info */}
                    <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                      <div className="flex items-center gap-1">
                        <Signal className={`w-3.5 h-3.5 ${isStrongSignal ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <span>{phone.rssi} dBm</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Battery className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{phone.battery}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-5">
                    <button
                      onClick={() => onSelectPhone(phone.id)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4" /> Conectado Actualmente
                        </>
                      ) : (
                        <>
                          Conectar Este Dispositivo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Garantía de Audio Sin Microcortes:</strong> Al seleccionar este dispositivo, la radio rechazará conexiones secundarias y aplicará la desconexión del Bluetooth a los 5 segundos de enlace Wi-Fi.
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
