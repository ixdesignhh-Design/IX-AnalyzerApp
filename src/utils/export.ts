import { LogSession, MotionSample } from '../types';

const STORAGE_KEY = 'workshop_multitool_sessions';

/**
 * Format motion samples to official Klipper CSV format
 * Suitable for running: python3 scripts/calibrate_shaper.py /tmp/resonances_x_*.csv -o /tmp/shaper_x.png
 */
export function formatKlipperCSV(samples: MotionSample[]): string {
  let csv = '# time,accel_x,accel_y,accel_z\n';
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    csv += `${s.time.toFixed(6)},${s.x.toFixed(6)},${s.y.toFixed(6)},${s.z.toFixed(6)}\n`;
  }
  return csv;
}

/**
 * Download a string content as a file
 */
export function downloadFile(content: string, filename: string, mimeType = 'text/csv'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Native mobile sharing using Web Share API (WhatsApp, Gmail, Drive, Discord, etc.)
 */
export async function shareFileOrText(
  title: string,
  text: string,
  content?: string,
  filename?: string,
  mimeType = 'text/csv'
): Promise<{ shared: boolean; method: 'native' | 'download' }> {
  // Check if Web Share API with files is supported
  if (content && filename && typeof navigator !== 'undefined' && 'canShare' in navigator) {
    try {
      const file = new File([content], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file],
        });
        return { shared: true, method: 'native' };
      }
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        console.warn('Share API error, falling back to download', e);
      } else {
        return { shared: false, method: 'native' };
      }
    }
  }

  // Text-only share fallback
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      await navigator.share({ title, text });
      return { shared: true, method: 'native' };
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') {
        return { shared: false, method: 'native' };
      }
    }
  }

  // If sharing not supported or user cancelled, trigger file download if content exists
  if (content && filename) {
    downloadFile(content, filename, mimeType);
    return { shared: true, method: 'download' };
  }

  return { shared: false, method: 'native' };
}

/**
 * Save log session to LocalStorage
 */
export function saveLogSession(session: LogSession): void {
  try {
    const existing = getSavedLogSessions();
    const updated = [session, ...existing.filter((s) => s.id !== session.id)].slice(0, 30);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save session to localStorage', err);
  }
}

/**
 * Retrieve saved log sessions
 */
export function getSavedLogSessions(): LogSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LogSession[];
  } catch {
    return [];
  }
}

/**
 * Delete a session
 */
export function deleteLogSession(id: string): LogSession[] {
  try {
    const existing = getSavedLogSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return existing;
  } catch {
    return [];
  }
}
