import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Bell,
  Clock,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

export const StopwatchTimerTool: React.FC = () => {
  const [tab, setTab] = useState<'stopwatch' | 'timer'>('stopwatch');

  // Stopwatch state
  const [swTimeMs, setSwTimeMs] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);

  // Timer state
  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTotalRemaining, setTimerTotalRemaining] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerAlarmTriggered, setTimerAlarmTriggered] = useState(false);

  const swIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Stopwatch loop
  useEffect(() => {
    if (swRunning) {
      const start = Date.now() - swTimeMs;
      swIntervalRef.current = setInterval(() => {
        setSwTimeMs(Date.now() - start);
      }, 10);
    } else {
      clearInterval(swIntervalRef.current);
    }
    return () => clearInterval(swIntervalRef.current);
  }, [swRunning]);

  // Timer loop
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerTotalRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current);
            setTimerRunning(false);
            setTimerAlarmTriggered(true);
            playAlarmSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerIntervalRef.current);
    }
    return () => clearInterval(timerIntervalRef.current);
  }, [timerRunning]);

  const playAlarmSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {}
  };

  const formatMs = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  const formatSeconds = (totalSec: number) => {
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const addLap = () => {
    setLaps((prev) => [swTimeMs, ...prev]);
    triggerHaptic(20);
  };

  const resetSw = () => {
    setSwRunning(false);
    setSwTimeMs(0);
    setLaps([]);
    triggerHaptic(20);
  };

  const setTimerPreset = (mins: number) => {
    setTimerRunning(false);
    setTimerAlarmTriggered(false);
    setTimerTotalRemaining(mins * 60);
    triggerHaptic(15);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Timer className="w-5 h-5 text-cyan-400" />
            Stoper & Minutnik Warsztatowy
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Precyzyjne odliczanie czasu, pomiar interwałów (laps) do ułamków sekund oraz minutnik z alarmem.
          </p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setTab('stopwatch')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              tab === 'stopwatch' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stoper (Laps)
          </button>
          <button
            onClick={() => setTab('timer')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              tab === 'timer' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Minutnik (Alarm)
          </button>
        </div>
      </div>

      {/* Stopwatch Tab */}
      {tab === 'stopwatch' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center space-y-6">
            <div className="text-6xl sm:text-8xl font-black font-mono tracking-tight text-cyan-400">
              {formatMs(swTimeMs)}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={resetSw}
                className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                title="Reset"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              <button
                onClick={() => {
                  setSwRunning(!swRunning);
                  triggerHaptic(25);
                }}
                className={`px-8 py-4 rounded-full font-black text-sm flex items-center gap-2 shadow-xl cursor-pointer transition-all active:scale-95 ${
                  swRunning
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-500/30'
                }`}
              >
                {swRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{swRunning ? 'ZATRZYMAJ' : 'START'}</span>
              </button>

              <button
                onClick={addLap}
                disabled={!swRunning}
                className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 cursor-pointer"
                title="Okrążenie (Lap)"
              >
                <Flag className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Laps list */}
          {laps.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-bold text-slate-300 uppercase">Międzyczasy / Okrążenia ({laps.length})</div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {laps.map((lap, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-2 px-3 bg-slate-950 rounded border border-slate-800 font-mono text-xs"
                  >
                    <span className="text-slate-400">Lap #{laps.length - i}</span>
                    <span className="text-cyan-300 font-bold">{formatMs(lap)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timer Tab */}
      {tab === 'timer' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center space-y-6">
          {timerAlarmTriggered && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500 text-red-400 px-6 py-2 rounded-full font-bold animate-bounce">
              <Bell className="w-5 h-5" />
              <span>CZAS MINĄŁ!</span>
            </div>
          )}

          <div className="text-7xl sm:text-9xl font-black font-mono tracking-tight text-cyan-400">
            {formatSeconds(timerTotalRemaining)}
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap justify-center gap-2">
            {[1, 3, 5, 10, 15, 25].map((m) => (
              <button
                key={m}
                onClick={() => setTimerPreset(m)}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono rounded cursor-pointer text-slate-300"
              >
                {m} min
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setTimerRunning(false);
                setTimerAlarmTriggered(false);
                setTimerTotalRemaining(300);
              }}
              className="p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setTimerRunning(!timerRunning);
                setTimerAlarmTriggered(false);
                triggerHaptic(25);
              }}
              className={`px-8 py-4 rounded-full font-black text-sm flex items-center gap-2 shadow-xl cursor-pointer transition-all active:scale-95 ${
                timerRunning
                  ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-500/30'
              }`}
            >
              {timerRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{timerRunning ? 'PAUZA' : 'ODLICZAJ'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
