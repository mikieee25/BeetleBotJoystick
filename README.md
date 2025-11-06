# Beetlebot Improved

## Overview

A modern, production-ready implementation of the Beetlebot mobile control application. This app provides precise joystick control, multi-touch support, Bluetooth connectivity to ESP32, and real-time vehicle telemetry.

## Key Features

### 🎮 **Joystick Control**

- **Multi-touch Support**: Uses `react-native-gesture-handler` and `react-native-reanimated` for smooth, performant gesture handling
- **Arcade Drive Mode**: Forward/backward on Y-axis, steering on X-axis
- **Customizable Deadzone**: Adjustable deadzone to ignore small unintended movements
- **Real-time Feedback**: Visual and haptic feedback for user interaction
- **Motor Speed Calculation**: Automatic calculation of left/right motor speeds from joystick input

### 📡 **Bluetooth Connectivity**

- **ESP32 Integration**: Seamless communication with ESP32-based vehicle controllers
- **Device Management**: List and connect to available Bluetooth devices
- **Command Queue**: Efficient command queuing system for reliable delivery
- **Telemetry**: Receive and display vehicle telemetry data
- **Auto-reconnect**: Maintains connection resilience

### ⚙️ **Vehicle Control**

- **Gear Selection**: Forward (D), Neutral (N), Reverse (R)
- **Claw Control**: Open/close the robotic claw
- **Speed Multiplier**: Adjustable speed limits (0-100%)
- **Haptic Feedback**: Tactile feedback for all interactions

### 🎨 **UI/UX**

- **Landscape Orientation**: Optimized for landscape mobile gameplay
- **Responsive Design**: Adapts to different screen sizes
- **Modern Components**: Clean, intuitive interface
- **Status Indicators**: Real-time connection and control state display

## Architecture

```
beetlebot-improved/
├── app/
│   ├── _layout.tsx          # Root layout with providers
│   └── index.tsx            # Main control screen
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Joystick.tsx
│   │   ├── GearSelector.tsx
│   │   ├── ClawControl.tsx
│   │   ├── SpeedControl.tsx
│   │   └── BluetoothConnector.tsx
│   ├── contexts/            # React contexts for state
│   │   ├── bluetoothContext.tsx
│   │   └── vehicleControlContext.tsx
│   ├── services/            # Business logic services
│   │   ├── bluetoothService.ts    # Bluetooth communication
│   │   └── hapticService.ts       # Haptic feedback
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   └── utils/               # Utility functions
│       └── joystickMath.ts  # Math utilities for joystick
├── package.json
├── tsconfig.json
├── app.json
└── babel.config.js
```

## Type System

All major features are fully typed with TypeScript:

```typescript
// Joystick data structure
interface JoystickData {
  x: number; // -1 to 1 (left/right)
  y: number; // -1 to 1 (down/up)
  angle: number; // -180 to 180 degrees
  distance: number; // 0 to 1 (from center)
  raw: { dx: number; dy: number };
}

// Motor command for ESP32
interface MotorCommand {
  type: "joystick" | "stop" | "brake" | "gear" | "claw";
  leftSpeed: number; // -100 to 100
  rightSpeed: number; // -100 to 100
  gear: GearType; // 'D' | 'N' | 'R'
  clawOpen: boolean;
  timestamp: number;
}
```

## Services

### BluetoothService (Singleton)

Handles all Bluetooth communication with ESP32:

```typescript
const bluetoothService = BluetoothService.getInstance();

// Connect to device
await bluetoothService.connect(deviceAddress);

// Send motor command
bluetoothService.sendMotorCommand(leftSpeed, rightSpeed, gear);

// Send stop command
bluetoothService.sendStopCommand();

// Change gear
bluetoothService.changeGear("D");

// Toggle claw
bluetoothService.toggleClaw(true);
```

### HapticService (Static)

Provides haptic feedback:

```typescript
await HapticService.lightTap(); // Light feedback
await HapticService.mediumTap(); // Medium feedback
await HapticService.success(); // Success notification
```

### JoystickMath (Utility)

Mathematical operations for joystick:

```typescript
// Normalize raw pixel input
const data = JoystickMath.normalize(dx, dy, maxDistance, deadzone);

// Calculate motor speeds
const { left, right } = JoystickMath.calculateMotorSpeeds(data);

// Apply exponential smoothing
const smoothed = JoystickMath.exponentialSmoothing(value, sensitivity);
```

## Context Providers

### BluetoothContext

Manages Bluetooth connection state:

```typescript
const { state, isConnected, connect, disconnect, connectedDevice } =
  useBluetooth();
```

### VehicleControlContext

Manages vehicle control state:

```typescript
const {
  joystickData,
  currentGear,
  clawOpen,
  speedMultiplier,
  setGear,
  toggleClaw,
  setSpeedMultiplier,
} = useVehicleControl();
```

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

For Android:

```bash
npm run android
```

For iOS:

```bash
npm run ios
```

## ESP32 Communication Protocol

The app sends motor commands to ESP32 over Bluetooth in the following format:

```
{
  type: string,           // 'joystick', 'stop', 'brake', 'gear', 'claw'
  leftSpeed: number,      // -100 to 100
  rightSpeed: number,     // -100 to 100
  gear: string,           // 'D', 'N', 'R'
  clawOpen: boolean,
  timestamp: number
}
```

Commands are sent at 20Hz (50ms interval) via a command queue system.

## Improvements Over Original

1. **Better Code Organization**: Clear separation of concerns with contexts, services, and utilities
2. **Type Safety**: Full TypeScript implementation
3. **Performance**: Uses native animation thread with Reanimated
4. **Maintainability**: Well-documented, modular components
5. **Scalability**: Easy to add new features or modify existing ones
6. **Error Handling**: Proper error handling in Bluetooth service
7. **Responsive UI**: Proper use of Flexbox for landscape layout
8. **Real-time Feedback**: Haptic and visual feedback for all interactions

## Future Enhancements

- [ ] Add battery level indicator
- [ ] Implement vehicle telemetry display (speed, temperature)
- [ ] Add recording/playback of control sequences
- [ ] Multi-device support (multiple vehicles)
- [ ] Custom control profiles
- [ ] In-app calibration
- [ ] Emergency stop button
- [ ] Autonomous mode integration
- [ ] Map/location tracking
- [ ] Real-time video stream support

## License

MIT
