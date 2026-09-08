import React from 'react';
import { Activity, Wrench, Wifi, WifiOff, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { KlipperPrinterState } from '../types';

interface HeaderProps {
  klipperState: KlipperPrinterState;
  onOpenKlipper: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenLogs: () => void;
  savedLogsCount: number;
  onOpenRadialHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  klipperState,
  onOpenKlipper,
  soundEnabled,
  onToggleSound,
  onOpenLogs,
  savedLogsCount,
  onOpenRadialHub,
}) => {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand */}
        <button
          onClick={onOpenRadialHub}
          className="flex items-center gap-2.5 text-left group cursor-pointer transition-transform active:scale-95"
          title="Kliknij, aby otworzyć interfejs kołowy / gwiazdowy"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm group-hover:border-amber-400 group-hover:bg-amber-500/20 transition-colors">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              Workshop MultiTool
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded border border-slate-700">
                S23 Ultra Sensor Suite
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Input Shaper 3D • Klipper • Pomiary • Sensory warsztatowe
            </p>
          </div>
        </button>

        {/* Action badges */}
        <div className="flex items-center gap-2">
          {/* Klipper status pill */}
          <button
            onClick={onOpenKlipper}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
              klipperState.connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Klipper Moonraker status"
          >
            {klipperState.connected ? (
              <>
                <Wifi className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                <span className="font-medium hidden xs:inline">Klipper: Połączono</span>
                <span className="font-medium xs:hidden">Klipper</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-medium hidden xs:inline">Klipper: Rozłączony</span>
                <span className="font-medium xs:hidden">Klipper</span>
              </>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
            title={soundEnabled ? 'Dźwięk włączony' : 'Wyciszono'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Saved Logs count button */}
          <button
            onClick={onOpenLogs}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            title="Zarządzaj zapisanymi logami pomiarów"
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Logi:</span>
            <span className="font-semibold px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-[11px]">
              {savedLogsCount}
            </span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors hidden sm:block cursor-pointer"
            title="Pełny ekran"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
