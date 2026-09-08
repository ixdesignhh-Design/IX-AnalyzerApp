import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Square,
  Download,
  Share2,
  Save,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Copy,
  Send,
  Sliders,
  Radio,
} from 'lucide-react';
import { MotionSample, ShaperRecommendation } from '../types';
import { computeResonanceSpectrum, calculateKlipperShapers } from '../utils/fft';
import { formatKlipperCSV, shareFileOrText, saveLogSession } from '../utils/export';
import { requestMotionPermission, triggerHaptic } from '../utils/sensors';
import { sendKlipperGcode } from '../utils/klipper';

interface InputShaperToolProps {
  klipperHost: string;
  isKlipperConnected: boolean;
  onSessionSaved: () => void;
}

export const InputShaperTool: React.FC<InputShaperToolProps> = ({
  klipperHost,
  isKlipperConnected,
  onSessionSaved,
}) => {
  const [axis, setAxis] = useState<'x' | 'y'>('x');
  const [isRecording, setIsRecording] = useState(false);
  const [samples, setSamples] = useState<MotionSample[]>([]);
  const [sampleCount, setSampleCount] = useState(0);
  const [sampleRate, setSampleRate] = useState(0);
  const [peakFreq, setPeakFreq] = useState(0);
  const [shapers, setShapers] = useState<ShaperRecommendation[]>([]);
  const [spectrum, setSpectrum] = useState<{ freqs: number[]; psd: number[] }>({ freqs: [], psd: [] });
  const [isSimulated, setIsSimulated] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [klipperStatusMsg, setKlipperStatusMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawSamplesRef = useRef<MotionSample[]>([]);
  const startTimeRef = useRef<number>(0);
  const lastSampleTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Stop recording and compute FFT
  const finishRecording = useCallback(() => {
    setIsRecording(false);
    triggerHaptic([30, 80, 30]);

    const collected = rawSamplesRef.current;
    setSamples(collected);

    if (collected.length >= 32) {
      const result = computeResonanceSpectrum(collected, axis);
      setSpectrum({ freqs: result.freqs, psd: result.psd });
      setPeakFreq(result.peakFreq);

      const calculatedShapers = calculateKlipperShapers(result.peakFreq);
      setShapers(calculatedShapers);

      // Save sample rate
      const duration = collected[collected.length - 1].time - collected[0].time;
      if (duration > 0) {
        setSampleRate(Math.round(collected.length / duration));
      }
    }
  }, [axis]);

  // Handle live device motion
  useEffect(() => {
    if (!isRecording || isSimulated) return;

    let localCount = 0;
    const handleMotion = (e: DeviceMotionEvent) => {
      const now = performance.now() / 1000;
      if (startTimeRef.current === 0) {
        startTimeRef.current = now;
      }
      const relTime = now - startTimeRef.current;

      const acc = e.acceleration || e.accelerationIncludingGravity;
      if (!acc) return;

      const sample: MotionSample = {
        time: relTime,
        x: acc.x || 0,
        y: acc.y || 0,
        z: acc.z || 0,
      };

      rawSamplesRef.current.push(sample);
      localCount++;
      lastSampleTimeRef.current = now;

      // Update counter in state throttled
      if (localCount % 15 === 0) {
        setSampleCount(localCount);
      }
    };

    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isRecording, isSimulated]);

  // Simulation loop for testing on desktop without accelerometer
  useEffect(() => {
    if (!isRecording || !isSimulated) return;

    let frameId: number;
    let localCount = 0;
    const baseFreq = axis === 'x' ? 48.5 : 36.2; // typical toolhead vs bed resonance
    const interval = 1 / 100; // 100 Hz simulation

    const simStart = performance.now() / 1000;
    startTimeRef.current = simStart;

    const timer = setInterval(() => {
      const now = performance.now() / 1000;
      const t = now - simStart;

      // Generate composite frequency signal (primary resonance + harmonic + random noise)
      const primary = Math.sin(2 * Math.PI * baseFreq * t) * 8.5;
      const harmonic = Math.sin(2 * Math.PI * (baseFreq * 2.1) * t) * 2.2;
      const noise = (Math.random() - 0.5) * 1.5;
      const val = primary + harmonic + noise;

      rawSamplesRef.current.push({
        time: t,
        x: axis === 'x' ? val : noise * 0.5,
        y: axis === 'y' ? val : noise * 0.5,
        z: 9.81 + noise * 0.2,
      });

      localCount++;
      setSampleCount(localCount);

      // Auto stop after 5 seconds of sweep
      if (t >= 5.0) {
        clearInterval(timer);
        finishRecording();
      }
    }, interval * 1000);

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(frameId);
    };
  }, [isRecording, isSimulated, axis, finishRecording]);

  // Draw real-time spectrum and waveform canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw background grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      if (isRecording) {
        // Draw live rolling waveform
        const data = rawSamplesRef.current;
        if (data.length > 2) {
          ctx.beginPath();
          ctx.strokeStyle = axis === 'x' ? '#38bdf8' : '#f59e0b';
          ctx.lineWidth = 2;

          const visiblePoints = Math.min(data.length, 250);
          const startIdx = data.length - visiblePoints;
          const slice = data.slice(startIdx);

          slice.forEach((s, idx) => {
            const xCoord = (idx / (visiblePoints - 1)) * width;
            const val = axis === 'x' ? s.x : s.y;
            const yCoord = height / 2 - (val / 15) * (height / 2);
            if (idx === 0) ctx.moveTo(xCoord, yCoord);
            else ctx.lineTo(xCoord, yCoord);
          });
          ctx.stroke();

          // Live label
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px sans-serif';
          ctx.fillText(`Nagrywanie osi ${axis.toUpperCase()}... (${data.length} próbek)`, 10, 20);
        }
      } else if (spectrum.freqs.length > 0) {
        // Draw PSD resonance curve
        const maxPsd = Math.max(...spectrum.psd, 0.1);
        ctx.beginPath();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;

        // Gradient fill below curve
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        ctx.beginPath();
        spectrum.freqs.forEach((freq, idx) => {
          const xCoord = (freq / 130) * width;
          const p = spectrum.psd[idx];
          const yCoord = height - (p / maxPsd) * (height - 35) - 15;

          if (idx === 0) {
            ctx.moveTo(xCoord, yCoord);
          } else {
            ctx.lineTo(xCoord, yCoord);
          }
        });

        // Fill area
        ctx.lineTo((spectrum.freqs[spectrum.freqs.length - 1] / 130) * width, height);
        ctx.lineTo((spectrum.freqs[0] / 130) * width, height);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        spectrum.freqs.forEach((freq, idx) => {
          const xCoord = (freq / 130) * width;
          const p = spectrum.psd[idx];
          const yCoord = height - (p / maxPsd) * (height - 35) - 15;
          if (idx === 0) ctx.moveTo(xCoord, yCoord);
          else ctx.lineTo(xCoord, yCoord);
        });
        ctx.stroke();

        // Highlight peak
        if (peakFreq > 0) {
          const peakX = (peakFreq / 130) * width;
          const peakP = spectrum.psd[spectrum.freqs.indexOf(peakFreq)] || maxPsd;
          const peakY = height - (peakP / maxPsd) * (height - 35) - 15;

          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(peakX, peakY, 5, 0, 2 * Math.PI);
          ctx.fill();

          ctx.fillStyle = '#fef08a';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`Pik: ${peakFreq.toFixed(1)} Hz`, Math.min(peakX + 8, width - 90), peakY - 8);
        }

        // Frequency axis labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px monospace';
        [20, 40, 60, 80, 100, 120].forEach((f) => {
          const x = (f / 130) * width;
          ctx.fillText(`${f}Hz`, x - 12, height - 4);
        });
      } else {
        // Idle placeholder
        ctx.fillStyle = '#64748b';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Zamontuj telefon na osi ' + axis.toUpperCase() + ' i naciśnij "Start Pomiaru"', width / 2, height / 2);
        ctx.textAlign = 'start';
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecording, axis, spectrum, peakFreq]);

  const handleStartRecording = async () => {
    if (!isSimulated) {
      const granted = await requestMotionPermission();
      if (!granted) {
        alert('Dostęp do akcelerometru został odrzucony w przeglądarce.');
        return;
      }
    }

    triggerHaptic(50);
    rawSamplesRef.current = [];
    startTimeRef.current = 0;
    setSampleCount(0);
    setPeakFreq(0);
    setShapers([]);
    setSpectrum({ freqs: [], psd: [] });
    setIsRecording(true);
  };

  const handleExportCSV = () => {
    if (samples.length === 0) return;
    const csv = formatKlipperCSV(samples);
    const filename = `resonances_${axis}_${Date.now()}.csv`;
    shareFileOrText(`Klipper Input Shaper ${axis.toUpperCase()}`, 'Dane rezonansu Klippera', csv, filename, 'text/csv');
  };

  const handleSaveToHistory = () => {
    if (samples.length === 0 || peakFreq === 0) return;
    const csv = formatKlipperCSV(samples);
    saveLogSession({
      id: `shaper_${axis}_${Date.now()}`,
      title: `Input Shaper Oś ${axis.toUpperCase()} (${peakFreq.toFixed(1)} Hz)`,
      type: 'input_shaper',
      createdAt: Date.now(),
      summary: `Pik: ${peakFreq.toFixed(1)} Hz, Rekomendacja: ${shapers[0]?.type || 'MZV'} @ ${shapers[0]?.maxAccel || 0} mm/s²`,
      csvData: csv,
      sampleCount: samples.length,
    });
    triggerHaptic([30, 30]);
    onSessionSaved();
  };

  const handleCopyKlipperConfig = () => {
    const recommended = shapers[0];
    if (!recommended) return;

    const config = `[input_shaper]\nshaper_freq_${axis}: ${recommended.freq.toFixed(1)}\nshaper_type_${axis}: ${recommended.type.toLowerCase()}`;
    navigator.clipboard.writeText(config);
    setCopiedConfig(true);
    triggerHaptic(20);
    setTimeout(() => setCopiedConfig(false), 2500);
  };

  const handleSendToKlipper = async () => {
    const recommended = shapers[0];
    if (!recommended || !isKlipperConnected) return;

    const gcode = `SET_INPUT_SHAPER SHAPER_FREQ_${axis.toUpperCase()}=${recommended.freq.toFixed(1)} SHAPER_TYPE_${axis.toUpperCase()}=${recommended.type.toLowerCase()}`;
    setKlipperStatusMsg('Wysyłanie do Klippera...');
    const res = await sendKlipperGcode(klipperHost, gcode);
    setKlipperStatusMsg(res.message);
    triggerHaptic(50);
    setTimeout(() => setKlipperStatusMsg(null), 4000);
  };

  const recommended = shapers[0];

  return (
    <div className="space-y-4">
      {/* Top Banner & Mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Radio className="w-5 h-5 text-amber-400" />
              Input Shaper 3D (Akcelerometr & FFT)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Montaż na głowicy (X) lub stole (Y). Rejestracja drgań, analiza rezonansów i rekomendacja filtrów Klippera.
            </p>
          </div>

          {/* Axis Selector & Simulation Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setAxis('x')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  axis === 'x' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Oś X (Głowica)
              </button>
              <button
                onClick={() => setAxis('y')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  axis === 'y' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Oś Y (Stół/Brama)
              </button>
            </div>

            <button
              onClick={() => setIsSimulated(!isSimulated)}
              className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isSimulated
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
              }`}
              title="Symulacja testu rezonansowego (przydatna na komputerze bez fizycznego montażu telefonu)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSimulated ? 'Symulacja WŁ' : 'Fizyczny sensor'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Display */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">
            {isRecording
              ? `Oscyloskop na żywo (Oś ${axis.toUpperCase()})`
              : spectrum.freqs.length > 0
              ? `Charakterystyka Rezonansowa PSD (10 - 130 Hz)`
              : 'Podgląd czujnika'}
          </span>
          <div className="flex items-center gap-3">
            {sampleRate > 0 && <span>Próbkowanie: ~{sampleRate} Hz</span>}
            <span>Próbki: {sampleCount}</span>
          </div>
        </div>

        <div className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800 aspect-[16/8] sm:aspect-[21/9]">
          <canvas
            ref={canvasRef}
            width={720}
            height={300}
            className="w-full h-full block"
          />

          {/* Peak badge on canvas */}
          {peakFreq > 0 && !isRecording && (
            <div className="absolute top-3 right-3 bg-slate-900/90 border border-amber-500/50 backdrop-blur px-3 py-1.5 rounded-lg text-right shadow-lg">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Główny rezonans</div>
              <div className="text-xl font-black text-amber-400 leading-tight">{peakFreq.toFixed(1)} Hz</div>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Pomiaru Osi {axis.toUpperCase()}</span>
            </button>
          ) : (
            <button
              onClick={finishRecording}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-red-900/20 animate-pulse transition-all active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Zatrzymaj i Przelicz ({sampleCount} próbek)</span>
            </button>
          )}

          {/* Quick Actions if data available */}
          {samples.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                title="Pobierz plik CSV zgodny ze skryptem calibrate_shaper.py Klippera"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Pobierz CSV Klippera</span>
              </button>

              <button
                onClick={handleSaveToHistory}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                title="Zapisz do historii pomiarów"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zapisz w Logach</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Klipper Shaper Recommendations Box */}
      {shapers.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Rekomendowane Filtry Input Shapera (Klipper)
              </h3>
              <p className="text-xs text-slate-400">
                Wyliczono na podstawie piku {peakFreq.toFixed(1)} Hz dla osi {axis.toUpperCase()}
              </p>
            </div>

            {/* Quick config copy / send */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyKlipperConfig}
                className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>{copiedConfig ? 'Skopiowano!' : 'Kopiuj do printer.cfg'}</span>
              </button>

              {isKlipperConnected && (
                <button
                  onClick={handleSendToKlipper}
                  className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Wyślij do drukarki</span>
                </button>
              )}
            </div>
          </div>

          {klipperStatusMsg && (
            <div className="bg-slate-800/80 border border-amber-500/30 text-amber-300 text-xs px-3 py-2 rounded-lg">
              {klipperStatusMsg}
            </div>
          )}

          {/* Shaper Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-2 font-medium">Algorytm</th>
                  <th className="pb-2 font-medium">Częstotliwość</th>
                  <th className="pb-2 font-medium">Max Accel</th>
                  <th className="pb-2 font-medium">Wibracje</th>
                  <th className="pb-2 font-medium hidden md:table-cell">Charakterystyka</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {shapers.map((shaper, idx) => {
                  const isTop = idx === 0;
                  return (
                    <tr
                      key={shaper.type}
                      className={isTop ? 'bg-amber-500/10 font-semibold text-slate-100' : 'hover:bg-slate-800/40'}
                    >
                      <td className="py-2.5 flex items-center gap-2">
                        <span className="font-mono text-amber-400">{shaper.type}</span>
                        {isTop && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded uppercase font-bold">
                            Zalecany
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 font-mono">{shaper.freq.toFixed(1)} Hz</td>
                      <td className="py-2.5 font-mono text-emerald-400">≤ {shaper.maxAccel} mm/s²</td>
                      <td className="py-2.5 font-mono">{shaper.vibrations}%</td>
                      <td className="py-2.5 text-slate-400 hidden md:table-cell">{shaper.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ready-to-paste snippet */}
          {recommended && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300">
              <div className="text-[10px] uppercase text-slate-500 mb-1 font-sans">Fragment do wklejenia w printer.cfg:</div>
              <div className="text-amber-300">[input_shaper]</div>
              <div>shaper_freq_{axis}: {recommended.freq.toFixed(1)}</div>
              <div>shaper_type_{axis}: {recommended.type.toLowerCase()}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
