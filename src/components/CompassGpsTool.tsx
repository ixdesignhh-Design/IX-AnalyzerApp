import React, { useState, useEffect } from 'react';
import {
  Compass,
  Navigation,
  MapPin,
  Mountain,
  Gauge,
  Crosshair,
  RotateCcw,
} from 'lucide-react';
import { requestMotionPermission, triggerHaptic } from '../utils/sensors';

export const CompassGpsTool: React.FC = () => {
  const [heading, setHeading] = useState<number>(0); // 0-360 degrees
  const [pitch, setPitch] = useState<number>(0);
  const [roll, setRoll] = useState<number>(0);
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
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    requestMotionPermission();

    // Orientation event for compass heading
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // In iOS webkitCompassHeading provides true north.
      // In Android standard alpha is compass heading (degrees counter-clockwise or clockwise).
      const anyE = e as any;
      let compHeading = 0;

      if (typeof anyE.webkitCompassHeading !== 'undefined') {
        compHeading = anyE.webkitCompassHeading;
      } else if (e.alpha !== null) {
        // Standard Android orientation alpha
        compHeading = (360 - e.alpha) % 360;
      }

      setHeading(Math.round(compHeading));
      if (e.beta !== null) setPitch(Math.round(e.beta));
      if (e.gamma !== null) setRoll(Math.round(e.gamma));
    };

    window.addEventListener('deviceorientation', handleOrientation);

    // Watch GPS position
    let watchId: number | null = null;
    if ('geolocation' in navigator) {
      setGpsActive(true);
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsData({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            alt: pos.coords.altitude,
            speedKmh: pos.coords.speed !== null ? Math.round(pos.coords.speed * 3.6) : 0,
            accuracy: Math.round(pos.coords.accuracy),
          });
          setGpsError(null);
        },
        (err) => {
          setGpsError('GPS niedostępny lub zablokowany');
        },
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Convert decimal degrees to DMS (Degrees, Minutes, Seconds)
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
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            Kompas Geodezyjny 360° & Pozycjoner GPS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Róża wiatrów z magnetycznym azymutem, prędkościomierzem i współrzędnymi geograficznymi DMS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-amber-400 font-bold">
            {heading}° {getCardinalDirection(heading)}
          </div>
        </div>
      </div>

      {/* Main Compass Rose & Readouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visual Compass Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          {/* Compass Rose Dial */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-slate-950 border-4 border-slate-800 shadow-2xl flex items-center justify-center">
            {/* Rotating Dial */}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center transition-transform duration-100"
              style={{ transform: `rotate(${-heading}deg)` }}
            >
              {/* Dial markings */}
              <div className="absolute top-2 font-bold text-rose-500 font-mono text-sm">N</div>
              <div className="absolute bottom-2 font-bold text-slate-400 font-mono text-xs">S</div>
              <div className="absolute right-3 font-bold text-slate-400 font-mono text-xs">E</div>
              <div className="absolute left-3 font-bold text-slate-400 font-mono text-xs">W</div>

              {/* Angle ticks every 30 deg */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                <div
                  key={deg}
                  className="absolute w-full h-full flex justify-center pt-1"
                  style={{ transform: `rotate(${deg}deg)` }}
                >
                  <div
                    className={`w-[2px] ${deg % 90 === 0 ? 'h-3 bg-amber-400' : 'h-1.5 bg-slate-700'}`}
                  />
                </div>
              ))}
            </div>

            {/* Fixed Heading Indicator Needle */}
            <div className="absolute w-1 h-36 flex flex-col justify-between items-center pointer-events-none z-10">
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[20px] border-b-rose-500" />
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[20px] border-t-slate-500" />
            </div>

            {/* Center Hub */}
            <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-slate-700 shadow-inner flex flex-col items-center justify-center z-20">
              <span className="font-mono text-sm font-black text-slate-100">{heading}°</span>
              <span className="text-[10px] font-bold text-amber-400">{getCardinalDirection(heading)}</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-400">
            Azymut magnetyczny z korekcją orientacji
          </div>
        </div>

        {/* GPS Coordinates & Altitude Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-400" />
              Współrzędne GPS & Telemetria
            </div>

            {/* Latitude DMS */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Szerokość Geograficzna (Latitude)</div>
              <div className="text-lg font-mono font-bold text-slate-100 mt-0.5">
                {toDms(gpsData.lat, true)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {gpsData.lat !== null ? gpsData.lat.toFixed(6) : 'Oczekiwanie na sygnał GPS'}
              </div>
            </div>

            {/* Longitude DMS */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Długość Geograficzna (Longitude)</div>
              <div className="text-lg font-mono font-bold text-slate-100 mt-0.5">
                {toDms(gpsData.lon, false)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {gpsData.lon !== null ? gpsData.lon.toFixed(6) : 'Oczekiwanie na sygnał GPS'}
              </div>
            </div>

            {/* Speed & Altitude */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Mountain className="w-3 h-3 text-emerald-400" />
                  Wysokość GPS
                </div>
                <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
                  {gpsData.alt !== null ? `${gpsData.alt.toFixed(1)} m` : '-- m'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-sky-400" />
                  Prędkość
                </div>
                <div className="text-xl font-mono font-bold text-sky-400 mt-1">
                  {gpsData.speedKmh !== null ? `${gpsData.speedKmh} km/h` : '0 km/h'}
                </div>
              </div>
            </div>
          </div>

          {/* GPS Accuracy Status */}
          <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
            <span>Dokładność pozycjonowania:</span>
            <span className="font-mono text-slate-200">
              {gpsData.accuracy !== null ? `±${gpsData.accuracy} m` : 'Szukanie satelitów...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
