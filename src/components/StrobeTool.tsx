import React, { useState, useEffect, useRef } from 'react';
import { Zap, Play, Square, Sliders, AlertTriangle } from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const StrobeTool: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [freqHz, setFreqHz] = useState(25); // 25 Hz = 1500 RPM
  const [dutyCycle, setDutyCycle] = useState(15); // % on-time
  const [useScreenFlash, setUseScreenFlash] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const screenFlashStateRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rpm = Math.round(freqHz * 60);

  const startStrobe = () => {
    setIsActive(true);
    triggerHaptic(30);
  };

  const stopStrobe = () => {
    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // High precision flash loop using requestAnimationFrame + timestamp
  useEffect(() => {
    if (!isActive) return;

    let animId: number;
    const period = 1000 / freqHz; // ms per cycle
    const onDuration = (period * dutyCycle) / 100;
    let lastCycleStart = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - lastCycleStart) % period;
      const isFlashOn = elapsed < onDuration;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = isFlashOn ? '#ffffff' : '#020617';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isActive, freqHz, dutyCycle]);

  const presets = [
    { label: 'Wentylator 120mm (1200 RPM)', hz: 20 },
    { label: 'Wentylator 5015 (2400 RPM)', hz: 40 },
    { label: 'Silnik / Wrzeciono (3000 RPM)', hz: 50 },
    { label: 'Wentylator 4010 (3600 RPM)', hz: 60 },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Stroboskop Optyczny & Obrotomierz (Tachometr)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pulsowanie ekranem i światłem do „zamrażania” obrotów wentylatorów, wykrywania bicia łopatek i sprawdzania RPM.
          </p>
        </div>

        <button
          onClick={isActive ? stopStrobe : startStrobe}
          className={`flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-lg transition-all cursor-pointer shadow-sm ${
            isActive ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isActive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isActive ? 'Zatrzymaj stroboskop' : 'Uruchom stroboskop'}</span>
        </button>
      </div>

      {/* Main Flash Area & Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
        {/* Flash Display Canvas */}
        <div className="relative rounded-lg overflow-hidden border border-slate-800 h-32 flex items-center justify-center">
          <canvas ref={canvasRef} width={600} height={150} className="w-full h-full block" />
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 bg-slate-950/80">
              Uruchom stroboskop i skieruj ekran na obracający się wirnik
            </div>
          )}
        </div>

        {/* Readout */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Częstotliwość błysku</div>
            <div className="text-3xl font-black font-mono text-amber-400 mt-0.5">
              {freqHz.toFixed(1)} <span className="text-base font-normal text-slate-500">Hz</span>
            </div>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Prędkość obrotowa (RPM)</div>
            <div className="text-3xl font-black font-mono text-emerald-400 mt-0.5">
              {rpm} <span className="text-base font-normal text-slate-500">RPM</span>
            </div>
          </div>
        </div>

        {/* Frequency Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Regulacja częstotliwości:</span>
            <span className="font-mono font-bold text-amber-400">{freqHz} Hz ({rpm} RPM)</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            step={0.5}
            value={freqHz}
            onChange={(e) => setFreqHz(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>1 Hz (60 RPM)</span>
            <span>30 Hz (1800 RPM)</span>
            <span>60 Hz (3600 RPM)</span>
          </div>
        </div>

        {/* Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {presets.map((p) => (
            <button
              key={p.hz}
              onClick={() => setFreqHz(p.hz)}
              className={`p-2.5 rounded-lg text-left border text-xs transition-colors cursor-pointer ${
                freqHz === p.hz
                  ? 'bg-amber-500/10 border-amber-500/50 text-slate-100'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="font-semibold text-slate-200">{p.label}</div>
              <div className="font-mono text-amber-400 text-[11px] mt-0.5">{p.hz} Hz</div>
            </button>
          ))}
        </div>

        {/* Safety note */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex items-start gap-2 text-xs text-amber-300/90">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Uwaga na epilepsję fotogenną: pulsujące światło może wywoływać dyskomfort u osób wrażliwych na migotanie.
          </span>
        </div>
      </div>
    </div>
  );
};
