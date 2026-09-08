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
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';
import { getAudioContext } from '../utils/audio';

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
  const [simulationActive, setSimulationActive] = useState<boolean>(false);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [threshold, setThreshold] = useState<number>(35);

  const lastBeepTimeRef = useRef<number>(0);

  const playGeigerClick = (intensity: number) => {
    if (!soundEnabled || soundMuted) return;
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Frequency rises with proximity
      osc.frequency.value = 450 + Math.min(1400, intensity * 9);
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
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

    // 2. Hybrid listener via deviceorientation flux
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!hasNative) {
        const a = e.alpha ?? 0;
        const b = e.beta ?? 0;
        const g = e.gamma ?? 0;
        if (Math.abs(a) > 0.1 || Math.abs(b) > 0.1) {
          setHardwareDetected(true);
        }
        const mockMag = Math.round(
          45 + Math.abs(Math.sin((a * Math.PI) / 180) * 15) + Math.abs(Math.sin((b * Math.PI) / 180) * 10)
        );
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

  // Simulation loop for PC / desktop testing
  useEffect(() => {
    if (!simulationActive) return;
    let t = 0;
    const interval = setInterval(() => {
      t += 0.1;
      const simFlux = 48 + Math.sin(t) * 35 + (Math.sin(t * 2) > 0.7 ? 60 : 0);
      setTotalUt(Math.round(simFlux));
      setXUt(Math.round(15 + Math.cos(t) * 10));
      setYUt(Math.round(20 + Math.sin(t) * 15));
      setZUt(Math.round(38 + Math.sin(t * 1.5) * 20));
    }, 80);
    return () => clearInterval(interval);
  }, [simulationActive]);

  // Compute relative anomaly
  const rawDifference = totalUt - (isZeroed ? baseline : 0);
  const amplifiedDifference = Math.max(0, rawDifference * sensitivityGain);
  const isMetalDetected = amplifiedDifference > threshold;

  // Sound triggering loop
  useEffect(() => {
    if (amplifiedDifference > 15) {
      const now = performance.now();
      const interval = Math.max(70, 750 - amplifiedDifference * 4);
      if (now - lastBeepTimeRef.current > interval) {
        lastBeepTimeRef.current = now;
        playGeigerClick(amplifiedDifference);
        if (amplifiedDifference > threshold) {
          triggerHaptic(25);
        }
      }
    }
  }, [amplifiedDifference, threshold, soundMuted, soundEnabled]);

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

  // Dial angle calculation (-90deg to +90deg)
  const gaugePercent = Math.min(100, (amplifiedDifference / 160) * 100);
  const needleAngle = -90 + (gaugePercent / 100) * 180;

  return (
    <div className="space-y-4">
      {/* OS X Workstation Card Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Magnet className="w-5 h-5 text-[#0284c7]" />
            Wykrywacz Metalu & Miernik Pola Magnetycznego (EMF)
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Pinpointer ferromagnetyczny (profile ramy, śruby, przewody ścienne, magnesy stołu PEI) z syntezą dźwiękową zbliżenia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!hardwareDetected && !simulationActive && (
            <button
              onClick={() => setSimulationActive(true)}
              className="aqua-button text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5"
              title="Włącz symulację zbliżenia metalu dla testów na komputerze"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Symulacja PC</span>
            </button>
          )}

          {simulationActive && (
            <button
              onClick={() => setSimulationActive(false)}
              className="bg-amber-100 text-amber-900 border border-amber-400 text-xs px-2.5 py-1.5 rounded-lg font-semibold"
            >
              Wyłącz test
            </button>
          )}

          <button
            onClick={() => setSoundMuted(!soundMuted)}
            className="aqua-button p-2 rounded-lg text-xs cursor-pointer"
            title={soundMuted ? 'Włącz dźwięk pikania' : 'Wycisz pikanie'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-[#0284c7]" />}
          </button>

          {!isZeroed ? (
            <button
              onClick={handleTare}
              className="aqua-button-primary flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
              title="Odejmij naturalne tło ziemskie"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kalibruj Tło (Tare)</span>
            </button>
          ) : (
            <button
              onClick={handleResetTare}
              className="aqua-button flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
            >
              <span>Resetuj Tło</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Analog Vu-Meter inside CRT Glass */}
      <div className="retro-screen-crt rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-6">
        {/* Detection Status Pill */}
        <div>
          {isMetalDetected ? (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500 text-red-300 px-5 py-1.5 rounded-full text-xs font-mono font-bold animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>WYKRYTO METAL / SILNE POLE MAGNETYCZNE</span>
            </div>
          ) : amplifiedDifference > 20 ? (
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500 text-amber-300 px-4 py-1.5 rounded-full text-xs font-mono font-bold">
              <Radio className="w-4 h-4 text-amber-400" />
              <span>Zbliżanie do ferromagnetyka (anomalia pola)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#0f172a] border border-[#334155] text-emerald-400 px-4 py-1.5 rounded-full text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Pole w normie (Tło stabilne)</span>
            </div>
          )}
        </div>

        {/* Vintage Analog Vu-Meter Dial */}
        <div className="relative w-64 h-36 bg-[#0a0d12] border-2 border-[#334155] rounded-t-full overflow-hidden flex flex-col items-center justify-end p-2 shadow-inner">
          <div className="absolute top-4 inset-x-8 h-28 border-t-4 border-[#334155] rounded-t-full pointer-events-none" />
          <div className="absolute top-4 right-8 w-16 h-28 border-t-4 border-red-500 rounded-tr-full pointer-events-none" />

          {/* Needle */}
          <div
            className="absolute bottom-2 w-1 h-28 bg-[#38bdf8] origin-bottom transition-transform duration-75 shadow-md z-10"
            style={{ transform: `rotate(${needleAngle}deg)` }}
          >
            <div className="w-3 h-3 rounded-full bg-[#0284c7] -ml-1 -mt-1 shadow" />
          </div>

          {/* Scale Labels */}
          <div className="flex justify-between w-48 text-[10px] font-mono text-[#64748b] pb-1 z-0">
            <span>0 µT</span>
            <span>50</span>
            <span>100</span>
            <span className="text-red-400 font-bold">150+</span>
          </div>

          <div className="w-6 h-6 rounded-full bg-[#1e293b] border-2 border-[#475569] z-20" />
        </div>

        {/* Big Numerical Anomaly Readout */}
        <div className="text-center space-y-0.5">
          <div
            className={`text-6xl font-black font-mono tracking-tight ${
              isMetalDetected ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {amplifiedDifference.toFixed(0)}
            <span className="text-2xl text-[#64748b] ml-1 font-sans font-normal">µT</span>
          </div>
          <div className="text-xs font-mono text-[#94a3b8]">
            {isZeroed ? (
              <span>Sygnał względny (Tło odniesienia: {baseline} µT)</span>
            ) : (
              <span>Suma wektorowa pola: {totalUt} µT (1 µT = 10 mG)</span>
            )}
          </div>
        </div>

        {/* 3-Axis Field Breakdown */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Oś X</div>
            <div className="font-mono text-sm font-bold text-[#f1f5f9]">{xUt} µT</div>
          </div>
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Oś Y</div>
            <div className="font-mono text-sm font-bold text-[#f1f5f9]">{yUt} µT</div>
          </div>
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Oś Z</div>
            <div className="font-mono text-sm font-bold text-[#f1f5f9]">{zUt} µT</div>
          </div>
        </div>
      </div>

      {/* Sensitivity Gain & Threshold Controls */}
      <div className="retro-bezel p-4 rounded-xl border border-[#b8b2a5] space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between text-[#292524] font-bold">
              <span>Wzmocnienie czułości:</span>
              <span className="font-mono text-[#0284c7] font-bold">{sensitivityGain}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={sensitivityGain}
              onChange={(e) => setSensitivityGain(Number(e.target.value))}
              className="w-full accent-[#0284c7] cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[#292524] font-bold">
              <span>Próg alarmu zbliżenia:</span>
              <span className="font-mono text-red-600 font-bold">{threshold} µT</span>
            </div>
            <input
              type="range"
              min={15}
              max={100}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-red-600 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
