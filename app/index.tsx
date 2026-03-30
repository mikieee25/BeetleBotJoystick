import React, { useCallback, useState, useRef, useEffect } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Joystick } from "@components/Joystick";
import { GearSelector } from "@components/GearSelector";
import { ClawControl } from "@components/ClawControl";
import { ControlModeToggle } from "@components/ControlModeToggle";
import { BluetoothConnectorV2 } from "@components/BluetoothConnectorV2";
import { useVehicleControl } from "@contexts/vehicleControlContext";
import { useGyroControl } from "@hooks/useGyroControl";
import { JoystickMath, type CardinalDirection } from "@utils/joystickMath";
import type { JoystickData, GearType } from "../src/types";

export default function ControlScreen() {
  const insets = useSafeAreaInsets();
  const {
    joystickData,
    setJoystickData,
    currentGear,
    setGear,
    clawOpen,
    toggleClaw,
    controlMode,
    setControlMode,
  } = useVehicleControl();

  const [motorSpeeds, setMotorSpeeds] = useState({ left: 0, right: 0 });
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(
    null
  );
  const [sendCommandFn, setSendCommandFn] = useState<
    ((cmd: string) => Promise<void>) | null
  >(null);

  const isGyro = controlMode === "gyro";

  // Gyro hook — active only when gyro mode is selected and connected
  const gyroState = useGyroControl({
    enabled: isGyro && !!connectedDeviceId,
    updateInterval: 150,
    tiltThreshold: 2.5,
  });

  // Initialize connection and send startup commands to ESP32
  const handleConnected = useCallback(
    (deviceId: string, sendCommand: (cmd: string) => Promise<void>) => {
      setConnectedDeviceId(deviceId);
      setSendCommandFn(() => sendCommand);

      // Send reset and max speed commands to establish communication
      const initCommands = async () => {
        try {
          await sendCommand("/");
          await new Promise((resolve) => setTimeout(resolve, 200));
          await sendCommand("MAX:100"); // Set initial motor speed
        } catch (error) {
          console.error("Initialization error:", error);
        }
      };
      initCommands();
    },
    []
  );

  // Clear connection state on disconnect
  const handleDisconnected = useCallback(() => {
    setConnectedDeviceId(null);
    setSendCommandFn(null);
  }, []);

  // Refs to prevent duplicate commands and track state changes
  const lastCommandRef = useRef<string | null>(null);
  const speedSentRef = useRef<boolean>(false);
  const maxSpeedSetRef = useRef<boolean>(false);

  // Send direction and speed commands based on cardinal direction
  const sendDirectionCommand = useCallback(
    (direction: CardinalDirection) => {
      if (!sendCommandFn || !connectedDeviceId) return;

      let directionCommand = "S";

      switch (direction) {
        case "NORTH":
          directionCommand = "F";
          break;
        case "SOUTH":
          directionCommand = "B";
          break;
        case "EAST":
          directionCommand = "R";
          break;
        case "WEST":
          directionCommand = "L";
          break;
        case "CENTER":
          directionCommand = "S";
          break;
      }

      // Send direction command only if it changed
      if (directionCommand !== lastCommandRef.current) {
        sendCommandFn(directionCommand).catch(console.error);
        lastCommandRef.current = directionCommand;
        speedSentRef.current = false;
        maxSpeedSetRef.current = false;
      }

      // Send speed increments (no delays to avoid ESP32 timeout)
      if (directionCommand !== "S" && !speedSentRef.current) {
        if (!maxSpeedSetRef.current) {
          const maxSpeed = currentGear === "2" ? 180 : 60;
          sendCommandFn(`MAX:${maxSpeed}`).catch(console.error);
          maxSpeedSetRef.current = true;
        }

        const isTurning = directionCommand === "L" || directionCommand === "R";

        if (currentGear === "2") {
          if (isTurning) {
            sendCommandFn("+").catch(console.error);
          } else {
            sendCommandFn("+").catch(console.error);
            sendCommandFn("+").catch(console.error);
          }
        } else if (currentGear === "1") {
          if (!isTurning) {
            sendCommandFn("+").catch(console.error);
            sendCommandFn("+").catch(console.error);
          }
        }
        speedSentRef.current = true;
      }
    },
    [sendCommandFn, connectedDeviceId, currentGear]
  );

  // Process joystick input: detect direction and send motor commands (4-way cardinal only)
  const handleJoystickMove = useCallback(
    (data: JoystickData) => {
      setJoystickData(data);

      // Calculate motor speeds for visual feedback
      const speeds = JoystickMath.calculateMotorSpeeds(data, "arcade", 100);
      setMotorSpeeds(speeds);

      const direction = JoystickMath.detectCardinalDirection(data, 45);
      sendDirectionCommand(direction);
    },
    [setJoystickData, sendDirectionCommand]
  );

  // Stop joystick and reset motor speeds
  const handleJoystickStop = useCallback(() => {
    setJoystickData(null);
    setMotorSpeeds({ left: 0, right: 0 });

    lastCommandRef.current = null;
    speedSentRef.current = false;

    if (sendCommandFn && connectedDeviceId) {
      sendCommandFn("S").catch(console.error);
    }
  }, [setJoystickData, sendCommandFn, connectedDeviceId]);

  // Process gyro input: send commands based on device tilt
  useEffect(() => {
    if (!isGyro || !gyroState) return;

    setMotorSpeeds({
      left: Math.round(gyroState.tiltY * 100),
      right: Math.round(gyroState.tiltY * 100),
    });

    sendDirectionCommand(gyroState.direction);
  }, [isGyro, gyroState, sendDirectionCommand]);

  // Stop motors when switching modes
  const handleModeChange = useCallback(
    (mode: "joystick" | "gyro") => {
      // Send stop before switching
      if (sendCommandFn && connectedDeviceId) {
        sendCommandFn("S").catch(console.error);
      }
      lastCommandRef.current = null;
      speedSentRef.current = false;
      maxSpeedSetRef.current = false;
      setMotorSpeeds({ left: 0, right: 0 });
      setControlMode(mode);
    },
    [sendCommandFn, connectedDeviceId, setControlMode]
  );

  // Switch gear and stop motor to prevent momentum conflicts
  const handleGearChange = useCallback(
    (gear: GearType) => {
      setGear(gear);
      speedSentRef.current = false;
      maxSpeedSetRef.current = false;
      lastCommandRef.current = null;

      if (sendCommandFn && connectedDeviceId) {
        sendCommandFn("S").catch(console.error);
      }
    },
    [setGear, sendCommandFn, connectedDeviceId]
  );

  // Toggle claw open/close and send command to robot
  const handleClawToggle = useCallback(
    (isOpen: boolean) => {
      toggleClaw();
      if (sendCommandFn && connectedDeviceId) {
        const command = isOpen ? "O" : "C";
        sendCommandFn(command).catch(console.error);
      }
    },
    [toggleClaw, sendCommandFn, connectedDeviceId]
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Header: App title, mode toggle, and Bluetooth connection button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            <Text style={styles.titleBeetle}>Beetle</Text>
            <Text style={styles.titleBot}>Bot</Text>
          </Text>
        </View>

        <View style={styles.headerRight}>
          <ControlModeToggle mode={controlMode} onModeChange={handleModeChange} />
          <BluetoothConnectorV2
            onConnected={handleConnected}
            onDisconnected={handleDisconnected}
          />
        </View>
      </View>

      {/* Layout: Control area on left, Gear/Claw controls on right */}
      <View style={styles.mainContent}>
        {/* Left: Joystick or Gyro indicator */}
        <View style={styles.leftSection}>
          {isGyro ? (
            <View style={styles.gyroIndicator}>
              <Text style={styles.gyroTitle}>GYRO MODE</Text>
              <Text style={styles.gyroDirection}>
                {gyroState?.direction ?? "CENTER"}
              </Text>
              <Text style={styles.gyroHint}>
                Tilt device to steer
              </Text>
            </View>
          ) : (
            <View style={styles.joystickWrapper}>
              <Joystick
                size={180}
                onMove={handleJoystickMove}
                onStop={handleJoystickStop}
                deadzone={0.1}
              />
            </View>
          )}
        </View>

        {/* Right: Gear selector and claw toggle */}
        <View style={styles.rightSection}>
          <View style={styles.controlRow}>
            <View style={styles.gearWrapper}>
              <GearSelector onGearChange={handleGearChange} size={200} />
            </View>
            <View style={styles.clawWrapper}>
              <ClawControl onToggle={handleClawToggle} size={120} />
            </View>
          </View>
        </View>
      </View>

      {/* Status bar: Connection and current state indicators */}
      {connectedDeviceId && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>✓ Connected</Text>
          <Text style={styles.statusText}>
            {isGyro ? "GYRO" : "JOYSTICK"} | Gear: {currentGear} | Claw:{" "}
            {clawOpen ? "OPEN" : "CLOSED"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  titleBeetle: {
    color: "#FF9E42",
  },
  titleBot: {
    color: "#999",
  },
  mainContent: {
    flex: 1,
    flexDirection: "row",
    padding: 16,
    paddingLeft: 32,
    paddingRight: 32,
    justifyContent: "space-between",
  },
  leftSection: {
    flex: 0,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 12,
  },
  joystickWrapper: {
    width: 220,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  gyroIndicator: {
    width: 220,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "#FF9E42",
  },
  gyroTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF9E42",
    letterSpacing: 1,
    marginBottom: 8,
  },
  gyroDirection: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
  },
  gyroHint: {
    fontSize: 11,
    color: "#999",
    marginTop: 8,
  },
  rightSection: {
    flex: 0,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingVertical: 16,
  },
  controlRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  gearWrapper: {
    width: 220,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  clawWrapper: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  statusBar: {
    backgroundColor: "#DCF9E8",
    borderTopWidth: 1,
    borderTopColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 12,
    color: "#10b981",
    fontWeight: "500",
  },
});
