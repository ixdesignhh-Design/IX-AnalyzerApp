import React, { useState, useEffect } from 'react';
import {
  Gauge,
  ArrowUp,
  ArrowDown,
  Minus,
  RotateCcw,
  Mountain,
  Wind,
  MapPin,
  RefreshCw,
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
  const [isFetchingQnh, setIsFetchingQnh] = useState<boolean>(false);

  // Pressure to altitude formula (Barometric formula with standard atmosphere)
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
            const p = Math.round(sensor.pressure * 10) / 10;
            setPressureHpa(p);
            setSensorAvailable(true);
            foundHardware = true;
          }
        });
        sensor.start();
      }
    } catch {}

    // Fallback via GPS altitude if Barometer is not directly accessible
    if (!foundHardware && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos.coords.altitude !== null && pos.coords.altitude > 0) {
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

  const fetchLiveQnh = () => {
    if (!('geolocation' in navigator)) return;
    setIsFetchingQnh(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=surface_pressure,pressure_msl`
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.current?.surface_pressure) {
              setPressureHpa(Math.round(data.current.surface_pressure * 10) / 10);
              triggerHaptic([30, 40]);
            }
          }
        } catch (err) {
          console.warn('Weather fetch failed', err);
        } finally {
          setIsFetchingQnh(false);
        }
      },
      () => {
        setIsFetchingQnh(false);
      }
    );
  };

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

  const firstP = history[0] || pressureHpa;
  const lastP = history[history.length - 1] || pressureHpa;
  const diff = lastP - firstP;
  const trend = Math.abs(diff) < 0.2 ? 'stable' : diff > 0 ? 'rising' : 'falling';

  return (
    <div className="space-y-4">
      {/* OS X Workstation Card Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Gauge className="w-5 h-5 text-[#0284c7]" />
            Barometr & Wysokościomierz Względny (Altimeter QFE)
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Precyzyjne ciśnienie atmosferyczne, tendencja baryczna pogody oraz wysokościomierz z zerowaniem punktu odniesienia.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Unit selector */}
          <div className="flex bg-[#cdc6b9] p-0.5 rounded-lg border border-[#a8a295] text-xs font-mono">
            {(['hPa', 'mmHg', 'inHg', 'psi'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  unit === u ? 'aqua-button-primary font-bold' : 'text-[#44403c] hover:bg-[#ded9ce]'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          <button
            onClick={fetchLiveQnh}
            disabled={isFetchingQnh}
            className="aqua-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            title="Pobierz ciśnienie ze stacji meteo GPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0284c7] ${isFetchingQnh ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Stacja Meteo</span>
          </button>

          <button
            onClick={isZeroed ? handleResetZero : handleZeroAltitude}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isZeroed ? 'aqua-button' : 'aqua-button-primary'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isZeroed ? 'Resetuj Zero' : 'Zeruj Wysokość (Tare)'}</span>
          </button>
        </div>
      </div>

      {/* Main Gauges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pressure Card */}
        <div className="retro-screen-crt rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-[#94a3b8] font-bold flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-[#38bdf8]" />
            Ciśnienie Atmosferyczne
          </div>

          <div className="text-center space-y-1">
            <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-emerald-400">
              {getDisplayPressure()}
              <span className="text-2xl text-[#64748b] ml-1 font-sans font-normal">{unit}</span>
            </div>
            <div className="text-xs font-mono text-[#94a3b8]">
              Poziom morza (QNH standard): 1013.25 hPa
            </div>
          </div>

          {/* Trend Badge */}
          <div className="flex items-center gap-2 pt-1 font-mono text-xs">
            <span className="text-[#94a3b8]">Tendencja:</span>
            {trend === 'stable' && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0f172a] text-[#cbd5e1] border border-[#334155]">
                <Minus className="w-3.5 h-3.5" />
                Stabilna
              </span>
            )}
            {trend === 'rising' && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ArrowUp className="w-3.5 h-3.5" />
                Wzrost (Poprawa pogody)
              </span>
            )}
            {trend === 'falling' && (
              <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <ArrowDown className="w-3.5 h-3.5" />
                Spadek (Front niżowy)
              </span>
            )}
          </div>

          {/* Manual adjustment slider */}
          <div className="w-full pt-3 border-t border-[#334155] space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#94a3b8]">
              <span>Kalibracja QNH:</span>
              <span className="text-emerald-400 font-bold">{pressureHpa.toFixed(1)} hPa</span>
            </div>
            <input
              type="range"
              min={950}
              max={1050}
              step={0.1}
              value={pressureHpa}
              onChange={(e) => setPressureHpa(Number(e.target.value))}
              className="w-full accent-[#0284c7] cursor-pointer"
            />
          </div>
        </div>

        {/* Altitude Card */}
        <div className="retro-screen-crt rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-[#94a3b8] font-bold flex items-center gap-1.5">
            <Mountain className="w-4 h-4 text-emerald-400" />
            {isZeroed ? 'Wysokość Względna (Od Punktu Zerowania)' : 'Wysokość Barometryczna n.p.m.'}
          </div>

          <div className="text-center space-y-1">
            <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-amber-400">
              {isZeroed
                ? relativeAltitudeM >= 0
                  ? `+${relativeAltitudeM.toFixed(2)}`
                  : relativeAltitudeM.toFixed(2)
                : currentAltitudeM.toFixed(1)}
              <span className="text-2xl text-[#64748b] ml-1 font-sans font-normal">m</span>
            </div>
            <div className="text-xs font-mono text-[#94a3b8]">
              {isZeroed ? (
                <span>Wysokość bezwzględna: {currentAltitudeM.toFixed(1)} m n.p.m.</span>
              ) : (
                <span>Wysokość w stopach: {(currentAltitudeM * 3.28084).toFixed(0)} ft</span>
              )}
            </div>
          </div>

          <div className="w-full bg-[#0a0d12] p-3 rounded-xl border border-[#334155] text-xs font-mono space-y-1 text-[#94a3b8]">
            <div className="font-semibold text-[#cbd5e1] flex items-center justify-between">
              <span>Pomiar różnicy wysokości:</span>
              <span className="text-amber-400">Δh = {Math.abs(relativeAltitudeM).toFixed(2)} m</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Połóż telefon na podłodze/stole, kliknij <strong>"Zeruj Wysokość"</strong>, a następnie unieś telefon, aby zmierzyć dokładną wysokość z rozdzielczością centymetrową.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#94a3b8]">
            <span
              className={`w-2 h-2 rounded-full ${
                sensorAvailable ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-amber-400'
              }`}
            />
            <span>
              {sensorAvailable
                ? 'Sprzętowy sensor barometru aktywny'
                : 'Sensor hybrydowy (GPS + interpolacja meteo)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
