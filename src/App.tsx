import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Disc } from 'lucide-react';
import { Header } from './components/Header';
import { SectionNav } from './components/SectionNav';
import { RadialStarHub } from './components/RadialStarHub';
import { RadialQuickDialModal } from './components/RadialQuickDialModal';

// 26 Tools
import { FlashlightTool } from './components/FlashlightTool';
import { LevelTool } from './components/LevelTool';
import { ProtractorTool } from './components/ProtractorTool';
import { ScreenCaliperTool } from './components/ScreenCaliperTool';
import { ArMeasureTool } from './components/ArMeasureTool';
import { CompassGpsTool } from './components/CompassGpsTool';
import { BarometerAltimeterTool } from './components/BarometerAltimeterTool';
import { WeatherStationTool } from './components/WeatherStationTool';
import { SeismographTool } from './components/SeismographTool';
import { SpeedometerTool } from './components/SpeedometerTool';
import { GpsFinderTool } from './components/GpsFinderTool';
import { EmfTool } from './components/EmfTool';
import { QrBarcodeScannerTool } from './components/QrBarcodeScannerTool';
import { MacroInspectionTool } from './components/MacroInspectionTool';
import { DecibelTool } from './components/DecibelTool';
import { ToneGeneratorTool } from './components/ToneGeneratorTool';
import { StrobeTool } from './components/StrobeTool';
import { MirrorTool } from './components/MirrorTool';
import { MetronomeTunerTool } from './components/MetronomeTunerTool';
import { StopwatchTimerTool } from './components/StopwatchTimerTool';
import { UnitConverterTool } from './components/UnitConverterTool';
import { MorseCodeTool } from './components/MorseCodeTool';
import { ScreenTesterTool } from './components/ScreenTesterTool';
import { DeviceInfoTool } from './components/DeviceInfoTool';

// Workshop & 3D Tools
import { InputShaperTool } from './components/InputShaperTool';
import { BeltTunerTool } from './components/BeltTunerTool';
import { KlipperPanel } from './components/KlipperPanel';
import { LogsManager } from './components/LogsManager';

import { ActiveToolId, KlipperPrinterState } from './types';
import { getSavedLogSessions } from './utils/export';
import { triggerHaptic } from './utils/sensors';

const DEFAULT_KLIPPER_HOST = '192.168.1.100:7125';

