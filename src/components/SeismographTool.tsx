import React, { useState, useEffect, useRef } from 'react';
import { Layers, Play, Pause, RotateCcw, AlertOctagon, Download, Save, Bell, BellOff } from 'lucide-react';
import { MotionSample } from '../types';
import { requestMotionPermission, triggerHaptic } from '../utils/sensors';
import { formatKlipperCSV, saveLogSession, shareFileOrText } from '../utils/export';

interface SeismographToolProps {
  onSessionSaved: () => void;
  soundEnabled: boolean;
}

export const SeismographTool: React.FC<SeismographToolProps> = ({ onSessionSaved, soundEnabled }) => {
  const [isRunning, setIsRunning] = useState(true);
  const [alarmThreshold, setAlarmThreshold] = useState<number>(1.8); // in g
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [peakG, setPeakG] = useState<number>(0);
  const [currentG, setCurrentG] = useState<number>(1.0);
  const [savedCount, setSavedCount] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataPointsRef = useRef<{ time: number; x: number; y: number; z: number; mag: number }[]>([]);
  const recordedSamplesRef = useRef<MotionSample[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const alarmCooldownRef = useRef<number>(0);

  useEffect(() => {
    requestMotionPermission();

    const handleMotion = (e: DeviceMotionEvent) => {
      if (!isRunning) return;

      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const mag = Math.sqrt(x * x + y * y + z * z) / 9.81; // in units of g

      const now = performance.now();
      dataPointsRef.current.push({ time: now, x, y, z, mag });
      if (dataPointsRef.current.length > 500) {
        dataPointsRef.current.shift();
      }

      recordedSamplesRef.current.push({
        time: (now - (recordedSamplesRef.current[0]?.time || now)) / 1000,
        x,
        y,
        z,
      });

      setCurrentG(Math.round(mag * 100) / 100);
      setPeakG((prev) => Math.max(prev, Math.round(mag * 100) / 100));

      // Alarm detection
      if (alarmEnabled && mag > alarmThreshold && now - alarmCooldownRef.current > 1500) {
        alarmCooldownRef.current = now;
        setAlarmTriggered(true);
        triggerHaptic([100, 50, 100, 50, 100]);
        setTimeout(() => setAlarmTriggered(false), 1200);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [isRunning, alarmEnabled, alarmThreshold]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Draw seismograph grid
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Center baseline (1g reference)
      const centerY = height * 0.55;
      ctx.strokeStyle = '#334155';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw channel lines
      const data = dataPointsRef.current;
      if (data.length > 2) {
        // Channels: X (cyan), Y (amber), Total Mag (emerald)
        const channels: { key: 'x' | 'y' | 'z' | 'mag'; color: string; scale: number; width: number }[] = [
          { key: 'x', color: 'rgba(56, 189, 248, 0.45)', scale: 5, width: 1 },
          { key: 'y', color: 'rgba(245, 158, 11, 0.45)', scale: 5, width: 1 },
          { key: 'mag', color: '#10b981', scale: 40, width: 2.5 },
        ];

        channels.forEach(({ key, color, scale, width: lineWidth }) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;

          data.forEach((p, idx) => {
            const xCoord = (idx / (data.length - 1)) * width;
            let val = 0;
            if (key === 'mag') {
              val = (p.mag - 1.0) * scale;
            } else {
              val = (p[key] / 9.81) * scale;
            }
            const yCoord = centerY - val;

            if (idx === 0) ctx.moveTo(xCoord, yCoord);
            else ctx.lineTo(xCoord, yCoord);
          });
          ctx.stroke();
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const resetPeak = () => {
    setPeakG(1.0);
    recordedSamplesRef.current = [];
    triggerHaptic(20);
  };

  const handleExportCSV = () => {
    const samples = recordedSamplesRef.current;
    if (samples.length === 0) return;
    const csv = formatKlipperCSV(samples);
    shareFileOrText('Sejsmograf Rejestracja', 'Wstrząsy i przyspieszenia', csv, `seismograph_${Date.now()}.csv`);
  };

  const handleSaveToLog = () => {
    const samples = recordedSamplesRef.current;
    if (samples.length === 0) return;
    const csv = formatKlipperCSV(samples);
    saveLogSession({
      id: `seismo_${Date.now()}`,
      title: `Sejsmograf (Pik ${peakG.toFixed(2)} g)`,
      type: 'seismograph',
      createdAt: Date.now(),
      summary: `Maksymalne przeciążenie: ${peakG.toFixed(2)} g, Próbki: ${samples.length}`,
      csvData: csv,
      sampleCount: samples.length,
    });
    setSavedCount((c) => c + 1);
    triggerHaptic([20, 20]);
    onSessionSaved();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Sejsmograf & Rejestrator Wstrząsów
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ciągła taśma sejsmograficzna, pomiar siły $g$, wykrywanie uderzeń w stół i rezonansów konstrukcji.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`text-xs px-3 py-2 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isRunning
                  ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                  : 'bg-emerald-600 text-white shadow-sm'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pauza' : 'Wznów'}</span>
            </button>

            <button
              onClick={resetPeak}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-2 rounded-lg cursor-pointer"
              title="Zeruj pik maksymalny"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Siła chwilowa</div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">{currentG.toFixed(2)} <span className="text-sm font-normal text-slate-500">g</span></div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Maksymalny pik</div>
          <div className="text-2xl font-black font-mono text-amber-400 mt-0.5">{peakG.toFixed(2)} <span className="text-sm font-normal text-slate-500">g</span></div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Próg alarmowy</div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-2xl font-black font-mono text-slate-200">{alarmThreshold.toFixed(1)} <span className="text-sm font-normal text-slate-500">g</span></span>
            <button
              onClick={() => setAlarmEnabled(!alarmEnabled)}
              className={`p-1.5 rounded-md cursor-pointer ${
                alarmEnabled ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 bg-slate-800'
              }`}
            >
              {alarmEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400">Stan sejsmiczny</div>
          <div className="text-sm font-bold mt-1.5">
            {currentG < 1.15 ? (
              <span className="text-emerald-400 flex items-center gap-1.5">● Spokój (Brak wstrząsów)</span>
            ) : currentG < 1.6 ? (
              <span className="text-sky-400 flex items-center gap-1.5">● Drgania robocze</span>
            ) : (
              <span className="text-red-400 animate-pulse flex items-center gap-1.5">▲ Silny wstrząs / Uderzenie!</span>
            )}
          </div>
        </div>
      </div>

      {/* Seismograph Tape Canvas */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Wypadkowa siły (g)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Oś X
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Oś Y
            </span>
          </div>

          {alarmTriggered && (
            <div className="flex items-center gap-1 text-red-400 font-bold animate-bounce">
              <AlertOctagon className="w-4 h-4" />
              <span>PRZEKROCZONO PRÓG!</span>
            </div>
          )}
        </div>

        <div className="relative rounded-lg overflow-hidden border border-slate-800 aspect-[16/8] sm:aspect-[21/9]">
          <canvas ref={canvasRef} width={760} height={300} className="w-full h-full block" />
        </div>

        {/* Alarm Threshold Slider & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-xs text-slate-400 whitespace-nowrap">Czułość alarmu:</span>
            <input
              type="range"
              min={1.2}
              max={3.5}
              step={0.1}
              value={alarmThreshold}
              onChange={(e) => setAlarmThreshold(Number(e.target.value))}
              className="w-36 accent-amber-500 cursor-pointer"
            />
            <span className="font-mono text-xs text-slate-300 font-bold">{alarmThreshold.toFixed(1)} g</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Eksport CSV</span>
            </button>

            <button
              onClick={handleSaveToLog}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zapisz w Logach</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
