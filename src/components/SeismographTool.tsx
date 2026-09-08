import React, { useState, useEffect, useRef } from 'react';
import { Layers, Play, Pause, RotateCcw, AlertOctagon, Download, Save, Bell, BellOff, Sparkles } from 'lucide-react';
import { MotionSample } from '../types';
import { requestMotionPermission, triggerHaptic } from '../utils/sensors';
import { formatKlipperCSV, saveLogSession, shareFileOrText } from '../utils/export';

interface SeismographToolProps {
  onSessionSaved: () => void;
  soundEnabled: boolean;
}

export const SeismographTool: React.FC<SeismographToolProps> = ({ onSessionSaved, soundEnabled }) => {
  const [isRunning, setIsRunning] = useState(true);
  const [alarmThreshold, setAlarmThreshold] = useState<number>(1.8);
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [peakG, setPeakG] = useState<number>(1.0);
  const [currentG, setCurrentG] = useState<number>(1.0);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataPointsRef = useRef<{ time: number; x: number; y: number; z: number; mag: number }[]>([]);
  const recordedSamplesRef = useRef<MotionSample[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const alarmCooldownRef = useRef<number>(0);

  useEffect(() => {
    requestMotionPermission();

    const handleMotion = (e: DeviceMotionEvent) => {
      if (!isRunning || simulationActive) return;

      const acc = e.accelerationIncludingGravity || e.acceleration;
      if (!acc) return;

      const x = acc.x || 0;
      const y = acc.y || 0;
      const z = acc.z || 0;
      const mag = Math.sqrt(x * x + y * y + z * z) / 9.81;

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
  }, [isRunning, alarmEnabled, alarmThreshold, simulationActive]);

  // Desktop PC simulation loop
  useEffect(() => {
    if (!simulationActive || !isRunning) return;
    let t = 0;
    const interval = setInterval(() => {
      t += 0.05;
      const x = Math.sin(t * 12) * 1.5 + (Math.random() - 0.5) * 0.4;
      const y = Math.cos(t * 8) * 1.2 + (Math.random() - 0.5) * 0.4;
      const z = 9.81 + Math.sin(t * 4) * 0.8;
      const mag = Math.sqrt(x * x + y * y + z * z) / 9.81;

      const now = performance.now();
      dataPointsRef.current.push({ time: now, x, y, z, mag });
      if (dataPointsRef.current.length > 500) {
        dataPointsRef.current.shift();
      }

      setCurrentG(Math.round(mag * 100) / 100);
      setPeakG((prev) => Math.max(prev, Math.round(mag * 100) / 100));
    }, 40);

    return () => clearInterval(interval);
  }, [simulationActive, isRunning]);

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

      // CRT phosphor dark background
      ctx.fillStyle = '#060a0f';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = '#152232';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Baseline (1g)
      const centerY = height * 0.55;
      ctx.strokeStyle = '#1e3a5f';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw channel lines
      const data = dataPointsRef.current;
      if (data.length > 2) {
        const channels: { key: 'x' | 'y' | 'z' | 'mag'; color: string; scale: number; width: number }[] = [
          { key: 'x', color: 'rgba(56, 189, 248, 0.5)', scale: 5, width: 1 },
          { key: 'y', color: 'rgba(245, 158, 11, 0.5)', scale: 5, width: 1 },
          { key: 'mag', color: '#10b981', scale: 45, width: 2.5 },
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
    triggerHaptic([20, 20]);
    onSessionSaved();
  };

  return (
    <div className="space-y-4">
      {/* Retro OS X Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0284c7]" />
            Sejsmograf & Rejestrator Wstrząsów (Oscyloskop G)
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Ciągła taśma sejsmiczna, monitorowanie uderzeń w stół drukarki 3D, rezonanse konstrukcji i eksport do analizy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSimulationActive(!simulationActive)}
            className="aqua-button text-xs px-2.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5"
            title="Włącz symulację wstrząsów dla PC"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0284c7]" />
            <span>{simulationActive ? 'Wyłącz test' : 'Test PC'}</span>
          </button>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`aqua-button text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer ${
              isRunning ? '' : 'aqua-button-primary'
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-[#0284c7]" />}
            <span>{isRunning ? 'Pauza' : 'Wznów'}</span>
          </button>

          <button
            onClick={resetPeak}
            className="aqua-button p-2 rounded-lg cursor-pointer"
            title="Zeruj pik maksymalny"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="retro-screen-crt p-3 rounded-xl">
          <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Siła chwilowa</div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
            {currentG.toFixed(2)} <span className="text-xs font-normal text-[#64748b]">g</span>
          </div>
        </div>

        <div className="retro-screen-crt p-3 rounded-xl">
          <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Maksymalny pik</div>
          <div className="text-2xl font-black font-mono text-amber-400 mt-0.5">
            {peakG.toFixed(2)} <span className="text-xs font-normal text-[#64748b]">g</span>
          </div>
        </div>

        <div className="retro-screen-crt p-3 rounded-xl">
          <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Próg alarmowy</div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-2xl font-black font-mono text-[#cbd5e1]">
              {alarmThreshold.toFixed(1)} <span className="text-xs font-normal text-[#64748b]">g</span>
            </span>
            <button
              onClick={() => setAlarmEnabled(!alarmEnabled)}
              className="p-1 rounded cursor-pointer"
            >
              {alarmEnabled ? <Bell className="w-4 h-4 text-amber-400" /> : <BellOff className="w-4 h-4 text-[#64748b]" />}
            </button>
          </div>
        </div>

        <div className="retro-screen-crt p-3 rounded-xl">
          <div className="text-[10px] uppercase font-mono font-bold text-[#94a3b8]">Stan sejsmiczny</div>
          <div className="text-xs font-mono font-bold mt-1.5">
            {currentG < 1.15 ? (
              <span className="text-emerald-400">● Spokój</span>
            ) : currentG < 1.6 ? (
              <span className="text-[#38bdf8]">● Drgania pracy</span>
            ) : (
              <span className="text-red-400 animate-pulse">▲ Silny wstrząs!</span>
            )}
          </div>
        </div>
      </div>

      {/* Seismograph Tape Canvas inside CRT frame */}
      <div className="retro-screen-crt rounded-2xl p-4 shadow-2xl space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Wypadkowa (g)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]"></span> Oś X
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

        <div className="relative rounded-xl overflow-hidden border-2 border-[#1e293b] aspect-[16/8] sm:aspect-[21/9]">
          <canvas ref={canvasRef} width={760} height={300} className="w-full h-full block" />
        </div>

        {/* Alarm Threshold Slider & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-3 w-full sm:w-auto font-mono text-xs text-[#94a3b8]">
            <span className="whitespace-nowrap">Czułość alarmu:</span>
            <input
              type="range"
              min={1.2}
              max={3.5}
              step={0.1}
              value={alarmThreshold}
              onChange={(e) => setAlarmThreshold(Number(e.target.value))}
              className="w-36 accent-[#0284c7] cursor-pointer"
            />
            <span className="text-emerald-400 font-bold">{alarmThreshold.toFixed(1)} g</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="aqua-button flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#0284c7]" />
              <span>Eksport CSV</span>
            </button>

            <button
              onClick={handleSaveToLog}
              className="aqua-button flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-emerald-500" />
              <span>Zapisz w Logach</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
