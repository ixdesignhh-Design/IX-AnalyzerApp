import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, RotateCcw, Sliders, Sparkles } from 'lucide-react';
import { getAudioContext } from '../utils/audio';

export const DecibelTool: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [currentDb, setCurrentDb] = useState(0);
  const [minDb, setMinDb] = useState(999);
  const [maxDb, setMaxDb] = useState(0);
  const [avgDb, setAvgDb] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calibration offset (SPL Offset)
  const [splOffset, setSplOffset] = useState<number>(() => {
    return parseFloat(localStorage.getItem('ix_spl_offset') || '0');
  });

  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const samplesRef = useRef<number[]>([]);

  useEffect(() => {
    localStorage.setItem('ix_spl_offset', splOffset.toString());
  }, [splOffset]);

  const startListening = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

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

        // Approximate SPL decibels + user calibration offset
        let db = 20 * Math.log10(rms || 0.00001) + 95 + splOffset;
        db = Math.max(25, Math.min(130, Math.round(db * 10) / 10));

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
      console.warn('Microphone access denied/failed:', e);
      setErrorMessage(
        'Wymagany dostęp do mikrofonu w przeglądarce. Zezwól na nagrywanie audio lub przetestuj symulację na PC.'
      );
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
      {/* OS X Workstation Card Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[#0284c7]" />
            Decybelomierz SPL & Analizator Hałasu dB
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Precyzyjny pomiar ciśnienia akustycznego dB SPL przez mikrofon, kalibracja offsetu, wskaźniki Leq i normy BHP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isListening ? (
            <button
              onClick={startListening}
              className="aqua-button-primary flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Włącz Pomiar SPL</span>
            </button>
          ) : (
            <button
              onClick={stopListening}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer shadow flex items-center gap-2"
            >
              <MicOff className="w-4 h-4" />
              <span>Zatrzymaj</span>
            </button>
          )}

          <button
            onClick={resetStats}
            className="aqua-button p-2 rounded-lg cursor-pointer"
            title="Resetuj min/max"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-amber-100 border border-amber-400 text-amber-900 p-3 rounded-xl text-xs font-sans">
          {errorMessage}
        </div>
      )}

      {/* Main Gauge inside CRT Glass */}
      <div className="retro-screen-crt rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center space-y-6">
        <div className="text-center space-y-1">
          <div className="text-xs font-mono uppercase tracking-widest text-[#94a3b8] font-bold">
            Poziom ciśnienia akustycznego (SPL)
          </div>
          <div className="text-6xl font-black font-mono tracking-tight">
            <span
              className={
                currentDb < 50
                  ? 'text-emerald-400'
                  : currentDb < 75
                  ? 'text-[#38bdf8]'
                  : currentDb < 85
                  ? 'text-amber-400'
                  : 'text-red-400'
              }
            >
              {currentDb > 0 ? currentDb.toFixed(1) : '--.-'}
            </span>
            <span className="text-2xl text-[#64748b] ml-1 font-sans">dB</span>
          </div>
        </div>

        {/* Min / Avg / Max Cards */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-center">
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#334155]">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Min</div>
            <div className="text-lg font-bold font-mono text-[#cbd5e1] mt-0.5">
              {minDb < 999 ? `${minDb.toFixed(1)} dB` : '--'}
            </div>
          </div>
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#334155]">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Średnia Leq</div>
            <div className="text-lg font-bold font-mono text-[#38bdf8] mt-0.5">
              {avgDb > 0 ? `${avgDb.toFixed(1)} dB` : '--'}
            </div>
          </div>
          <div className="bg-[#0f172a] p-2.5 rounded-lg border border-[#334155]">
            <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Pik (Max)</div>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
              {maxDb > 0 ? `${maxDb.toFixed(1)} dB` : '--'}
            </div>
          </div>
        </div>

        {/* Reference scale */}
        <div className="w-full max-w-md bg-[#0a0d12] p-3 rounded-lg border border-[#334155] text-xs font-mono space-y-1.5">
          <div className="text-[11px] font-bold text-[#94a3b8] uppercase">Punkty odniesienia hałasu:</div>
          <div className="flex justify-between text-[#94a3b8]">
            <span>30 dB</span>
            <span>Cichy warsztat / szum tła</span>
          </div>
          <div className="flex justify-between text-emerald-400">
            <span>45 dB</span>
            <span>Drukarka 3D w trybie StealthChop</span>
          </div>
          <div className="flex justify-between text-[#38bdf8]">
            <span>65 dB</span>
            <span>Wentylator głowicy / Normalna rozmowa</span>
          </div>
          <div className="flex justify-between text-red-400 font-bold">
            <span>&gt; 85 dB</span>
            <span>Próg BHP – wymagana ochrona słuchu</span>
          </div>
        </div>
      </div>

      {/* SPL Microphone Calibration Offset Slider */}
      <div className="retro-bezel p-3.5 rounded-xl border border-[#b8b2a5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-[#292524] font-bold whitespace-nowrap">Kalibracja mikrofonu (Offset):</span>
          <input
            type="range"
            min={-20}
            max={20}
            step={1}
            value={splOffset}
            onChange={(e) => setSplOffset(Number(e.target.value))}
            className="w-48 accent-[#0284c7] cursor-pointer"
          />
          <span className="font-mono text-[#0284c7] font-bold">
            {splOffset > 0 ? `+${splOffset}` : splOffset} dB
          </span>
        </div>

        <button
          onClick={() => setSplOffset(0)}
          className="aqua-button px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
        >
          Reset Offsetu
        </button>
      </div>
    </div>
  );
};
