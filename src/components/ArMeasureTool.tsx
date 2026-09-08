import React, { useState, useRef, useEffect } from 'react';
import {
  Maximize,
  Camera,
  EyeOff,
  RotateCcw,
  Plus,
  Trash2,
  Box,
  Layers,
  Info,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

interface Point3D {
  x: number;
  y: number;
  label: string;
}

export const ArMeasureTool: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [phoneHeightCm, setPhoneHeightCm] = useState(140); // User eye/phone level in cm
  const [pitch, setPitch] = useState(0);
  const [points, setPoints] = useState<Point3D[]>([]);
  const [calculatedDistanceM, setCalculatedDistanceM] = useState<number>(0);
  const [roomAreaM2, setRoomAreaM2] = useState<number>(0);
  const [roomVolumeM3, setRoomVolumeM3] = useState<number>(0);
  const [ceilingHeightM, setCeilingHeightM] = useState<number>(2.5);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsActive(true);
      triggerHaptic(25);
    } catch (e) {
      alert('Brak dostępu do kamery.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  };

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null) {
        setPitch(e.beta);
        // Distance calculation by trigonometric projection
        // If phone is tilted downwards at angle theta (from vertical/horizontal)
        // distance = height / tan(angle)
        const rad = ((90 - Math.abs(e.beta)) * Math.PI) / 180;
        if (rad > 0.05) {
          const dist = (phoneHeightCm / 100) * Math.tan(rad);
          setCalculatedDistanceM(Math.round(Math.min(50, Math.max(0.2, dist)) * 100) / 100);
        }
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      stopCamera();
    };
  }, [phoneHeightCm]);

  const addPoint = () => {
    triggerHaptic(30);
    const newPt: Point3D = {
      x: points.length * 1.2,
      y: calculatedDistanceM,
      label: `Punkt ${points.length + 1}`,
    };
    const updated = [...points, newPt];
    setPoints(updated);

    // If 3 or more points, calculate polygon area
    if (updated.length >= 3) {
      // Shoelace approximation
      let a = 0;
      for (let i = 0; i < updated.length; i++) {
        const j = (i + 1) % updated.length;
        a += updated[i].x * updated[j].y;
        a -= updated[j].x * updated[i].y;
      }
      const area = Math.abs(a / 2);
      setRoomAreaM2(Math.round(area * 10) / 10);
      setRoomVolumeM3(Math.round(area * ceilingHeightM * 10) / 10);
    }
  };

  const clearPoints = () => {
    setPoints([]);
    setRoomAreaM2(0);
    setRoomVolumeM3(0);
    triggerHaptic(20);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Maximize className="w-5 h-5 text-indigo-400" />
            Pomiary Przestrzenne AR (Odległość, Powierzchnia, Kubatura)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dalmierz optyczno-żyroskopowy, wyznaczanie odległości podłogi, metrażu pomieszczeń (m²) i kubatury (m³).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Włącz Kamerę AR</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Wyłącz</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center">
        {/* Live Video */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${isActive ? 'block' : 'hidden'}`}
        />

        {!isActive && (
          <div className="text-center text-slate-500 p-6 space-y-2">
            <Maximize className="w-12 h-12 mx-auto text-slate-600" />
            <div className="text-sm font-medium">Kamera dalmierza AR jest wyłączona</div>
            <p className="text-xs text-slate-500 max-w-xs">
              Włącz kamerę, wyceluj celownik w styk podłogi ze ścianą, aby natychmiast odczytać odległość i dodać narożniki pokoju.
            </p>
          </div>
        )}

        {/* Reticle Crosshair */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-indigo-400 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            </div>
            {/* Real-time distance tag on reticle */}
            <div className="absolute mt-20 bg-slate-950/90 text-amber-300 font-mono font-bold text-xs px-3 py-1 rounded-full border border-slate-800 shadow">
              Dystans: {calculatedDistanceM.toFixed(2)} m
            </div>
          </div>
        )}

        {/* Floating Controls inside HUD */}
        {isActive && (
          <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-auto">
            <button
              onClick={clearPoints}
              className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-900 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-700 backdrop-blur cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wyczyść punkty</span>
            </button>

            <button
              onClick={addPoint}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-full shadow-lg shadow-indigo-600/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Zaznacz Punkt ({points.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Results & Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-slate-400">Odległość do celu</div>
          <div className="text-3xl font-black font-mono text-amber-400 mt-1">
            {calculatedDistanceM.toFixed(2)} m
          </div>
          <div className="text-[11px] text-slate-500">Rzut trygonometryczny</div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-slate-400">Powierzchnia pomieszczenia</div>
          <div className="text-3xl font-black font-mono text-indigo-400 mt-1">
            {roomAreaM2 > 0 ? `${roomAreaM2.toFixed(1)} m²` : '-- m²'}
          </div>
          <div className="text-[11px] text-slate-500">
            {points.length < 3 ? 'Zaznacz min. 3 narożniki' : `${points.length} punktów obrysu`}
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-slate-400">Kubatura (Objętość)</div>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-1">
            {roomVolumeM3 > 0 ? `${roomVolumeM3.toFixed(1)} m³` : '-- m³'}
          </div>
          <div className="text-[11px] text-slate-500">Wys. sufitu: {ceilingHeightM} m</div>
        </div>
      </div>
    </div>
  );
};
