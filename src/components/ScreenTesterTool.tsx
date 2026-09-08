import React, { useState, useRef, useEffect } from 'react';
import {
  Monitor,
  Maximize,
  RotateCcw,
  Sparkles,
  Touchpad,
  CheckCircle2,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

const TEST_COLORS = [
  { name: 'Czysta Biel (100% White)', bg: '#ffffff', text: 'text-slate-900' },
  { name: 'Głęboka Czerń (OLED Black)', bg: '#000000', text: 'text-white' },
  { name: 'Czerwony (Red Subpixel)', bg: '#ff0000', text: 'text-white' },
  { name: 'Zielony (Green Subpixel)', bg: '#00ff00', text: 'text-slate-900' },
  { name: 'Niebieski (Blue Subpixel)', bg: '#0000ff', text: 'text-white' },
  { name: 'Żółty (Yellow)', bg: '#ffff00', text: 'text-slate-900' },
  { name: 'Magenta', bg: '#ff00ff', text: 'text-white' },
  { name: 'Cyan', bg: '#00ffff', text: 'text-slate-900' },
];

export const ScreenTesterTool: React.FC = () => {
  const [activeColorIndex, setActiveColorIndex] = useState<number | null>(null);
  const [touchTestActive, setTouchTestActive] = useState(false);
  const [touchPoints, setTouchPoints] = useState<{ id: number; x: number; y: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Touch drawing on canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);

    const onMove = (ev: PointerEvent) => {
      ctx.lineTo(ev.offsetX, ev.offsetY);
      ctx.stroke();
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="space-y-4">
      {/* Fullscreen Color Test Overlay */}
      {activeColorIndex !== null && (
        <div
          onClick={() => {
            const next = activeColorIndex + 1;
            if (next < TEST_COLORS.length) {
              setActiveColorIndex(next);
            } else {
              setActiveColorIndex(null);
            }
            triggerHaptic(15);
          }}
          className="fixed inset-0 z-50 flex flex-col justify-between p-6 cursor-pointer select-none"
          style={{ backgroundColor: TEST_COLORS[activeColorIndex].bg }}
        >
          <div
            className={`text-xs font-mono font-bold px-4 py-2 rounded-full backdrop-blur-sm self-start ${TEST_COLORS[activeColorIndex].text} bg-slate-900/30 border border-white/20`}
          >
            Test {activeColorIndex + 1}/{TEST_COLORS.length}: {TEST_COLORS[activeColorIndex].name}
          </div>
          <div
            className={`text-center text-xs font-mono opacity-60 self-center ${TEST_COLORS[activeColorIndex].text}`}
          >
            Dotknij ekranu, aby przejść do następnego koloru (lub wyjść na końcu)
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-cyan-400" />
            Test Pikseli & Ekranu Dotykowego
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Diagnostyka matrycy pod kątem martwych i zawieszonych subpikseli (RGB/Biel/Czerń), równomierności podświetlenia oraz test czułości dotyku.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveColorIndex(0)}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span>Pełnoekranowy Test Pikseli</span>
          </button>
        </div>
      </div>

      {/* Grid of Color Presets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="text-xs font-bold text-slate-300 uppercase">
          Wybierz planszę kontrolną (Piksele & Subpiksele)
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TEST_COLORS.map((tc, idx) => (
            <button
              key={tc.name}
              onClick={() => setActiveColorIndex(idx)}
              className="p-4 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-700 flex flex-col items-center gap-2 transition-all cursor-pointer text-center"
            >
              <div
                className="w-10 h-10 rounded-lg border border-white/20 shadow-md"
                style={{ backgroundColor: tc.bg }}
              />
              <span className="text-xs font-semibold text-slate-200">{tc.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Touch Screen Multi-touch Grid Test */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
            <Touchpad className="w-4 h-4 text-cyan-400" />
            Test Reakcji na Dotyk & Próbkowania Matrycy
          </div>
          <button
            onClick={clearCanvas}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Wyczyść ślad</span>
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden aspect-[16/9] relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            onPointerDown={handlePointerDown}
            className="w-full h-full cursor-crosshair touch-none"
          />
          <div className="absolute top-2 left-3 pointer-events-none text-[11px] text-slate-500 font-mono">
            Przeciągaj palcem po całym ekranie, aby sprawdzić martwe strefy digitizera
          </div>
        </div>
      </div>
    </div>
  );
};
