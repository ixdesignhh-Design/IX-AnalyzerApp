import React, { useState, useEffect, useRef } from 'react';
import { SunMedium, Camera, Sparkles } from 'lucide-react';

export const LuxTool: React.FC = () => {
  const [lux, setLux] = useState<number>(450);
  const [method, setMethod] = useState<'sensor' | 'camera' | 'manual'>('sensor');
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let sensor: any = null;
    try {
      const anyWin = window as any;
      if ('AmbientLightSensor' in anyWin) {
        sensor = new anyWin.AmbientLightSensor();
        sensor.addEventListener('reading', () => {
          setLux(Math.round(sensor.illuminance));
          setMethod('sensor');
        });
        sensor.start();
      }
    } catch {
      // Fallback to manual / camera
    }

    return () => {
      if (sensor) {
        try {
          sensor.stop();
        } catch {}
      }
    };
  }, []);

  const startCameraLuminance = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 320, height: 240 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setMethod('camera');

      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      const estimate = () => {
        if (videoRef.current && ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 64, 64);
          const imgData = ctx.getImageData(0, 0, 64, 64).data;
          let totalLuma = 0;
          for (let i = 0; i < imgData.length; i += 4) {
            const luma = 0.2126 * imgData[i] + 0.7152 * imgData[i + 1] + 0.0722 * imgData[i + 2];
            totalLuma += luma;
          }
          const avgLuma = totalLuma / (imgData.length / 4);
          const estimatedLux = Math.round(Math.pow(avgLuma / 255, 1.8) * 1500);
          setLux(Math.max(10, estimatedLux));
        }
        animRef.current = requestAnimationFrame(estimate);
      };

      estimate();
    } catch {
      setErrorMessage('Nie można uzyskać dostępu do kamery.');
    }
  };

  const stopCameraLuminance = () => {
    setCameraActive(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopCameraLuminance();
  }, []);

  const footCandles = Math.round((lux / 10.764) * 10) / 10;

  return (
    <div className="space-y-4">
      {/* Retro OS X Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <SunMedium className="w-5 h-5 text-[#0284c7]" />
            Luksomierz (Światłomierz Warsztatowy)
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Pomiar natężenia oświetlenia w luksach (lx) stanowiska pracy, stołu montażowego i komory drukarki 3D.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!cameraActive ? (
            <button
              onClick={startCameraLuminance}
              className="aqua-button-primary flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Pomiar z kamery</span>
            </button>
          ) : (
            <button
              onClick={stopCameraLuminance}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer shadow"
            >
              Wyłącz kamerę
            </button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-amber-100 border border-amber-400 text-amber-900 p-3 rounded-xl text-xs font-sans">
          {errorMessage}
        </div>
      )}

      {cameraActive && (
        <div className="hidden">
          <video ref={videoRef} playsInline muted />
        </div>
      )}

      {/* Main Gauge inside CRT */}
      <div className="retro-screen-crt rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-1 font-mono">
          <div className="text-xs uppercase tracking-widest text-[#94a3b8] font-bold">Natężenie oświetlenia</div>
          <div className="text-6xl font-black text-amber-400">
            {lux}
            <span className="text-2xl text-[#64748b] ml-1 font-sans">lx</span>
          </div>
          <div className="text-xs text-[#94a3b8]">
            {footCandles} foot-candles (fc)
          </div>
        </div>

        {/* Evaluation Scale */}
        <div className="w-full max-w-md bg-[#0f172a] p-4 rounded-xl border border-[#334155] text-xs font-mono space-y-2">
          <div className="text-[11px] font-bold text-[#94a3b8] uppercase">Normy oświetlenia ISO/EN:</div>
          <div className="flex justify-between text-[#64748b]">
            <span>&lt; 150 lx</span>
            <span>Korytarz / Magazyn</span>
          </div>
          <div className={`flex justify-between ${lux >= 300 && lux <= 600 ? 'text-emerald-400 font-bold' : 'text-[#64748b]'}`}>
            <span>300 - 500 lx</span>
            <span>Biuro / Drukarka 3D / Czytanie</span>
          </div>
          <div className={`flex justify-between ${lux >= 750 && lux <= 1500 ? 'text-emerald-400 font-bold' : 'text-[#64748b]'}`}>
            <span>750 - 1500 lx</span>
            <span>Lutowanie SMD / Warsztat precyzyjny</span>
          </div>
          <div className="flex justify-between text-[#64748b]">
            <span>&gt; 2000 lx</span>
            <span>Studio fotograficzne / Inspekcja optyczna</span>
          </div>
        </div>
      </div>

      {/* PC simulation slider */}
      <div className="retro-bezel p-3.5 rounded-xl border border-[#b8b2a5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-[#292524] font-bold whitespace-nowrap">Symulacja jasności (PC):</span>
          <input
            type="range"
            min={10}
            max={2500}
            step={25}
            value={lux}
            onChange={(e) => {
              setLux(Number(e.target.value));
              setMethod('manual');
            }}
            className="w-48 accent-[#0284c7] cursor-pointer"
          />
          <span className="font-mono text-[#0284c7] font-bold">{lux} lx</span>
        </div>
      </div>
    </div>
  );
};
