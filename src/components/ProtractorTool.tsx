import React, { useState, useRef, useEffect } from 'react';
import {
  Crosshair,
  Camera,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  Lock,
  Unlock,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const ProtractorTool: React.FC = () => {
  const [angle, setAngle] = useState(45);
  const [useCamera, setUseCamera] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [zeroOffset, setZeroOffset] = useState(0);

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
      setUseCamera(true);
      triggerHaptic(20);
    } catch (e) {
      alert('Brak dostępu do kamery.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const updateFromPointer = (clientX: number, clientY: number) => {
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      // Angle in degrees from positive X axis (0 to 360)
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      setAngle(Math.round(deg * 10) / 10);
    };

    updateFromPointer(e.clientX, e.clientY);

    const onMove = (ev: PointerEvent) => {
      updateFromPointer(ev.clientX, ev.clientY);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const effectiveAngle = (angle - zeroOffset + 360) % 360;
  const complementaryAngle = Math.round((180 - (effectiveAngle % 180)) * 10) / 10;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-indigo-400" />
            Kątomierz Ekranowy & Nakładka AR Kamery
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Precyzyjny pomiar kąta wierzchołkowego, fazowania, skosu ramy i nachylenia bezpośrednio na ekranie lub przez obiektyw aparatu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isLocked
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isLocked ? 'Zablokowano' : 'Zablokuj Kąt'}</span>
          </button>

          {!useCamera ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Podgląd z Kamery AR</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Wyłącz Kamerę</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Live Camera Backdrop if active */}
        {useCamera && (
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
          />
        )}

        {/* Protractor Disc */}
        <div
          onPointerDown={handlePointerDown}
          className="relative w-72 h-72 sm:w-88 sm:h-88 rounded-full bg-slate-950/80 backdrop-blur-md border-4 border-indigo-500/30 shadow-2xl flex items-center justify-center cursor-crosshair touch-none"
        >
          {/* Degree Ticks */}
          {[...Array(72)].map((_, i) => {
            const tickDeg = i * 5;
            const isMajor = tickDeg % 30 === 0;
            const isMid = tickDeg % 15 === 0;
            return (
              <div
                key={tickDeg}
                className="absolute w-full h-full flex justify-center pt-1 pointer-events-none"
                style={{ transform: `rotate(${tickDeg}deg)` }}
              >
                <div
                  className={`w-[1px] ${
                    isMajor ? 'h-4 bg-indigo-400' : isMid ? 'h-2.5 bg-slate-500' : 'h-1.5 bg-slate-700'
                  }`}
                />
              </div>
            );
          })}

          {/* Reference Base Horizontal Arm (0 deg) */}
          <div className="absolute w-1/2 right-0 h-[2px] bg-indigo-400 origin-left pointer-events-none" />

          {/* Rotating Dynamic Arm */}
          <div
            className="absolute w-1/2 right-0 h-[3px] bg-amber-400 origin-left pointer-events-none shadow-lg shadow-amber-500/50 transition-transform duration-75 flex items-center justify-end"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-950 mr-[-8px] shadow" />
          </div>

          {/* Center Pivot Core */}
          <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-indigo-500/50 shadow-inner flex flex-col items-center justify-center pointer-events-none z-10">
            <span className="text-xl font-black font-mono text-slate-100">{effectiveAngle.toFixed(1)}°</span>
            <span className="text-[10px] text-slate-400 font-mono">wierzchołek</span>
          </div>
        </div>

        {/* Readouts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mt-6">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Kąt mierzony</div>
            <div className="text-2xl font-black font-mono text-amber-400 mt-0.5">
              {effectiveAngle.toFixed(1)}°
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Kąt dopełniający (180°)</div>
            <div className="text-2xl font-black font-mono text-indigo-400 mt-0.5">
              {complementaryAngle.toFixed(1)}°
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase font-bold text-slate-400">Radiany</div>
            <div className="text-2xl font-black font-mono text-slate-200 mt-0.5">
              {((effectiveAngle * Math.PI) / 180).toFixed(3)} rad
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
