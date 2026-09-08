export type ToolCategory =
  | 'lighting'
  | 'measurement'
  | 'navigation'
  | 'environment'
  | 'detection'
  | 'optics'
  | 'sound'
  | 'utilities'
  | 'workshop';

export type ActiveToolId =
  | 'radial_hub'
  // 1. Latarka
  | 'flashlight'
  // 2. Poziomica
  | 'bubble_level'
  // 3. Kątomierz
  | 'protractor'
  // 4. Linijka ekranowa
  | 'ruler'
  // 5. Pomiary przestrzenne AR
  | 'ar_measure'
  // 6. Kompas magnetyczny & AR
  | 'compass'
  // 7. Wysokościomierz
  | 'altimeter'
  // 8. Barometr
  | 'barometer'
  // 9. Termometr i higrometr
  | 'thermometer_hygrometer'
  // 10. Sejsmograf i wibrometr
  | 'seismograph'
  // 11. Szybkościomierz
  | 'speedometer'
  // 12. GPS i geolokalizator
  | 'gps_finder'
  // 13. Detektor metalu
  | 'metal_detector'
  // 14. Detektor pola elektromagnetycznego / EMF
  | 'emf_meter'
  // 15. Skaner kodów kreskowych i QR
  | 'qr_barcode_scanner'
  // 16. Lupa z zamrożeniem obrazu i filtrami
  | 'magnifier'
  // 17. Decybelomierz
  | 'sound_meter'
  // 18. Generator częstotliwości
  | 'frequency_generator'
  // 19. Stroboskop
  | 'strobe_light'
  // 20. Lustro
  | 'mirror'
  // 21. Metronom i stroik muzyczny
  | 'metronome_tuner'
  // 22. Stoper i minutnik
  | 'stopwatch_timer'
  // 23. Przelicznik jednostek i walut
  | 'unit_converter'
  // 24. Latarka Morse'a
  | 'morse_code'
  // 25. Test pikseli i ekranu
  | 'screen_tester'
  // 26. Informacje o urządzeniu i systemie
  | 'device_info'
  // Moduły Drukarki 3D & Klipper
  | 'input_shaper'
  | 'belt_tuner'
  | 'klipper_dashboard'
  | 'logs_manager';

export interface ToolMeta {
  id: ActiveToolId;
  name: string;
  category: ToolCategory;
  categoryLabel: string;
  description: string;
  angleDeg: number;
  badge?: string;
}

export interface MotionSample {
  time: number;
  timestamp?: number;
  x: number;
  y: number;
  z: number;
  magnitude?: number;
}

export interface ShaperRecommendation {
  type: string;
  name?: string;
  freq?: number;
  frequency?: number;
  vibrations: number;
  smoothing?: number;
  maxAccel?: number;
  description?: string;
}

export interface BeltPreset {
  id: string;
  name: string;
  printer?: string;
  axis?: 'X' | 'Y' | 'A/B' | string;
  targetHz: number;
  targetFreq?: number;
  tolerance?: number;
  toleranceHz?: number;
  spanMm?: number;
  description: string;
}

export interface KlipperPrinterState {
  connected: boolean;
  connecting: boolean;
  state: 'ready' | 'printing' | 'paused' | 'error' | 'disconnected' | 'shutdown';
  message?: string;
  error?: string;
  toolhead: {
    homedAxes: string;
    position: [number, number, number, number];
  };
  temperatures: {
    extruder: { current: number; target: number };
    bed: { current: number; target: number };
  };
  printStats: {
    filename?: string;
    progress?: number;
    printDuration?: number;
    state?: string;
  };
}

export interface LogSession {
  id: string;
  title: string;
  type?: string;
  toolType?: string;
  createdAt?: string | number;
  timestamp?: number;
  durationMs?: number;
  sampleCount: number;
  summary: any;
  samples?: any[];
  csvData?: string;
}
