/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Terminal, 
  ShieldCheck, 
  FileDiff,
  ExternalLink,
  Code
} from 'lucide-react';
import { PATCH_FILES, PatchFile } from '../data/patchData';

export const CodePatchViewer: React.FC = () => {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentFile: PatchFile = PATCH_FILES[activeFileIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentFile.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header Info */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white tracking-wide">
                Código Fuente del Fork DiPlay (Solución de Audio)
              </h2>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl">
              Archivos Kotlin y C++ listos para compilar en Android Studio o inyectar como parche unificado en el repositorio oficial de DiPlay (<code>shihabal3amri/DiPlay</code>).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center gap-2 transition-colors border border-neutral-700"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar Código
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-2 transition-colors shadow-lg shadow-emerald-950"
            >
              <Download className="w-4 h-4" /> Descargar {currentFile.filename}
            </button>
          </div>
        </div>

        {/* Git Apply Quick Command Banner */}
        <div className="mt-5 p-3.5 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-300 font-mono">
            <Terminal className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-neutral-400">Comando para aplicar directamente:</span>
            <span className="text-emerald-300 font-bold bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800">
              git apply diplay_audio_fix.patch
            </span>
          </div>
          <span className="text-[11px] text-neutral-500">
            Compatible con DiPlay v1.4.x - v2.2.x
          </span>
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* File Tabs */}
        <div className="bg-neutral-900/90 border-b border-neutral-800 px-4 pt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {PATCH_FILES.map((file, idx) => {
            const isDiff = file.filename.endsWith('.patch') || file.filename.endsWith('.diff');
            return (
              <button
                key={file.filename}
                onClick={() => setActiveFileIndex(idx)}
                className={`px-3.5 py-2 text-xs font-mono font-medium rounded-t-xl transition-all flex items-center gap-2 shrink-0 border-t border-x ${
                  activeFileIndex === idx
                    ? 'bg-neutral-950 text-emerald-400 border-neutral-800 border-b-neutral-950 -mb-px z-10'
                    : 'bg-neutral-900 text-neutral-400 border-transparent hover:text-neutral-200 hover:bg-neutral-850'
                }`}
              >
                {isDiff ? <FileDiff className="w-3.5 h-3.5 text-blue-400" /> : <Code className="w-3.5 h-3.5 text-emerald-400" />}
                <span>{file.filename}</span>
              </button>
            );
          })}
        </div>

        {/* File Details description banner */}
        <div className="bg-neutral-900/50 px-5 py-3 border-b border-neutral-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div>
            <span className="font-semibold text-white">{currentFile.title}</span>
            <div className="text-neutral-400 mt-0.5">{currentFile.summary}</div>
          </div>
          <div className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 px-3 py-1 rounded-md text-[11px] shrink-0 font-medium">
            🛡️ Soluciona: {currentFile.problemSolved.split('.')[0]}
          </div>
        </div>

        {/* Monospaced Code Display with line numbers */}
        <div className="p-4 overflow-x-auto font-mono text-xs leading-relaxed max-h-[580px] bg-neutral-950 text-neutral-300 selection:bg-emerald-800 selection:text-white">
          <pre className="table w-full">
            <code>
              {currentFile.code.split('\n').map((line, lineIndex) => {
                const isDiff = currentFile.language === 'diff';
                const isAdd = isDiff && line.startsWith('+') && !line.startsWith('+++');
                const isRemove = isDiff && line.startsWith('-') && !line.startsWith('---');
                const isHeader = isDiff && (line.startsWith('diff') || line.startsWith('@@') || line.startsWith('index'));

                return (
                  <div
                    key={lineIndex}
                    className={`table-row ${
                      isAdd
                        ? 'bg-emerald-950/40 text-emerald-300'
                        : isRemove
                        ? 'bg-rose-950/40 text-rose-300'
                        : isHeader
                        ? 'text-blue-400 font-bold'
                        : ''
                    }`}
                  >
                    <span className="table-cell select-none pr-4 text-right text-neutral-600 text-[11px] w-10">
                      {lineIndex + 1}
                    </span>
                    <span className="table-cell whitespace-pre">{line}</span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};
