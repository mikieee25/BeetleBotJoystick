import type { JoystickData } from "../types";

export type CardinalDirection = "NORTH" | "SOUTH" | "EAST" | "WEST" | "CENTER";

export class JoystickMath {
  // Convert raw pixel movement to normalized -1..1 joystick values with deadzone
  static normalize(
    dx: number,
    dy: number,
    maxDistance: number,
    deadzone: number = 0.1
  ): JoystickData {
    const rawDistance = Math.sqrt(dx * dx + dy * dy);

    // Ignore movement below deadzone threshold
    if (rawDistance < maxDistance * deadzone) {
      return {
        x: 0,
        y: 0,
        angle: 0,
        distance: 0,
        raw: { dx: 0, dy: 0 },
      };
    }

    // Limit distance to max and calculate angle
    const clampedDistance = Math.min(rawDistance, maxDistance);
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    // Normalize to -1..1 range
    const normalizedDistance = clampedDistance / maxDistance;
    const normalizedX = (dx / maxDistance) * (clampedDistance / maxDistance);
    const normalizedY = -(dy / maxDistance) * (clampedDistance / maxDistance);

    return {
      x: normalizedX,
      y: normalizedY,
      angle: angleDeg,
      distance: normalizedDistance,
      raw: { dx, dy },
    };
  }

  // Map joystick position to 4-way cardinal directions (N/S/E/W) using angle-based quadrants
  static detectCardinalDirection(
    data: JoystickData,
    quadrantThreshold: number = 45
  ): CardinalDirection {
    // Return center if joystick barely moved
    if (data.distance < 0.15) {
      return "CENTER";
    }

    // Normalize angle to 0-360 range
    let angle = data.angle;
    if (angle < 0) {
      angle += 360;
    }

    // Determine direction based on angle quadrants (±45° from cardinal directions)
    // Angle 0° = right (EAST), 90° = down (SOUTH), 180° = left (WEST), 270° = up (NORTH)
    if (angle >= 360 - quadrantThreshold || angle < quadrantThreshold) {
      return "EAST";
    } else if (angle >= quadrantThreshold && angle < 90 + quadrantThreshold) {
      return "SOUTH";
    } else if (
      angle >= 90 + quadrantThreshold &&
      angle < 180 + quadrantThreshold
    ) {
      return "WEST";
    } else if (
      angle >= 180 + quadrantThreshold &&
      angle < 270 + quadrantThreshold
    ) {
      return "NORTH";
    }

    return "CENTER";
  }

  // Calculate arcade or tank drive motor speeds from normalized joystick data
  static calculateMotorSpeeds(
    data: JoystickData,
    driveMode: "arcade" | "tank" = "arcade",
    maxSpeed: number = 100
  ): { left: number; right: number } {
    if (driveMode === "arcade") {
      // Forward/backward on Y axis, steering on X axis
      const forward = data.y * maxSpeed;
      const steering = data.x * maxSpeed;

      const left = Math.max(-maxSpeed, Math.min(maxSpeed, forward + steering));
      const right = Math.max(-maxSpeed, Math.min(maxSpeed, forward - steering));

      return { left, right };
    } else {
      // Tank drive: Y for left, X for right
      const left = data.y * maxSpeed;
      const right = data.x * maxSpeed;

      return {
        left: Math.max(-maxSpeed, Math.min(maxSpeed, left)),
        right: Math.max(-maxSpeed, Math.min(maxSpeed, right)),
      };
    }
  }

  // Get intensity of joystick push (0 = centered, 1 = fully extended)
  static getDirectionStrength(data: JoystickData): number {
    return Math.min(1, Math.max(0, data.distance));
  }

  // Apply exponential curve for smoother low-speed control
  static exponentialSmoothing(value: number, sensitivity: number = 1): number {
    const sign = value < 0 ? -1 : 1;
    const absValue = Math.abs(value);
    return sign * Math.pow(absValue, sensitivity);
  }

  // Linear interpolation between two values
  static lerp(min: number, max: number, t: number): number {
    return min + (max - min) * t;
  }
}
