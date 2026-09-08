import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { KlipperPrinterState } from '../types';

interface HeaderProps {
  klipperState: KlipperPrinterState;
  onOpenKlipper: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenLogs: () => void;
  savedLogsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  klipperState,
  onOpenKlipper,
  soundEnabled,
  onToggleSound,
  onOpenLogs,
  savedLogsCount,
}) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="retro-chassis border-b border-[#b6b0a3] px-3 sm:px-4 py-2 sticky top-0 z-30 shadow-md">
      {/* Top Apple OS X Window Titlebar Strip */}
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#c8c2b5]/70 text-[11px] font-mono text-[#57534e]">
        {/* OS X Jelly Traffic Lights */}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full os-x-traffic-red inline-block cursor-pointer shadow-sm" title="Zamknij sesję" />
          <span className="w-3 h-3 rounded-full os-x-traffic-yellow inline-block cursor-pointer shadow-sm" title="Zminimalizuj do paska" />
          <span className="w-3 h-3 rounded-full os-x-traffic-green inline-block cursor-pointer shadow-sm" title="Maksymalizuj okno" onClick={toggleFullscreen} />
          <span className="ml-2 font-bold tracking-wider text-[#3d3a35] hidden sm:inline">
            iX AI SOFTWARE • WORKSTATION ENVIRONMENT
          </span>
        </div>

        {/* System telemetry clock and status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#ceca21]/10 px-2 py-0.5 rounded border border-[#b8b2a5]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] animate-pulse" />
            <span className="font-semibold text-emerald-800 text-[10px] uppercase tracking-wide">BUS: READY</span>
          </div>
          <span className="font-bold text-[#44403c] hidden xs:inline">{timeStr}</span>
        </div>
      </div>

      {/* Main Workstation Header Content */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        {/* Branding & App Title */}
        <div className="flex items-center gap-3">
          {/* Retro PC Beveled Badge */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f2eee7] to-[#cdc6b9] border-2 border-[#9e978a] shadow-[inset_0_1px_0_#fff,0_2px_4px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#1e293b] shrink-0">
            <span className="font-black text-lg tracking-tighter text-[#0284c7] font-mono">iX</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-[#0284c7] uppercase">
                iX Ai Software
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#ded8cd] text-[#44403c] border border-[#beb8ab] font-bold">
                v4.8 OS X Edition
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1c1917] tracking-tight flex items-center gap-2 leading-none mt-0.5">
              IX Analyzer
              <span className="text-xs font-mono font-medium text-[#78716c] hidden md:inline">
                • Hardware Sensor & Workshop Telemetry
              </span>
            </h1>
          </div>
        </div>

        {/* Action Controls & Klipper Pill */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Klipper status button */}
          <button
            onClick={onOpenKlipper}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-semibold shadow-sm ${
              klipperState.connected
                ? 'bg-emerald-100/80 border-emerald-500/50 text-emerald-900 hover:bg-emerald-200'
                : 'aqua-button text-slate-700'
            }`}
            title="Klipper Moonraker status"
          >
            {klipperState.connected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span>Klipper: Połączono</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden xs:inline">Klipper: Gotowy</span>
                <span className="xs:hidden">Klipper</span>
              </>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="aqua-button p-2 rounded-lg cursor-pointer transition-colors"
            title={soundEnabled ? 'Dźwięk aktywny' : 'Wyciszono'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#0284c7]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Saved Logs count button */}
          <button
            onClick={onOpenLogs}
            className="aqua-button flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer"
            title="Dziennik sesji i logi CSV"
          >
            <Activity className="w-3.5 h-3.5 text-[#0284c7]" />
            <span className="hidden sm:inline">Logi:</span>
            <span className="font-bold font-mono px-1.5 py-0.2 rounded-full bg-[#0284c7]/20 text-[#0369a1] text-[11px]">
              {savedLogsCount}
            </span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="aqua-button p-2 rounded-lg text-slate-700 hover:text-slate-900 transition-colors hidden sm:block cursor-pointer"
            title="Pełny ekran"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
