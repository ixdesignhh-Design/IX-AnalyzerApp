import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Mountain,
  Gauge,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { requestMotionPermission, triggerHaptic } from '../utils/sensors';

export const CompassGpsTool: React.FC = () => {
  const [heading, setHeading] = useState<number>(0);
  const [declinationOffset, setDeclinationOffset] = useState<number>(0);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);
  const [gpsData, setGpsData] = useState<{
    lat: number | null;
    lon: number | null;
    alt: number | null;
    speedKmh: number | null;
    accuracy: number | null;
  }>({
    lat: null,
    lon: null,
    alt: null,
    speedKmh: null,
    accuracy: null,
  });

  useEffect(() => {
    requestMotionPermission();

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (simulationActive) return;
      const anyE = e as any;
      let compHeading = 0;

      if (typeof anyE.webkitCompassHeading !== 'undefined') {
        compHeading = anyE.webkitCompassHeading;
      } else if (e.alpha !== null) {
        compHeading = (360 - e.alpha) % 360;
      }

      setHeading(Math.round((compHeading + declinationOffset + 360) % 360));
    };

    window.addEventListener('deviceorientation', handleOrientation);

    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsData({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            alt: pos.coords.altitude,
            speedKmh: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : 0,
            accuracy: Math.round(pos.coords.accuracy),
          });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [declinationOffset, simulationActive]);

  // Simulation loop for PC
  useEffect(() => {
    if (!simulationActive) return;
    let current = 45;
    const interval = setInterval(() => {
      current = (current + 1.5) % 360;
      setHeading(Math.round(current));
    }, 50);
    return () => clearInterval(interval);
  }, [simulationActive]);

  const toDms = (val: number | null, isLat: boolean) => {
    if (val === null) return '--° --\' --"';
    const absolute = Math.abs(val);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    const direction = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  };

  const getCardinalDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  return (
    <div className="space-y-4">
      {/* Retro OS X Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Compass className="w-5 h-5 text-[#0284c7]" />
            Kompas Geodezyjny 360° & Telemetria GPS
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Róża wiatrów z magnetycznym azymutem, korekcją deklinacji, prędkościomierzem i koordynatami DMS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSimulationActive(!simulationActive)}
            className="aqua-button text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5"
            title="Włącz obrót testowy na PC"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>{simulationActive ? 'Wyłącz test' : 'Test PC'}</span>
          </button>

          <div className="text-xs font-mono aqua-button-primary px-3 py-1.5 rounded-lg font-bold">
            {heading}° {getCardinalDirection(heading)}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visual Compass Card inside CRT Frame */}
        <div className="retro-screen-crt rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-[#0a0d12] border-4 border-[#334155] shadow-2xl flex items-center justify-center">
            {/* Rotating Dial */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-100"
              style={{ transform: `rotate(${-heading}deg)` }}
            >
              <div className="absolute top-2 font-bold text-rose-500 font-mono text-sm">N</div>
              <div className="absolute bottom-2 font-bold text-[#94a3b8] font-mono text-xs">S</div>
              <div className="absolute right-3 font-bold text-[#94a3b8] font-mono text-xs">E</div>
              <div className="absolute left-3 font-bold text-[#94a3b8] font-mono text-xs">W</div>

              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <div
                  key={deg}
                  className="absolute w-full h-full flex justify-center pt-1"
                  style={{ transform: `rotate(${deg}deg)` }}
                >
                  <div
                    className={`w-[2px] ${deg % 90 === 0 ? 'h-3 bg-[#38bdf8]' : 'h-1.5 bg-[#334155]'}`}
                  />
                </div>
              ))}
            </div>

            {/* Fixed Heading Indicator Needle */}
            <div className="absolute w-1 h-36 flex flex-col justify-between items-center pointer-events-none z-10">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[20px] border-b-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[20px] border-t-[#64748b]" />
            </div>

            {/* Center Hub */}
            <div className="w-16 h-16 rounded-full bg-[#0a0d12] border-2 border-[#475569] shadow-inner flex flex-col items-center justify-center z-20 font-mono">
              <span className="text-sm font-black text-[#f8fafc]">{heading}°</span>
              <span className="text-[10px] font-bold text-amber-400">{getCardinalDirection(heading)}</span>
            </div>
          </div>

          <div className="mt-4 text-xs font-mono text-[#94a3b8]">
            Azymut zorientowany magnetycznie
          </div>
        </div>

        {/* GPS Coordinates & Altitude Card */}
        <div className="retro-bezel rounded-2xl p-6 border border-[#b6b0a3] shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-[#57534e] font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#0284c7]" />
              Współrzędne GPS & Telemetria
            </div>

            <div className="bg-[#ede9df] p-3 rounded-lg border border-[#c5bfb2]">
              <div className="text-[10px] uppercase font-bold text-[#57534e]">Szerokość Geograficzna (Lat)</div>
              <div className="text-lg font-mono font-bold text-[#1c1917] mt-0.5">
                {toDms(gpsData.lat, true)}
              </div>
              <div className="text-[11px] text-[#78716c] font-mono">
                {gpsData.lat !== null ? gpsData.lat.toFixed(6) : 'Oczekiwanie na sygnał GPS'}
              </div>
            </div>

            <div className="bg-[#ede9df] p-3 rounded-lg border border-[#c5bfb2]">
              <div className="text-[10px] uppercase font-bold text-[#57534e]">Długość Geograficzna (Lon)</div>
              <div className="text-lg font-mono font-bold text-[#1c1917] mt-0.5">
                {toDms(gpsData.lon, false)}
              </div>
              <div className="text-[11px] text-[#78716c] font-mono">
                {gpsData.lon !== null ? gpsData.lon.toFixed(6) : 'Oczekiwanie na sygnał GPS'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#ede9df] p-3 rounded-lg border border-[#c5bfb2]">
                <div className="text-[10px] uppercase font-bold text-[#57534e] flex items-center gap-1">
                  <Mountain className="w-3 h-3 text-emerald-600" />
                  Wysokość GPS
                </div>
                <div className="text-xl font-mono font-bold text-emerald-700 mt-1">
                  {gpsData.alt !== null ? `${gpsData.alt.toFixed(1)} m` : '-- m'}
                </div>
              </div>

              <div className="bg-[#ede9df] p-3 rounded-lg border border-[#c5bfb2]">
                <div className="text-[10px] uppercase font-bold text-[#57534e] flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-[#0284c7]" />
                  Prędkość
                </div>
                <div className="text-xl font-mono font-bold text-[#0284c7] mt-1">
                  {gpsData.speedKmh !== null ? `${gpsData.speedKmh} km/h` : '0 km/h'}
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-[#57534e] flex items-center justify-between pt-2 border-t border-[#c5bfb2]">
            <span>Dokładność pozycjonowania:</span>
            <span className="font-mono text-[#1c1917] font-bold">
              {gpsData.accuracy !== null ? `±${gpsData.accuracy} m` : 'Szukanie satelitów...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
