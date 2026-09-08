import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Gauge, Sliders, CheckCircle2, AlertTriangle, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { BeltPreset } from '../types';
import { getAudioContext, autoCorrelate } from '../utils/audio';
import { triggerHaptic } from '../utils/sensors';

const PRESETS: BeltPreset[] = [
  {
    id: 'voron_24',
    name: 'Voron 2.4 / Trident (150mm)',
    targetHz: 110,
    toleranceHz: 5,
    description: 'Paski A/B Gates 2GT (6mm/9mm), pomiar na odcinku 150 mm.',
  },
  {
    id: 'prusa_mk3_mk4',
    name: 'Prusa MK3S+ / MK4',
    targetHz: 140,
    toleranceHz: 7,
    description: 'Paski osi X oraz Y Gates PowerGrip.',
  },
  {
    id: 'bambu_x1',
    name: 'Bambu Lab X1C / P1S / P1P',
    targetHz: 135,
    toleranceHz: 6,
    description: 'Naciąg pasków osi XY na prętach węglowych.',
  },
  {
    id: 'ender_k1',
    name: 'Creality Ender 3 / K1 Series',
    targetHz: 150,
    toleranceHz: 8,
    description: 'Standardowe paski GT2 6mm na profilach 2020.',
  },
  {
    id: 'custom',
    name: 'Własna wartość (Custom Hz)',
    targetHz: 120,
    toleranceHz: 5,
    description: 'Dowolna częstotliwość zadana.',
  },
];

interface BeltTunerToolProps {
  soundEnabled: boolean;
}

