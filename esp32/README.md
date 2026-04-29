# ESP32 Setup Guide for BeetleBot (PCB Edition + PS4 Controller)

This guide covers setting up the ESP32 for the BeetleBot PCB edition, which supports both a **PS4 controller** (primary input) and the **React Native app via BLE** (secondary input).

## Features

- **PS4 Controller** — Tank mode and Classic mode driving
- **Proportional claw control** via R2 trigger with smooth easing
- **Brake system** via L2 trigger — gradual deceleration to full stop
- **Joystick distance-based speed control** with exponential curve
- **Motor speed ramping** — smooth acceleration and deceleration
- **BLE fallback** — React Native app still works when PS4 is not connected

## Hardware Requirements

- **ESP32 Development Board** (ESP32-WROOM-32 or similar)
- **Motor Driver** (TB6612FNG or similar — PCB edition uses STBY/PWMA/PWMB/AIN/BIN layout)
- **2x DC Motors** (for left and right wheels)
- **1x Servo Motor** (SG90 or similar for claw)
- **PS4 DualShock 4 Controller**
- **Power Supply** (7.4V–12V for motors, 5V for ESP32)

## Pin Connections

### Motor Driver (PCB Edition)

```
Driver Pin  → ESP32 Pin
STBY        → GPIO 17
PWMA        → GPIO 25
PWMB        → GPIO 26
AIN1        → GPIO 27
AIN2        → GPIO 14
BIN1        → GPIO 16
BIN2        → GPIO 13
```

### Servo Motor (Claw)

```
Servo Wire    → ESP32 Pin
Signal (PWM)  → GPIO 15
VCC (5V)      → 5V
GND           → GND
```

### Status LED

```
LED → GPIO 2 (built-in or external)
```

### Power Connections

```
Motor Driver VCC  → 7.4V–12V Battery
Motor Driver GND  → Common Ground
ESP32 VIN         → 5V (USB or regulator)
ESP32 GND         → Common Ground
```

## PS4 Controller Pairing

The PS4Controller library works the other way around from what you might expect — **you don't pair the ESP32 to the controller, you set the controller's master Bluetooth address to the ESP32's MAC address**. Once the controller knows the ESP32's address, pressing the PS button will connect directly to it.

### Step 1 — Get the ESP32's Bluetooth MAC Address

Upload and run this small sketch to print the MAC address to Serial Monitor:

```cpp
#include "esp_bt_main.h"
#include "esp_bt_device.h"
#include "BluetoothSerial.h"

BluetoothSerial SerialBT;

void setup() {
  Serial.begin(115200);
  SerialBT.begin("BeetleBot-ESP32");

  const uint8_t* mac = esp_bt_dev_get_address();
  Serial.printf("ESP32 BT MAC: %02X:%02X:%02X:%02X:%02X:%02X\n",
    mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

void loop() {}
```

Open **Serial Monitor at 115200 baud** — you'll see something like:

```
ESP32 BT MAC: 00:70:07:DF:8E:3E
```
> **If the sketch above doesn't work**, you can get the MAC address directly from the BeetleBot app instead:
> 1. Open the **BeetleBot App** on your phone
> 2. Tap the **Bluetooth icon** in the top-right corner — a device list will appear
> 3. Scan for devices and find your ESP32 by the name you set (e.g. `BeetleBot-ESP32`)
> 4. The MAC address is displayed below the device name (e.g. `00:70:07:DF:8E:3E`)

> ## Copy that address.

### Step 2 — Set the PS4 Controller's Master Address

You need **SixaxisPairTool** to write the ESP32's MAC into the controller:

1. Download **SixaxisPairTool** from: https://sixaxispairtool.en.lo4d.com/windows
2. Connect your PS4 controller to your PC via **USB cable**
3. Open SixaxisPairTool — it will show the controller's current master address
4. Enter the ESP32's MAC address in the **"Change Master"** field
5. Click **Update** — the controller now knows to connect to your ESP32

### Step 3 — Update the Sketch

Paste the ESP32's MAC address into `setup()` in the sketch:

```cpp
PS4.begin("00:70:07:DF:8E:3E"); // Your ESP32's BT MAC address
```

### Step 4 — Connect

1. Upload the full BeetleBot sketch to the ESP32
2. Disconnect the controller from USB
3. Press the **PS button** — the controller will connect to the ESP32 automatically

> **Note:** You only need to do Steps 1–3 once. After that, the controller will always connect to this ESP32 on PS button press.

## PS4 Controls

| Button       | Action                                      |
|--------------|---------------------------------------------|
| D-Pad Left   | Switch to **Tank Mode** (Blue LED)          |
| D-Pad Right  | Switch to **Classic Mode** (Green LED)      |
| L1           | Decrease speed (step: 20, min: 60)          |
| R1           | Increase speed (step: 20, max: 255)         |
| L2 (analog)  | Brake — gradual deceleration to full stop   |
| R2 (analog)  | Proportional claw close (smooth easing)     |

### Tank Mode (default)
- **Left stick** → controls left motor (forward/backward by Y-axis)
- **Right stick** → controls right motor (forward/backward by Y-axis)
- Stick distance from center maps to speed via exponential curve

### Classic Mode
- **Left stick Y** → forward / backward
- **Right stick X** → turn left / right
- Combining drive + turn reduces the inner wheel speed by 50%

### LED Feedback
- **Blue** → Tank mode active
- **Green** → Classic mode active
- **Red (intensity)** → Brake depth (brighter = harder braking)
- **On (solid)** → BLE device connected

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

1. **ESP32Servo** (by Kevin Harrington)
2. **PS4Controller** (by Juan Pablo Marquez / ps4-esp32)

