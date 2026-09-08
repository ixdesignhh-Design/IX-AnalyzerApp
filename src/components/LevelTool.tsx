import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  RotateCcw,
  CheckCircle2,
  Volume2,
  VolumeX,
  Smartphone,
  Sliders,
  Maximize2,
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
  const [yaw, setYaw] = useState(0);
  const [tarePitch, setTarePitch] = useState(0);
  const [tareRoll, setTareRoll] = useState(0);
  const [isTared, setIsTared] = useState(false);
  const [tolerance, setTolerance] = useState<number>(0.2); // 0.1 deg or 0.2 deg precision threshold

  const lastBeepTimeRef = useRef(0);
  const smoothPitchRef = useRef(0);
  const smoothRollRef = useRef(0);

  useEffect(() => {
    requestMotionPermission();

    // Low pass filter factor (EMA) to completely eliminate hand jitter
    const alpha = 0.25;

    // Use device motion (gravity vector) for high stability & precision
    const handleMotion = (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc) return;

      const gx = acc.x || 0;
      const gy = acc.y || 0;
      const gz = acc.z || 0;

      // Compute pitch and roll using standard aviation atan2 gravity decomposition
      // Pitch: rotation around X axis (nose up/down)
      // Roll: rotation around Y axis (wing tilt)
      const rawPitch = (Math.atan2(gy, Math.sqrt(gx * gx + gz * gz)) * 180) / Math.PI;
      const rawRoll = (Math.atan2(-gx, gz) * 180) / Math.PI;

      smoothPitchRef.current = alpha * rawPitch + (1 - alpha) * smoothPitchRef.current;
      smoothRollRef.current = alpha * rawRoll + (1 - alpha) * smoothRollRef.current;

      setPitch(Math.round(smoothPitchRef.current * 10) / 10);
      setRoll(Math.round(smoothRollRef.current * 10) / 10);
    };

    // Fallback/enhancement via deviceorientation
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) setYaw(Math.round(e.alpha));
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Compute angles adjusted for current Tare
  const relPitch = Math.round((pitch - tarePitch) * 10) / 10;
  const relRoll = Math.round((roll - tareRoll) * 10) / 10;

  // Selected axis based on mode
  let primaryAngle = 0;
  let totalError = 0;

  if (mode === 'surface_2d') {
    totalError = Math.sqrt(relPitch * relPitch + relRoll * relRoll);
  } else if (mode === 'vertical_edge') {
    // Standing up vertically: deviation from 90°
    const verticalDeviation = 90 - Math.abs(relPitch);
    totalError = Math.abs(verticalDeviation);
    primaryAngle = verticalDeviation;
  } else {
    // Horizontal tube: left-right roll
    totalError = Math.abs(relRoll);
    primaryAngle = relRoll;
  }

  const isAligned = totalError <= tolerance;

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
    setIsTared(true);
    triggerHaptic(40);
  };

  const handleResetTare = () => {
    setTarePitch(0);
    setTareRoll(0);
    setIsTared(false);
    triggerHaptic(20);
  };

  // Convert angles to bubble position on a 220px disc
  const maxOffset = 85;
  const bubbleX = Math.max(-maxOffset, Math.min(maxOffset, (relRoll / 12) * maxOffset));
  const bubbleY = Math.max(-maxOffset, Math.min(maxOffset, (relPitch / 12) * maxOffset));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            Poziomica Cyfrowa 2D/3D & Kątomierz Warsztatowy
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Filtracja grawitacyjna EMA, dokładność do 0.1°, wskaźnik mm/m oraz dedykowany tryb krawędziowy dla profili Z i stołu roboczego.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isTared ? (
            <button
              onClick={handleTare}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-2 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Ustaw aktualne położenie jako 0.0° (względne zero)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Wyzeruj (Tare)</span>
            </button>
          ) : (
            <button
              onClick={handleResetTare}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <span>Resetuj Tare</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
        <button
          onClick={() => setMode('surface_2d')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
            mode === 'surface_2d'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Płasko (Stół 2D / Libelka)
        </button>
        <button
          onClick={() => setMode('vertical_edge')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
            mode === 'vertical_edge'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Krawędź Pionowa (Rama Z)
        </button>
        <button
          onClick={() => setMode('horizontal_tube')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
            mode === 'horizontal_tube'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Rurkowa (Belka X)
        </button>
      </div>

      {/* Main Display Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-6">
        {/* Status Header */}
        <div className="flex items-center gap-2">
          {isAligned ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-bold animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span>IDEALNY POZIOM / PION (0.0°)</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400">
              Odchylenie: <span className="font-mono font-bold text-amber-400 text-sm">{totalError.toFixed(1)}°</span>
            </div>
          )}
        </div>

        {/* 2D Bull's Eye View */}
        {mode === 'surface_2d' && (
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-slate-950 border-4 border-slate-800 shadow-2xl flex items-center justify-center overflow-hidden">
            {/* Concentric rings with angle markers */}
            <div className="absolute w-52 h-52 rounded-full border border-slate-800 pointer-events-none" />
            <div className="absolute w-36 h-36 rounded-full border border-slate-700/80 pointer-events-none" />
            <div
              className={`absolute w-16 h-16 rounded-full border-2 transition-colors pointer-events-none ${
                isAligned ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-600'
              }`}
            />

            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-slate-800 pointer-events-none" />
            <div className="absolute h-full w-[1px] bg-slate-800 pointer-events-none" />

            {/* Liquid Bubble */}
            <div
              className={`absolute w-12 h-12 rounded-full shadow-lg transition-transform duration-75 flex items-center justify-center ${
                isAligned
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/50'
                  : 'bg-amber-400 text-slate-950 shadow-amber-500/30'
              }`}
              style={{
                transform: `translate(${bubbleX}px, ${bubbleY}px)`,
              }}
            >
              <div className="w-3 h-3 rounded-full bg-white/70 blur-[1px]" />
            </div>

            {/* Center Target Dot */}
            <div className="w-2 h-2 rounded-full bg-slate-400 pointer-events-none z-10" />
          </div>
        )}

        {/* Linear Spirit Level Tube View (Horizontal or Vertical) */}
        {mode !== 'surface_2d' && (
          <div className="w-full max-w-md space-y-4 py-6">
            <div className="relative w-full h-16 bg-slate-950 border-2 border-slate-700 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner">
              {/* Center target boundary lines */}
              <div className="absolute w-14 h-full border-x-2 border-slate-600/80 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-[1px] h-full bg-slate-800" />
              </div>

              {/* Moving spirit bubble */}
              <div
                className={`absolute w-12 h-10 rounded-xl transition-transform duration-75 flex items-center justify-center shadow-md ${
                  isAligned ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-400 shadow-amber-500/30'
                }`}
                style={{
                  transform: `translateX(${Math.max(-140, Math.min(140, (primaryAngle / 10) * 140))}px)`,
                }}
              >
                <div className="w-3 h-2 rounded-full bg-white/80" />
              </div>
            </div>

            <div className="text-center font-mono text-3xl font-black text-slate-100">
              {primaryAngle > 0 ? `+${primaryAngle.toFixed(1)}` : primaryAngle.toFixed(1)}°
            </div>
          </div>
        )}

        {/* Numerical Technical Readouts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Roll (Lewo/Prawo)</div>
            <div className={`text-xl font-black font-mono mt-0.5 ${Math.abs(relRoll) <= tolerance ? 'text-emerald-400' : 'text-slate-100'}`}>
              {relRoll > 0 ? `+${relRoll.toFixed(1)}` : relRoll.toFixed(1)}°
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Pitch (Przód/Tył)</div>
            <div className={`text-xl font-black font-mono mt-0.5 ${Math.abs(relPitch) <= tolerance ? 'text-emerald-400' : 'text-slate-100'}`}>
              {relPitch > 0 ? `+${relPitch.toFixed(1)}` : relPitch.toFixed(1)}°
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Skok (mm/m)</div>
            <div className="text-xl font-black font-mono text-amber-400 mt-0.5">
              {mmPerMeter}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Nachylenie %</div>
            <div className="text-xl font-black font-mono text-sky-400 mt-0.5">
              {slopePercent}%
            </div>
          </div>
        </div>

        {/* Tare banner */}
        {isTared && (
          <div className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span>Względny punkt odniesienia (Tare): zero ustawione na [{tareRoll.toFixed(1)}°, {tarePitch.toFixed(1)}°]</span>
          </div>
        )}
      </div>
    </div>
  );
};
