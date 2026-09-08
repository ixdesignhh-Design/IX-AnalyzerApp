import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Calculator,
  RotateCcw,
  Coins,
  Gauge,
  Thermometer,
  Ruler,
  Scale,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

type Category = 'length' | 'weight' | 'temp' | 'pressure' | 'speed' | 'currency';

export const UnitConverterTool: React.FC = () => {
  const [category, setCategory] = useState<Category>('length');
  const [inputValue, setInputValue] = useState<number>(100);
  const [fromUnit, setFromUnit] = useState<string>('cm');
  const [toUnit, setToUnit] = useState<string>('inch');

  // Conversion definitions
  const unitsMap: Record<Category, { id: string; label: string; toBase: (v: number) => number; fromBase: (v: number) => number }[]> = {
    length: [
      { id: 'mm', label: 'Milimetry (mm)', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'cm', label: 'Centymetry (cm)', toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      { id: 'm', label: 'Metry (m)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'km', label: 'Kilometry (km)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'inch', label: 'Cale (in)', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { id: 'ft', label: 'Stopy (ft)', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
    ],
    weight: [
      { id: 'g', label: 'Gramy (g)', toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { id: 'kg', label: 'Kilogramy (kg)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'lb', label: 'Funty (lb)', toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
      { id: 'oz', label: 'Uncje (oz)', toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
    ],
    temp: [
      { id: 'c', label: 'Celsjusz (°C)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'f', label: 'Fahrenheit (°F)', toBase: (v) => (v - 32) * (5 / 9), fromBase: (v) => v * (9 / 5) + 32 },
      { id: 'k', label: 'Kelvin (K)', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
    pressure: [
      { id: 'hpa', label: 'Hektopaskale (hPa / mbar)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'bar', label: 'Bary (bar)', toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { id: 'psi', label: 'PSI (lb/in²)', toBase: (v) => v * 68.9476, fromBase: (v) => v / 68.9476 },
      { id: 'mmhg', label: 'mmHg (Torr)', toBase: (v) => v * 1.33322, fromBase: (v) => v / 1.33322 },
    ],
    speed: [
      { id: 'kmh', label: 'km/h', toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
      { id: 'ms', label: 'm/s', toBase: (v) => v, fromBase: (v) => v },
      { id: 'mph', label: 'mph', toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
      { id: 'knots', label: 'Węzły (kn)', toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
    ],
    currency: [
      { id: 'pln', label: 'Złoty (PLN)', toBase: (v) => v / 4.30, fromBase: (v) => v * 4.30 },
      { id: 'eur', label: 'Euro (EUR)', toBase: (v) => v, fromBase: (v) => v },
      { id: 'usd', label: 'Dolar (USD)', toBase: (v) => v * 0.92, fromBase: (v) => v / 0.92 },
      { id: 'gbp', label: 'Funt (GBP)', toBase: (v) => v * 1.17, fromBase: (v) => v / 1.17 },
      { id: 'chf', label: 'Frank (CHF)', toBase: (v) => v * 1.05, fromBase: (v) => v / 1.05 },
    ],
  };

  const currentUnits = unitsMap[category];

  const handleCategoryChange = (newCat: Category) => {
    setCategory(newCat);
    setFromUnit(unitsMap[newCat][0].id);
    setToUnit(unitsMap[newCat][1]?.id || unitsMap[newCat][0].id);
    triggerHaptic(15);
  };

  const calculateResult = () => {
    const fromDef = currentUnits.find((u) => u.id === fromUnit) || currentUnits[0];
    const toDef = currentUnits.find((u) => u.id === toUnit) || currentUnits[1];
    const base = fromDef.toBase(inputValue);
    const res = toDef.fromBase(base);
    return Math.round(res * 10000) / 10000;
  };

  const swapUnits = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
    triggerHaptic(20);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
            Przelicznik Jednostek Miar & Walut
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Konwersja długości, masy, ciśnienia, temperatury, prędkości oraz aktualnych relacji walutowych.
          </p>
        </div>
      </div>

      {/* Category selector */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { id: 'length', label: 'Długość', icon: Ruler },
          { id: 'weight', label: 'Masa', icon: Scale },
          { id: 'temp', label: 'Temp.', icon: Thermometer },
          { id: 'pressure', label: 'Ciśnienie', icon: Gauge },
          { id: 'speed', label: 'Prędkość', icon: ArrowLeftRight },
          { id: 'currency', label: 'Waluty', icon: Coins },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = category === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleCategoryChange(item.id as Category)}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Converter Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
          {/* FROM */}
          <div className="sm:col-span-2 space-y-2">
            <label className="text-xs text-slate-400 font-bold uppercase">Wartość początkowa</label>
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-2xl font-bold text-slate-100 focus:outline-none focus:border-cyan-500"
            />
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300"
            >
              {currentUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          {/* SWAP BUTTON */}
          <div className="flex justify-center">
            <button
              onClick={swapUnits}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-full border border-slate-700 cursor-pointer shadow-md transition-transform active:scale-95"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>
          </div>

          {/* TO */}
          <div className="sm:col-span-2 space-y-2">
            <label className="text-xs text-slate-400 font-bold uppercase">Wynik przeliczenia</label>
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 font-mono text-2xl font-bold text-cyan-400 truncate">
              {calculateResult()}
            </div>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300"
            >
              {currentUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
