import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Square, Sliders } from 'lucide-react';
import { ToneGenerator } from '../utils/audio';

export const ToneGeneratorTool: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [freq, setFreq] = useState(110);
  const [waveform, setWaveform] = useState<OscillatorType>('sine');
  const [volume, setVolume] = useState(0.2);

  const genRef = useRef<ToneGenerator | null>(null);

  useEffect(() => {
    genRef.current = new ToneGenerator();
    return () => {
      genRef.current?.stop();
    };
  }, []);

  const togglePlay = () => {
    if (!genRef.current) return;
    if (isPlaying) {
      genRef.current.stop();
      setIsPlaying(false);
    } else {
      genRef.current.start(freq, waveform, volume);
      setIsPlaying(true);
    }
  };

  const handleFreqChange = (newFreq: number) => {
    setFreq(newFreq);
    genRef.current?.setFrequency(newFreq);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    genRef.current?.setVolume(newVol);
  };

  const handleWaveformChange = (type: OscillatorType) => {
    setWaveform(type);
    genRef.current?.setWaveform(type);
  };

  const quickFreqs = [50, 60, 100, 110, 140, 220, 440, 1000, 4000, 10000];

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            Generator Częstotliwości (20 Hz - 20 kHz)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Testowanie rezonansów akustycznych, wibracji obudów, luźnych śrub i pasma głośników.
          </p>
        </div>

        <button
          onClick={togglePlay}
          className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-sm ${
            isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isPlaying ? 'Zatrzymaj dźwięk' : 'Włącz generator'}</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-sm">
        {/* Big Frequency Readout */}
        <div className="text-center space-y-1">
          <div className="text-xs uppercase tracking-widest text-slate-400 font-bold">Częstotliwość fali</div>
          <div className="text-6xl font-black font-mono text-amber-400">
            {freq}
            <span className="text-2xl text-slate-500 ml-1 font-sans">Hz</span>
          </div>
        </div>

        {/* Frequency Slider */}
        <div className="space-y-2">
          <input
            type="range"
            min={20}
            max={20000}
            step={1}
            value={freq}
            onChange={(e) => handleFreqChange(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-500 font-mono">
            <span>20 Hz (Sub-bas)</span>
            <span>1 kHz (Środek)</span>
            <span>20 kHz (Pisk)</span>
          </div>
        </div>

        {/* Quick frequency presets */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {quickFreqs.map((f) => (
            <button
              key={f}
              onClick={() => handleFreqChange(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer border ${
                freq === f
                  ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {f >= 1000 ? `${f / 1000}k` : f} Hz
            </button>
          ))}
        </div>

        {/* Waveform Selector */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {(['sine', 'square', 'triangle', 'sawtooth'] as OscillatorType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleWaveformChange(type)}
              className={`py-2 rounded-lg text-xs font-semibold capitalize border transition-colors cursor-pointer ${
                waveform === type
                  ? 'bg-slate-800 text-amber-400 border-amber-500/50'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-400 whitespace-nowrap">Głośność:</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <span className="font-mono text-xs text-slate-300 w-12 text-right">{Math.round(volume * 100)}%</span>
        </div>
      </div>
    </div>
  );
};
