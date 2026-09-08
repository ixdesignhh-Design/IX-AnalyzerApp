import React, { useState, useEffect } from 'react';
import {
  Zap,
  RotateCcw,
  Navigation,
  AlertTriangle,
  Play,
  Pause,
  Compass,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const SpeedometerTool: React.FC = () => {
  const [speedKmh, setSpeedKmh] = useState(0);
  const [maxSpeedKmh, setMaxSpeedKmh] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [unit, setUnit] = useState<'kmh' | 'mph' | 'knots'>('kmh');
  const [speedLimit, setSpeedLimit] = useState(50);
  const [isTracking, setIsTracking] = useState(true);

  useEffect(() => {
    if (!('geolocation' in navigator) || !isTracking) return;

    let lastCoords: { lat: number; lon: number } | null = null;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const rawSpeed = pos.coords.speed; // m/s
        const curKmh = rawSpeed !== null && rawSpeed > 0 ? Math.round(rawSpeed * 3.6) : 0;
        setSpeedKmh(curKmh);
        setMaxSpeedKmh((prev) => Math.max(prev, curKmh));

        // Distance accumulation
        if (lastCoords) {
          const R = 6371; // km
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
  }, [isTracking]);

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
    triggerHaptic(20);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-400" />
            Szybkościomierz Cyfrowy GPS (Speedometer)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pomiar prędkości przemieszczania się (pieszo, rowerem, samochodem), prędkość maksymalna, licznik trasy i ostrzeżenie o limicie.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(['kmh', 'mph', 'knots'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  unit === u ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={resetStats}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resetuj Statystyki</span>
          </button>
        </div>
      </div>

      {/* Main Big HUD Speedometer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
        {isOverLimit && (
          <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 text-red-400 px-4 py-1.5 rounded-full text-xs font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span>PRZEKROCZONO ZADANY LIMIT PRĘDKOŚCI ({speedLimit} {unit})</span>
          </div>
        )}

        <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-slate-950 border-4 border-slate-800 shadow-2xl flex flex-col items-center justify-center">
          {/* Subtle Speed Arc */}
          <div
            className={`text-8xl sm:text-9xl font-black font-mono tracking-tighter transition-colors ${
              isOverLimit ? 'text-red-400' : 'text-sky-400'
            }`}
          >
            {displaySpeed}
          </div>

          <div className="text-sm font-bold uppercase tracking-widest text-slate-400 mt-[-6px]">
            {unit === 'kmh' ? 'km / h' : unit === 'mph' ? 'mph' : 'węzłów'}
          </div>

          <div className="text-xs text-slate-500 font-mono mt-2">
            Sygnał GPS Satelitarny
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-lg">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Maksymalna</div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-0.5">
              {displayMax} <span className="text-xs text-slate-500 font-sans">{unit}</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Przebyty Dystans</div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
              {distanceKm.toFixed(2)} <span className="text-xs text-slate-500 font-sans">km</span>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Limit Alarmowy</div>
            <div className="text-2xl font-black font-mono text-slate-200 mt-0.5">
              {speedLimit} <span className="text-xs text-slate-500 font-sans">{unit}</span>
            </div>
          </div>
        </div>

        {/* Speed Limit Slider */}
        <div className="w-full max-w-lg space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Ustawienie progu ostrzegawczego:</span>
            <span className="font-mono text-slate-200 font-bold">{speedLimit} km/h</span>
          </div>
          <input
            type="range"
            min={10}
            max={180}
            step={5}
            value={speedLimit}
            onChange={(e) => setSpeedLimit(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
