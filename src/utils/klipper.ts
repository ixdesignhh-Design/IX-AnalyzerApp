import { KlipperPrinterState } from '../types';

/**
 * Moonraker (Klipper Web API) Client
 */
export async function testMoonrakerConnection(host: string): Promise<boolean> {
  const url = cleanHostUrl(host);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${url}/server/info`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPrinterStatus(host: string): Promise<KlipperPrinterState> {
  const url = cleanHostUrl(host);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `${url}/printer/objects/query?heater_bed&extruder&print_stats&toolhead`,
      {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      }
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const status = data.result?.status;

    const extruder = status?.extruder || { temperature: 0, target: 0 };
    const bed = status?.heater_bed || { temperature: 0, target: 0 };
    const printStats = status?.print_stats || {};
    const toolhead = status?.toolhead || { homed_axes: '', position: [0, 0, 0, 0] };

    let stateStr: KlipperPrinterState['state'] = 'ready';
    if (printStats.state === 'printing') stateStr = 'printing';
    else if (printStats.state === 'paused') stateStr = 'paused';
    else if (printStats.state === 'error') stateStr = 'error';

    return {
      connected: true,
      connecting: false,
      state: stateStr,
      message: printStats.message || '',
      toolhead: {
        homedAxes: toolhead.homed_axes || '',
        position: toolhead.position || [0, 0, 0, 0],
      },
      temperatures: {
        extruder: {
          current: Math.round((extruder.temperature || 0) * 10) / 10,
          target: Math.round((extruder.target || 0) * 10) / 10,
        },
        bed: {
          current: Math.round((bed.temperature || 0) * 10) / 10,
          target: Math.round((bed.target || 0) * 10) / 10,
        },
      },
      printStats: {
        filename: printStats.filename,
        progress: printStats.total_duration > 0 ? (printStats.print_duration / printStats.total_duration) * 100 : 0,
        printDuration: printStats.print_duration,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Nie można połączyć z Moonraker';
    return {
      connected: false,
      connecting: false,
      error: errorMsg,
      state: 'disconnected',
      toolhead: { homedAxes: '', position: [0, 0, 0, 0] },
      temperatures: { extruder: { current: 0, target: 0 }, bed: { current: 0, target: 0 } },
      printStats: {},
    };
  }
}

export async function sendKlipperGcode(host: string, gcode: string): Promise<{ success: boolean; message: string }> {
  const url = cleanHostUrl(host);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${url}/printer/gcode/script`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script: gcode }),
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Błąd G-code: ${errText}` };
    }

    return { success: true, message: `Wykonano pomyślnie: ${gcode}` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Błąd komunikacji z Moonraker';
    return { success: false, message: errorMsg };
  }
}

export async function emergencyStopKlipper(host: string): Promise<boolean> {
  const url = cleanHostUrl(host);
  try {
    const res = await fetch(`${url}/printer/emergency_stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function cleanHostUrl(host: string): string {
  let cleaned = host.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned}`;
  }
  return cleaned.replace(/\/$/, '');
}
