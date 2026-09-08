import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Flashlight,
  FlashlightOff,
  ZoomIn,
  Camera,
  Pause,
  Play,
  Sliders,
  Focus,
  Crosshair,
  Sparkles,
  Sun,
  Contrast,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const MacroInspectionTool: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(2.5);
  const [isFrozen, setIsFrozen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Manual Focus & Capabilities
  const [focusMode, setFocusMode] = useState<'auto' | 'manual'>('auto');
  const [focusDistance, setFocusDistance] = useState<number>(0.1); // in meters: 0.05m (5cm macro) to 1.0m
  const [hasHardwareFocus, setHasHardwareFocus] = useState<boolean>(false);
  const [focusPeaking, setFocusPeaking] = useState<boolean>(false);

  // Image enhancement filters for black filaments and PEI surfaces
  const [contrastBoost, setContrastBoost] = useState<number>(115); // 100% to 200%
  const [brightnessBoost, setBrightnessBoost] = useState<number>(105); // 100% to 150%

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peakingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      // Check capabilities for focusDistance & torch
      const anyTrack = track as any;
      if (anyTrack.getCapabilities) {
        const caps = anyTrack.getCapabilities();
        if (caps.focusMode && caps.focusMode.includes('manual')) {
          setHasHardwareFocus(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsActive(true);
      setIsFrozen(false);
      triggerHaptic(30);
    } catch (e) {
      alert('Nie udało się uzyskać dostępu do kamery.');
      console.error(e);
    }
  };

  const stopCamera = () => {
    setIsActive(false);
    setTorchOn(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      trackRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  // Hardware focus update
  const applyFocusSetting = async (mode: 'auto' | 'manual', distanceVal: number) => {
    const track = trackRef.current;
    if (!track) return;

    try {
      const anyTrack = track as any;
      if (mode === 'manual') {
        await anyTrack.applyConstraints({
          advanced: [{ focusMode: 'manual', focusDistance: distanceVal }],
        });
      } else {
        await anyTrack.applyConstraints({
          advanced: [{ focusMode: 'continuous' }],
        });
      }
    } catch (err) {
      console.warn('Manual focus constraint not accepted by hardware driver', err);
    }
  };

  const handleFocusModeChange = (newMode: 'auto' | 'manual') => {
    setFocusMode(newMode);
    applyFocusSetting(newMode, focusDistance);
    triggerHaptic(20);
  };

  const handleFocusDistanceChange = (val: number) => {
    setFocusDistance(val);
    applyFocusSetting('manual', val);
  };

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;

    try {
      const anyTrack = track as any;
      const newState = !torchOn;
      await anyTrack.applyConstraints({
        advanced: [{ torch: newState }],
      });
      setTorchOn(newState);
      triggerHaptic(20);
    } catch (err) {
      alert('Lampa błyskowa może nie być dostępna w przeglądarce.');
    }
  };

  const toggleFreeze = () => {
    if (!videoRef.current || !canvasRef.current) return;
    triggerHaptic(30);

    if (!isFrozen) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = `contrast(${contrastBoost}%) brightness(${brightnessBoost}%)`;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      setIsFrozen(true);
    } else {
      setIsFrozen(false);
    }
  };

  // Focus Peaking real-time edge highlighter loop
  useEffect(() => {
    if (!focusPeaking || !isActive || isFrozen) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const runPeaking = () => {
      const video = videoRef.current;
      const pCanvas = peakingCanvasRef.current;
      if (video && pCanvas && video.readyState === 4) {
        const width = 320;
        const height = Math.round(width * (video.videoHeight / (video.videoWidth || 1)));
        pCanvas.width = width;
        pCanvas.height = height;

        const ctx = pCanvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          // Simple Sobel edge magnitude filter
          for (let y = 1; y < height - 1; y += 2) {
            for (let x = 1; x < width - 1; x += 2) {
              const i = (y * width + x) * 4;
              const right = (y * width + (x + 1)) * 4;
              const down = ((y + 1) * width + x) * 4;

              const diff = Math.abs(d[i] - d[right]) + Math.abs(d[i] - d[down]);
              if (diff > 45) {
                // Highlight focused edge with neon green
                d[i] = 0;
                d[i + 1] = 255;
                d[i + 2] = 120;
                d[i + 3] = 255;
              } else {
                d[i + 3] = 0; // transparent
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }
      animFrameRef.current = requestAnimationFrame(runPeaking);
    };

    animFrameRef.current = requestAnimationFrame(runPeaking);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [focusPeaking, isActive, isFrozen]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            Lupa Inspekcyjna Makro z Ręczną Ostrością (Focus Control)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ręczna regulacja ostrości (makro 5cm - 1m), podświetlenie krawędzi (Focus Peaking), powiększenie do 8x i siatka kalibracji pierwszej warstwy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Włącz Kamerę Makro</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              <EyeOff className="w-4 h-4" />
              <span>Wyłącz</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3] sm:aspect-[16/9] border border-slate-800 flex items-center justify-center">
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-transform duration-100 ${isFrozen ? 'hidden' : 'block'}`}
            style={{
              transform: `scale(${zoom})`,
              filter: `contrast(${contrastBoost}%) brightness(${brightnessBoost}%)`,
            }}
          />

          {/* Frozen Canvas */}
          <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover transition-transform duration-100 ${isFrozen ? 'block' : 'hidden'}`}
            style={{ transform: `scale(${zoom})` }}
          />

          {/* Focus Peaking Layer */}
          {focusPeaking && isActive && !isFrozen && (
            <canvas
              ref={peakingCanvasRef}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-80"
              style={{ transform: `scale(${zoom})` }}
            />
          )}

          {/* Not Active Overlay */}
          {!isActive && (
            <div className="text-center text-slate-500 p-6 space-y-2">
              <Eye className="w-12 h-12 mx-auto text-slate-600" />
              <div className="text-sm font-medium">Kamera makro jest wyłączona</div>
              <p className="text-xs max-w-xs text-slate-600">
                Włącz kamerę, zbliż obiektyw na 3–5 cm od dyszy lub pierwszej warstwy i skorzystaj z suwaka ostrości.
              </p>
            </div>
          )}

          {/* Grid Overlay */}
          {isActive && showGrid && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-full h-[1px] bg-amber-400/40" />
              <div className="h-full w-[1px] bg-amber-400/40 absolute" />
              <div className="w-24 h-24 rounded-full border border-amber-400/40 absolute" />
              <div className="w-48 h-48 rounded-full border border-amber-400/20 absolute" />
              <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-[11px] font-mono text-amber-300 border border-slate-800">
                Siatka Makro Z-Offset (0.1mm - 0.2mm)
              </div>
            </div>
          )}

          {/* Status badges */}
          <div className="absolute top-4 right-4 flex flex-col gap-1 items-end pointer-events-none">
            {isFrozen && (
              <div className="bg-red-500/90 text-white font-bold text-xs px-2.5 py-1 rounded shadow-lg animate-pulse">
                KLATKA ZAMROŻONA (PAUZA)
              </div>
            )}
            {focusPeaking && (
              <div className="bg-emerald-500/90 text-slate-950 font-bold text-xs px-2.5 py-1 rounded shadow">
                PEAKING AKTYWNY (KONTURY OSTROŚCI)
              </div>
            )}
          </div>
        </div>

        {/* Quick Toolbar */}
        {isActive && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <ZoomIn className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">Zoom:</span>
              <input
                type="range"
                min={1.0}
                max={8.0}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-32 sm:w-40 accent-amber-500 cursor-pointer"
              />
              <span className="font-mono text-xs text-slate-200 font-bold">{zoom.toFixed(1)}x</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={toggleTorch}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-colors cursor-pointer ${
                  torchOn
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {torchOn ? <Flashlight className="w-3.5 h-3.5" /> : <FlashlightOff className="w-3.5 h-3.5" />}
                <span>{torchOn ? 'Latarka WŁ' : 'Latarka'}</span>
              </button>

              <button
                onClick={() => setFocusPeaking(!focusPeaking)}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium cursor-pointer transition-colors ${
                  focusPeaking
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Focus Peaking</span>
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`text-xs px-3 py-2 rounded-lg border font-medium cursor-pointer ${
                  showGrid ? 'bg-slate-800 text-amber-400 border-amber-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'
                }`}
              >
                Siatka
              </button>

              <button
                onClick={toggleFreeze}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-semibold cursor-pointer ${
                  isFrozen
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{isFrozen ? 'Odmroź' : 'Zamroź klatkę'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Dedicated Focus Controls Panel */}
        {isActive && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <Focus className="w-4 h-4 text-amber-400" />
                <span>Regulacja Ostrości Obiektywu (Focus Control)</span>
              </div>

              {/* Auto vs Manual Focus Switch */}
              <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => handleFocusModeChange('auto')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    focusMode === 'auto' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Auto Focus (AF)
                </button>
                <button
                  onClick={() => handleFocusModeChange('manual')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    focusMode === 'manual' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Focus (MF)
                </button>
              </div>
            </div>

            {/* Manual focus distance slider */}
            {focusMode === 'manual' && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Odległość ogniskowania:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {(focusDistance * 100).toFixed(0)} cm {focusDistance <= 0.08 ? '(Makro Ekstremalne)' : ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.03}
                  max={0.6}
                  step={0.01}
                  value={focusDistance}
                  onChange={(e) => handleFocusDistanceChange(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>3 cm (Super Makro dyszy)</span>
                  <span>10 cm (Stół roboczy)</span>
                  <span>60 cm (Cała drukarka)</span>
                </div>
              </div>
            )}

            {/* Contrast & Brightness Enhancements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3 h-3 text-slate-400" /> Kontrast:
                  </span>
                  <span className="font-mono text-slate-200">{contrastBoost}%</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={200}
                  step={5}
                  value={contrastBoost}
                  onChange={(e) => setContrastBoost(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-slate-400" /> Jasność (dla czarnych filamentów):
                  </span>
                  <span className="font-mono text-slate-200">{brightnessBoost}%</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={160}
                  step={5}
                  value={brightnessBoost}
                  onChange={(e) => setBrightnessBoost(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
