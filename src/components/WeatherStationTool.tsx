import React, { useState, useEffect } from 'react';
import {
  CloudSun,
  Droplets,
  Thermometer,
  Wind,
  Compass,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Flame,
} from 'lucide-react';
import { triggerHaptic } from '../utils/sensors';

interface WeatherData {
  temp: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  condition: string;
  dewPoint: number;
  locationName: string;
}

export const WeatherStationTool: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherData>({
    temp: 21.5,
    humidity: 45,
    pressure: 1014.2,
    windSpeed: 12,
    windDirection: 210,
    condition: 'Częściowo słonecznie',
    dewPoint: 9.2,
    locationName: 'Lokalny Warsztat',
  });
  const [manualTemp, setManualTemp] = useState<number>(22);
  const [manualHumidity, setManualHumidity] = useState<number>(45);
  const [useLiveApi, setUseLiveApi] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Magnus-Tetensa formula for accurate dew point calculation
  // Td = (b * alpha) / (a - alpha)
  // where alpha = (a * T) / (b + T) + ln(RH / 100)
  // a = 17.27, b = 237.7°C
  const calculateDewPoint = (t: number, rh: number) => {
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * t) / (b + t) + Math.log(rh / 100);
    return Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
  };

  const fetchLiveWeather = async () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolokalizacja nie jest obsługiwana w tej przeglądarce.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    triggerHaptic(20);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m,weather_code`;
          const res = await fetch(url);
          const data = await res.json();

          if (data.current) {
            const cur = data.current;
            const t = cur.temperature_2m;
            const rh = cur.relative_humidity_2m;
            const p = cur.surface_pressure;
            const dp = calculateDewPoint(t, rh);

            setWeather({
              temp: t,
              humidity: rh,
              pressure: p,
              windSpeed: Math.round(cur.wind_speed_10m),
              windDirection: Math.round(cur.wind_direction_10m),
              condition: 'Aktualne dane stacji',
              dewPoint: dp,
              locationName: `Współrzędne: ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
            });
            setManualTemp(t);
            setManualHumidity(rh);
            setUseLiveApi(true);
          }
        } catch (e) {
          setErrorMsg('Błąd podczas pobierania danych meteorologicznych.');
        } finally {
          setLoading(false);
        }
      },
      () => {
        setErrorMsg('Brak zgody na lokalizację GPS. Użyj ręcznych nastaw.');
        setLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const activeTemp = useLiveApi ? weather.temp : manualTemp;
  const activeHumidity = useLiveApi ? weather.humidity : manualHumidity;
  const activeDewPoint = calculateDewPoint(activeTemp, activeHumidity);

  // Filament hygrometry safety check
  const getFilamentAdvice = (rh: number) => {
    if (rh <= 20) {
      return {
        status: 'ideal',
        label: 'IDEALNE WARUNKI (Sucho)',
        desc: 'Można bezpiecznie drukować nawet trudne materiały: Nylon (PA), TPU, PETG, ASA bez natychmiastowego suszenia.',
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
      };
    } else if (rh <= 40) {
      return {
        status: 'good',
        label: 'DOBRE DLA PLA / PETG',
        desc: 'PLA i PETG zachowują właściwości. Nylon, PVA i elastyczne TPU zalecane z zamkniętego dry-boxa.',
        color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
      };
    } else if (rh <= 55) {
      return {
        status: 'warning',
        label: 'UMIARKOWANA WILGOĆ (Uwaga na PETG/TPU)',
        desc: 'PETG i TPU mogą zacząć "strzelać" i tworzyć nitkowanie (stringing). Zalecane użycie suszarki do filamentu.',
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
      };
    } else {
      return {
        status: 'danger',
        label: 'KRYTYCZNA WILGOTNOŚĆ (>55% RH)',
        desc: 'Wysokie ryzyko nieudanego wydruku, pęcherzyków pary w dyszy, osłabienia warstw. Obowiązkowe suszenie filamentu w 50–70°C!',
        color: 'text-red-400 border-red-500/30 bg-red-500/10',
      };
    }
  };

  const advice = getFilamentAdvice(activeHumidity);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-amber-400" />
            Stacja Meteo & Higrometr Warsztatowy (Punkt Rosy)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Analiza wilgotności powietrza dla druku 3D, kalkulator punktu rosy (kondensacja na ramie/szkle) oraz dane pogodowe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLiveWeather}
            disabled={loading}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold px-3 py-2 rounded-lg transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Pobieranie GPS...' : 'Pobierz Pogodę GPS'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Temperature */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-bold">
            <Thermometer className="w-4 h-4 text-rose-400" />
            Temperatura Otoczenia
          </div>
          <div className="text-4xl font-black font-mono text-slate-100 mt-1">
            {activeTemp.toFixed(1)}°C
          </div>
          <div className="text-[11px] text-slate-500">
            {((activeTemp * 9) / 5 + 32).toFixed(1)}°F
          </div>
        </div>

        {/* Humidity */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-bold">
            <Droplets className="w-4 h-4 text-sky-400" />
            Wilgotność Względna
          </div>
          <div className="text-4xl font-black font-mono text-sky-400 mt-1">
            {activeHumidity.toFixed(0)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Higrometr warsztatowy RH
          </div>
        </div>

        {/* Dew Point */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 uppercase font-bold">
            <Flame className="w-4 h-4 text-amber-400" />
            Punkt Rosy (Dew Point)
          </div>
          <div className="text-4xl font-black font-mono text-amber-400 mt-1">
            {activeDewPoint.toFixed(1)}°C
          </div>
          <div className="text-[11px] text-slate-500">
            Kondensacja pary wodnej
          </div>
        </div>
      </div>

      {/* 3D Printing Filament Moisture Recommendation */}
      <div className={`border rounded-xl p-5 shadow-sm space-y-2.5 ${advice.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>DIAGNOSTYKA DLA DRUKARKI 3D: {advice.label}</span>
          </div>
          <span className="text-xs font-mono font-bold">{activeHumidity}% RH</span>
        </div>
        <p className="text-xs leading-relaxed opacity-90">
          {advice.desc}
        </p>
      </div>

      {/* Manual Workshop Environment Adjuster */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
          <span>Ręczna symulacja / kalibracja warunków w warsztacie:</span>
          {useLiveApi && (
            <button
              onClick={() => setUseLiveApi(false)}
              className="text-amber-400 hover:underline cursor-pointer"
            >
              Przejdź na tryb manualny
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Temperatura w pokoju/komorze:</span>
              <span className="font-mono text-slate-200 font-bold">{manualTemp}°C</span>
            </div>
            <input
              type="range"
              min={10}
              max={45}
              step={0.5}
              value={manualTemp}
              onChange={(e) => {
                setManualTemp(Number(e.target.value));
                setUseLiveApi(false);
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Wilgotność względna (RH):</span>
              <span className="font-mono text-slate-200 font-bold">{manualHumidity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={95}
              step={1}
              value={manualHumidity}
              onChange={(e) => {
                setManualHumidity(Number(e.target.value));
                setUseLiveApi(false);
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
