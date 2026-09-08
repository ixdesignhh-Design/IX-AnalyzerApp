import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, AlertCircle, RotateCcw } from 'lucide-react';
import { getAudioContext } from '../utils/audio';

export const DecibelTool: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [currentDb, setCurrentDb] = useState(0);
  const [minDb, setMinDb] = useState(999);
  const [maxDb, setMaxDb] = useState(0);
  const [avgDb, setAvgDb] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      setIsListening(true);
      const buffer = new Float32Array(analyser.fftSize);

      const processAudio = () => {
        analyser.getFloatTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);

        // Approximate SPL decibels (reference ~20uPa)
        let db = 20 * Math.log10(rms || 0.00001) + 95;
        db = Math.max(25, Math.min(125, Math.round(db * 10) / 10));

        setCurrentDb(db);
        setMinDb((m) => Math.min(m, db));
        setMaxDb((m) => Math.max(m, db));

        samplesRef.current.push(db);
        if (samplesRef.current.length > 50) samplesRef.current.shift();
        const avg = samplesRef.current.reduce((a, b) => a + b, 0) / samplesRef.current.length;
        setAvgDb(Math.round(avg * 10) / 10);

        animFrameRef.current = requestAnimationFrame(processAudio);
      };

      processAudio();
    } catch (e) {
      alert('Wymagany dostęp do mikrofonu.');
      console.error(e);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopListening();
  }, []);

  const resetStats = () => {
    setMinDb(currentDb || 999);
    setMaxDb(currentDb || 0);
    samplesRef.current = [];
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            Decybelomierz (SPL dB)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pomiar hałasu pracy drukarki 3D, wentylatorów chłodzenia oraz ocena norm BHP w warsztacie.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isListening ? (
            <button
              onClick={startListening}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Włącz Miernik</span>
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
            >
              <MicOff className="w-4 h-4" />
              <span>Zatrzymaj</span>
            </button>
          )}

          <button
            onClick={resetStats}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg cursor-pointer"
            title="Resetuj min/max"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Gauge & Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Poziom ciśnienia akustycznego</div>
          <div className="text-6xl font-black font-mono tracking-tight">
            <span
              className={
                currentDb < 50
                  ? 'text-emerald-400'
                  : currentDb < 75
                  ? 'text-sky-400'
                  : currentDb < 85
                  ? 'text-amber-400'
                  : 'text-red-400'
              }
            >
              {currentDb > 0 ? currentDb.toFixed(1) : '--.-'}
            </span>
            <span className="text-2xl text-slate-500 ml-1 font-sans">dB</span>
          </div>
        </div>

        {/* Min / Avg / Max Cards */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-center">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Min</div>
            <div className="text-lg font-bold font-mono text-slate-300 mt-0.5">
              {minDb < 999 ? `${minDb.toFixed(1)} dB` : '--'}
            </div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Średnia</div>
            <div className="text-lg font-bold font-mono text-slate-200 mt-0.5">
              {avgDb > 0 ? `${avgDb.toFixed(1)} dB` : '--'}
            </div>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <div className="text-[10px] uppercase font-bold text-slate-400">Max (Pik)</div>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
              {maxDb > 0 ? `${maxDb.toFixed(1)} dB` : '--'}
            </div>
          </div>
        </div>

        {/* Reference scale */}
        <div className="w-full max-w-md bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Punkty odniesienia hałasu:</div>
          <div className="flex justify-between text-slate-400">
            <span>30 dB</span>
            <span>Cichy pokój / szept</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>45 dB</span>
            <span>Drukarka 3D w trybie StealthChop</span>
          </div>
          <div className="flex justify-between text-sky-400">
            <span>60-65 dB</span>
            <span>Wentylator 5015 na 100% / Normalna rozmowa</span>
          </div>
          <div className="flex justify-between text-red-400 font-bold">
            <span>&gt; 85 dB</span>
            <span>Próg BHP – wymagane nauszniki ochronne!</span>
          </div>
        </div>
      </div>
    </div>
  );
};