export const BeltTunerTool: React.FC<BeltTunerToolProps> = () => {
  const [isListening, setIsListening] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<BeltPreset>(PRESETS[0]);
  const [customTargetHz, setCustomTargetHz] = useState<number>(120);
  const [currentFreq, setCurrentFreq] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [history, setHistory] = useState<number[]>([]);
  const [status, setStatus] = useState<'idle' | 'too_loose' | 'good' | 'too_tight'>('idle');

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastPluckTimeRef = useRef<number>(0);

  const target = selectedPreset.id === 'custom' ? customTargetHz : selectedPreset.targetHz;
  const tolerance = selectedPreset.toleranceHz;

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      triggerHaptic(30);

      const buffer = new Float32Array(analyser.fftSize);

      const checkPitch = () => {
        analyser.getFloatTimeDomainData(buffer);
        const { freq, confidence: conf } = autoCorrelate(buffer, ctx.sampleRate);

        if (freq > 40 && freq < 450 && conf > 0.65) {
          const roundedFreq = Math.round(freq * 10) / 10;
          setCurrentFreq(roundedFreq);
          setConfidence(conf);

          // Evaluate tension state
          const diff = roundedFreq - target;
          if (Math.abs(diff) <= tolerance) {
            setStatus('good');
            // Subtle haptic pulse when perfectly tuned
            if (performance.now() - lastPluckTimeRef.current > 600) {
              triggerHaptic([20, 60, 20]);
            }
          } else if (diff < -tolerance) {
            setStatus('too_loose');
          } else {
            setStatus('too_tight');
          }

          // Record pluck in history if distinct
          const now = performance.now();
          if (now - lastPluckTimeRef.current > 750) {
            lastPluckTimeRef.current = now;
            setHistory((prev) => [roundedFreq, ...prev.slice(0, 4)]);
          }
        }

        animFrameRef.current = requestAnimationFrame(checkPitch);
      };

      checkPitch();
    } catch (err) {
      alert('Wymagany dostęp do mikrofonu, aby nastroić pasek.');
      console.error(err);
      stopListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const diff = currentFreq > 0 ? currentFreq - target : 0;
  const pctOffset = Math.max(-100, Math.min(100, (diff / (tolerance * 3)) * 100));

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-400" />
              Tuner Naciągu Pasków GT2 (Audio Hz)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Szarpnij za pasek jak za strunę gitary. Mikrofon bada częstotliwość akustyczną fali drgań.
            </p>
          </div>

          {!isListening ? (
            <button
              onClick={startListening}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Włącz Mikrofon</span>
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <MicOff className="w-4 h-4" />
              <span>Wyłącz Mikrofon</span>
            </button>
          )}
        </div>
      </div>

      {/* Preset Selection */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        <label className="text-xs font-semibold text-slate-300 block">Wybierz profil drukarki lub zadaną częstotliwość:</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const isSel = selectedPreset.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPreset(p)}
                className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                  isSel
                    ? 'bg-amber-500/10 border-amber-500/60 text-slate-100 ring-1 ring-amber-500/40'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>{p.name}</span>
                  <span className="font-mono text-amber-400">{p.id === 'custom' ? `${customTargetHz} Hz` : `${p.targetHz} Hz`}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 leading-snug">{p.description}</div>
              </button>
            );
          })}
        </div>

        {selectedPreset.id === 'custom' && (
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center gap-4">
            <span className="text-xs text-slate-400 whitespace-nowrap">Docelowy naciąg:</span>
            <input
              type="range"
              min={60}
              max={220}
              value={customTargetHz}
              onChange={(e) => setCustomTargetHz(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <span className="font-mono text-sm font-bold text-amber-400 w-16 text-right">{customTargetHz} Hz</span>
          </div>
        )}
      </div>

      {/* Main Tuner Gauge */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
        {/* Big Frequency Display */}
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Zmierzona częstotliwość</div>
          <div className="text-6xl font-black tracking-tight font-mono">
            {currentFreq > 0 ? (
              <span
                className={
                  status === 'good'
                    ? 'text-emerald-400'
                    : status === 'too_loose'
                    ? 'text-sky-400'
                    : 'text-amber-400'
                }
              >
                {currentFreq.toFixed(1)}
              </span>
            ) : (
              <span className="text-slate-600">---.-</span>
            )}
            <span className="text-2xl text-slate-500 ml-1 font-sans">Hz</span>
          </div>
          <div className="text-xs text-slate-400">
            Cel: <span className="font-mono text-slate-200">{target} Hz</span> (±{tolerance} Hz)
          </div>
        </div>

        {/* Visual Needle Indicator Bar */}
        <div className="w-full max-w-md space-y-2">
          <div className="relative h-6 bg-slate-950 rounded-full border border-slate-800 overflow-hidden flex items-center">
            {/* Center target zone */}
            <div className="absolute left-1/2 -translate-x-1/2 w-16 h-full bg-emerald-500/20 border-x border-emerald-500/40" />
            {/* Center line */}
            <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-emerald-400 z-10" />

            {/* Current needle */}
            {currentFreq > 0 && (
              <div
                className="absolute top-0 bottom-0 w-3 rounded-full -translate-x-1/2 transition-all duration-150 shadow-md"
                style={{
                  left: `${50 + pctOffset * 0.45}%`,
                  backgroundColor:
                    status === 'good' ? '#10b981' : status === 'too_loose' ? '#38bdf8' : '#f59e0b',
                }}
              />
            )}
          </div>

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>&lt; Za luźny ({target - tolerance * 2} Hz)</span>
            <span className="text-emerald-400 font-bold">IDEALNY ({target} Hz)</span>
            <span>Za mocny ({target + tolerance * 2} Hz) &gt;</span>
          </div>
        </div>

        {/* Status Verdict Banner */}
        <div className="min-h-12 flex items-center justify-center">
          {currentFreq === 0 ? (
            <div className="text-xs text-slate-500 italic">
              {isListening ? 'Szarpnij za pasek blisko wózka lub silnika...' : 'Kliknij "Włącz Mikrofon", aby rozpocząć strojenie.'}
            </div>
          ) : status === 'good' ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>IDEALNY NACIĄG! Dokładność: {diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)} Hz</span>
            </div>
          ) : status === 'too_loose' ? (
            <div className="bg-sky-500/10 border border-sky-500/30 text-sky-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
              <ArrowDown className="w-5 h-5" />
              <span>ZA LUŹNY! Dociągnij pasek o ok. {Math.abs(diff).toFixed(1)} Hz</span>
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
              <ArrowUp className="w-5 h-5" />
              <span>ZA MOCNO NACIĄGNIĘTY! Poluzuj śrubę naciągu o {diff.toFixed(1)} Hz</span>
            </div>
          )}
        </div>

        {/* Pluck History */}
        {history.length > 0 && (
          <div className="w-full max-w-sm pt-2 border-t border-slate-800">
            <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between">
              <span>Ostatnie szarpnięcia (powtarzalność):</span>
              <button
                onClick={() => setHistory([])}
                className="text-slate-500 hover:text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Wyczyść</span>
              </button>
            </div>
            <div className="flex items-center justify-center gap-2">
              {history.map((h, i) => (
                <span
                  key={i}
                  className={`font-mono text-xs px-2.5 py-1 rounded-md border ${
                    i === 0
                      ? 'bg-slate-800 text-slate-100 border-amber-500/50 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  {h.toFixed(1)} Hz
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
