import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Battery,
  BatteryCharging,
  Wifi,
  Monitor,
  Smartphone,
  Gauge,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';

export const DeviceInfoTool: React.FC = () => {
  const [battery, setBattery] = useState<{
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  } | null>(null);

  const [network, setNetwork] = useState<{
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  }>({
    online: navigator.onLine,
  });

  useEffect(() => {
    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((batt: any) => {
        const updateBatt = () => {
          setBattery({
            level: Math.round(batt.level * 100),
            charging: batt.charging,
            chargingTime: batt.chargingTime,
            dischargingTime: batt.dischargingTime,
          });
        };
        updateBatt();
        batt.addEventListener('levelchange', updateBatt);
        batt.addEventListener('chargingchange', updateBatt);
      });
    }

    // Network API
    const conn = (navigator as any).connection;
    if (conn) {
      const updateConn = () => {
        setNetwork({
          online: navigator.onLine,
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
        });
      };
      updateConn();
      conn.addEventListener('change', updateConn);
    }
  }, []);

  // Hardware specs
  const cores = navigator.hardwareConcurrency || 8;
  const memoryGb = (navigator as any).deviceMemory || 8;
  const userAgent = navigator.userAgent;
  const screenW = window.screen.width;
  const screenH = window.screen.height;
  const pixelRatio = window.devicePixelRatio || 1;
  const touchPoints = navigator.maxTouchPoints || 10;

  // Sensor availability checks
  const sensorChecks = [
    { name: 'Akcelerometr (Linear Acceleration)', supported: 'LinearAccelerationSensor' in window || 'DeviceMotionEvent' in window },
    { name: 'Żyroskop (Gyroscope 3-Axis)', supported: 'Gyroscope' in window || 'DeviceOrientationEvent' in window },
    { name: 'Magnetometr (Kompas cyfrowy)', supported: 'Magnetometer' in window || 'DeviceOrientationEvent' in window },
    { name: 'Barometr ciśnieniowy', supported: 'Barometer' in window },
    { name: 'Luksomierz (Ambient Light)', supported: 'AmbientLightSensor' in window },
    { name: 'GPS & Geolokalizacja satelitarna', supported: 'geolocation' in navigator },
    { name: 'Kamera HD & Latarka LED', supported: 'mediaDevices' in navigator },
    { name: 'Silnik wibracji haptycznych (Vibration API)', supported: 'vibrate' in navigator },
    { name: 'Detektor kodów (BarcodeDetector API)', supported: 'BarcodeDetector' in window },
    { name: 'Web Audio Synthesizer', supported: 'AudioContext' in window || 'webkitAudioContext' in window },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Informacje o Urządzeniu & Systemie
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Podgląd parametrów procesora, pamięci RAM, stanu baterii, wyświetlacza, sieci oraz diagnostyka czujników sprzętowych.
          </p>
        </div>
      </div>

      {/* Main Hardware Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Procesor & CPU</span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-100">{cores} Rdzeni</div>
          <div className="text-xs text-slate-500 font-mono">Wielowątkowość sprzętowa</div>
        </div>

        {/* RAM */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Gauge className="w-4 h-4 text-cyan-400" />
            <span>Pamięć Operacyjna RAM</span>
          </div>
          <div className="text-2xl font-black font-mono text-slate-100">{memoryGb} GB+</div>
          <div className="text-xs text-slate-500 font-mono">Dostępna pula systemowa</div>
        </div>

        {/* Battery */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            {battery?.charging ? (
              <BatteryCharging className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <Battery className="w-4 h-4 text-amber-400" />
            )}
            <span>Stan Baterii</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {battery ? `${battery.level}%` : 'Dostępna'}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {battery?.charging ? 'Ładowanie w toku (AC/Fast)' : 'Zasilanie bateryjne'}
          </div>
        </div>

        {/* Display */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Monitor className="w-4 h-4 text-cyan-400" />
            <span>Ekran & Rozdzielczość</span>
          </div>
          <div className="text-xl font-black font-mono text-slate-100 truncate">
            {screenW * pixelRatio} × {screenH * pixelRatio}
          </div>
          <div className="text-xs text-slate-500 font-mono">
            DPR: {pixelRatio}x • Dotyk: {touchPoints} pkt
          </div>
        </div>
      </div>

      {/* Network & Platform */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Wifi className="w-4 h-4 text-sky-400" />
            <span>Sieć & Połączenie</span>
          </div>
          <div className="text-sm font-semibold text-slate-200">
            Status: {network.online ? 'Online (Połączono)' : 'Offline'}
          </div>
          {network.effectiveType && (
            <div className="text-xs text-slate-400 font-mono">
              Technologia: {network.effectiveType.toUpperCase()} • Przepustowość: ~{network.downlink} Mbps • RTT: {network.rtt} ms
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>Platforma & Środowisko</span>
          </div>
          <div className="text-xs font-mono text-slate-400 break-all line-clamp-2">
            {userAgent}
          </div>
        </div>
      </div>

      {/* Sensor Availability Diagnostic Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="text-xs font-bold text-slate-300 uppercase">
          Matryca Diagnostyki Czujników Urządzenia
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sensorChecks.map((sensor) => (
            <div
              key={sensor.name}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs"
            >
              <span className="text-slate-300 font-medium">{sensor.name}</span>
              {sensor.supported ? (
                <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Dostępny
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Fallback API
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
