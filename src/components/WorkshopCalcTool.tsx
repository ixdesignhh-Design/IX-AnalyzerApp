import React, { useState } from 'react';
import { Calculator, Zap, Cpu, Wrench } from 'lucide-react';

export const WorkshopCalcTool: React.FC = () => {
  const [calcTab, setCalcTab] = useState<'esteps' | 'threads' | 'ohm'>('esteps');

  // E-Steps state
  const [currentRotDist, setCurrentRotDist] = useState<number>(22.678); // typical BMG / Stealthburner
  const [requestedMm, setRequestedMm] = useState<number>(100);
  const [measuredMm, setMeasuredMm] = useState<number>(96.5);

  // Ohm state
  const [voltage, setVoltage] = useState<number>(24);
  const [wattage, setWattage] = useState<number>(50); // 50W heater cartridge

  // E-steps formula for Klipper rotation_distance
  // new_rotation_distance = <previous_rotation_distance> * <actual_extrude_distance> / <initial_mark_distance>
  const newRotDist = Math.round((currentRotDist * (measuredMm / requestedMm)) * 1000) / 1000;

  // Ohm's law
  const currentAmps = Math.round((wattage / voltage) * 100) / 100;
  const resistanceOhms = Math.round(((voltage * voltage) / wattage) * 10) / 10;

  const tapDrillTable = [
    { thread: 'M2', pitch: 0.4, tapDrill: '1.6 mm', heatSetHole: '3.2 mm', heatSetDepth: '4.0 mm' },
    { thread: 'M2.5', pitch: 0.45, tapDrill: '2.05 mm', heatSetHole: '3.6 mm', heatSetDepth: '5.0 mm' },
    { thread: 'M3', pitch: 0.5, tapDrill: '2.5 mm', heatSetHole: '4.0 mm (Voron standard)', heatSetDepth: '5.7 mm' },
    { thread: 'M4', pitch: 0.7, tapDrill: '3.3 mm', heatSetHole: '5.6 mm', heatSetDepth: '8.0 mm' },
    { thread: 'M5', pitch: 0.8, tapDrill: '4.2 mm', heatSetHole: '6.4 mm', heatSetDepth: '9.5 mm' },
    { thread: 'M6', pitch: 1.0, tapDrill: '5.0 mm', heatSetHole: '8.0 mm', heatSetDepth: '12.0 mm' },
    { thread: 'M8', pitch: 1.25, tapDrill: '6.8 mm', heatSetHole: '10.2 mm', heatSetDepth: '15.0 mm' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            Kalkulator Warsztatowy (Druk 3D, Gwinty, Ohm)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Precyzyjne przeliczniki: ekstruzja Klipper, wkładki gwintowane heat-set oraz zasilanie grzałek.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setCalcTab('esteps')}
            className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
              calcTab === 'esteps' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Klipper E-Steps
          </button>
          <button
            onClick={() => setCalcTab('threads')}
            className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
              calcTab === 'threads' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Wiertła & Wkładki
          </button>
          <button
            onClick={() => setCalcTab('ohm')}
            className={`px-3 py-1 rounded text-xs font-semibold cursor-pointer ${
              calcTab === 'ohm' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Prawo Ohma (Grzałki)
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {calcTab === 'esteps' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-200">Kalibracja ekstrudera (Klipper rotation_distance)</h3>
            <p className="text-xs text-slate-400">
              Zaznacz 120 mm na filamencie, wytłocz 100 mm poleceniem G1 E100 F60 i zmierz ile filamentu rzeczywiście pobrał ekstruder.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Aktualne rotation_distance:</label>
              <input
                type="number"
                step="0.001"
                value={currentRotDist}
                onChange={(e) => setCurrentRotDist(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Żądana długość ekstruzji:</label>
              <div className="relative">
                <input
                  type="number"
                  value={requestedMm}
                  onChange={(e) => setRequestedMm(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">mm</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Rzeczywiście pobrano filamentu:</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={measuredMm}
                  onChange={(e) => setMeasuredMm(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500">mm</span>
              </div>
            </div>
          </div>

          {/* Result card */}
          <div className="bg-slate-950 border border-amber-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Nowa wartość do wpisania w printer.cfg:</div>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                rotation_distance: {newRotDist}
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`rotation_distance: ${newRotDist}`);
                alert('Skopiowano do schowka!');
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
            >
              Kopiuj wpis
            </button>
          </div>
        </div>
      )}

      {calcTab === 'threads' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
          <div className="text-xs font-bold text-slate-300">
            Tabela wierteł pod gwinty metryczne oraz otworów pod wkładki mosiężne (Heat-Set Voron):
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Gwint</th>
                  <th className="pb-2">Skok</th>
                  <th className="pb-2 text-sky-400">Wiertło pod gwintownik</th>
                  <th className="pb-2 text-amber-400">Otwór pod wkładkę 3D</th>
                  <th className="pb-2">Min. głębokość</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
                {tapDrillTable.map((t) => (
                  <tr key={t.thread} className="hover:bg-slate-800/40">
                    <td className="py-2.5 font-bold text-slate-100">{t.thread}</td>
                    <td className="py-2.5 text-slate-400">{t.pitch} mm</td>
                    <td className="py-2.5 text-sky-300 font-bold">{t.tapDrill}</td>
                    <td className="py-2.5 text-amber-300 font-bold">{t.heatSetHole}</td>
                    <td className="py-2.5 text-slate-400">{t.heatSetDepth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {calcTab === 'ohm' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-200">Prawo Ohma & Dobór przewodów grzałki (Hotend / Stół)</h3>
            <p className="text-xs text-slate-400">
              Oblicz pobór prądu w amperach, wymaganą grubość przewodów i rezystancję grzałki do diagnostyki multimetrem.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Napięcie zasilacza (V):</label>
              <select
                value={voltage}
                onChange={(e) => setVoltage(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
              >
                <option value={12}>12 V (Starsze drukarki)</option>
                <option value={24}>24 V (Standard Klipper/Voron)</option>
                <option value={48}>48 V (High-speed)</option>
                <option value={230}>230 V (Stół AC Keenovo)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Moc grzałki (W):</label>
              <input
                type="number"
                value={wattage}
                onChange={(e) => setWattage(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Prąd (I)</div>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">{currentAmps} A</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Rezystancja (R)</div>
              <div className="text-2xl font-black font-mono text-sky-400 mt-1">{resistanceOhms} Ω</div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <div className="text-[10px] uppercase font-bold text-slate-400">Zalecany przewód</div>
              <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                {currentAmps < 3 ? 'AWG 22 (0.35 mm²)' : currentAmps < 6 ? 'AWG 20 (0.5 mm²)' : 'AWG 16 (1.5 mm²)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
