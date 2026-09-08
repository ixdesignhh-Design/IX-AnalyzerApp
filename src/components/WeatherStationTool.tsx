import React, { useState } from 'react';
import {
  CloudSun,
  Droplets,
  Thermometer,
  RefreshCw,
  Flame,
  CheckCircle2,
  AlertTriangle,
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

  const calculateDewPoint = (t: number, rh: number) => {
    const a = 17.27;
    const b = 237.7;
    const alpha = (a * t) / (b + t) + Math.log(rh / 100);
    return Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
  };

  const fetchLiveWeather = async () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolokalizacja nie jest dostępna w przeglądarce.');
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
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m`;
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
              condition: 'Aktualne dane GPS',
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

  const getFilamentAdvice = (rh: number) => {
    if (rh <= 20) {
      return {
        label: 'IDEALNE WARUNKI (Sucho)',
        desc: 'Bezpieczny druk trudnych materiałów: PA (Nylon), TPU, PETG, ASA bez natychmiastowego suszenia.',
        style: 'bg-emerald-100 border-emerald-400 text-emerald-950',
      };
    } else if (rh <= 40) {
      return {
        label: 'DOBRE DLA PLA / PETG',
        desc: 'PLA i PETG zachowują właściwości. Nylon i TPU zalecane z zamkniętego dry-boxa.',
        style: 'bg-sky-100 border-sky-400 text-sky-950',
      };
    } else if (rh <= 55) {
      return {
        label: 'UMIARKOWANA WILGOĆ (Uwaga na PETG/TPU)',
        desc: 'PETG i TPU mogą zacząć strzelać i tworzyć nitkowanie (stringing). Zalecane użycie suszarki.',
        style: 'bg-amber-100 border-amber-400 text-amber-950',
      };
    } else {
      return {
        label: 'KRYTYCZNA WILGOTNOŚĆ (>55% RH)',
        desc: 'Wysokie ryzyko pęcherzyków pary w dyszy, osłabienia warstw. Obowiązkowe suszenie filamentu w 50–70°C!',
        style: 'bg-rose-100 border-rose-400 text-rose-950',
      };
    }
  };

  const advice = getFilamentAdvice(activeHumidity);

  return (
    <div className="space-y-4">
      {/* Retro OS X Header */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#1c1917] flex items-center gap-2">
            <CloudSun className="w-5 h-5 text-[#0284c7]" />
            Stacja Meteo & Higrometr Warsztatowy (Punkt Rosy)
          </h2>
          <p className="text-xs text-[#57534e] mt-0.5 font-sans">
            Analiza wilgotności otoczenia dla druku 3D, kalkulator punktu rosy (kondensacja na ramie/stole) oraz dane pogodowe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLiveWeather}
            disabled={loading}
            className="aqua-button-primary flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Pobieranie GPS...' : 'Pobierz Pogodę GPS'}</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-amber-100 border border-amber-400 text-amber-900 text-xs p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Stats Cards inside CRT */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Temperature */}
        <div className="retro-screen-crt rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase font-bold text-[#94a3b8]">
            <Thermometer className="w-4 h-4 text-rose-400" />
            Temperatura
          </div>
          <div className="text-4xl font-black font-mono text-emerald-400 mt-1">
            {activeTemp.toFixed(1)}°C
          </div>
          <div className="text-[11px] font-mono text-[#64748b]">
            {((activeTemp * 9) / 5 + 32).toFixed(1)}°F
          </div>
        </div>

        {/* Humidity */}
        <div className="retro-screen-crt rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase font-bold text-[#94a3b8]">
            <Droplets className="w-4 h-4 text-[#38bdf8]" />
            Wilgotność (RH)
          </div>
          <div className="text-4xl font-black font-mono text-[#38bdf8] mt-1">
            {activeHumidity.toFixed(0)}%
          </div>
          <div className="text-[11px] font-mono text-[#64748b]">
            Higrometr otoczenia
          </div>
        </div>

        {/* Dew Point */}
        <div className="retro-screen-crt rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase font-bold text-[#94a3b8]">
            <Flame className="w-4 h-4 text-amber-400" />
            Punkt Rosy
          </div>
          <div className="text-4xl font-black font-mono text-amber-400 mt-1">
            {activeDewPoint.toFixed(1)}°C
          </div>
          <div className="text-[11px] font-mono text-[#64748b]">
            Próg kondensacji wody
          </div>
        </div>
      </div>

      {/* Filament moisture recommendation */}
      <div className={`border rounded-xl p-4 shadow-sm space-y-2 ${advice.style}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xs font-sans">
            <CheckCircle2 className="w-4 h-4" />
            <span>DIAGNOSTYKA DLA DRUKARKI 3D: {advice.label}</span>
          </div>
          <span className="text-xs font-mono font-bold">{activeHumidity}% RH</span>
        </div>
        <p className="text-xs font-sans leading-relaxed">
          {advice.desc}
        </p>
      </div>

      {/* Manual Workshop Environment Adjuster */}
      <div className="retro-bezel rounded-xl p-4 border border-[#b6b0a3] space-y-3">
        <div className="flex items-center justify-between text-xs text-[#1c1917] font-semibold">
          <span>Ręczna kalibracja / warunki w komorze drukarki:</span>
          {useLiveApi && (
            <button
              onClick={() => setUseLiveApi(false)}
              className="text-[#0284c7] hover:underline cursor-pointer"
            >
              Przejdź na tryb manualny
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 bg-[#ede9df] p-3 rounded-lg border border-[#c5bfb2]">
            <div className="flex justify-between text-xs text-[#57534e]">
              <span>Temperatura w komorze:</span>
              <span className="font-mono text-[#1c1917] font-bold">{manualTemp}°C</span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={0.5}
              value={manualTemp}
              onChange={(e) => {
                setManualTemp(Number(e.target.value));
                setUseLiveApi(false);
              }}
              className="w-full accent-[#0284c7] cursor-pointer"
            />
          </div>

          <div className="space-y-1 bg-[#ede9df] p-3 rounded-lg border border-[#c5bfb2]">
            <div className="flex justify-between text-xs text-[#57534e]">
              <span>Wilgotność względna (RH):</span>
              <span className="font-mono text-[#1c1917] font-bold">{manualHumidity}%</span>
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
              className="w-full accent-[#0284c7] cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
