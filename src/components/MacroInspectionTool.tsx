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
  Focus,
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual Focus & Capabilities
  const [focusMode, setFocusMode] = useState<'auto' | 'manual'>('auto');
  const [focusDistance, setFocusDistance] = useState<number>(0.08); // 8cm default macro
  const [focusPeaking, setFocusPeaking] = useState<boolean>(false);

  // Image enhancement filters for black filaments and PEI surfaces
  const [contrastBoost, setContrastBoost] = useState<number>(115);
  const [brightnessBoost, setBrightnessBoost] = useState<number>(105);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peakingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const startCamera = async () => {
    setErrorMessage(null);
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setIsActive(true);
      setIsFrozen(false);
      triggerHaptic(30);
    } catch (e) {
      console.warn('Camera access error:', e);
      setErrorMessage(
        'Brak dostępu do kamery. Upewnij się, że przeglądarka ma zezwolenie na korzystanie z kamery wideo.'
      );
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
      console.warn('Manual focus constraint not accepted by camera driver', err);
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
      console.warn('Torch not supported on this track', err);
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

          for (let y = 1; y < height - 1; y += 2) {
            for (let x = 1; x < width - 1; x += 2) {
              const i = (y * width + x) * 4;
              const right = (y * width + (x + 1)) * 4;
              const down = ((y + 1) * width + x) * 4;

              const diff = Math.abs(d[i] - d[right]) + Math.abs(d[i] - d[down]);
              if (diff > 45) {
                d[i] = 0;
                d[i + 1] = 255;
                d[i + 2] = 120;
                d[i + 3] = 255;
              } else {
                d[i + 3] = 0;
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
      {/* OS X Workstation Card Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#0284c7]" />
            Lupa Inspekcyjna Makro (Manual Focus & Peaking)
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Ręczna regulacja ostrości obiektywu S23 Ultra (od 3cm do 60cm), podświetlenie krawędzi (Focus Peaking), powiększenie do 8x i siatka kalibracyjna.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={startCamera}
              className="aqua-button-primary flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Włącz Kamerę Makro</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer shadow flex items-center gap-2"
            >
              <EyeOff className="w-4 h-4" />
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

      {/* Main Viewport inside CRT Glass Frame */}
      <div className="retro-screen-crt rounded-2xl p-4 shadow-2xl space-y-4">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] sm:aspect-[16/9] border-2 border-[#334155] flex items-center justify-center">
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-transform duration-100 ${
              isFrozen ? 'hidden' : 'block'
            }`}
            style={{
              transform: `scale(${zoom})`,
              filter: `contrast(${contrastBoost}%) brightness(${brightnessBoost}%)`,
            }}
          />

          {/* Frozen Canvas */}
          <canvas
            ref={canvasRef}
            className={`w-full h-full object-cover transition-transform duration-100 ${
              isFrozen ? 'block' : 'hidden'
            }`}
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
            <div className="text-center text-[#94a3b8] p-6 space-y-2">
              <Eye className="w-12 h-12 mx-auto text-[#64748b]" />
              <div className="text-sm font-bold font-mono text-[#cbd5e1]">Kamera makro jest wyłączona</div>
              <p className="text-xs max-w-xs text-[#94a3b8] font-sans">
                Włącz kamerę, zbliż obiektyw na 3–5 cm od dyszy lub pierwszej warstwy i skorzystaj z suwaka ręcznej ostrości.
              </p>
            </div>
          )}

          {/* Grid Overlay */}
          {isActive && showGrid && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-full h-[1px] bg-[#38bdf8]/40" />
              <div className="h-full w-[1px] bg-[#38bdf8]/40 absolute" />
              <div className="w-24 h-24 rounded-full border border-[#38bdf8]/40 absolute" />
              <div className="w-48 h-48 rounded-full border border-[#38bdf8]/20 absolute" />
              <div className="absolute top-4 left-4 bg-[#0a0d12]/80 backdrop-blur px-2.5 py-1 rounded text-[11px] font-mono text-emerald-400 border border-[#334155]">
                Siatka Makro Z-Offset (0.1mm - 0.2mm)
              </div>
            </div>
          )}

          {/* Status badges */}
          <div className="absolute top-4 right-4 flex flex-col gap-1 items-end pointer-events-none font-mono text-xs">
            {isFrozen && (
              <div className="bg-red-600 text-white font-bold px-2.5 py-1 rounded shadow-lg animate-pulse">
                KLATKA ZAMROŻONA (PAUZA)
              </div>
            )}
            {focusPeaking && (
              <div className="bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded shadow">
                PEAKING AKTYWNY (KONTURY OSTROŚCI)
              </div>
            )}
          </div>
        </div>

        {/* Quick Toolbar */}
        {isActive && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 w-full sm:w-auto font-mono text-xs text-[#cbd5e1]">
              <ZoomIn className="w-4 h-4 text-[#38bdf8]" />
              <span>Zoom:</span>
              <input
                type="range"
                min={1.0}
                max={8.0}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-32 sm:w-40 accent-[#0284c7] cursor-pointer"
              />
              <span className="text-emerald-400 font-bold">{zoom.toFixed(1)}x</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={toggleTorch}
                className={`aqua-button flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  torchOn ? 'text-amber-500 font-bold' : ''
                }`}
              >
                {torchOn ? <Flashlight className="w-3.5 h-3.5 text-amber-500" /> : <FlashlightOff className="w-3.5 h-3.5" />}
                <span>{torchOn ? 'Latarka WŁ' : 'Latarka'}</span>
              </button>

              <button
                onClick={() => setFocusPeaking(!focusPeaking)}
                className={`aqua-button flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer ${
                  focusPeaking ? 'text-emerald-600 font-bold' : ''
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Focus Peaking</span>
              </button>

              <button
                onClick={() => setShowGrid(!showGrid)}
                className="aqua-button text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
              >
                Siatka {showGrid ? 'WŁ' : 'WYŁ'}
              </button>

              <button
                onClick={toggleFreeze}
                className="aqua-button flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer"
              >
                {isFrozen ? <Play className="w-3.5 h-3.5 text-[#0284c7]" /> : <Pause className="w-3.5 h-3.5 text-[#0284c7]" />}
                <span>{isFrozen ? 'Odmroź' : 'Zamroź klatkę'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Dedicated Focus Controls Panel */}
        {isActive && (
          <div className="bg-[#0a0d12] p-4 rounded-xl border border-[#334155] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold font-mono text-[#cbd5e1]">
                <Focus className="w-4 h-4 text-[#38bdf8]" />
                <span>Regulacja Ostrości Obiektywu (Focus Control)</span>
              </div>

              {/* Auto vs Manual Focus Switch */}
              <div className="flex bg-[#1e293b] p-0.5 rounded-lg border border-[#334155] text-xs font-mono">
                <button
                  onClick={() => handleFocusModeChange('auto')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    focusMode === 'auto' ? 'aqua-button-primary font-bold' : 'text-[#94a3b8]'
                  }`}
                >
                  Auto Focus (AF)
                </button>
                <button
                  onClick={() => handleFocusModeChange('manual')}
                  className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                    focusMode === 'manual' ? 'aqua-button-primary font-bold' : 'text-[#94a3b8]'
                  }`}
                >
                  Manual Focus (MF)
                </button>
              </div>
            </div>

            {/* Manual focus distance slider */}
            {focusMode === 'manual' && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-mono text-[#94a3b8]">
                  <span>Odległość ogniskowania soczewki:</span>
                  <span className="text-emerald-400 font-bold">
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
                  className="w-full accent-[#0284c7] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#64748b] font-mono">
                  <span>3 cm (Super Makro dyszy)</span>
                  <span>10 cm (Stół roboczy)</span>
                  <span>60 cm (Plan ogólny)</span>
                </div>
              </div>
            )}

            {/* Contrast & Brightness Enhancements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1e293b]">
              <div className="space-y-1 font-mono text-xs text-[#94a3b8]">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Contrast className="w-3 h-3 text-[#38bdf8]" /> Kontrast:
                  </span>
                  <span className="text-emerald-400">{contrastBoost}%</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={200}
                  step={5}
                  value={contrastBoost}
                  onChange={(e) => setContrastBoost(Number(e.target.value))}
                  className="w-full accent-[#0284c7] cursor-pointer"
                />
              </div>

              <div className="space-y-1 font-mono text-xs text-[#94a3b8]">
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Sun className="w-3 h-3 text-[#38bdf8]" /> Jasność (czarne filamenty):
                  </span>
                  <span className="text-emerald-400">{brightnessBoost}%</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={160}
                  step={5}
                  value={brightnessBoost}
                  onChange={(e) => setBrightnessBoost(Number(e.target.value))}
                  className="w-full accent-[#0284c7] cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
