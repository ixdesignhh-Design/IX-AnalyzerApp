import React, { useState, useRef, useEffect } from 'react';
import { Ruler, CreditCard, RotateCcw, Sliders, CheckCircle2 } from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const ScreenCaliperTool: React.FC = () => {
  // S23 Ultra standard screen density ~15.5 pixels per millimeter (~393 ppi CSS viewport)
  const [pxPerMm, setPxPerMm] = useState<number>(() => {
    return parseFloat(localStorage.getItem('ix_caliper_px_per_mm') || '15.5');
  });
  const [jaw1, setJaw1] = useState<number>(30); // in pixels
  const [jaw2, setJaw2] = useState<number>(230); // in pixels
  const [unit, setUnit] = useState<'mm' | 'inch'>('mm');

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem('ix_caliper_px_per_mm', pxPerMm.toString());
  }, [pxPerMm]);

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
    const center = 150;
    setJaw1(Math.max(10, center - px / 2));
    setJaw2(Math.max(10, center + px / 2));
    triggerHaptic(20);
  };

  // One-click credit card calibration (ISO/IEC 7810 ID-1 standard: 85.60 mm)
  const calibrateWithCard = () => {
    const cardPx = rawDiffPx;
    if (cardPx > 50) {
      const calculated = cardPx / 85.6;
      setPxPerMm(Math.round(calculated * 100) / 100);
      triggerHaptic([40, 60]);
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* OS X Workstation Card Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#0284c7]" />
            Suwmiarka Ekranowa & Mikrometr Cyfrowy
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Wyskalowana podziałka ekranowa z noniuszem, kalibracja do fizycznego ekranu S23 Ultra (lub karty płatniczej) i wzorce śrub ISO.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnit(unit === 'mm' ? 'inch' : 'mm')}
            className="aqua-button px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
          >
            Jednostka: {unit.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Main Measurement Readout inside CRT Glass */}
      <div className="retro-screen-crt rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-1">
          <div className="text-xs font-mono uppercase tracking-widest text-[#94a3b8] font-bold">
            Zmierzona szerokość noniusza
          </div>
          <div className="text-5xl sm:text-6xl font-black font-mono text-emerald-400 tracking-tight">
            {unit === 'mm' ? measuredMm.toFixed(1) : measuredInch.toFixed(2)}
            <span className="text-2xl text-[#64748b] ml-1 font-sans">{unit}</span>
          </div>
          <div className="text-xs font-mono text-[#94a3b8]">
            {unit === 'mm' ? `${measuredInch.toFixed(3)} in` : `${measuredMm.toFixed(1)} mm`} ({Math.round(rawDiffPx)} px na matrycy)
          </div>
        </div>

        {/* Interactive Caliper Stage */}
        <div
          ref={containerRef}
          className="relative w-full h-44 bg-[#0a0d12] rounded-xl border-2 border-[#334155] overflow-hidden touch-none shadow-inner"
        >
          {/* Ruler scale markings top */}
          <div className="absolute top-0 inset-x-0 h-6 border-b border-[#1e293b] flex justify-between px-2 text-[9px] font-mono text-[#64748b] pointer-events-none">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <span>{i * 10}</span>
                <div className="w-[1px] h-2 bg-[#475569]" />
              </div>
            ))}
          </div>

          {/* Measured gap highlight */}
          <div
            className="absolute top-6 bottom-0 bg-[#0284c7]/20 border-y border-[#38bdf8]/40 pointer-events-none"
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
            <div className="w-6 h-6 rounded-full bg-[#0284c7] text-white font-black text-[10px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              1
            </div>
            <div className="w-1 h-full bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]" />
            <div className="w-6 h-6 rounded-full bg-[#0f172a] border border-[#0284c7] text-[#38bdf8] text-[10px] font-bold flex items-center justify-center">
              ◄►
            </div>
          </div>

          {/* Caliper Jaw 2 */}
          <div
            onPointerDown={handlePointerDown(2)}
            className="absolute top-0 bottom-0 w-8 -ml-4 flex flex-col items-center justify-between cursor-ew-resize z-20 group"
            style={{ left: `${jaw2}px` }}
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              2
            </div>
            <div className="w-1 h-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <div className="w-6 h-6 rounded-full bg-[#0f172a] border border-emerald-500 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
              ◄►
            </div>
          </div>
        </div>

        {/* Quick screw size templates */}
        <div className="w-full space-y-1.5">
          <div className="text-xs text-[#94a3b8] font-mono font-semibold">Wzorce kalibracyjne śrub i pasków:</div>
          <div className="flex flex-wrap gap-2">
            {screwPresets.map((p) => (
              <button
                key={p.name}
                onClick={() => setCaliperDistance(p.mm)}
                className="px-3 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] text-[#cbd5e1] border border-[#334155] rounded-lg text-xs font-mono transition-colors cursor-pointer"
              >
                {p.name} ({p.mm}mm)
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Screen PPI Calibration Panel */}
      <div className="retro-bezel p-3.5 rounded-xl border border-[#b8b2a5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-[#292524] font-bold whitespace-nowrap">DPI ekranu:</span>
          <input
            type="range"
            min={10}
            max={25}
            step={0.1}
            value={pxPerMm}
            onChange={(e) => setPxPerMm(Number(e.target.value))}
            className="w-48 accent-[#0284c7] cursor-pointer"
          />
          <span className="font-mono text-[#0284c7] font-bold">{pxPerMm.toFixed(1)} px/mm</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={calibrateWithCard}
            className="aqua-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            title="Przyłóż dowód/kartę płatniczą (85.6mm) między szczęki 1 i 2, a następnie kliknij tutaj"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>Kalibruj kartą (85.6mm)</span>
          </button>
          <button
            onClick={() => setPxPerMm(15.5)}
            className="aqua-button px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
          >
            Reset S23 Ultra
          </button>
        </div>
      </div>
    </div>
  );
};
