# BeetleBot Wiring Diagram

## Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        BeetleBot System                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [Phone/Tablet]                                             │
│       │                                                      │
│       │ Bluetooth Low Energy (BLE)                          │
│       ↓                                                      │
│  [ESP32 Dev Board]                                          │
│       │                                                      │
│       ├──→ [Motor Driver L298N] ──→ [Left Motor]           │
│       │         │                                           │
│       │         └──────────────────→ [Right Motor]          │
│       │                                                      │
│       └──→ [Servo Motor] (Claw)                            │
│                                                              │
│  [Battery Pack] ──→ Motor Driver + ESP32                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Detailed Wiring

### ESP32 to L298N Motor Driver

```
ESP32 Pin    →    L298N Pin    →    Function
──────────────────────────────────────────────
GPIO 25      →    ENA          →    Left Motor Speed (PWM)
GPIO 26      →    IN1          →    Left Motor Direction A
GPIO 27      →    IN2          →    Left Motor Direction B

GPIO 32      →    ENB          →    Right Motor Speed (PWM)
GPIO 33      →    IN3          →    Right Motor Direction A
GPIO 14      →    IN4          →    Right Motor Direction B

GND          →    GND          →    Common Ground
```

### L298N to DC Motors

```
L298N Pin    →    Motor Connection
───────────────────────────────────
OUT1         →    Left Motor (+)
OUT2         →    Left Motor (-)

OUT3         →    Right Motor (+)
OUT4         →    Right Motor (-)
```

### ESP32 to Servo Motor

```
ESP32 Pin    →    Servo Wire    →    Function
────────────────────────────────────────────
GPIO 15      →    Signal (PWM)  →    Servo Control
5V           →    VCC (Red)     →    Power
GND          →    GND (Brown)   →    Ground
```

### Power Connections

```
Component        →    Power Source       →    Voltage
──────────────────────────────────────────────────────
L298N VCC        →    Battery +          →    7.4V - 12V
L298N GND        →    Battery -          →    GND
L298N 5V Out     →    ESP32 VIN          →    5V (optional)
ESP32 VIN        →    USB or 5V Reg      →    5V
ESP32 GND        →    Common Ground      →    GND
Servo VCC        →    5V (ESP32/Reg)     →    5V
Servo GND        →    Common Ground      →    GND
```

## Breadboard Layout (Optional)

```
                 ┌─────────────────────────────┐
                 │       ESP32 Dev Board       │
                 │                             │
    GPIO Pins    │  26 27 14 25 32 33 15      │
                 │  │  │  │  │  │  │  │       │
                 └──┼──┼──┼──┼──┼──┼──┼───────┘
                    │  │  │  │  │  │  │
      ┌─────────────┴──┴──┴──┴──┴──┴──┴────────────┐
      │           Breadboard Power Rails            │
      │  Red +5V ═══════════════════════════       │
      │  Blue GND ══════════════════════════       │
      └────────────────────────────────────────────┘
                    │  │           │
                    │  │           └──→ Servo Signal
                    │  │
                    │  └──→ To L298N Control Pins
                    │
                    └──→ To Motors via L298N
```

## Component Specifications

### ESP32 Dev Board

- Voltage: 3.3V logic, 5V input
- Current: ~80-260mA (varies with WiFi/BLE usage)
- GPIO: 25, 26, 27, 32, 33, 14, 15 (used)

### L298N Motor Driver

- Input Voltage: 5V-35V (7.4V-12V recommended)
- Output Current: 2A per channel (4A peak)
- Logic Voltage: 5V
- Enable Jumpers: Keep in place for PWM control

### DC Motors (typical)

- Voltage: 6V-12V
- Current: 100-500mA per motor
- Type: Geared DC motor (TT motor recommended)

### Servo Motor (SG90 or similar)

- Voltage: 4.8V-6V
- Current: 100-250mA (600mA stall)
- Rotation: 0-180 degrees
- PWM Frequency: 50Hz

### Battery Pack

- Voltage: 7.4V (2S LiPo) or 9V-12V (NiMH)
- Capacity: 1000mAh minimum
- Connector: XT60, Deans, or barrel jack

## Safety Notes

⚠️ **IMPORTANT**

- Always connect GND first
- Never reverse power polarity
- Use appropriate gauge wire (20-22 AWG for motors)
- Add fuse (2A-3A) to battery for safety
- Disconnect battery when programming ESP32
- Keep battery away from metal objects

## Assembly Tips

1. **Test Components Individually**

   - Test ESP32 with blink sketch
   - Test motors with direct battery connection
   - Test servo with sweep example

2. **Wire in Stages**

   - Start with ESP32 to motor driver (no motors)
   - Add motors one at a time
   - Add servo last

3. **Use Color-Coded Wires**

   - Red: Power (+)
   - Black/Brown: Ground (-)
   - Yellow/Orange: Signal/Control
   - Blue/Green: Motor connections

4. **Secure Connections**
   - Solder connections for permanent build
   - Use heat shrink tubing
   - Strain relief for motor wires

## Testing Checklist

- [ ] ESP32 powers on (LED blinks)
- [ ] Serial Monitor shows "BLE advertising"
- [ ] Phone can scan and find "BeetleBot-ESP32"
- [ ] Phone can connect to ESP32
- [ ] Serial Monitor shows received commands
- [ ] Left motor responds to joystick
- [ ] Right motor responds to joystick
- [ ] Motors reverse with gear change
- [ ] Servo opens/closes claw
- [ ] All controls work simultaneously

## Troubleshooting Common Issues

### Motors Run Backwards

- Swap OUT1 ↔ OUT2 or OUT3 ↔ OUT4 on L298N

### Motors Too Slow

- Check battery voltage (should be > 7V)
- Remove ENA/ENB jumpers if using external PWM
- Increase PWM duty cycle in code

### Motors Too Fast

- Reduce gear ratio in code (change gear "1" speed)
- Use lower voltage battery
- Add mechanical gearing

### Servo Jitters

- Use separate 5V power supply for servo
- Add 100µF capacitor across servo power
- Ensure common ground connection

### ESP32 Resets When Motors Start

- Motor driver needs separate battery
- Add 470µF capacitor across ESP32 power
- Use voltage regulator for ESP32 power

---

Need help? Check the main README.md or ESP32 setup guide!
