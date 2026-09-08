/**
 * Sensor listeners, hardware permission management, and S23 Ultra calibrated telemetry.
 */

export interface MotionData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface OrientationData {
  alpha: number; // 0 to 360 (compass)
  beta: number; // -180 to 180 (pitch)
  gamma: number; // -90 to 90 (roll)
}

export interface MagnetometerData {
  x: number;
  y: number;
  z: number;
  total: number;
}

export interface SensorStatusReport {
  hasMotion: boolean;
  hasOrientation: boolean;
  hasMagnetometer: boolean;
  hasGeolocation: boolean;
  hasMediaDevices: boolean;
  isSimulatedFallback: boolean;
}

let simulatedMode = false;

export function setHardwareSimulation(enabled: boolean): void {
  simulatedMode = enabled;
}

export function isHardwareSimulation(): boolean {
  return simulatedMode;
}

/**
 * Request device motion and orientation permissions (especially iOS 13+ Safari).
 * On Android (Chrome on Samsung S23 Ultra), permissions are usually granted directly.
 */
export async function requestMotionPermission(): Promise<boolean> {
  const anyDeviceMotion = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };

  if (typeof anyDeviceMotion.requestPermission === 'function') {
    try {
      const response = await anyDeviceMotion.requestPermission();
      return response === 'granted';
    } catch (e) {
      console.warn('Motion permission request error:', e);
      return false;
    }
  }

  return true;
}

/**
 * Trigger subtle haptic pulse
 */
export function triggerHaptic(pattern: number | number[] = 15): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

/**
 * Check sensor availability on device
 */
export async function diagnoseSensors(): Promise<SensorStatusReport> {
  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const hasGeolocation = typeof navigator !== 'undefined' && !!navigator.geolocation;
  const hasMotion = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
  const hasOrientation = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;

  let hasMagnetometer = false;
  if (typeof window !== 'undefined' && 'Magnetometer' in window) {
    hasMagnetometer = true;
  }

  return {
    hasMotion,
    hasOrientation,
    hasMagnetometer,
    hasGeolocation,
    hasMediaDevices,
    isSimulatedFallback: simulatedMode,
  };
}
