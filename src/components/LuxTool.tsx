import React, { useState, useEffect, useRef } from 'react';
import { SunMedium, Camera, CheckCircle2, Sliders } from 'lucide-react';

export const LuxTool: React.FC = () => {
  const [lux, setLux] = useState<number>(450);
  const [method, setMethod] = useState<'sensor' | 'camera'>('sensor');
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    // Try native AmbientLightSensor
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
      // Fallback
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 320, height: 240 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
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
            // Perceived luminance formula (ITU-R BT.709)
            const luma = 0.2126 * imgData[i] + 0.7152 * imgData[i + 1] + 0.0722 * imgData[i + 2];
            totalLuma += luma;
          }
          const avgLuma = totalLuma / (imgData.length / 4);
          // Scale non-linearly to realistic lux
          const estimatedLux = Math.round(Math.pow(avgLuma / 255, 1.8) * 1500);
          setLux(Math.max(10, estimatedLux));
        }
        animRef.current = requestAnimationFrame(estimate);
      };

      estimate();
    } catch {
      alert('Nie można uzyskać dostępu do kamery.');
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <SunMedium className="w-5 h-5 text-amber-400" />
            Luksomierz (Światłomierz Warsztatowy)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pomiar natężenia oświetlenia w luksach (lx) stanowiska pracy, lutowania i komory drukarki 3D.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!cameraActive ? (
            <button
              onClick={startCameraLuminance}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Kalibruj kamerą</span>
            </button>
          ) : (
            <button
              onClick={stopCameraLuminance}
              className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg cursor-pointer"
            >
              Wyłącz kamerę
            </button>
          )}
        </div>
      </div>

      {cameraActive && (
        <div className="hidden">
          <video ref={videoRef} playsInline muted />
        </div>
      )}

      {/* Main Gauge */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Natężenie światła</div>
          <div className="text-6xl font-black font-mono text-amber-400">
            {lux}
            <span className="text-2xl text-slate-500 ml-1 font-sans">lx</span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {footCandles} foot-candles (fc)
          </div>
        </div>

        {/* Evaluation Scale */}
        <div className="w-full max-w-md bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Zalecane normy oświetlenia:</div>
          <div className="flex justify-between text-slate-400">
            <span>&lt; 150 lx</span>
            <span>Korytarz / Magazyn</span>
          </div>
          <div className={`flex justify-between ${lux >= 300 && lux <= 600 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
            <span>300 - 500 lx</span>
            <span>Biuro / Drukarka 3D / Czytanie</span>
          </div>
          <div className={`flex justify-between ${lux >= 750 && lux <= 1500 ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
            <span>750 - 1500 lx</span>
            <span>Precyzyjne lutowanie SMD / Warsztat mechaniczny</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>&gt; 2000 lx</span>
            <span>Studio fotograficzne / Inspekcja mikroskopowa</span>
          </div>
        </div>
      </div>
    </div>
  );
};
