import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { SectionNav } from './components/SectionNav';

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
import { ALL_TOOLS } from './utils/toolsRegistry';
import { getSavedLogSessions } from './utils/export';

const DEFAULT_KLIPPER_HOST = '192.168.1.100:7125';

export default function App() {
  // Start cleanly on the Level Tool or user's preference without any unwanted circular wheel
  const [activeTool, setActiveTool] = useState<ActiveToolId>('bubble_level');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [savedLogsCount, setSavedLogsCount] = useState(0);

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

  const currentToolDef = ALL_TOOLS.find((t) => t.id === activeTool) || ALL_TOOLS[0];
  const ToolIcon = currentToolDef.icon;

  return (
    <div className="min-h-screen bg-[#d8d4cb] text-[#1c1d21] flex flex-col font-sans selection:bg-[#0284c7] selection:text-white">
      {/* OS X Workstation Header with iX Ai Software Branding */}
      <Header
        klipperState={klipperState}
        onOpenKlipper={handleOpenKlipper}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onOpenLogs={handleOpenLogs}
        savedLogsCount={savedLogsCount}
      />

      {/* Segmented OS X Workstation Deck Navigation */}
      <SectionNav
        activeTool={activeTool}
        onSelectTool={setActiveTool}
      />

      {/* Main Workstation Container / Retro Chassis Window */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        <div className="retro-chassis rounded-2xl p-3 sm:p-5 shadow-2xl border border-[#b8b2a5] relative overflow-hidden">
          {/* Sub-window header bar */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#c8c2b5] text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#ded8cd] border border-[#beb8ab] flex items-center justify-center text-[#0284c7] shadow-inner">
                <ToolIcon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-[#1c1917] text-sm leading-tight flex items-center gap-2">
                  {currentToolDef.name}
                </h2>
                <span className="text-[11px] font-mono text-[#78716c]">
                  Kategoria: {currentToolDef.categoryName} • iX S23 Ultra Driver v2.1
                </span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-[#57534e]">
              <span className="px-2 py-0.5 rounded bg-[#f2eee8] border border-[#a8a295]">
                HARDWARE BUS: LOCKED
              </span>
            </div>
          </div>

          {/* Module Content with Smooth OS X Transitions */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTool}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="w-full"
            >
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
        </div>
      </main>

      {/* Retro PC / OS X Bezel Status Footer */}
      <footer className="retro-bezel border-t border-[#b8b2a5] px-4 py-2.5 text-xs text-[#57534e] mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
            <span className="font-bold text-[#292524]">iX Ai Software • IX Analyzer Workstation</span>
            <span className="text-[#a8a29e]">|</span>
            <span>Arch: ARM64 S23 Ultra</span>
          </div>
          <div className="flex items-center gap-4 text-[#44403c]">
            <span>Sensory: Akcelerometr, Żyro, Barometr, GPS, Magnetometr</span>
            <span className="text-[#0284c7] font-bold">OS X Aqua Style</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
