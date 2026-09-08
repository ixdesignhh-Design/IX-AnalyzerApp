import React, { useState, useEffect } from 'react';
import {
  Server,
  Wifi,
  WifiOff,
  Flame,
  Home,
  AlertTriangle,
  Play,
  Send,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { KlipperPrinterState } from '../types';
import { fetchPrinterStatus, sendKlipperGcode, emergencyStopKlipper } from '../utils/klipper';
import { triggerHaptic } from '../utils/sensors';

interface KlipperPanelProps {
  host: string;
  onHostChange: (newHost: string) => void;
  klipperState: KlipperPrinterState;
  onStateUpdate: (state: KlipperPrinterState) => void;
}

export const KlipperPanel: React.FC<KlipperPanelProps> = ({
  host,
  onHostChange,
  klipperState,
  onStateUpdate,
}) => {
  const [inputHost, setInputHost] = useState(host);
  const [customGcode, setCustomGcode] = useState('');
  const [terminalLogs, setTerminalLogs] = useState<{ time: string; text: string; isError?: boolean }[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Poll printer status if connected or trying to connect
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const poll = async () => {
      const status = await fetchPrinterStatus(host);
      onStateUpdate(status);
    };

    poll();
    timer = setInterval(poll, 3000);

    return () => clearInterval(timer);
  }, [host, onStateUpdate]);

  const handleConnect = async (targetHost = inputHost) => {
    onHostChange(targetHost);
    triggerHaptic(20);
    const status = await fetchPrinterStatus(targetHost);
    onStateUpdate(status);
  };

  const handleSendGcode = async (cmd: string) => {
    if (!cmd.trim()) return;
    setIsSending(true);
    triggerHaptic(30);

    const now = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [{ time: now, text: `> ${cmd}` }, ...prev.slice(0, 20)]);

    const res = await sendKlipperGcode(host, cmd);
    setTerminalLogs((prev) => [
      { time: new Date().toLocaleTimeString(), text: res.message, isError: !res.success },
      ...prev.slice(0, 20),
    ]);

    setIsSending(false);
  };

  const handleEmergencyStop = async () => {
    if (window.confirm('CZY NA PEWNO CHCESZ WYKONAĆ AWARYJNE ZATRZYMANIE (M112)? Silniki i grzałki zostaną natychmiast odcięte!')) {
      triggerHaptic([100, 100, 100]);
      await emergencyStopKlipper(host);
      setTerminalLogs((prev) => [
        { time: new Date().toLocaleTimeString(), text: '!!! WYKONANO AWARYJNE ZATRZYMANIE (M112) !!!', isError: true },
        ...prev,
      ]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-400" />
              Połączenie Klipper (Moonraker API)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Zarządzaj drukarką 3D, wysyłaj makra rezonansowe i odczytuj parametry w czasie rzeczywistym.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium ${
                klipperState.connected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {klipperState.connected ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4" />}
              <span>{klipperState.connected ? `Połączono: ${klipperState.state.toUpperCase()}` : 'Rozłączony'}</span>
            </span>
          </div>
        </div>

        {/* IP Input Form */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={inputHost}
              onChange={(e) => setInputHost(e.target.value)}
              placeholder="np. 192.168.1.50:7125 lub klipper.local"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            onClick={() => handleConnect(inputHost)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            Połącz z Moonraker
          </button>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span>Szybki wybór:</span>
            <button
              onClick={() => {
                setInputHost('klipper.local:7125');
                handleConnect('klipper.local:7125');
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
            >
              klipper.local
            </button>
            <button
              onClick={() => {
                setInputHost('192.168.1.100:7125');
                handleConnect('192.168.1.100:7125');
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
            >
              192.168.1.100
            </button>
          </div>
        </div>
      </div>

      {/* Realtime Printer Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Extruder Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Hotend (Dysza)
            </div>
            <div className="text-2xl font-black font-mono text-slate-100">
              {klipperState.temperatures.extruder.current.toFixed(1)}°C
            </div>
            <div className="text-[11px] text-slate-500">
              Zadana: {klipperState.temperatures.extruder.target.toFixed(0)}°C
            </div>
          </div>
          <div className="flex flex-col gap-1 text-[10px]">
            <button
              onClick={() => handleSendGcode('M104 S200')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-300 cursor-pointer"
            >
              PLA (200°C)
            </button>
            <button
              onClick={() => handleSendGcode('M104 S0')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-400 cursor-pointer"
            >
              Wyłącz (0°C)
            </button>
          </div>
        </div>

        {/* Bed Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-sky-400" />
              Grzany Stół (Bed)
            </div>
            <div className="text-2xl font-black font-mono text-slate-100">
              {klipperState.temperatures.bed.current.toFixed(1)}°C
            </div>
            <div className="text-[11px] text-slate-500">
              Zadana: {klipperState.temperatures.bed.target.toFixed(0)}°C
            </div>
          </div>
          <div className="flex flex-col gap-1 text-[10px]">
            <button
              onClick={() => handleSendGcode('M140 S60')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-300 cursor-pointer"
            >
              60°C
            </button>
            <button
              onClick={() => handleSendGcode('M140 S0')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-400 cursor-pointer"
            >
              Wyłącz (0°C)
            </button>
          </div>
        </div>

        {/* Position / Toolhead Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            Pozycja Głowicy (XYZ)
          </div>
          <div className="font-mono text-sm text-slate-200 mt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">X:</span>
              <span className="font-bold">{klipperState.toolhead.position[0]?.toFixed(1) || '0.0'} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Y:</span>
              <span className="font-bold">{klipperState.toolhead.position[1]?.toFixed(1) || '0.0'} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Z:</span>
              <span className="font-bold">{klipperState.toolhead.position[2]?.toFixed(2) || '0.00'} mm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Macros & Emergency Stop */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">Szybkie polecenia G-code:</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleSendGcode('G28')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-amber-400" />
            <span>Bazowanie (G28)</span>
          </button>

          <button
            onClick={() => handleSendGcode('BED_MESH_CALIBRATE')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 cursor-pointer"
          >
            <span>Bed Mesh Calibrate</span>
          </button>

          <button
            onClick={() => handleSendGcode('TEST_RESONANCES AXIS=X')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 cursor-pointer"
          >
            <span>Test Resonances X</span>
          </button>

          <button
            onClick={() => handleSendGcode('TEST_RESONANCES AXIS=Y')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 cursor-pointer"
          >
            <span>Test Resonances Y</span>
          </button>

          <button
            onClick={() => handleSendGcode('M84')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 cursor-pointer"
          >
            <span>Odblokuj silniki (M84)</span>
          </button>

          {/* Prominent Emergency Stop Button */}
          <button
            onClick={handleEmergencyStop}
            className="ml-auto flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs px-4 py-2 rounded-lg shadow-lg shadow-red-950/40 transition-transform active:scale-95 cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 fill-current" />
            <span>STOP AWARYJNY (M112)</span>
          </button>
        </div>
      </div>

      {/* Terminal Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
        <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span>Konsola G-Code Moonraker</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customGcode}
            onChange={(e) => setCustomGcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendGcode(customGcode);
                setCustomGcode('');
              }
            }}
            placeholder="Wpisz komendę G-code (np. G1 X100 F3000, M105)..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => {
              handleSendGcode(customGcode);
              setCustomGcode('');
            }}
            disabled={isSending}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Wyślij</span>
          </button>
        </div>

        {/* Log Window */}
        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 h-36 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-none">
          {terminalLogs.length === 0 ? (
            <div className="text-slate-600 italic">Brak wpisów w konsoli. Wpisz komendę powyżej.</div>
          ) : (
            terminalLogs.map((log, i) => (
              <div key={i} className={log.isError ? 'text-red-400' : 'text-slate-300'}>
                <span className="text-slate-600 mr-2">[{log.time}]</span>
                <span>{log.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
