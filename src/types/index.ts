/**
 * Joystick movement data with normalized values and angle information
 */
export interface JoystickData {
  x: number; // Normalized -1 to 1 (left to right)
  y: number; // Normalized -1 to 1 (down to up, inverted)
  angle: number; // Angle in degrees -180 to 180
  distance: number; // Normalized 0 to 1 (from center)
  raw: {
    dx: number; // Raw pixel movement X
    dy: number; // Raw pixel movement Y
  };
}

/**
 * Motor control command for ESP32
 */
export interface MotorCommand {
  type: "joystick" | "stop" | "brake" | "gear" | "claw";
  leftSpeed: number; // -100 to 100
  rightSpeed: number; // -100 to 100
  gear: GearType;
  clawOpen: boolean;
  timestamp: number;
}

/**
 * Gear type for the vehicle
 */
export type GearType = "2" | "1";

/**
 * Bluetooth device information
 */
export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  isConnected: boolean;
  lastConnected: Date | null;
  signalStrength: number; // -100 to 0 dBm
}

/**
 * Bluetooth connection state
 */
export type BluetoothState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

/**
 * Vehicle telemetry data received from ESP32
 */
export interface VehicleTelemetry {
  battery: number; // 0-100%
  isMoving: boolean;
  speed: number; // km/h or arbitrary units
  gear: GearType;
  temperature: number; // Celsius
  timestamp: number;
}

/**
 * Control configuration
 */
export interface ControlConfig {
  joystickSize: number;
  invertX: boolean;
  invertY: boolean;
  deadzone: number; // 0 to 1
  sensitivity: number; // 0.1 to 2
  maxSpeed: number; // 0-100%
}
