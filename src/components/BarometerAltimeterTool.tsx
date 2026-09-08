import React, { useState, useEffect, useRef } from 'react';
import {
  Gauge,
  ArrowUp,
  ArrowDown,
  Minus,
  RotateCcw,
  Compass,
  Mountain,
  Wind,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const BarometerAltimeterTool: React.FC = () => {
  // Atmospheric pressure in hPa (standard sea-level is 1013.25 hPa)
  const [pressureHpa, setPressureHpa] = useState<number>(1013.2);
  const [sensorAvailable, setSensorAvailable] = useState<boolean>(false);
  const [basePressure, setBasePressure] = useState<number>(1013.2);
  const [isZeroed, setIsZeroed] = useState<boolean>(false);
  const [unit, setUnit] = useState<'hPa' | 'mmHg' | 'inHg' | 'psi'>('hPa');
  const [history, setHistory] = useState<number[]>([]);

  // Pressure to altitude formula (Barometric formula with standard atmosphere)
  // h = 44330 * (1 - (p / p0)^(1 / 5.255))
  const seaLevelP0 = 1013.25;
  const currentAltitudeM = 44330 * (1 - Math.pow(pressureHpa / seaLevelP0, 1 / 5.255));
  const baseAltitudeM = 44330 * (1 - Math.pow(basePressure / seaLevelP0, 1 / 5.255));
  const relativeAltitudeM = currentAltitudeM - baseAltitudeM;

  useEffect(() => {
    let sensor: any = null;
    let foundHardware = false;

    // Check for native Barometer Sensor (Generic Sensor API)
    try {
      const anyWin = window as any;
      if ('Barometer' in anyWin) {
        sensor = new anyWin.Barometer({ frequency: 10 });
        sensor.addEventListener('reading', () => {
          if (sensor.pressure) {
            // Pressure is in hectopascals (hPa)
            const p = Math.round(sensor.pressure * 10) / 10;
            setPressureHpa(p);
            setSensorAvailable(true);
            foundHardware = true;
          }
        });
        sensor.start();
      }
    } catch {
      // Sensor not allowed or unsupported
    }

    // Try GPS Altitude as an atmospheric reference if Barometer is not present
    if (!foundHardware && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos.coords.altitude !== null && pos.coords.altitude > 0) {
            // Reverse calculate estimated pressure from GPS altitude
            const alt = pos.coords.altitude;
            const estimatedP = Math.round(seaLevelP0 * Math.pow(1 - alt / 44330, 5.255) * 10) / 10;
            setPressureHpa(estimatedP);
            setBasePressure(estimatedP);
          }
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (sensor) {
        try {
          sensor.stop();
        } catch {}
      }
    };
  }, []);

  // Record pressure history for trend
  useEffect(() => {
    const timer = setInterval(() => {
      setHistory((prev) => [...prev.slice(-19), pressureHpa]);
    }, 2000);
    return () => clearInterval(timer);
  }, [pressureHpa]);

  const handleZeroAltitude = () => {
    setBasePressure(pressureHpa);
    setIsZeroed(true);
    triggerHaptic(40);
  };

  const handleResetZero = () => {
    setBasePressure(seaLevelP0);
    setIsZeroed(false);
    triggerHaptic(20);
  };

  // Unit conversions
  const getDisplayPressure = () => {
    switch (unit) {
      case 'mmHg':
        return (pressureHpa * 0.750062).toFixed(1);
      case 'inHg':
        return (pressureHpa * 0.02953).toFixed(2);
      case 'psi':
        return (pressureHpa * 0.0145038).toFixed(3);
      case 'hPa':
      default:
        return pressureHpa.toFixed(1);
    }
  };

  // Weather tendency
  const firstP = history[0] || pressureHpa;
  const lastP = history[history.length - 1] || pressureHpa;
  const diff = lastP - firstP;
  const trend = Math.abs(diff) < 0.2 ? 'stable' : diff > 0 ? 'rising' : 'falling';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-400" />
            Barometr & Wysokościomierz Względny (Altimeter)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Precyzyjne ciśnienie atmosferyczne, prognoza trendu pogodowego oraz wysokościomierz z funkcją zerowania (QFE).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Unit selector */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
            {(['hPa', 'mmHg', 'inHg', 'psi'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  unit === u ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <button
            onClick={isZeroed ? handleResetZero : handleZeroAltitude}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isZeroed
                ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isZeroed ? 'Resetuj Zero' : 'Zeruj Wysokość'}</span>
          </button>
        </div>
      </div>

      {/* Main Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pressure Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-sky-400" />
            Ciśnienie Atmosferyczne
          </div>

          <div className="text-center space-y-1">
            <div className="text-6xl font-black font-mono tracking-tight text-slate-100">
              {getDisplayPressure()}
              <span className="text-2xl text-slate-500 ml-1 font-sans font-normal">{unit}</span>
            </div>
            <div className="text-xs text-slate-400">
              Poziom morza (QNH standard): <span className="font-mono text-slate-200">1013.25 hPa</span>
            </div>
          </div>

          {/* Trend Badge */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-xs text-slate-400">Tendencja barometryczna:</span>
            {trend === 'stable' && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                <Minus className="w-3.5 h-3.5" />
                Stabilna (Brak zmian pogody)
              </span>
            )}
            {trend === 'rising' && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ArrowUp className="w-3.5 h-3.5" />
                Wzrost (Poprawa pogody)
              </span>
            )}
            {trend === 'falling' && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <ArrowDown className="w-3.5 h-3.5" />
                Spadek (Front / Możliwy deszcz)
              </span>
            )}
          </div>

          {/* Manual adjustment slider if phone lacks barometer */}
          <div className="w-full pt-4 border-t border-slate-800/80 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Ręczna kalibracja / ciśnienie stacji:</span>
              <span className="font-mono font-bold text-slate-200">{pressureHpa.toFixed(1)} hPa</span>
            </div>
            <input
              type="range"
              min={950}
              max={1050}
              step={0.1}
              value={pressureHpa}
              onChange={(e) => setPressureHpa(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>950 hPa (Niż górski)</span>
              <span>1013.2 hPa (Standard)</span>
              <span>1050 hPa (Silny wyż)</span>
            </div>
          </div>
        </div>

        {/* Altitude Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-4">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
            <Mountain className="w-4 h-4 text-emerald-400" />
            {isZeroed ? 'Wysokość Względna (Od Punktu Zerowania)' : 'Wysokość Barometryczna n.p.m.'}
          </div>

          <div className="text-center space-y-1">
            <div className="text-6xl font-black font-mono tracking-tight text-amber-400">
              {isZeroed ? (
                relativeAltitudeM >= 0 ? `+${relativeAltitudeM.toFixed(2)}` : relativeAltitudeM.toFixed(2)
              ) : (
                currentAltitudeM.toFixed(1)
              )}
              <span className="text-2xl text-slate-500 ml-1 font-sans font-normal">m</span>
            </div>
            <div className="text-xs text-slate-400">
              {isZeroed ? (
                <span>Wysokość bezwzględna: <strong className="text-slate-200">{currentAltitudeM.toFixed(1)} m n.p.m.</strong></span>
              ) : (
                <span>Wysokość w stopach: <strong className="text-slate-200">{(currentAltitudeM * 3.28084).toFixed(0)} ft</strong></span>
              )}
            </div>
          </div>

          {/* Zero mode indicator */}
          <div className="w-full max-w-sm bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="font-semibold text-slate-300 flex items-center justify-between">
              <span>Zastosowanie warsztatowe:</span>
              <span className="text-amber-400 font-mono text-[11px]">Δh = {Math.abs(relativeAltitudeM).toFixed(2)} m</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Połóż telefon na podłodze lub stole roboczym, kliknij <strong>"Zeruj Wysokość"</strong>, a następnie podnieś do ramy drukarki lub sufitu, aby zmierzyć różnicę wysokości z czułością mikro-barometryczną.
            </p>
          </div>

          {/* Sensor status */}
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                sensorAvailable ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
              }`}
            />
            <span className="text-slate-400">
              {sensorAvailable
                ? 'Czujnik barometru sprzętowego aktywny'
                : 'Tryb barometru barometryczno-geodezyjnego'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
