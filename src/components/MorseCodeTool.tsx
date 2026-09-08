import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Play,
  Pause,
  Flashlight,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

const MORSE_MAP: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '0': '-----',
  ' ': '/',
};

export const MorseCodeTool: React.FC = () => {
  const [inputText, setInputText] = useState('SOS HELP');
  const [wpm, setWpm] = useState(15); // Words per minute
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lightEnabled, setLightEnabled] = useState(true);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [activeSymbolIndex, setActiveSymbolIndex] = useState<number>(-1);
  const [isFlashing, setIsFlashing] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const transmitTimeoutRef = useRef<any>(null);

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
    } catch {
      return null;
    }
  };

  const setTorch = async (state: boolean) => {
    setIsFlashing(state);
    if (!lightEnabled) return;
    const track = await getCameraTrack();
    if (track) {
      try {
        await (track as any).applyConstraints({ advanced: [{ torch: state }] });
      } catch {}
    }
  };

  const playTone = (durationMs: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(750, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {}
  };

  // Convert text to morse code string
  const textToMorse = (text: string) => {
    return text
      .toUpperCase()
      .split('')
      .map((ch) => MORSE_MAP[ch] || '')
      .filter((s) => s.length > 0)
      .join(' ');
  };

  const morseString = textToMorse(inputText);

  // Transmission runner
  const startTransmission = () => {
    setIsTransmitting(true);
    triggerHaptic(30);

    // Standard Paris unit timing: 1 unit = 1200 / WPM ms
    const unitMs = Math.round(1200 / wpm);
    const ditMs = unitMs;
    const dahMs = unitMs * 3;
    const symbolSpaceMs = unitMs;
    const letterSpaceMs = unitMs * 3;
    const wordSpaceMs = unitMs * 7;

    const symbols = morseString.split('');
    let idx = 0;

    const step = async () => {
      if (idx >= symbols.length) {
        setIsTransmitting(false);
        setActiveSymbolIndex(-1);
        await setTorch(false);
        return;
      }

      const sym = symbols[idx];
      setActiveSymbolIndex(idx);
      idx++;

      if (sym === '.') {
        await setTorch(true);
        playTone(ditMs);
        transmitTimeoutRef.current = setTimeout(async () => {
          await setTorch(false);
          transmitTimeoutRef.current = setTimeout(step, symbolSpaceMs);
        }, ditMs);
      } else if (sym === '-') {
        await setTorch(true);
        playTone(dahMs);
        transmitTimeoutRef.current = setTimeout(async () => {
          await setTorch(false);
          transmitTimeoutRef.current = setTimeout(step, symbolSpaceMs);
        }, dahMs);
      } else if (sym === ' ') {
        transmitTimeoutRef.current = setTimeout(step, letterSpaceMs);
      } else if (sym === '/') {
        transmitTimeoutRef.current = setTimeout(step, wordSpaceMs);
      } else {
        step();
      }
    };

    step();
  };

  const stopTransmission = async () => {
    clearTimeout(transmitTimeoutRef.current);
    setIsTransmitting(false);
    setActiveSymbolIndex(-1);
    await setTorch(false);
  };

  useEffect(() => {
    return () => {
      clearTimeout(transmitTimeoutRef.current);
      if (trackRef.current) {
        try {
          (trackRef.current as any).applyConstraints({ advanced: [{ torch: false }] });
          trackRef.current.stop();
        } catch {}
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Send className="w-5 h-5 text-amber-400" />
            Latarka & Nadajnik Kodu Morse'a
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatyczne nadawanie wiadomości tekstowych za pomocą błysków diody LED, ekranu i sygnałów akustycznych.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Dźwięk sygnałów Morse'a"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setLightEnabled(!lightEnabled)}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              lightEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Światło LED / Ekranu"
          >
            <Flashlight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Transmitter Board */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        {/* Flashing Light Simulated Orb */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            className={`w-28 h-28 rounded-full border-4 transition-all duration-75 flex items-center justify-center ${
              isFlashing
                ? 'bg-amber-400 border-amber-300 shadow-2xl shadow-amber-500/80 scale-110'
                : 'bg-slate-950 border-slate-800'
            }`}
          >
            <Sparkles className={`w-10 h-10 ${isFlashing ? 'text-slate-950 animate-spin' : 'text-slate-700'}`} />
          </div>
          <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            {isTransmitting ? (isFlashing ? 'BŁYSK' : 'PRZERWA') : 'GOTOWY DO NADAWANIA'}
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-bold uppercase">Wpisz tekst wiadomości</label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isTransmitting}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-lg font-bold text-amber-400 uppercase focus:outline-none focus:border-amber-500 disabled:opacity-50"
          />
        </div>

        {/* Morse Stream Visualizer */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-bold">Transkrypcja kodu Morse'a</div>
          <div className="font-mono text-xl tracking-widest break-all text-slate-300">
            {morseString.split('').map((sym, i) => (
              <span
                key={i}
                className={`${
                  activeSymbolIndex === i
                    ? 'text-amber-400 font-black bg-amber-500/20 px-1 rounded shadow'
                    : ''
                }`}
              >
                {sym}
              </span>
            ))}
          </div>
        </div>

        {/* WPM Speed Slider */}
        <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Prędkość nadawania (WPM):</span>
            <span className="font-mono text-amber-400 font-bold">{wpm} WPM</span>
          </div>
          <input
            type="range"
            min={5}
            max={35}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            disabled={isTransmitting}
            className="w-full accent-amber-500 cursor-pointer disabled:opacity-50"
          />
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          {!isTransmitting ? (
            <button
              onClick={startTransmission}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-8 py-3.5 rounded-full shadow-lg shadow-amber-500/30 cursor-pointer transition-all active:scale-95"
            >
              <Play className="w-5 h-5" />
              <span>NADAJ WIADOMOŚĆ ŚWIATŁEM & DŹWIĘKIEM</span>
            </button>
          ) : (
            <button
              onClick={stopTransmission}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-black px-8 py-3.5 rounded-full shadow-lg shadow-red-600/30 cursor-pointer"
            >
              <Pause className="w-5 h-5" />
              <span>PRZERWIJ NADAWANIE</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
