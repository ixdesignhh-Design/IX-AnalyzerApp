import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Share2,
  Copy,
  ExternalLink,
  Check,
  RefreshCw,
  Navigation,
  Globe,
  Compass,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const GpsFinderTool: React.FC = () => {
  const [coords, setCoords] = useState<{
    lat: number;
    lon: number;
    altitude: number | null;
    accuracy: number;
    heading: number | null;
    timestamp: number;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLocation = () => {
    setLoading(true);
    if (!('geolocation' in navigator)) {
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        });
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    fetchLocation();
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        });
      },
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const toDms = (val: number, isLat: boolean) => {
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
    const abs = Math.abs(val);
    const deg = Math.floor(abs);
    const minDec = (abs - deg) * 60;
    const min = Math.floor(minDec);
    const sec = Math.round((minDec - min) * 60 * 10) / 10;
    return `${deg}° ${min}' ${sec}" ${dir}`;
  };

  const handleCopy = () => {
    if (!coords) return;
    const str = `${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`;
    navigator.clipboard.writeText(str);
    setCopied(true);
    triggerHaptic(25);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!coords) return;
    const text = `Moja pozycja GPS: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)} (wys. ${
      coords.altitude ? coords.altitude.toFixed(1) : '--'
    } m)`;
    const url = `https://www.google.com/maps?q=${coords.lat},${coords.lon}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Współrzędne GPS', text, url });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-sky-400" />
            GPS & Precyzyjny Geolokalizator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Wyświetlanie współrzędnych geograficznych (dziesiętne i DMS), wysokości n.p.m., dokładności satelitarnej i udostępnianie pozycji.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLocation}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Odśwież Fix</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Udostępnij</span>
          </button>
        </div>
      </div>

      {/* Main Coordinates Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        {coords ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Latitude */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-bold uppercase">Szerokość Geograficzna (Latitude)</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-sky-400 mt-1">
                  {coords.lat.toFixed(6)}°
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  DMS: {toDms(coords.lat, true)}
                </div>
              </div>

              {/* Longitude */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-bold uppercase">Długość Geograficzna (Longitude)</div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-sky-400 mt-1">
                  {coords.lon.toFixed(6)}°
                </div>
                <div className="text-xs text-slate-400 font-mono mt-1">
                  DMS: {toDms(coords.lon, false)}
                </div>
              </div>
            </div>

            {/* Sub-telemetry */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Dokładność Fixa</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                  ±{coords.accuracy.toFixed(1)} m
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Wysokość GPS</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {coords.altitude !== null ? `${coords.altitude.toFixed(1)} m` : '-- m'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Azymut Ruchu</div>
                <div className="text-xl font-bold font-mono text-slate-200 mt-0.5">
                  {coords.heading !== null ? `${Math.round(coords.heading)}°` : '--°'}
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Status Odbiornika</div>
                <div className="text-xl font-bold font-mono text-sky-300 mt-0.5">
                  3D DGPS
                </div>
              </div>
            </div>

            {/* Copy / Maps bar */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Skopiowano współrzędne!' : 'Kopiuj (Lat, Lon)'}</span>
              </button>

              <a
                href={`https://www.google.com/maps?q=${coords.lat},${coords.lon}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-700 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Otwórz w Google Maps</span>
              </a>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Globe className="w-12 h-12 mx-auto animate-spin text-sky-500 mb-3" />
            <div className="text-sm font-semibold text-slate-300">Uzyskiwanie sygnału satelitarnego GPS...</div>
            <div className="text-xs text-slate-500 mt-1">Upewnij się, że zezwolono na dostęp do lokalizacji w przeglądarce.</div>
          </div>
        )}
      </div>
    </div>
  );
};
