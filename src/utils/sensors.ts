/**
 * Sensor listeners and permission management.
 */

export interface MotionData {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface OrientationData {
  alpha: number; // 0 to 360 (compass)
  beta: number; // -180 to 180 (front to back)
  gamma: number; // -90 to 90 (left to right)
}

export interface MagnetometerData {
  x: number;
  y: number;
  z: number;
  total: number;
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
