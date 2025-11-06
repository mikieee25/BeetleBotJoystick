# ESP32 Setup Guide for BeetleBot

This guide will help you set up the ESP32 microcontroller to communicate with the BeetleBot React Native app.

## Hardware Requirements

- **ESP32 Development Board** (ESP32-WROOM-32 or similar)
- **Motor Driver** (L298N or similar dual H-bridge)
- **2x DC Motors** (for left and right wheels)
- **1x Servo Motor** (SG90 or similar for claw)
- **Power Supply** (7.4V-12V for motors, 5V for ESP32)
- **Jumper wires** and **breadboard** (optional)

## Pin Connections

### Left Motor (Motor A)

```
L298N Pin     → ESP32 Pin
ENA (Speed)   → GPIO 25
IN1           → GPIO 26
IN2           → GPIO 27
```

### Right Motor (Motor B)

```
L298N Pin     → ESP32 Pin
ENB (Speed)   → GPIO 32
IN3           → GPIO 33
IN4           → GPIO 14
```

### Servo Motor (Claw)

```
Servo Wire    → ESP32 Pin
Signal (PWM)  → GPIO 15
VCC (5V)      → 5V
GND           → GND
```

### Power Connections

```
Motor Driver VCC  → 7.4V-12V Battery
Motor Driver GND  → Common Ground
ESP32 VIN         → 5V (USB or regulator)
ESP32 GND         → Common Ground
```

## Software Setup

### 1. Install Arduino IDE

Download and install Arduino IDE from: https://www.arduino.cc/en/software

### 2. Install ESP32 Board Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add this URL to **Additional Board Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools → Board → Boards Manager**
5. Search for "ESP32" and install **esp32 by Espressif Systems**

### 3. Install Required Libraries

Go to **Sketch → Include Library → Manage Libraries** and install:

1. **ArduinoJson** (by Benoit Blanchon) - version 6.x
2. **ESP32Servo** (by Kevin Harrington)

### 4. Upload the Sketch

1. Open `BeetleBot_ESP32.ino` in Arduino IDE
2. Select your board:
   - **Tools → Board → ESP32 Arduino → ESP32 Dev Module**
3. Select the correct COM port:
   - **Tools → Port → (select your ESP32 port)**
4. Click **Upload** (→ button)
5. Wait for "Done uploading" message

### 5. Verify Operation

1. Open **Tools → Serial Monitor** (set to 115200 baud)
2. You should see:
   ```
   BeetleBot ESP32 Starting...
   BLE advertising started. Waiting for connection...
   ```
3. The ESP32 is now discoverable as **"BeetleBot-ESP32"**

## Testing the Connection

1. **Build and run** the React Native app on your phone/tablet
2. **Tap the "Connect" button** in the app
3. **Select "BeetleBot-ESP32"** from the device list
4. Serial Monitor should show: `Device connected`
5. Move the joystick - Serial Monitor will show received commands

## Customization

### Change Device Name

Edit line 90 in `BeetleBot_ESP32.ino`:

```cpp
BLEDevice::init("BeetleBot-ESP32"); // Change this name
```

### Adjust Claw Angles

Edit lines 40-41:

```cpp
#define CLAW_OPEN_ANGLE 90   // Adjust for your servo
#define CLAW_CLOSED_ANGLE 0  // Adjust for your servo
```

### Change Pin Assignments

Edit the pin definitions at the top of the sketch (lines 25-38)

### Adjust Gear Ratios

Edit the `controlMotors()` function to change speed ratios:

```cpp
} else if (currentGear == "1") {
  // Gear 1 - currently 50%, adjust as needed
  leftSpeed = leftSpeed / 2;
  rightSpeed = rightSpeed / 2;
}
```

## Troubleshooting

### ESP32 Not Detected

- Install CH340 or CP2102 USB drivers for your ESP32 board
- Try a different USB cable (must support data transfer)
- Press and hold BOOT button while uploading

### Motors Not Responding

- Check all connections (especially ground)
- Verify motor driver power supply is connected
- Test motors directly with battery to confirm they work
- Check if motor driver enable jumpers are in place

### Servo Not Moving

- Verify servo is powered (needs 5V, not 3.3V)
- Test servo separately with sweep example
- Adjust `CLAW_OPEN_ANGLE` and `CLAW_CLOSED_ANGLE` values

### BLE Connection Issues

- Make sure location permission is granted on phone
- Make sure Bluetooth is enabled
- Try scanning again
- Check Serial Monitor for error messages
- Restart ESP32 (press EN/RST button)

### No Commands Received

- Verify UUIDs match between app and ESP32
- Check Serial Monitor shows "Device connected"
- Ensure phone is within Bluetooth range (< 10 meters)

## Command Protocol

The app sends JSON commands via BLE:

### Joystick Command

```json
{
  "type": "joystick",
  "leftSpeed": 75,
  "rightSpeed": 50,
  "gear": "2",
  "clawOpen": false,
  "timestamp": 1699036800000
}
```

### Stop Command

```json
{
  "type": "stop",
  "leftSpeed": 0,
  "rightSpeed": 0,
  "gear": "1",
  "clawOpen": false,
  "timestamp": 1699036800000
}
```

### Gear Change

```json
{
  "type": "gear",
  "leftSpeed": 0,
  "rightSpeed": 0,
  "gear": "R",
  "clawOpen": false,
  "timestamp": 1699036800000
}
```

### Claw Control

```json
{
  "type": "claw",
  "leftSpeed": 0,
  "rightSpeed": 0,
  "gear": "1",
  "clawOpen": true,
  "timestamp": 1699036800000
}
```

## Next Steps

1. Test each control individually:

   - Joystick forward/backward
   - Joystick left/right turning
   - Gear changes (2/1/R)
   - Claw open/close

2. Fine-tune motor speeds if needed
3. Calibrate servo angles for proper claw operation
4. Add additional sensors (ultrasonic, line following, etc.)

## Support

For issues specific to:

- **Arduino/ESP32**: Check ESP32 Arduino documentation
- **React Native App**: Check app documentation
- **Hardware**: Verify connections and power supply

Happy Building! 🤖