export default function App() {
  const [activeTool, setActiveTool] = useState<ActiveToolId>('radial_hub');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savedLogsCount, setSavedLogsCount] = useState(0);
  const [isQuickDialOpen, setIsQuickDialOpen] = useState(false);

  const [klipperHost, setKlipperHost] = useState(() => {
    return localStorage.getItem('workshop_klipper_host') || DEFAULT_KLIPPER_HOST;
  });

  const [klipperState, setKlipperState] = useState<KlipperPrinterState>({
    connected: false,
    connecting: false,
    state: 'disconnected',
    toolhead: { homedAxes: '', position: [0, 0, 0, 0] },
    temperatures: {
      extruder: { current: 0, target: 0 },
      bed: { current: 0, target: 0 },
    },
    printStats: {},
  });

  useEffect(() => {
    updateLogsCount();
  }, []);

  const updateLogsCount = () => {
    const list = getSavedLogSessions();
    setSavedLogsCount(list.length);
  };

  const handleHostChange = (newHost: string) => {
    setKlipperHost(newHost);
    localStorage.setItem('workshop_klipper_host', newHost);
  };

  const handleOpenKlipper = () => {
    setActiveTool('klipper_dashboard');
  };

  const handleOpenLogs = () => {
    setActiveTool('logs_manager');
  };

  const handleOpenRadialHub = () => {
    setActiveTool('radial_hub');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 relative">
      {/* App Header */}
      <Header
        klipperState={klipperState}
        onOpenKlipper={handleOpenKlipper}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenLogs={handleOpenLogs}
        savedLogsCount={savedLogsCount}
        onOpenRadialHub={handleOpenRadialHub}
      />

      {/* Categorized Navigation */}
      <SectionNav
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        onOpenRadialHub={handleOpenRadialHub}
      />

      {/* Main Content Area with Motion Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            {/* Radial Star Hub */}
            {activeTool === 'radial_hub' && (
              <RadialStarHub
                activeTool={activeTool}
                onSelectTool={setActiveTool}
              />
            )}

            {/* 1. Latarka */}
            {activeTool === 'flashlight' && <FlashlightTool />}

            {/* 2. Poziomica */}
            {activeTool === 'bubble_level' && <LevelTool soundEnabled={soundEnabled} />}

            {/* 3. Kątomierz */}
            {activeTool === 'protractor' && <ProtractorTool />}

            {/* 4. Linijka ekranowa */}
            {activeTool === 'ruler' && <ScreenCaliperTool />}

            {/* 5. Pomiary przestrzenne AR */}
            {activeTool === 'ar_measure' && <ArMeasureTool />}

            {/* 6. Kompas */}
            {activeTool === 'compass' && <CompassGpsTool />}

            {/* 7. Wysokościomierz */}
            {activeTool === 'altimeter' && <BarometerAltimeterTool />}

            {/* 8. Barometr */}
            {activeTool === 'barometer' && <BarometerAltimeterTool />}

            {/* 9. Termometr i higrometr */}
            {activeTool === 'thermometer_hygrometer' && <WeatherStationTool />}

            {/* 10. Sejsmograf i wibrometr */}
            {activeTool === 'seismograph' && (
              <SeismographTool onSessionSaved={updateLogsCount} soundEnabled={soundEnabled} />
            )}

            {/* 11. Szybkościomierz */}
            {activeTool === 'speedometer' && <SpeedometerTool />}

            {/* 12. GPS i geolokalizator */}
            {activeTool === 'gps_finder' && <GpsFinderTool />}

            {/* 13. Detektor metalu */}
            {activeTool === 'metal_detector' && <EmfTool soundEnabled={soundEnabled} />}

            {/* 14. Detektor pola EMF */}
            {activeTool === 'emf_meter' && <EmfTool soundEnabled={soundEnabled} />}

            {/* 15. Skaner kodów kreskowych i QR */}
            {activeTool === 'qr_barcode_scanner' && <QrBarcodeScannerTool />}

            {/* 16. Lupa z filtrami */}
            {activeTool === 'magnifier' && <MacroInspectionTool />}

            {/* 17. Decybelomierz */}
            {activeTool === 'sound_meter' && <DecibelTool />}

            {/* 18. Generator częstotliwości */}
            {activeTool === 'frequency_generator' && <ToneGeneratorTool />}

            {/* 19. Stroboskop */}
            {activeTool === 'strobe_light' && <StrobeTool />}

            {/* 20. Lustro */}
            {activeTool === 'mirror' && <MirrorTool />}

            {/* 21. Metronom i stroik muzyczny */}
            {activeTool === 'metronome_tuner' && <MetronomeTunerTool />}

            {/* 22. Stoper i minutnik */}
            {activeTool === 'stopwatch_timer' && <StopwatchTimerTool />}

            {/* 23. Przelicznik jednostek i walut */}
            {activeTool === 'unit_converter' && <UnitConverterTool />}

            {/* 24. Latarka Morse'a */}
            {activeTool === 'morse_code' && <MorseCodeTool />}

            {/* 25. Test pikseli i ekranu */}
            {activeTool === 'screen_tester' && <ScreenTesterTool />}

            {/* 26. Informacje o urządzeniu i systemie */}
            {activeTool === 'device_info' && <DeviceInfoTool />}

            {/* Druk 3D & Klipper */}
            {activeTool === 'input_shaper' && (
              <InputShaperTool
                klipperHost={klipperHost}
                isKlipperConnected={klipperState.connected}
                onSessionSaved={updateLogsCount}
              />
            )}
            {activeTool === 'belt_tuner' && <BeltTunerTool soundEnabled={soundEnabled} />}
            {activeTool === 'klipper_dashboard' && (
              <KlipperPanel
                host={klipperHost}
                onHostChange={handleHostChange}
                klipperState={klipperState}
                onStateUpdate={setKlipperState}
              />
            )}
            {activeTool === 'logs_manager' && <LogsManager onLogsChanged={updateLogsCount} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Action Quick Dial Button (Always accessible) */}
      <button
        onClick={() => {
          triggerHaptic(20);
          setIsQuickDialOpen(true);
        }}
        className="fixed bottom-6 right-6 z-40 bg-amber-400 hover:bg-amber-300 text-slate-950 p-3.5 rounded-full shadow-2xl shadow-amber-500/50 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ring-4 ring-slate-900"
        title="Szybkie Koło Wyboru Modułów"
      >
        <Disc className="w-6 h-6 animate-[spin_8s_linear_infinite]" />
      </button>

      {/* Floating Quick Dial Modal */}
      <RadialQuickDialModal
        isOpen={isQuickDialOpen}
        onClose={() => setIsQuickDialOpen(false)}
        onSelectTool={setActiveTool}
        currentTool={activeTool}
      />

      {/* Bottom Status Bar */}
      <footer className="bg-slate-900/80 border-t border-slate-900 px-4 py-3 text-[11px] text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Workshop MultiTool Pro • Zestaw 26 narzędzi sensorycznych dla Samsung S23 Ultra</span>
          <div className="flex items-center gap-4">
            <button
              onClick={handleOpenRadialHub}
              className="text-amber-400 hover:underline cursor-pointer"
            >
              Koło Wyboru 360°
            </button>
            <span>Web APIs: Camera, Audio, Accelerometer, Gyro, Barometer, GPS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