> **Note:** ArduinoJson is no longer required — this sketch uses simple string commands over BLE.

### 4. Upload the Sketch

1. Open `BeetleBot_ESP32_wPS4Controller.ino` in Arduino IDE
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
   BeetleBot PCB + PS4 starting...
   Features: Proportional Claw (R2) + Brake (L2) + Speed Curve + Motor Ramp
   Servo test...
   Servo test done. Claw open.
   PS4: waiting for controller...
   Ready! BLE advertising + PS4 pairing active.
   Default mode: TANK | L2=Brake | R2=Claw
   ```
3. The ESP32 is discoverable as **"BeetleBot-ESP32"** via BLE
4. Press the PS button on your PS4 controller to connect

## BLE UUIDs

These UUIDs are used for the React Native app connection:

```
Service UUID:        0000ffe0-0000-1000-8000-00805f9b34fb
Characteristic UUID: 0000ffe1-0000-1000-8000-00805f9b34fb
```

> These differ from the original sketch. Update the app's UUID configuration to match.

## BLE Command Protocol (React Native App)

When the PS4 controller is not connected, the app controls the robot via simple single-character BLE commands:

| Command | Action                        |
|---------|-------------------------------|
| `F`     | Drive forward                 |
| `B`     | Drive backward                |
| `L`     | Turn left                     |
| `R`     | Turn right                    |
| `S`     | Stop                          |
| `/`     | Stop (alternate)              |
| `O`     | Open claw                     |
| `C`     | Close claw                    |
| `+`     | Increase speed                |
| `MAX:<value>` | Set max speed (≤60 → 200, else 255) |

> **Note:** The BLE timeout is 600 ms. If no command is received within that window, the motors stop automatically.

## Customization

### Change PS4 MAC Address

Edit in `setup()`:

```cpp
PS4.begin("00:70:07:DF:8E:3E"); // Replace with your ESP32's BT MAC address
```

### Change Device Name

```cpp
BLEDevice::init("BeetleBot-ESP32"); // Change this name
```

### Adjust Claw Angles

```cpp
#define CLAW_OPEN_ANGLE   90  // Adjust for your servo
#define CLAW_CLOSED_ANGLE 3   // Adjust for your servo
```

### Adjust Speed Settings

```cpp
#define SPEED_DEFAULT  150   // Starting speed
#define SPEED_MIN       60   // Minimum speed (L1 floor)
#define SPEED_MAX      255   // Maximum speed (R1 ceiling)
#define SPEED_STEP      20   // Speed change per L1/R1 press
```

### Adjust Speed Curve

```cpp
#define SPEED_EXPONENT   2.0  // Higher = more exponential feel
#define SPEED_CURVE_TYPE 1    // 0=linear, 1=exponential, 2=smooth-step
```

### Adjust Motor Ramping

```cpp
#define MOTOR_RAMP_UP    25  // Max speed increase per loop tick
#define MOTOR_RAMP_DOWN  35  // Max speed decrease per loop tick
```

### Adjust Brake Behavior

```cpp
#define BRAKE_FULL_STOP  200  // L2 value above this triggers instant stop
#define BRAKE_DEADZONE    10  // L2 values below this are ignored
```

### Change Pin Assignments

Edit the pin constants near the top of the sketch:

```cpp
const int STBY      = 17;
const int PWMA      = 25;
const int PWMB      = 26;
const int AIN1      = 27;
const int AIN2      = 14;
const int BIN1      = 16;
const int BIN2      = 13;
const int SERVO_PIN = 15;
```

## Troubleshooting

### ESP32 Not Detected

- Install CH340 or CP2102 USB drivers for your ESP32 board
- Try a different USB cable (must support data transfer)
- Press and hold BOOT button while uploading

### PS4 Controller Not Connecting

- Verify the MAC address in `PS4.begin(...)` matches your controller
- Use SixaxisPairTool to check/set the pairing address
- Hold PS + Share on the controller to enter pairing mode
- Check Serial Monitor — it will print "PS4 controller connected!" on success

### Motors Not Responding

- Check STBY pin is HIGH (GPIO 17) — motor driver is disabled if LOW
- Verify all AIN/BIN/PWMA/PWMB connections
- Test motors directly with battery to confirm they work
- Confirm motor driver power supply is connected

### Servo Not Moving

- Verify servo is powered from 5V, not 3.3V
- Check Serial Monitor for the servo test sequence at startup
- Adjust `CLAW_OPEN_ANGLE` and `CLAW_CLOSED_ANGLE` if range is wrong

### BLE Connection Issues

- Make sure Bluetooth and location permissions are granted on phone
- Verify the app UUIDs match the sketch UUIDs (see BLE UUIDs section above)
- Restart ESP32 (press EN/RST button) and scan again
- Check Serial Monitor shows "BLE: device connected"

### BLE Commands Ignored While PS4 Is Connected

- This is expected behavior — PS4 input takes priority in the main loop
- BLE timeout safety still applies when PS4 is disconnected

## Next Steps

1. Pair your PS4 controller and test each mode:
   - Tank mode (D-Pad Left)
   - Classic mode (D-Pad Right)
2. Test L2 brake at various depths
3. Test R2 proportional claw — should move smoothly from open to closed
4. Connect the React Native app and verify BLE fallback works
5. Calibrate `CLAW_OPEN_ANGLE` and `CLAW_CLOSED_ANGLE` for your servo
6. Add additional sensors (ultrasonic, line following, etc.)

## Support

For issues specific to:

- **Arduino/ESP32**: Check ESP32 Arduino documentation
- **PS4Controller library**: https://github.com/jvpernis/esp32-ps4
- **React Native App**: Check app documentation
- **Hardware**: Verify connections and power supply

Happy Building! 🤖
