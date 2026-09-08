import React, { useState, useRef } from 'react';
import { Ruler, RotateCcw, Sliders, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const ScreenCaliperTool: React.FC = () => {
  // S23 Ultra standard screen density ~15.5 pixels per millimeter (~393 ppi)
  const [pxPerMm, setPxPerMm] = useState<number>(15.5);
  const [jaw1, setJaw1] = useState<number>(30); // in pixels
  const [jaw2, setJaw2] = useState<number>(230); // in pixels
  const [unit, setUnit] = useState<'mm' | 'inch'>('mm');

  const containerRef = useRef<HTMLDivElement | null>(null);

  const rawDiffPx = Math.abs(jaw2 - jaw1);
  const measuredMm = Math.round((rawDiffPx / pxPerMm) * 10) / 10;
  const measuredInch = Math.round((measuredMm / 25.4) * 100) / 100;

  const handlePointerDown = (which: 1 | 2) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    triggerHaptic(15);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(rect.width, moveEvent.clientX - rect.left));
      if (which === 1) setJaw1(pos);
      else setJaw2(pos);
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const screwPresets = [
    { name: 'M2', mm: 2.0 },
    { name: 'M2.5', mm: 2.5 },
    { name: 'M3', mm: 3.0 },
    { name: 'M4', mm: 4.0 },
    { name: 'M5', mm: 5.0 },
    { name: 'Pasek GT2', mm: 6.0 },
  ];

  const setCaliperDistance = (mm: number) => {
    const px = mm * pxPerMm;
    const center = 140;
    setJaw1(Math.max(10, center - px / 2));
    setJaw2(Math.max(10, center + px / 2));
    triggerHaptic(20);
  };

  return (
    <div className="space-y-4 select-none">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-amber-400" />
            Suwmiarka Ekranowa & Linijka Mikrometryczna
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Przyłóż śrubę, nakrętkę lub element do ekranu i przesuń szczęki suwmiarki. Kalibracja ekranu S23 Ultra.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnit(unit === 'mm' ? 'inch' : 'mm')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-lg text-xs font-bold cursor-pointer"
          >
            Jednostka: {unit.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Main Measurement Readout */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Zmierzony wymiar</div>
          <div className="text-6xl font-black font-mono text-amber-400 tracking-tight">
            {unit === 'mm' ? measuredMm.toFixed(1) : measuredInch.toFixed(2)}
            <span className="text-2xl text-slate-500 ml-1 font-sans">{unit}</span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {unit === 'mm' ? `${measuredInch.toFixed(3)} in` : `${measuredMm.toFixed(1)} mm`} ({Math.round(rawDiffPx)} px)
          </div>
        </div>

        {/* Interactive Caliper Stage */}
        <div
          ref={containerRef}
          className="relative w-full h-44 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden touch-none"
        >
          {/* Ruler scale markings top */}
          <div className="absolute top-0 inset-x-0 h-6 border-b border-slate-800 flex justify-between px-2 text-[9px] font-mono text-slate-500 pointer-events-none">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <span>{i * 10}</span>
                <div className="w-[1px] h-2 bg-slate-700" />
              </div>
            ))}
          </div>

          {/* Measured gap highlight */}
          <div
            className="absolute top-6 bottom-0 bg-amber-500/10 border-y border-amber-500/20 pointer-events-none"
            style={{
              left: `${Math.min(jaw1, jaw2)}px`,
              width: `${rawDiffPx}px`,
            }}
          />

          {/* Caliper Jaw 1 */}
          <div
            onPointerDown={handlePointerDown(1)}
            className="absolute top-0 bottom-0 w-8 -ml-4 flex flex-col items-center justify-between cursor-ew-resize z-20 group"
            style={{ left: `${jaw1}px` }}
          >
            <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              1
            </div>
            <div className="w-1 h-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
            <div className="w-6 h-6 rounded-full bg-slate-800 border border-amber-500 text-amber-400 text-[10px] font-bold flex items-center justify-center">
              ◄►
            </div>
          </div>

          {/* Caliper Jaw 2 */}
          <div
            onPointerDown={handlePointerDown(2)}
            className="absolute top-0 bottom-0 w-8 -ml-4 flex flex-col items-center justify-between cursor-ew-resize z-20 group"
            style={{ left: `${jaw2}px` }}
          >
            <div className="w-6 h-6 rounded-full bg-sky-500 text-white font-black text-[10px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              2
            </div>
            <div className="w-1 h-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
            <div className="w-6 h-6 rounded-full bg-slate-800 border border-sky-500 text-sky-400 text-[10px] font-bold flex items-center justify-center">
              ◄►
            </div>
          </div>
        </div>

        {/* Quick screw size templates */}
        <div className="w-full space-y-2">
          <div className="text-xs text-slate-400 font-semibold">Szybkie wzorce gwintów i śrub:</div>
          <div className="flex flex-wrap gap-2">
            {screwPresets.map((p) => (
              <button
                key={p.name}
                onClick={() => setCaliperDistance(p.mm)}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                {p.name} ({p.mm}mm)
              </button>
            ))}
          </div>
        </div>

        {/* Screen PPI Calibration Slider */}
        <div className="w-full max-w-sm flex items-center gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
          <span className="text-slate-400 whitespace-nowrap">DPI ekranu:</span>
          <input
            type="range"
            min={10}
            max={25}
            step={0.1}
            value={pxPerMm}
            onChange={(e) => setPxPerMm(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="font-mono text-slate-200 font-bold">{pxPerMm.toFixed(1)} px/mm</span>
          <button
            onClick={() => setPxPerMm(15.5)}
            className="text-[10px] text-amber-400 hover:underline cursor-pointer"
          >
            Domyślne S23
          </button>
        </div>
      </div>
    </div>
  );
};
