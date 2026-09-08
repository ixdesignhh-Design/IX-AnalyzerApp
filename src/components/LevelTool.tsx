import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  RotateCcw,
  CheckCircle2,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { requestMotionPermission, triggerHaptic } from '../utils/sensors';
import { playLevelBeep } from '../utils/audio';

interface LevelToolProps {
  soundEnabled: boolean;
}

type LevelMode = 'surface_2d' | 'vertical_edge' | 'horizontal_tube';

export const LevelTool: React.FC<LevelToolProps> = ({ soundEnabled }) => {
  const [mode, setMode] = useState<LevelMode>('surface_2d');
  const [pitch, setPitch] = useState(0); // Front-Back angle in degrees
  const [roll, setRoll] = useState(0); // Left-Right angle in degrees
  const [isHardwareAvailable, setIsHardwareAvailable] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);

  // Calibration Tare loaded from localStorage
  const [tarePitch, setTarePitch] = useState(() => {
    return parseFloat(localStorage.getItem('ix_level_tare_pitch') || '0');
  });
  const [tareRoll, setTareRoll] = useState(() => {
    return parseFloat(localStorage.getItem('ix_level_tare_roll') || '0');
  });
  const [tolerance, setTolerance] = useState<number>(0.2); // 0.2 deg precision
  const [dampingFactor, setDampingFactor] = useState<number>(0.25); // EMA filter

  const lastBeepTimeRef = useRef(0);
  const smoothPitchRef = useRef(0);
  const smoothRollRef = useRef(0);

  useEffect(() => {
    requestMotionPermission();

    let receivedSensorData = false;

    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const gx = acc.x ?? 0;
      const gy = acc.y ?? 0;
      const gz = acc.z ?? 0;

      // Check if actual values are arriving (not static 0 on desktop)
      if (Math.abs(gx) > 0.05 || Math.abs(gy) > 0.05 || Math.abs(gz) > 0.05) {
        receivedSensorData = true;
        setIsHardwareAvailable(true);
      }

      // Compute pitch and roll using standard aviation atan2 gravity decomposition
      const rawPitch = (Math.atan2(gy, Math.sqrt(gx * gx + gz * gz)) * 180) / Math.PI;
      const rawRoll = (Math.atan2(-gx, gz) * 180) / Math.PI;

      smoothPitchRef.current = dampingFactor * rawPitch + (1 - dampingFactor) * smoothPitchRef.current;
      smoothRollRef.current = dampingFactor * rawRoll + (1 - dampingFactor) * smoothRollRef.current;

      setPitch(Math.round(smoothPitchRef.current * 10) / 10);
      setRoll(Math.round(smoothRollRef.current * 10) / 10);
    };

    window.addEventListener('devicemotion', handleMotion);

    // Timeout check: if no physical accelerometer detected after 1.5s (e.g. running on desktop PC), provide test mode option
    const timer = setTimeout(() => {
      if (!receivedSensorData) {
        setIsHardwareAvailable(false);
      }
    }, 1500);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      clearTimeout(timer);
    };
  }, [dampingFactor]);

  // Simulation loop when active (for PC/GitHub testing)
  useEffect(() => {
    if (!simulationActive) return;
    let angle = 0;
    const interval = setInterval(() => {
      angle += 0.05;
      const simPitch = Math.sin(angle) * 3.5;
      const simRoll = Math.cos(angle * 0.8) * 4.2;
      setPitch(Math.round(simPitch * 10) / 10);
      setRoll(Math.round(simRoll * 10) / 10);
    }, 50);
    return () => clearInterval(interval);
  }, [simulationActive]);

  // Compute angles adjusted for current Tare
  const relPitch = Math.round((pitch - tarePitch) * 10) / 10;
  const relRoll = Math.round((roll - tareRoll) * 10) / 10;

  // Selected axis based on mode
  let primaryAngle = 0;
  let totalError = 0;

  if (mode === 'surface_2d') {
    totalError = Math.sqrt(relPitch * relPitch + relRoll * relRoll);
  } else if (mode === 'vertical_edge') {
    const verticalDeviation = 90 - Math.abs(relPitch);
    totalError = Math.abs(verticalDeviation);
    primaryAngle = verticalDeviation;
  } else {
    totalError = Math.abs(relRoll);
    primaryAngle = relRoll;
  }

  const isAligned = totalError <= tolerance;
  const isTared = tarePitch !== 0 || tareRoll !== 0;

  // Slope conversions
  const slopePercent = (Math.tan((totalError * Math.PI) / 180) * 100).toFixed(2);
  const mmPerMeter = (Math.tan((totalError * Math.PI) / 180) * 1000).toFixed(1);

  // Audio/Haptic on perfect alignment
  useEffect(() => {
    if (isAligned) {
      const now = performance.now();
      if (now - lastBeepTimeRef.current > 1000) {
        lastBeepTimeRef.current = now;
        triggerHaptic([30, 60, 30]);
        if (soundEnabled) {
          playLevelBeep(true);
        }
      }
    }
  }, [isAligned, soundEnabled]);

  const handleTare = () => {
    setTarePitch(pitch);
    setTareRoll(roll);
    localStorage.setItem('ix_level_tare_pitch', pitch.toString());
    localStorage.setItem('ix_level_tare_roll', roll.toString());
    triggerHaptic(40);
  };

  const handleResetTare = () => {
    setTarePitch(0);
    setTareRoll(0);
    localStorage.removeItem('ix_level_tare_pitch');
    localStorage.removeItem('ix_level_tare_roll');
    triggerHaptic(20);
  };

  // Convert angles to bubble position on a 220px disc
  const maxOffset = 85;
  const bubbleX = Math.max(-maxOffset, Math.min(maxOffset, (relRoll / 12) * maxOffset));
  const bubbleY = Math.max(-maxOffset, Math.min(maxOffset, (relPitch / 12) * maxOffset));

  return (
    <div className="space-y-4">
      {/* OS X Workstation Card Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#0284c7]" />
            Poziomica Cyfrowa 2D/3D & Kątomierz Płaszczyzn
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Kalibracja IMU z filtrem grawitacyjnym EMA, dokładność 0.1°, wskaźnik mm/m oraz trwała pamięć zerowania Tare.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isHardwareAvailable && !simulationActive && (
            <button
              onClick={() => setSimulationActive(true)}
              className="aqua-button text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5"
              title="Włącz symulację kołysania (dla testów na PC bez czujnika)"
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

          {!isTared ? (
            <button
              onClick={handleTare}
              className="aqua-button-primary flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
              title="Ustaw aktualne położenie jako 0.0° (względne zero)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Kalibruj Zero (Tare)</span>
            </button>
          ) : (
            <button
              onClick={handleResetTare}
              className="aqua-button flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
            >
              <span>Resetuj Tare</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-[#cdc6b9] p-1.5 rounded-xl border border-[#a8a295] shadow-inner">
        <button
          onClick={() => setMode('surface_2d')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
            mode === 'surface_2d'
              ? 'aqua-button-primary shadow'
              : 'text-[#44403c] hover:bg-[#ded9ce]'
          }`}
        >
          Płasko (Stół 2D / Libelka)
        </button>
        <button
          onClick={() => setMode('vertical_edge')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
            mode === 'vertical_edge'
              ? 'aqua-button-primary shadow'
              : 'text-[#44403c] hover:bg-[#ded9ce]'
          }`}
        >
          Krawędź Pionowa (Rama Z)
        </button>
        <button
          onClick={() => setMode('horizontal_tube')}
          className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
            mode === 'horizontal_tube'
              ? 'aqua-button-primary shadow'
              : 'text-[#44403c] hover:bg-[#ded9ce]'
          }`}
        >
          Rurkowa (Belka X)
        </button>
      </div>

      {/* Main Display CRT Bezel Card */}
      <div className="retro-screen-crt rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-6 relative">
        {/* Status Header */}
        <div className="flex items-center gap-2">
          {isAligned ? (
            <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500 text-emerald-300 px-4 py-1 rounded-full text-xs font-bold font-mono tracking-wider animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>IDEALNY POZIOM / PION [0.0°]</span>
            </div>
          ) : (
            <div className="text-xs font-mono text-[#94a3b8]">
              Odchylenie: <span className="font-bold text-amber-400 text-sm">{totalError.toFixed(1)}°</span>
            </div>
          )}
        </div>

        {/* 2D Bull's Eye View */}
        {mode === 'surface_2d' && (
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-[#0d1117] border-4 border-[#334155] shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] flex items-center justify-center overflow-hidden">
            {/* Concentric grid rings */}
            <div className="absolute w-52 h-52 rounded-full border border-[#1e293b] pointer-events-none" />
            <div className="absolute w-36 h-36 rounded-full border border-[#334155]/60 pointer-events-none" />
            <div
              className={`absolute w-16 h-16 rounded-full border-2 transition-colors pointer-events-none ${
                isAligned ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_12px_#10b981]' : 'border-[#475569]'
              }`}
            />

            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-[#1e293b] pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-[#1e293b] pointer-events-none" />

            {/* Glowing Liquid Bubble */}
            <div
              className={`absolute w-12 h-12 rounded-full shadow-lg transition-transform duration-75 flex items-center justify-center ${
                isAligned
                  ? 'bg-emerald-400 text-slate-950 shadow-[0_0_20px_#34d399]'
                  : 'bg-amber-400 text-slate-950 shadow-[0_0_15px_#f59e0b]'
              }`}
              style={{
                transform: `translate(${bubbleX}px, ${bubbleY}px)`,
              }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white/80 blur-[0.5px]" />
            </div>

            {/* Center Crosshair Dot */}
            <div className="w-2 h-2 rounded-full bg-[#64748b] pointer-events-none z-10" />
          </div>
        )}

        {/* Linear Spirit Level Tube View */}
        {mode !== 'surface_2d' && (
          <div className="w-full max-w-md space-y-4 py-4">
            <div className="relative w-full h-16 bg-[#0d1117] border-2 border-[#334155] rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
              <div className="absolute w-14 h-full border-x-2 border-[#475569] pointer-events-none z-10 flex items-center justify-center">
                <div className="w-[1px] h-full bg-[#1e293b]" />
              </div>

              <div
                className={`absolute w-12 h-10 rounded-xl transition-transform duration-75 flex items-center justify-center shadow-md ${
                  isAligned ? 'bg-emerald-400 shadow-[0_0_15px_#34d399]' : 'bg-amber-400 shadow-[0_0_15px_#f59e0b]'
                }`}
                style={{
                  transform: `translateX(${Math.max(-140, Math.min(140, (primaryAngle / 10) * 140))}px)`,
                }}
              >
                <div className="w-3 h-2 rounded-full bg-white/90" />
              </div>
            </div>

            <div className="text-center font-mono text-4xl font-black text-emerald-400">
              {primaryAngle > 0 ? `+${primaryAngle.toFixed(1)}` : primaryAngle.toFixed(1)}°
            </div>
          </div>
        )}

        {/* Technical Digital Readouts in Phosphor Screen Style */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Roll (Oś X)</div>
            <div className={`text-xl font-black font-mono mt-0.5 ${Math.abs(relRoll) <= tolerance ? 'text-emerald-400' : 'text-slate-100'}`}>
              {relRoll > 0 ? `+${relRoll.toFixed(1)}` : relRoll.toFixed(1)}°
            </div>
          </div>

          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Pitch (Oś Y)</div>
            <div className={`text-xl font-black font-mono mt-0.5 ${Math.abs(relPitch) <= tolerance ? 'text-emerald-400' : 'text-slate-100'}`}>
              {relPitch > 0 ? `+${relPitch.toFixed(1)}` : relPitch.toFixed(1)}°
            </div>
          </div>

          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Skok mm/m</div>
            <div className="text-xl font-black font-mono text-amber-400 mt-0.5">
              {mmPerMeter}
            </div>
          </div>

          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Nachylenie %</div>
            <div className="text-xl font-black font-mono text-sky-400 mt-0.5">
              {slopePercent}%
            </div>
          </div>
        </div>

        {/* Tare banner */}
        {isTared && (
          <div className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span>Kalibracja Tare aktywna: offset [{tareRoll.toFixed(1)}°, {tarePitch.toFixed(1)}°] zapisany w pamięci</span>
          </div>
        )}
      </div>

      {/* Filter and Calibration Fine-Tuning Drawer */}
      <div className="retro-bezel p-3 rounded-xl border border-[#b8b2a5] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-[#0284c7]" />
          <span className="font-bold text-[#292524]">Czułość tłumienia (Filtr EMA):</span>
          <select
            value={dampingFactor}
            onChange={(e) => setDampingFactor(parseFloat(e.target.value))}
            className="bg-[#f2eee8] border border-[#a8a295] rounded px-2 py-0.5 text-xs font-mono"
          >
            <option value={0.1}>Maksymalne wygładzenie (statyw/maszyna)</option>
            <option value={0.25}>Standard (ręczne trzymanie S23 Ultra)</option>
            <option value={0.45}>Szybka reakcja (dynamiczne)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-[#292524]">Tolerancja poziomu:</span>
          <select
            value={tolerance}
            onChange={(e) => setTolerance(parseFloat(e.target.value))}
            className="bg-[#f2eee8] border border-[#a8a295] rounded px-2 py-0.5 text-xs font-mono"
          >
            <option value={0.1}>Ultra dokładna (±0.1°)</option>
            <option value={0.2}>Standardowa warsztatowa (±0.2°)</option>
            <option value={0.5}>Zgrubna (±0.5°)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
