import React, { useState, useRef, useEffect } from 'react';
import {
  Crosshair,
  Camera,
  EyeOff,
  RotateCcw,
  Lock,
  Unlock,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const ProtractorTool: React.FC = () => {
  const [angle, setAngle] = useState(45);
  const [useCamera, setUseCamera] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [zeroOffset, setZeroOffset] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      setUseCamera(true);
      triggerHaptic(20);
    } catch (e) {
      setErrorMessage('Brak uprawnień do kamery dla nakładki kątomierza.');
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
      {/* Retro OS X Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-[#0284c7]" />
            Kątomierz Warsztatowy & Nakładka AR Kamery
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Precyzyjny pomiar kątów wierzchołkowych, fazowania, skosów ramy i geometrii bezpośrednio na ekranie lub przez kamerę.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setZeroOffset(angle);
              triggerHaptic(20);
            }}
            className="aqua-button flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
            title="Ustaw bieżący kąt jako zero (odniesienie)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Zeruj (Tare)</span>
          </button>

          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`aqua-button flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              isLocked ? 'text-amber-600 font-bold' : ''
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isLocked ? 'Zablokowano' : 'Zablokuj'}</span>
          </button>

          {!useCamera ? (
            <button
              onClick={startCamera}
              className="aqua-button-primary flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera AR</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 shadow"
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

      {/* Main Interactive Stage */}
      <div className="retro-screen-crt rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden select-none shadow-2xl">
        {/* Live Camera Backdrop */}
        {useCamera && (
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none"
          />
        )}

        {/* Protractor Disc */}
        <div
          onPointerDown={handlePointerDown}
          className="relative w-72 h-72 sm:w-84 sm:h-84 rounded-full bg-[#0a0d12]/80 backdrop-blur-md border-4 border-[#38bdf8]/40 shadow-2xl flex items-center justify-center cursor-crosshair touch-none"
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
                    isMajor ? 'h-4 bg-[#38bdf8]' : isMid ? 'h-2.5 bg-[#94a3b8]' : 'h-1.5 bg-[#334155]'
                  }`}
                />
              </div>
            );
          })}

          {/* Reference Base Horizontal Arm (0 deg) */}
          <div className="absolute w-1/2 right-0 h-[2px] bg-[#38bdf8] origin-left pointer-events-none" />

          {/* Rotating Dynamic Arm */}
          <div
            className="absolute w-1/2 right-0 h-[3px] bg-amber-400 origin-left pointer-events-none shadow-[0_0_10px_rgba(251,191,36,0.6)] transition-transform duration-75 flex items-center justify-end"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-black mr-[-8px] shadow" />
          </div>

          {/* Center Pivot Core */}
          <div className="w-24 h-24 rounded-full bg-[#0a0d12] border-2 border-[#38bdf8]/60 shadow-inner flex flex-col items-center justify-center pointer-events-none z-10 font-mono">
            <span className="text-xl font-black text-[#f8fafc]">{effectiveAngle.toFixed(1)}°</span>
            <span className="text-[10px] text-[#94a3b8]">kąt</span>
          </div>
        </div>

        {/* Readouts */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg mt-6 font-mono text-center">
          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155]">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8]">Kąt mierzony</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              {effectiveAngle.toFixed(1)}°
            </div>
          </div>

          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155]">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8]">Kąt dopełniający</div>
            <div className="text-2xl font-black text-[#38bdf8] mt-0.5">
              {complementaryAngle.toFixed(1)}°
            </div>
          </div>

          <div className="bg-[#0f172a] p-3 rounded-xl border border-[#334155] col-span-2 sm:col-span-1">
            <div className="text-[10px] uppercase font-bold text-[#94a3b8]">Radiany</div>
            <div className="text-2xl font-black text-[#cbd5e1] mt-0.5">
              {((effectiveAngle * Math.PI) / 180).toFixed(3)} rad
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
