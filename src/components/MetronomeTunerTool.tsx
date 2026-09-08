import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Play,
  Pause,
  Plus,
  Minus,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const MetronomeTunerTool: React.FC = () => {
  const [tab, setTab] = useState<'metronome' | 'tuner'>('metronome');

  // Metronome State
  const [bpm, setBpm] = useState(120);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);

  // Tuner State
  const [isTunerActive, setIsTunerActive] = useState(false);
  const [detectedPitchHz, setDetectedPitchHz] = useState<number | null>(null);
  const [detectedNote, setDetectedNote] = useState<string>('--');
  const [centsOffset, setCentsOffset] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerIdRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<any>(null);

  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playClick = (isAccent: boolean) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 1600 : 800, ctx.currentTime);
      gain.gain.setValueAtTime(isAccent ? 0.8 : 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  };

  // Metronome loop
  useEffect(() => {
    if (!isPlaying) {
      clearInterval(timerIdRef.current);
      return;
    }

    const intervalMs = (60 / bpm) * 1000;
    timerIdRef.current = setInterval(() => {
      setCurrentBeat((prev) => {
        const next = (prev + 1) % beatsPerMeasure;
        const isAccent = next === 0;
        playClick(isAccent);
        triggerHaptic(isAccent ? 25 : 10);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timerIdRef.current);
  }, [isPlaying, bpm, beatsPerMeasure]);

  // Tuner Pitch Detection (Autocorrelation)
  const autoCorrelate = (buf: Float32Array, sampleRate: number): number => {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) {
      const val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.02) return -1; // Not enough signal

    let r1 = 0,
      r2 = SIZE - 1,
      thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < thres) {
        r1 = i;
        break;
      }
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < thres) {
        r2 = SIZE - i;
        break;
      }
    }

    buf = buf.slice(r1, r2);
    const c = new Array(buf.length).fill(0);
    for (let i = 0; i < buf.length; i++) {
      for (let j = 0; j < buf.length - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1,
      maxpos = -1;
    for (let i = d; i < buf.length; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;
    return sampleRate / T0;
  };

  const noteStrings = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const getNoteFromPitch = (freq: number) => {
    const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
    const midi = Math.round(noteNum) + 69;
    const noteName = noteStrings[midi % 12];
    const standardFreq = 440 * Math.pow(2, (midi - 69) / 12);
    const cents = Math.floor((1200 * Math.log(freq / standardFreq)) / Math.log(2));
    return { noteName, cents };
  };

  const startTuner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const ctx = getAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      setIsTunerActive(true);

      const buf = new Float32Array(analyser.fftSize);
      const updatePitch = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getFloatTimeDomainData(buf);
        const pitch = autoCorrelate(buf, ctx.sampleRate);
        if (pitch > 40 && pitch < 1200) {
          setDetectedPitchHz(Math.round(pitch * 10) / 10);
          const { noteName, cents } = getNoteFromPitch(pitch);
          setDetectedNote(noteName);
          setCentsOffset(cents);
        }
        animFrameRef.current = requestAnimationFrame(updatePitch);
      };
      updatePitch();
    } catch (e) {
      alert('Brak dostępu do mikrofonu.');
    }
  };

  const stopTuner = () => {
    cancelAnimationFrame(animFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    setIsTunerActive(false);
    setDetectedPitchHz(null);
    setDetectedNote('--');
  };

  useEffect(() => {
    return () => {
      clearInterval(timerIdRef.current);
      stopTuner();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Music className="w-5 h-5 text-amber-400" />
            Metronom & Stroik Muzyczny Chromatyczny
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Wybijanie tempa z akcentem miar oraz stroik mikrofonowy z precyzyjną detekcją częstotliwości (Hz), nut i odchyłki w centach.
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setTab('metronome')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              tab === 'metronome' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Metronom
          </button>
          <button
            onClick={() => setTab('tuner')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              tab === 'tuner' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stroik Chromatyczny
          </button>
        </div>
      </div>

      {/* Metronome Mode */}
      {tab === 'metronome' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-6">
          {/* Visual Beat Indicator Dots */}
          <div className="flex items-center gap-3">
            {[...Array(beatsPerMeasure)].map((_, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  isPlaying && currentBeat === i
                    ? i === 0
                      ? 'bg-amber-400 border-amber-300 scale-125 shadow-lg shadow-amber-500/50'
                      : 'bg-indigo-400 border-indigo-300 scale-110 shadow-lg shadow-indigo-500/50'
                    : 'bg-slate-950 border-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Big BPM Display */}
          <div className="text-center">
            <div className="text-7xl sm:text-8xl font-black font-mono text-slate-100">{bpm}</div>
            <div className="text-xs uppercase font-bold tracking-widest text-slate-500 mt-1">
              BPM (Uderzeń na minutę)
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setBpm((b) => Math.max(30, b - 5))}
              className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            >
              <Minus className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-8 py-4 rounded-full font-black text-sm flex items-center gap-2 shadow-xl cursor-pointer transition-all active:scale-95 ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/30'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{isPlaying ? 'STOP' : 'START'}</span>
            </button>

            <button
              onClick={() => setBpm((b) => Math.min(300, b + 5))}
              className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* BPM Slider & Time Signature */}
          <div className="w-full max-w-md space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <input
              type="range"
              min={30}
              max={280}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-medium">Metrum:</span>
              <div className="flex gap-1.5">
                {[2, 3, 4, 6].map((beats) => (
                  <button
                    key={beats}
                    onClick={() => setBeatsPerMeasure(beats)}
                    className={`px-2.5 py-1 rounded border text-xs font-mono cursor-pointer ${
                      beatsPerMeasure === beats
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {beats}/4
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tuner Mode */}
      {tab === 'tuner' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-6">
          {!isTunerActive ? (
            <div className="text-center py-6 space-y-4">
              <Mic className="w-16 h-16 mx-auto text-slate-600" />
              <div className="text-sm text-slate-300 font-semibold">Stroik mikrofonowy jest wyłączony</div>
              <button
                onClick={startTuner}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-6 py-2.5 rounded-full shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Uruchom Stroik
              </button>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center space-y-6">
              {/* Note Display */}
              <div className="relative w-48 h-48 rounded-full bg-slate-950 border-4 border-slate-800 flex flex-col items-center justify-center shadow-2xl">
                <div
                  className={`text-7xl font-black font-mono transition-colors ${
                    Math.abs(centsOffset) < 5 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {detectedNote}
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1">
                  {detectedPitchHz ? `${detectedPitchHz} Hz` : '-- Hz'}
                </div>
              </div>

              {/* Tuning Needle / Cents Gauge */}
              <div className="w-full max-w-sm space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>-50ct (Za nisko)</span>
                  <span
                    className={`font-bold ${
                      Math.abs(centsOffset) < 5 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {centsOffset > 0 ? `+${centsOffset} ct` : `${centsOffset} ct`}
                  </span>
                  <span>+50ct (Za wysoko)</span>
                </div>

                <div className="relative h-4 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div className="absolute left-1/2 -translate-x-1/2 w-1 h-full bg-emerald-500 z-10" />
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-amber-400 rounded-full shadow transition-all duration-75"
                    style={{
                      left: `calc(${Math.min(100, Math.max(0, ((centsOffset + 50) / 100) * 100))}% - 6px)`,
                    }}
                  />
                </div>
              </div>

              <button
                onClick={stopTuner}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs px-4 py-2 rounded-lg cursor-pointer"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>Wyłącz Stroik</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
