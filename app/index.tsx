import React, { useCallback, useState, useRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Joystick } from "@components/Joystick";
import { GearSelector } from "@components/GearSelector";
import { ClawControl } from "@components/ClawControl";
import { BluetoothConnectorV2 } from "@components/BluetoothConnectorV2";
import { useVehicleControl } from "@contexts/vehicleControlContext";
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
  } = useVehicleControl();

  const [motorSpeeds, setMotorSpeeds] = useState({ left: 0, right: 0 });
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(
    null
  );
  const [sendCommandFn, setSendCommandFn] = useState<
    ((cmd: string) => Promise<void>) | null
  >(null);

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

  // Process joystick input: detect direction and send motor commands (4-way cardinal only)
  const handleJoystickMove = useCallback(
    (data: JoystickData) => {
      setJoystickData(data);

      // Calculate motor speeds for visual feedback
      const speeds = JoystickMath.calculateMotorSpeeds(data, "arcade", 100);
      setMotorSpeeds(speeds);

      if (!sendCommandFn || !connectedDeviceId) return;

      // Map joystick position to 4 cardinal directions (N/S/E/W)
      const direction = JoystickMath.detectCardinalDirection(data, 45);

      let directionCommand = "S";

      // Convert cardinal direction to ESP32 command
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

      // Send speed increments immediately (no delays to avoid ESP32 timeout)
      if (directionCommand !== "S" && !speedSentRef.current) {
        // Set max speed once per direction change
        if (!maxSpeedSetRef.current) {
          const maxSpeed = currentGear === "2" ? 180 : 60;
          sendCommandFn(`MAX:${maxSpeed}`).catch(console.error);
          maxSpeedSetRef.current = true;
        }

        // Send speed increments based on gear and direction (forward vs turning)
        // Turning uses less speed for smoother control and less motor noise
        const isTurning = directionCommand === "L" || directionCommand === "R";

        if (currentGear === "2") {
          if (isTurning) {
            // Gear 2 turning: 1 increment (lower speed, quieter)
            sendCommandFn("+").catch(console.error);
          } else {
            // Gear 2 forward/backward: 2 increments (full speed)
            sendCommandFn("+").catch(console.error);
            sendCommandFn("+").catch(console.error);
          }
        } else if (currentGear === "1") {
          if (isTurning) {
            // Gear 1 turning: no extra increments (very slow, quiet turns)
            // Uses base speed only
          } else {
            // Gear 1 forward/backward: 2 increments
            sendCommandFn("+").catch(console.error);
            sendCommandFn("+").catch(console.error);
          }
        }
        speedSentRef.current = true;
      }
    },
    [setJoystickData, sendCommandFn, connectedDeviceId, currentGear]
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

  // Switch gear and stop motor to prevent momentum conflicts
  const handleGearChange = useCallback(
    (gear: GearType) => {
      setGear(gear);
      // Reset speed tracking for clean gear transition
      speedSentRef.current = false;
      maxSpeedSetRef.current = false;
      lastCommandRef.current = null;

      // Stop motor before changing gears
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
      {/* Header: App title and Bluetooth connection button */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            <Text style={styles.titleBeetle}>Beetle</Text>
            <Text style={styles.titleBot}>Bot</Text>
          </Text>
        </View>

        <BluetoothConnectorV2
          onConnected={handleConnected}
          onDisconnected={handleDisconnected}
        />
      </View>

      {/* Layout: Joystick on left, Gear/Claw controls on right */}
      <View style={styles.mainContent}>
        {/* Left: Joystick controller */}
        <View style={styles.leftSection}>
          <View style={styles.joystickWrapper}>
            <Joystick
              size={180}
              onMove={handleJoystickMove}
              onStop={handleJoystickStop}
              deadzone={0.1}
            />
          </View>
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
            Gear: {currentGear} | Claw: {clawOpen ? "OPEN" : "CLOSED"}
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
    paddingLeft: 32, // Add left padding
    paddingRight: 32, // Balance right padding
    justifyContent: "space-between", // Space between joystick and controls
  },
  leftSection: {
    flex: 0, // Don't flex, use fixed size
    justifyContent: "center",
    alignItems: "flex-start", // Align left
    gap: 12,
  },
  joystickWrapper: {
    width: 220,
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  rightSection: {
    flex: 0, // Don't flex, use fixed size
    justifyContent: "center",
    alignItems: "flex-end", // Align right
    paddingVertical: 16,
  },
  controlRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "flex-end", // Align right
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
