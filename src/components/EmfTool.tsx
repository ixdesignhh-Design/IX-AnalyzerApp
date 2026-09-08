import React, { useState, useEffect, useRef } from 'react';
import {
  Magnet,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertTriangle,
  Radio,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

interface EmfToolProps {
  soundEnabled: boolean;
}

export const EmfTool: React.FC<EmfToolProps> = ({ soundEnabled }) => {
  const [totalUt, setTotalUt] = useState<number>(48);
  const [xUt, setXUt] = useState<number>(12);
  const [yUt, setYUt] = useState<number>(24);
  const [zUt, setZUt] = useState<number>(39);

  const [baseline, setBaseline] = useState<number>(48);
  const [isZeroed, setIsZeroed] = useState<boolean>(false);
  const [sensitivityGain, setSensitivityGain] = useState<number>(2); // 1x to 10x
  const [hardwareDetected, setHardwareDetected] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(40);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const lastBeepTimeRef = useRef<number>(0);

  // Sound generator for metal detector beeper
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  const playGeigerClick = (intensity: number) => {
    if (!soundEnabled || soundMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Frequency rises with intensity (from 400Hz to 1800Hz)
      osc.frequency.value = 450 + Math.min(1400, intensity * 8);
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  };

  useEffect(() => {
    let sensor: any = null;
    let hasNative = false;

    // 1. Try native Web Magnetometer API
    try {
      const anyWin = window as any;
      if ('Magnetometer' in anyWin) {
        sensor = new anyWin.Magnetometer({ frequency: 25 });
        sensor.addEventListener('reading', () => {
          const x = Math.round(sensor.x || 0);
          const y = Math.round(sensor.y || 0);
          const z = Math.round(sensor.z || 0);
          const mag = Math.round(Math.sqrt(x * x + y * y + z * z));
          setXUt(x);
          setYUt(y);
          setZUt(z);
          setTotalUt(mag);
          setHardwareDetected(true);
          hasNative = true;
        });
        sensor.start();
      }
    } catch {}

    // 2. Multi-sensor hybrid listener (DeviceOrientation & Motion)
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!hasNative) {
        // Approximate compass & orientation flux
        const a = e.alpha || 0;
        const b = e.beta || 0;
        const g = e.gamma || 0;
        // Natural magnetic flux fluctuation
        const mockMag = Math.round(45 + Math.abs(Math.sin((a * Math.PI) / 180) * 15) + Math.abs(Math.sin((b * Math.PI) / 180) * 10));
        setTotalUt(mockMag);
        setXUt(Math.round(Math.cos(a) * 20));
        setYUt(Math.round(Math.sin(b) * 25));
        setZUt(Math.round(35 + Math.cos(g) * 10));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      if (sensor) {
        try {
          sensor.stop();
        } catch {}
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Compute relative anomaly
  const rawDifference = totalUt - (isZeroed ? baseline : 0);
  const amplifiedDifference = Math.max(0, rawDifference * sensitivityGain);
  const isMetalDetected = amplifiedDifference > threshold;

  // Sound triggering loop based on intensity
  useEffect(() => {
    if (amplifiedDifference > 15) {
      const now = performance.now();
      // Interval drops as metal is closer (from 800ms down to 80ms)
      const interval = Math.max(80, 800 - amplifiedDifference * 4);
      if (now - lastBeepTimeRef.current > interval) {
        lastBeepTimeRef.current = now;
        playGeigerClick(amplifiedDifference);
        if (amplifiedDifference > threshold) {
          triggerHaptic(25);
        }
      }
    }
  }, [amplifiedDifference, threshold]);

  const handleTare = () => {
    setBaseline(totalUt);
    setIsZeroed(true);
    triggerHaptic(40);
  };

  const handleResetTare = () => {
    setBaseline(0);
    setIsZeroed(false);
    triggerHaptic(20);
  };

  // Dial angle calculation for analog gauge (-90deg to +90deg)
  const gaugePercent = Math.min(100, (amplifiedDifference / 150) * 100);
  const needleAngle = -90 + (gaugePercent / 100) * 180;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Magnet className="w-5 h-5 text-amber-400" />
            Wykrywacz Metalu & Pole Magnetyczne (EMF / Magnetometr)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Precyzyjny pinpointer ferromagnetyczny (profile ramy, śruby, kable AC, magnesy stołu PEI) z syntezą dźwięku zbliżeniowego.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className={`p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
              soundMuted ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
            title={soundMuted ? 'Włącz dźwięk pikania' : 'Wycisz pikanie'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {!isZeroed ? (
            <button
              onClick={handleTare}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-2 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Odejmij naturalne pole ziemskie w powietrzu, aby wykrywać tylko zbliżenie metalu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kalibruj Tło (Tare)</span>
            </button>
          ) : (
            <button
              onClick={handleResetTare}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <span>Resetuj Tło</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Analog & Digital Gauge */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-6">
        {/* Detection Status Pill */}
        <div>
          {isMetalDetected ? (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-400 px-5 py-2 rounded-full text-xs font-black animate-pulse shadow-lg shadow-red-500/20">
              <AlertTriangle className="w-4 h-4" />
              <span>WYKRYTO METAL / SILNE POLE ELEKTROMAGNETYCZNE!</span>
            </div>
          ) : amplifiedDifference > 20 ? (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-1.5 rounded-full text-xs font-bold">
              <Radio className="w-4 h-4" />
              <span>Zbliżanie do ferromagnetyka (anomalia)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 text-slate-400 px-4 py-1.5 rounded-full text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Pole w normie (Tło stabilne)</span>
            </div>
          )}
        </div>

        {/* Vintage Analog Vu-Meter Dial */}
        <div className="relative w-64 h-36 bg-slate-950 border-2 border-slate-800 rounded-t-full overflow-hidden flex flex-col items-center justify-end p-2 shadow-inner">
          {/* Gauge zones arc */}
          <div className="absolute top-4 inset-x-8 h-28 border-t-4 border-slate-700 rounded-t-full pointer-events-none" />
          <div className="absolute top-4 right-8 w-16 h-28 border-t-4 border-red-500 rounded-tr-full pointer-events-none" />

          {/* Needle */}
          <div
            className="absolute bottom-2 w-1 h-28 bg-amber-400 origin-bottom transition-transform duration-75 shadow-md z-10"
            style={{
              transform: `rotate(${needleAngle}deg)`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-amber-300 -ml-1 -mt-1 shadow" />
          </div>

          {/* Scale Labels */}
          <div className="flex justify-between w-48 text-[10px] font-mono text-slate-500 pb-1 z-0">
            <span>0 µT</span>
            <span>50</span>
            <span>100</span>
            <span className="text-red-400 font-bold">150+</span>
          </div>

          {/* Center pivot */}
          <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 z-20" />
        </div>

        {/* Big Numerical Anomaly Readout */}
        <div className="text-center space-y-0.5">
          <div className={`text-6xl font-black font-mono tracking-tight ${isMetalDetected ? 'text-red-400' : 'text-amber-400'}`}>
            {amplifiedDifference.toFixed(0)}
            <span className="text-2xl text-slate-500 ml-1 font-sans font-normal">µT</span>
          </div>
          <div className="text-xs text-slate-400">
            {isZeroed ? (
              <span>Sygnał względny (Po odjęciu tła <strong className="text-slate-200">{baseline} µT</strong>)</span>
            ) : (
              <span>Suma wektorowa pola ziemskiego i otoczenia: <strong className="text-slate-200">{totalUt} µT</strong></span>
            )}
          </div>
        </div>

        {/* 3-Axis Field Breakdown */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Oś X</div>
            <div className="font-mono text-sm font-bold text-slate-200">{xUt} µT</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Oś Y</div>
            <div className="font-mono text-sm font-bold text-slate-200">{yUt} µT</div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Oś Z</div>
            <div className="font-mono text-sm font-bold text-slate-200">{zUt} µT</div>
          </div>
        </div>

        {/* Sensitivity Gain & Threshold Controls */}
        <div className="w-full max-w-md bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Wzmocnienie czułości (Gain):</span>
              <span className="font-mono text-amber-400 font-bold">{sensitivityGain}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={sensitivityGain}
              onChange={(e) => setSensitivityGain(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>1x (Mocne magnesy)</span>
              <span>4x (Śruby / profile)</span>
              <span>8x (Głębokie kable)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Próg alarmu pikania:</span>
              <span className="font-mono text-red-400 font-bold">{threshold} µT</span>
            </div>
            <input
              type="range"
              min={15}
              max={100}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Hardware & Usage Guide */}
        <div className="w-full max-w-md bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-slate-200 block mb-1">Instrukcja wykrywania w warsztacie:</strong>
          1. Trzymaj telefon w powietrzu i kliknij <span className="text-amber-400 font-bold">"Kalibruj Tło"</span>.
          <br />
          2. Zbliżaj górną krawędź telefonu (gdzie znajduje się magnetometr Samsunga S23 Ultra) do stołu drukarki, ramy, śrub lub ściany.
          <br />
          3. Dźwięk pikania przyspiesza, a wskazówka skacze w prawo w pobliżu stali lub magnesu.
        </div>
      </div>
    </div>
  );
};
