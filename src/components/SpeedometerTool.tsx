import React, { useState, useEffect } from 'react';
import {
  Zap,
  RotateCcw,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const SpeedometerTool: React.FC = () => {
  const [speedKmh, setSpeedKmh] = useState(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [unit, setUnit] = useState<'kmh' | 'mph' | 'knots'>('kmh');
  const [speedLimit, setSpeedLimit] = useState(50);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (isSimulating) {
      const interval = setInterval(() => {
        setSpeedKmh((prev) => {
          const next = Math.max(0, Math.min(130, prev + (Math.random() * 8 - 3)));
          const rounded = Math.round(next);
          setMaxSpeedKmh((m) => Math.max(m, rounded));
          setDistanceKm((d) => Math.round((d + 0.01) * 100) / 100);
          return rounded;
        });
      }, 500);
      return () => clearInterval(interval);
    }

    if (!('geolocation' in navigator)) return;

    let lastCoords: { lat: number; lon: number } | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const rawSpeed = pos.coords.speed;
        const curKmh = rawSpeed !== null && rawSpeed > 0 ? Math.round(rawSpeed * 3.6) : 0;
        setSpeedKmh(curKmh);
        setMaxSpeedKmh((prev) => Math.max(prev, curKmh));

        if (lastCoords) {
          const R = 6371;
          const dLat = ((pos.coords.latitude - lastCoords.lat) * Math.PI) / 180;
          const dLon = ((pos.coords.longitude - lastCoords.lon) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lastCoords.lat * Math.PI) / 180) *
              Math.cos((pos.coords.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const delta = R * c;
          if (delta > 0.002) {
            setDistanceKm((prev) => Math.round((prev + delta) * 100) / 100);
          }
        }
        lastCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isSimulating]);

  const convertSpeed = (kmhVal: number) => {
    switch (unit) {
      case 'mph':
        return Math.round(kmhVal * 0.621371);
      case 'knots':
        return Math.round(kmhVal * 0.539957);
      case 'kmh':
      default:
        return kmhVal;
    }
  };

  const displaySpeed = convertSpeed(speedKmh);
  const displayMax = convertSpeed(maxSpeedKmh);
  const isOverLimit = speedKmh > speedLimit;

  const resetStats = () => {
    setMaxSpeedKmh(0);
    setDistanceKm(0);
    setSpeedKmh(0);
    triggerHaptic(20);
  };

  return (
    <div className="space-y-4">
      {/* Retro OS X Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#0284c7]" />
            Szybkościomierz Cyfrowy GPS (Speedometer)
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Pomiar prędkości przemieszczania się (pieszo, rowerem, autem), prędkość maksymalna, licznik trasy i limit ostrzegawczy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className="aqua-button text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Symulacja prędkości na PC"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>{isSimulating ? 'Zatrzymaj test' : 'Test PC'}</span>
          </button>

          <div className="flex bg-[#ede9df] p-0.5 rounded-lg border border-[#c5bfb2] text-xs font-mono">
            {(['kmh', 'mph', 'knots'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  unit === u ? 'aqua-button-primary font-bold' : 'text-[#57534e] hover:text-black'
                }`}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={resetStats}
            className="aqua-button flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetuj</span>
          </button>
        </div>
      </div>

      {/* Main Big HUD Speedometer */}
      <div className="retro-screen-crt rounded-2xl p-8 flex flex-col items-center justify-center space-y-6 relative overflow-hidden shadow-2xl">
        {isOverLimit && (
          <div className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/50 text-rose-400 px-4 py-1.5 rounded-full text-xs font-bold animate-pulse font-mono">
            <AlertTriangle className="w-4 h-4" />
            <span>PRZEKROCZONO LIMIT PRĘDKOŚCI ({speedLimit} {unit})</span>
          </div>
        )}

        <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-[#0a0d12] border-4 border-[#334155] shadow-2xl flex flex-col items-center justify-center">
          <div
            className={`text-8xl sm:text-9xl font-black font-mono tracking-tighter transition-colors ${
              isOverLimit ? 'text-rose-500' : 'text-[#38bdf8]'
            }`}
          >
            {displaySpeed}
          </div>

          <div className="text-sm font-bold uppercase tracking-widest text-[#94a3b8] font-mono mt-[-6px]">
            {unit === 'kmh' ? 'km / h' : unit === 'mph' ? 'mph' : 'węzłów'}
          </div>

          <div className="text-xs text-[#64748b] font-mono mt-2">
            {isSimulating ? 'Symulacja testowa' : 'Sygnał GPS'}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg font-mono">
          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8]">Maksymalna</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              {displayMax} <span className="text-xs text-[#64748b] font-sans">{unit}</span>
            </div>
          </div>

          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8]">Dystans</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              {distanceKm.toFixed(2)} <span className="text-xs text-[#64748b] font-sans">km</span>
            </div>
          </div>

          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155] text-center">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8]">Limit</div>
            <div className="text-2xl font-black text-[#f8fafc] mt-0.5">
              {speedLimit} <span className="text-xs text-[#64748b] font-sans">{unit}</span>
            </div>
          </div>
        </div>

        {/* Speed Limit Slider */}
        <div className="w-full max-w-lg space-y-1 bg-[#0f172a] p-3 rounded-xl border border-[#334155] font-mono text-xs">
          <div className="flex justify-between text-[#cbd5e1]">
            <span>Próg ostrzeżenia o prędkości:</span>
            <span className="text-amber-400 font-bold">{speedLimit} km/h</span>
          </div>
          <input
            type="range"
            min={10}
            max={180}
            step={5}
            value={speedLimit}
            onChange={(e) => setSpeedLimit(Number(e.target.value))}
            className="w-full accent-[#0284c7] cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
