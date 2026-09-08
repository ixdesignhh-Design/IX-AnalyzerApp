import React, { useState, useEffect, useRef } from 'react';
import {
  Flashlight,
  FlashlightOff,
  Sun,
  Radio,
  Sliders,
  Palette,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const FlashlightTool: React.FC = () => {
  const [torchOn, setTorchOn] = useState(false);
  const [screenLightOn, setScreenLightOn] = useState(false);
  const [mode, setMode] = useState<'torch' | 'screen' | 'sos' | 'strobe'>('torch');
  const [strobeHz, setStrobeHz] = useState(5);
  const [screenColor, setScreenColor] = useState('#ffffff');
  const [screenBrightness, setScreenBrightness] = useState(100);

  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const strobeIntervalRef = useRef<any>(null);

  // Initialize camera track for torch
  const getCameraTrack = async () => {
    if (trackRef.current) return trackRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;
      return track;
    } catch (err) {
      console.warn('Camera/Torch access error', err);
      return null;
    }
  };

  const setTorchState = async (state: boolean) => {
    const track = await getCameraTrack();
    if (!track) return;
    try {
      const anyTrack = track as any;
      await anyTrack.applyConstraints({
        advanced: [{ torch: state }],
      });
      setTorchOn(state);
    } catch (e) {
      console.warn('Torch constraint not supported on this device/browser', e);
    }
  };

  const toggleTorch = async () => {
    triggerHaptic(30);
    if (torchOn) {
      clearInterval(strobeIntervalRef.current);
      await setTorchState(false);
    } else {
      await setTorchState(true);
    }
  };

  // Strobe & SOS logic
  useEffect(() => {
    clearInterval(strobeIntervalRef.current);

    if (mode === 'strobe' && torchOn) {
      const intervalMs = Math.max(40, Math.round(1000 / (strobeHz * 2)));
      let current = true;
      strobeIntervalRef.current = setInterval(async () => {
        current = !current;
        await setTorchState(current);
      }, intervalMs);
    } else if (mode === 'sos' && torchOn) {
      // SOS pattern: 3 short, 3 long, 3 short (... --- ...)
      const timings = [
        150, 150, 150, 150, 150, 300, // S
        400, 200, 400, 200, 400, 300, // O
        150, 150, 150, 150, 150, 800, // S
      ];
      let step = 0;
      const runSos = async () => {
        if (!torchOn) return;
        const isLight = step % 2 === 0;
        await setTorchState(isLight);
        const duration = timings[step % timings.length];
        step++;
        strobeIntervalRef.current = setTimeout(runSos, duration);
      };
      runSos();
    }

    return () => {
      clearInterval(strobeIntervalRef.current);
      clearTimeout(strobeIntervalRef.current);
    };
  }, [mode, torchOn, strobeHz]);

  useEffect(() => {
    return () => {
      clearInterval(strobeIntervalRef.current);
      clearTimeout(strobeIntervalRef.current);
      if (trackRef.current) {
        try {
          (trackRef.current as any).applyConstraints({ advanced: [{ torch: false }] });
          trackRef.current.stop();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const colorPresets = [
    { label: 'Czysty Biały (5500K)', color: '#ffffff' },
    { label: 'Ciepły Żółty (3200K)', color: '#ffe4a0' },
    { label: 'Nocna Czerwień', color: '#ff2222' },
    { label: 'Bursztyn', color: '#ff9900' },
    { label: 'Zielony Sygnał', color: '#00ff66' },
    { label: 'Niebieski Neon', color: '#00ccff' },
  ];

  return (
    <div className="space-y-4">
      {/* Fullscreen Screen Light Overlay */}
      {screenLightOn && (
        <div
          onClick={() => setScreenLightOn(false)}
          className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer select-none transition-colors"
          style={{
            backgroundColor: screenColor,
            opacity: screenBrightness / 100,
          }}
        >
          <div className="bg-slate-950/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur border border-white/20">
            Dotknij ekranu, aby wyłączyć oświetlenie
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Flashlight className="w-5 h-5 text-amber-400" />
            Latarka & Oświetlenie Wielozadaniowe
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dioda LED z regulacją stroboskopu i SOS oraz tryb świecenia ekranu (Softbox RGB) do fotografii makro i prac precyzyjnych.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScreenLightOn(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors"
          >
            <Sun className="w-4 h-4 text-amber-300" />
            <span>Świecenie Ekranem</span>
          </button>
        </div>
      </div>

      {/* Main Big Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center space-y-6">
        <button
          onClick={toggleTorch}
          className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center border-4 shadow-2xl transition-all active:scale-95 cursor-pointer ${
            torchOn
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-amber-500/50 scale-105'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 shadow-inner'
          }`}
        >
          {torchOn ? (
            <Flashlight className="w-16 h-16 sm:w-20 sm:h-20 animate-pulse" />
          ) : (
            <FlashlightOff className="w-16 h-16 sm:w-20 sm:h-20" />
          )}
          <span className="font-black text-sm sm:text-base mt-2 tracking-wider uppercase">
            {torchOn ? 'WŁĄCZONA' : 'WYŁĄCZONA'}
          </span>
        </button>

        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-md bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => {
              setMode('torch');
              triggerHaptic(20);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'torch' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ciągłe Świecenie
          </button>
          <button
            onClick={() => {
              setMode('strobe');
              triggerHaptic(20);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'strobe' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stroboskop
          </button>
          <button
            onClick={() => {
              setMode('sos');
              triggerHaptic(20);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'sos' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sygnał SOS
          </button>
        </div>

        {/* Strobe speed slider */}
        {mode === 'strobe' && (
          <div className="w-full max-w-md bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>Częstotliwość stroboskopu LED:</span>
              <span className="font-mono text-amber-400 font-bold">{strobeHz} Hz ({strobeHz * 60} RPM)</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={strobeHz}
              onChange={(e) => setStrobeHz(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Screen Softbox Lighting Presets */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-200">
          <span className="flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-amber-400" />
            Konfiguracja Świecenia Ekranem (Softbox)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {colorPresets.map((p) => (
            <button
              key={p.color}
              onClick={() => {
                setScreenColor(p.color);
                setScreenLightOn(true);
                triggerHaptic(20);
              }}
              className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-700 transition-all text-left cursor-pointer"
            >
              <div
                className="w-5 h-5 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-xs font-medium text-slate-200">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
