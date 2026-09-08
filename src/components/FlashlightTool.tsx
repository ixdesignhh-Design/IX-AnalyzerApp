import React, { useState, useEffect, useRef } from 'react';
import {
  Flashlight,
  FlashlightOff,
  Sun,
  Palette,
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
      const timings = [
        150, 150, 150, 150, 150, 300,
        400, 200, 400, 200, 400, 300,
        150, 150, 150, 150, 150, 800,
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
          <div className="bg-black/80 text-white text-xs px-4 py-2 rounded-full backdrop-blur border border-white/20 font-mono">
            Dotknij ekranu, aby zamknąć softbox
          </div>
        </div>
      )}

      {/* Retro OS X Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Flashlight className="w-5 h-5 text-[#0284c7]" />
            Latarka & Oświetlenie Wielozadaniowe
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Dioda LED z regulacją stroboskopu i SOS oraz tryb świecenia ekranem (Softbox RGB) do prac inspekcyjnych.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScreenLightOn(true)}
            className="aqua-button flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Świecenie Ekranem</span>
          </button>
        </div>
      </div>

      {/* Main Big Switch & Controls */}
      <div className="retro-screen-crt rounded-2xl p-8 flex flex-col items-center justify-center space-y-6 shadow-2xl">
        <button
          onClick={toggleTorch}
          className={`w-40 h-40 sm:w-48 sm:h-48 rounded-full flex flex-col items-center justify-center border-4 shadow-2xl transition-all active:scale-95 cursor-pointer ${
            torchOn
              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.6)] scale-105'
              : 'bg-[#0a0d12] text-[#64748b] border-[#334155] hover:border-[#475569] shadow-inner'
          }`}
        >
          {torchOn ? (
            <Flashlight className="w-16 h-16 sm:w-20 sm:h-20 animate-pulse" />
          ) : (
            <FlashlightOff className="w-16 h-16 sm:w-20 sm:h-20" />
          )}
          <span className="font-mono font-black text-sm sm:text-base mt-2 tracking-wider uppercase">
            {torchOn ? 'WŁĄCZONA' : 'WYŁĄCZONA'}
          </span>
        </button>

        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-2 w-full max-w-md bg-[#0a0d12] p-1 rounded-xl border border-[#334155]">
          <button
            onClick={() => {
              setMode('torch');
              triggerHaptic(20);
            }}
            className={`py-2 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'torch' ? 'aqua-button-primary' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            Ciągłe Świecenie
          </button>
          <button
            onClick={() => {
              setMode('strobe');
              triggerHaptic(20);
            }}
            className={`py-2 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'strobe' ? 'aqua-button-primary' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            Stroboskop
          </button>
          <button
            onClick={() => {
              setMode('sos');
              triggerHaptic(20);
            }}
            className={`py-2 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
              mode === 'sos' ? 'bg-red-600 text-white' : 'text-[#94a3b8] hover:text-white'
            }`}
          >
            Sygnał SOS
          </button>
        </div>

        {/* Strobe speed slider */}
        {mode === 'strobe' && (
          <div className="w-full max-w-md bg-[#0a0d12] p-4 rounded-xl border border-[#334155] space-y-2 font-mono text-xs">
            <div className="flex justify-between text-[#cbd5e1]">
              <span>Częstotliwość stroboskopu:</span>
              <span className="text-amber-400 font-bold">{strobeHz} Hz ({strobeHz * 60} RPM)</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={strobeHz}
              onChange={(e) => setStrobeHz(Number(e.target.value))}
              className="w-full accent-[#0284c7] cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Screen Softbox Lighting Presets */}
      <div className="retro-bezel rounded-xl p-5 border border-[#b6b0a3] space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-[#1c1917]">
          <span className="flex items-center gap-1.5">
            <Palette className="w-4 h-4 text-[#0284c7]" />
            Wybór Barwy Świecenia Ekranem (Softbox Makro)
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
              className="aqua-button flex items-center gap-2.5 p-2.5 rounded-lg text-left cursor-pointer"
            >
              <div
                className="w-4 h-4 rounded-full border border-black/30 shadow-sm"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-xs font-medium text-[#292524]">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
