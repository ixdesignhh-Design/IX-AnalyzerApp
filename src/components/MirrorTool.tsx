import React, { useState, useRef, useEffect } from 'react';
import {
  Smile,
  Camera,
  Pause,
  Play,
  RotateCw,
  Sun,
  ZoomIn,
  ZoomOut,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const MirrorTool: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [frameLight, setFrameLight] = useState(true);
  const [lightTemp, setLightTemp] = useState<'neutral' | 'warm' | 'cool'>('neutral');
  const [lightBrightness, setLightBrightness] = useState(90);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsActive(true);
      setIsFrozen(false);
      triggerHaptic(25);
    } catch (e) {
      alert('Brak dostępu do przedniej kamery.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setIsFrozen(false);
  };

  const toggleFreeze = () => {
    triggerHaptic(30);
    if (!isFrozen && videoRef.current && canvasRef.current) {
      const v = videoRef.current;
      const c = canvasRef.current;
      c.width = v.videoWidth || 640;
      c.height = v.videoHeight || 480;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.translate(c.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(v, 0, 0, c.width, c.height);
        ctx.restore();
      }
      setIsFrozen(true);
    } else {
      setIsFrozen(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const getFrameBorderColor = () => {
    if (!frameLight) return 'border-transparent';
    switch (lightTemp) {
      case 'warm':
        return '#ffe8c2';
      case 'cool':
        return '#d4f1ff';
      case 'neutral':
      default:
        return '#ffffff';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Smile className="w-5 h-5 text-emerald-400" />
            Lustro z Przedniej Kamery (Z Oświetleniem LED)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Odbicie lustrzane z ramką softbox doświetlającą twarz, zoomem cyfrowym oraz funkcją zamrożenia kadru (Freeze).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Włącz Lustro</span>
            </button>
          ) : (
            <button
              onClick={toggleFreeze}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                isFrozen
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isFrozen ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isFrozen ? 'Wznów Ruch' : 'Zamroź Kadr'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Mirror Stage */}
      <div
        className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-[3/4] max-w-md mx-auto flex items-center justify-center transition-all shadow-2xl"
        style={{
          border: frameLight ? `14px solid ${getFrameBorderColor()}` : '2px solid #1e293b',
          boxShadow: frameLight
            ? `0 0 ${lightBrightness / 2}px ${getFrameBorderColor()}`
            : 'none',
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform ${
            isActive && !isFrozen ? 'block' : 'hidden'
          }`}
          style={{
            transform: `scaleX(-1) scale(${zoom})`,
          }}
        />

        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover ${isFrozen ? 'block' : 'hidden'}`}
          style={{
            transform: `scale(${zoom})`,
          }}
        />

        {!isActive && (
          <div className="text-center p-6 text-slate-500 space-y-2">
            <Smile className="w-16 h-16 mx-auto text-slate-600" />
            <div className="text-sm font-medium text-slate-300">Lustro jest wyłączone</div>
            <p className="text-xs text-slate-500">
              Uruchom lustro, aby użyć przedniej kamery wraz z doświetlającą ramką softboxu.
            </p>
          </div>
        )}

        {/* Floating Zoom & Controls */}
        {isActive && (
          <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-auto">
            <div className="bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-700 text-xs font-mono text-slate-200">
              Zoom: {zoom.toFixed(1)}x
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                className="p-2 bg-slate-950/80 backdrop-blur rounded-full text-white border border-slate-700 cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                className="p-2 bg-slate-950/80 backdrop-blur rounded-full text-white border border-slate-700 cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lighting Frame Adjustments */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 max-w-md mx-auto space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
          <span className="flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-amber-400" />
            Doświetlająca Ramka LED (Softbox)
          </span>
          <button
            onClick={() => setFrameLight(!frameLight)}
            className={`px-2.5 py-1 rounded text-[11px] cursor-pointer transition-colors ${
              frameLight ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {frameLight ? 'Włączona' : 'Wyłączona'}
          </button>
        </div>

        {frameLight && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {(['neutral', 'warm', 'cool'] as const).map((temp) => (
                <button
                  key={temp}
                  onClick={() => setLightTemp(temp)}
                  className={`py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                    lightTemp === temp
                      ? 'bg-slate-800 text-white border-amber-400 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {temp === 'neutral' ? 'Białe 5000K' : temp === 'warm' ? 'Ciepłe 3200K' : 'Zimne 6500K'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
