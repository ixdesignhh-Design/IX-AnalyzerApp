import React, { useState, useRef, useEffect } from 'react';
import {
  Maximize,
  Camera,
  EyeOff,
  Plus,
  Trash2,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

interface Point3D {
  x: number;
  y: number;
  label: string;
}

export const ArMeasureTool: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [phoneHeightCm, setPhoneHeightCm] = useState<number>(() => {
    return parseInt(localStorage.getItem('ix_phone_height_cm') || '140', 10);
  });
  const [pitch, setPitch] = useState(0);
  const [points, setPoints] = useState<Point3D[]>([]);
  const [calculatedDistanceM, setCalculatedDistanceM] = useState<number>(0);
  const [roomAreaM2, setRoomAreaM2] = useState<number>(0);
  const [roomVolumeM3, setRoomVolumeM3] = useState<number>(0);
  const [ceilingHeightM, setCeilingHeightM] = useState<number>(2.5);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    localStorage.setItem('ix_phone_height_cm', phoneHeightCm.toString());
  }, [phoneHeightCm]);

  const startCamera = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsActive(true);
      triggerHaptic(25);
    } catch (e) {
      setErrorMessage('Brak dostępu do kamery urządzenia.');
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

    if (updated.length >= 3) {
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
      {/* Retro OS X Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Maximize className="w-5 h-5 text-[#0284c7]" />
            Pomiary Przestrzenne AR (Dalmierz, Metraż m², Kubatura m³)
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Dalmierz optyczno-żyroskopowy, wyznaczanie odległości podłogi, obrysu powierzchni pomieszczeń i kubatury.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={startCamera}
              className="aqua-button-primary flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Włącz Kamerę AR</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 shadow"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Wyłącz</span>
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-amber-100 border border-amber-400 text-amber-900 p-3 rounded-xl text-xs font-sans">
          {errorMessage}
        </div>
      )}

      {/* Main Viewport inside CRT Frame */}
      <div className="relative retro-screen-crt rounded-2xl overflow-hidden aspect-[4/3] sm:aspect-[16/9] flex items-center justify-center shadow-2xl">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${isActive ? 'block' : 'hidden'}`}
        />

        {!isActive && (
          <div className="text-center text-[#94a3b8] p-6 space-y-2">
            <Maximize className="w-12 h-12 mx-auto text-[#64748b]" />
            <div className="text-sm font-bold font-mono text-[#cbd5e1]">Kamera dalmierza AR jest wyłączona</div>
            <p className="text-xs text-[#94a3b8] max-w-xs font-sans">
              Włącz kamerę, wyceluj w styk podłogi ze ścianą, aby odczytać odległość i dodawać kolejne punkty obrysu pokoju.
            </p>
          </div>
        )}

        {/* Reticle Crosshair */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-12 h-12 border-2 border-[#38bdf8] rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            </div>
            <div className="absolute mt-20 bg-black/80 text-emerald-400 font-mono font-bold text-xs px-3 py-1 rounded-full border border-[#334155] shadow">
              Dystans: {calculatedDistanceM.toFixed(2)} m
            </div>
          </div>
        )}

        {/* Floating Controls */}
        {isActive && (
          <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-auto">
            <button
              onClick={clearPoints}
              className="aqua-button flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wyczyść punkty</span>
            </button>

            <button
              onClick={addPoint}
              className="aqua-button-primary flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-full shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj Punkt ({points.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Results & Calibration Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="retro-bezel p-4 rounded-xl border border-[#b6b0a3] flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-[#57534e]">Odległość do celu</div>
          <div className="text-3xl font-black font-mono text-[#0284c7] mt-1">
            {calculatedDistanceM.toFixed(2)} m
          </div>
          <div className="text-[11px] text-[#78716c]">Rzut trygonometryczny</div>
        </div>

        <div className="retro-bezel p-4 rounded-xl border border-[#b6b0a3] flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-[#57534e]">Powierzchnia (Metraż)</div>
          <div className="text-3xl font-black font-mono text-emerald-700 mt-1">
            {roomAreaM2 > 0 ? `${roomAreaM2.toFixed(1)} m²` : '-- m²'}
          </div>
          <div className="text-[11px] text-[#78716c]">
            {points.length < 3 ? 'Zaznacz min. 3 punkty' : `${points.length} punktów`}
          </div>
        </div>

        <div className="retro-bezel p-4 rounded-xl border border-[#b6b0a3] flex flex-col justify-between">
          <div className="text-[10px] uppercase font-bold text-[#57534e]">Kubatura (Objętość)</div>
          <div className="text-3xl font-black font-mono text-amber-700 mt-1">
            {roomVolumeM3 > 0 ? `${roomVolumeM3.toFixed(1)} m³` : '-- m³'}
          </div>
          <div className="text-[11px] text-[#78716c]">Wysokość sufitu: {ceilingHeightM} m</div>
        </div>
      </div>

      {/* Height Calibration */}
      <div className="retro-bezel p-3.5 rounded-xl border border-[#b8b2a5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-[#292524] font-bold whitespace-nowrap">Wysokość trzymania telefonu:</span>
          <input
            type="range"
            min={100}
            max={190}
            step={1}
            value={phoneHeightCm}
            onChange={(e) => setPhoneHeightCm(Number(e.target.value))}
            className="w-40 accent-[#0284c7] cursor-pointer"
          />
          <span className="font-mono text-[#0284c7] font-bold">{phoneHeightCm} cm</span>
        </div>
      </div>
    </div>
  );
};
