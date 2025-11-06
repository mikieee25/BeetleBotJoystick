import type { JoystickData } from "../types";

/**
 * Joystick math utility functions
 * Handles normalization, angle calculation, and deadzone
 */
export class JoystickMath {
  /**
   * Calculate normalized joystick values from raw pixel movement
   */
  static normalize(
    dx: number,
    dy: number,
    maxDistance: number,
    deadzone: number = 0.1
  ): JoystickData {
    // Calculate distance from center
    const rawDistance = Math.sqrt(dx * dx + dy * dy);

    // Apply deadzone
    if (rawDistance < maxDistance * deadzone) {
      return {
        x: 0,
        y: 0,
        angle: 0,
        distance: 0,
        raw: { dx: 0, dy: 0 },
      };
    }

    // Clamp to max distance
    const clampedDistance = Math.min(rawDistance, maxDistance);

    // Calculate angle
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Normalize values (-1 to 1)
    const normalizedDistance = clampedDistance / maxDistance;
    const normalizedX = (dx / maxDistance) * (clampedDistance / maxDistance);
    const normalizedY = -(dy / maxDistance) * (clampedDistance / maxDistance); // Invert Y

    return {
      x: normalizedX,
      y: normalizedY,
      angle: angleDeg,
      distance: normalizedDistance,
      raw: { dx, dy },
    };
  }

  /**
   * Convert joystick data to motor speeds
   * Uses arcade or tank drive kinematics
   */
  static calculateMotorSpeeds(
    data: JoystickData,
    driveMode: "arcade" | "tank" = "arcade",
    maxSpeed: number = 100
  ): { left: number; right: number } {
    if (driveMode === "arcade") {
      // Arcade drive: forward/backward on Y, steering on X
      const forward = data.y * maxSpeed;
      const steering = data.x * maxSpeed;

      const left = Math.max(-maxSpeed, Math.min(maxSpeed, forward + steering));
      const right = Math.max(-maxSpeed, Math.min(maxSpeed, forward - steering));

      return { left, right };
    } else {
      // Tank drive: left joystick Y for left motor, right joystick X for right motor
      const left = data.y * maxSpeed;
      const right = data.x * maxSpeed;

      return {
        left: Math.max(-maxSpeed, Math.min(maxSpeed, left)),
        right: Math.max(-maxSpeed, Math.min(maxSpeed, right)),
      };
    }
  }

  /**
   * Smooth joystick input using exponential curve
   * Provides finer control at low speeds
   */
  static exponentialSmoothing(value: number, sensitivity: number = 1): number {
    const sign = value < 0 ? -1 : 1;
    const absValue = Math.abs(value);
    return sign * Math.pow(absValue, sensitivity);
  }

  /**
   * Linear interpolation (deadzone compensation)
   */
  static lerp(min: number, max: number, t: number): number {
    return min + (max - min) * t;
  }
}
