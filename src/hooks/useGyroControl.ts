import { useState, useEffect, useRef, useCallback } from "react";
import { DeviceMotion } from "expo-sensors";
import type { CardinalDirection } from "@utils/joystickMath";

interface UseGyroControlOptions {
  enabled: boolean;
  updateInterval?: number; // ms between sensor updates
  tiltThreshold?: number; // m/s² to trigger direction (gravity ≈ 9.8)
}

interface GyroState {
  direction: CardinalDirection;
  tiltX: number; // -1 to 1 (left/right tilt)
  tiltY: number; // -1 to 1 (forward/backward tilt)
}

/**
 * Hook that reads device tilt via DeviceMotion and maps it to cardinal directions.
 *
 * Uses accelerationIncludingGravity for tilt detection:
 * - x axis: left/right tilt (positive = tilted right)
 * - y axis: forward/backward tilt (positive = tilted forward, top edge going down)
 * - z axis: unused (perpendicular to screen)
 *
 * In landscape mode, the axes are remapped so tilting the phone "forward"
 * (screen top edge away from you) drives the bot forward.
 */
export function useGyroControl({
  enabled,
  updateInterval = 100,
  tiltThreshold = 2.5,
}: UseGyroControlOptions): GyroState | null {
  const [state, setState] = useState<GyroState | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof DeviceMotion.addListener> | null>(null);

  const onDeviceMotion = useCallback(
    (measurement: any) => {
      const { accelerationIncludingGravity } = measurement;
      if (!accelerationIncludingGravity) return;

      // accelerationIncludingGravity values when device is flat: x≈0, y≈0, z≈-9.8
      // In landscape orientation:
      //   - Tilting screen forward (top edge away) → y becomes negative
      //   - Tilting screen backward (top edge toward you) → y becomes positive
      //   - Tilting left side down → x becomes negative
      //   - Tilting right side down → x becomes positive
      const rawX = accelerationIncludingGravity.x;
      const rawY = -accelerationIncludingGravity.y; // negate so tilting forward = positive

      // Normalize to -1..1 using gravity as the max reference
      const gravity = 9.8;
      const normalizedX = Math.max(-1, Math.min(1, rawX / gravity));
      const normalizedY = Math.max(-1, Math.min(1, rawY / gravity));

      // Determine cardinal direction based on dominant tilt axis
      let direction: CardinalDirection = "CENTER";

      const absX = Math.abs(rawX);
      const absY = Math.abs(rawY);

      if (absX < tiltThreshold && absY < tiltThreshold) {
        direction = "CENTER";
      } else if (absX > absY) {
        // Horizontal tilt is dominant
        direction = rawX > 0 ? "EAST" : "WEST";
      } else {
        // Vertical tilt is dominant
        direction = rawY > 0 ? "SOUTH" : "NORTH";
      }

      setState({
        direction,
        tiltX: normalizedX,
        tiltY: normalizedY,
      });
    },
    [tiltThreshold]
  );

  useEffect(() => {
    if (!enabled) {
      // Clean up subscription when disabled
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
      setState(null);
      return;
    }

    // Check availability and request permissions
    let mounted = true;

    const startListening = async () => {
      const available = await DeviceMotion.isAvailableAsync();
      if (!available || !mounted) return;

      const permission = await DeviceMotion.requestPermissionsAsync();
      if (permission.status !== "granted" || !mounted) return;

      DeviceMotion.setUpdateInterval(updateInterval);
      subscriptionRef.current = DeviceMotion.addListener(onDeviceMotion);
    };

    startListening();

    return () => {
      mounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [enabled, updateInterval, onDeviceMotion]);

  return state;
}
