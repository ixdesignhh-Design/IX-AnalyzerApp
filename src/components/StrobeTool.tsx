import React, { useState, useEffect, useRef } from 'react';
import { Zap, Play, Square, AlertTriangle } from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const StrobeTool: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [freqHz, setFreqHz] = useState(25);
  const [dutyCycle, setDutyCycle] = useState(15);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const rpm = Math.round(freqHz * 60);

  const startStrobe = () => {
    setIsActive(true);
    triggerHaptic(30);
  };

  const stopStrobe = () => {
    setIsActive(false);
  };

  useEffect(() => {
    if (!isActive) return;

    let animId: number;
    const period = 1000 / freqHz;
    const onDuration = (period * dutyCycle) / 100;
    let lastCycleStart = performance.now();

    const loop = (now: number) => {
      const elapsed = (now - lastCycleStart) % period;
      const isFlashOn = elapsed < onDuration;

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = isFlashOn ? '#ffffff' : '#05070a';
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
      {/* Retro OS X Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#0284c7]" />
            Stroboskop Optyczny & Tachometr (Obrotomierz)
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Pulsowanie ekranu i światła do „zamrażania” obrotów wirników wentylatorów drukarki 3D, sprawdzania RPM i wyważenia.
          </p>
        </div>

        <button
          onClick={isActive ? stopStrobe : startStrobe}
          className={`flex items-center gap-2 text-xs font-bold px-5 py-2 rounded-lg cursor-pointer shadow ${
            isActive ? 'bg-red-600 hover:bg-red-500 text-white' : 'aqua-button-primary'
          }`}
        >
          {isActive ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isActive ? 'Zatrzymaj stroboskop' : 'Uruchom stroboskop'}</span>
        </button>
      </div>

      {/* Main Flash Area inside CRT Frame */}
      <div className="retro-screen-crt rounded-2xl p-6 space-y-6 shadow-2xl">
        <div className="relative rounded-xl overflow-hidden border border-[#334155] h-32 flex items-center justify-center">
          <canvas ref={canvasRef} width={600} height={150} className="w-full h-full block" />
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-[#94a3b8] font-mono bg-[#05070a]/90">
              Naciśnij "Uruchom stroboskop" i skieruj ekran na wirujący wentylator
            </div>
          )}
        </div>

        {/* Readout */}
        <div className="grid grid-cols-2 gap-4 text-center font-mono">
          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155]">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8]">Częstotliwość błysku</div>
            <div className="text-3xl font-black text-amber-400 mt-0.5">
              {freqHz.toFixed(1)} <span className="text-base font-normal text-[#64748b]">Hz</span>
            </div>
          </div>
          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155]">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8]">Prędkość obrotowa (RPM)</div>
            <div className="text-3xl font-black text-emerald-400 mt-0.5">
              {rpm} <span className="text-base font-normal text-[#64748b]">RPM</span>
            </div>
          </div>
        </div>

        {/* Frequency Slider */}
        <div className="space-y-2 font-mono text-xs">
          <div className="flex justify-between text-[#cbd5e1]">
            <span>Regulacja częstotliwości:</span>
            <span className="text-amber-400 font-bold">{freqHz} Hz ({rpm} RPM)</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            step={0.5}
            value={freqHz}
            onChange={(e) => setFreqHz(Number(e.target.value))}
            className="w-full accent-[#0284c7] cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-[#64748b]">
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
              className={`p-2.5 rounded-lg text-left border text-xs transition-colors cursor-pointer font-mono ${
                freqHz === p.hz
                  ? 'bg-[#0284c7]/20 border-[#38bdf8] text-white'
                  : 'bg-[#0f172a] border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]'
              }`}
            >
              <div className="font-semibold text-[#f8fafc]">{p.label}</div>
              <div className="text-amber-400 text-[11px] mt-0.5">{p.hz} Hz</div>
            </button>
          ))}
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg flex items-start gap-2 text-xs text-amber-300 font-sans">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <span>
            Uwaga na epilepsję fotogenną: pulsujące światło o wysokiej częstotliwości może wywoływać dyskomfort u osób wrażliwych na migotanie.
          </span>
        </div>
      </div>
    </div>
  );
};
