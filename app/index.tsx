import React, { useCallback, useState, useRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Joystick } from "@components/Joystick";
import { GearSelector } from "@components/GearSelector";
import { ClawControl } from "@components/ClawControl";
import { BluetoothConnectorV2 } from "@components/BluetoothConnectorV2";
import { useVehicleControl } from "@contexts/vehicleControlContext";
import { JoystickMath } from "@utils/joystickMath";
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

  /**
   * Handle Bluetooth connection
   */
  const handleConnected = useCallback(
    (deviceId: string, sendCommand: (cmd: string) => Promise<void>) => {
      setConnectedDeviceId(deviceId);
      setSendCommandFn(() => sendCommand);

      // Send initial commands (matching friend's code)
      const initCommands = async () => {
        try {
          await sendCommand("/");
          console.log("Sent initialization command: /");
          // Wait a bit before sending max speed
          await new Promise((resolve) => setTimeout(resolve, 200));
          await sendCommand("MAX:100"); // Start with safer default (100)
          console.log("Sent initial max speed command: MAX:100");
        } catch (error) {
          console.error("Initialization error:", error);
        }
      };
      initCommands();
    },
    []
  );

  /**
   * Handle Bluetooth disconnection
   */
  const handleDisconnected = useCallback(() => {
    setConnectedDeviceId(null);
    setSendCommandFn(null);
  }, []);

  // Refs to track previous state
  const lastCommandRef = useRef<string | null>(null);
  const speedSentRef = useRef<boolean>(false);

  /**
   * Handle joystick movement and send motor commands
   */
  const handleJoystickMove = useCallback(
    (data: JoystickData) => {
      setJoystickData(data);

      // Calculate motor speeds using arcade drive
      const speeds = JoystickMath.calculateMotorSpeeds(data, "arcade", 100);
      setMotorSpeeds(speeds);

      if (!sendCommandFn || !connectedDeviceId) return;

      // Determine direction based on joystick position and gear
      const moveThreshold = 20; // Minimum movement to trigger motor
      const turnThreshold = 35; // Difference between left/right before turning kicks in
      let directionCommand = "S";

      // Check if we should move forward or backward based on gear
      const shouldMoveForward = currentGear === "1" || currentGear === "2";
      const shouldMoveBackward = currentGear === "R";

      if (
        shouldMoveForward &&
        (speeds.left > moveThreshold || speeds.right > moveThreshold)
      ) {
        // Moving forward (Gear 1 or 2)
        if (Math.abs(speeds.left - speeds.right) < turnThreshold) {
          directionCommand = "F"; // Straight forward - speeds are similar
        } else if (speeds.left > speeds.right) {
          directionCommand = "FR"; // Forward Right
        } else {
          directionCommand = "FL"; // Forward Left
        }
      } else if (
        shouldMoveBackward &&
        (speeds.left > moveThreshold || speeds.right > moveThreshold)
      ) {
        // Moving backward (Gear R - joystick forward = car backward)
        if (Math.abs(speeds.left - speeds.right) < turnThreshold) {
          directionCommand = "B"; // Straight backward - speeds are similar
        } else if (speeds.left > speeds.right) {
          directionCommand = "BR"; // Backward Right
        } else {
          directionCommand = "BL"; // Backward Left
        }
      }

      // Send direction command if it changed
      if (directionCommand !== lastCommandRef.current) {
        sendCommandFn(directionCommand).catch(console.error);
        lastCommandRef.current = directionCommand;
        speedSentRef.current = false; // Reset speed flag when direction changes
      }

      // Send speed command based on gear (only once per movement)
      if (directionCommand !== "S" && !speedSentRef.current) {
        if (currentGear === "2") {
          // High speed - send more + commands
          sendCommandFn("+").catch(console.error);
          setTimeout(() => sendCommandFn("+").catch(console.error), 100);
          setTimeout(() => sendCommandFn("+").catch(console.error), 200);
        } else if (currentGear === "1") {
          // Medium speed - send one + command
          sendCommandFn("+").catch(console.error);
        }
        // Gear R uses the same speed as Gear 1
        speedSentRef.current = true;
      }
    },
    [setJoystickData, sendCommandFn, connectedDeviceId, currentGear]
  );

  /**
   * Handle joystick release
   */
  const handleJoystickStop = useCallback(() => {
    setJoystickData(null);
    setMotorSpeeds({ left: 0, right: 0 });

    // Reset tracking
    lastCommandRef.current = null;
    speedSentRef.current = false;

    if (sendCommandFn && connectedDeviceId) {
      sendCommandFn("S").catch(console.error); // Stop command
    }
  }, [setJoystickData, sendCommandFn, connectedDeviceId]);

  /**
   * Handle gear change
   */
  const handleGearChange = useCallback(
    (gear: GearType) => {
      setGear(gear);
      // Reset speed tracking when gear changes
      speedSentRef.current = false;

      // Stop the robot and set max speed based on gear
      if (sendCommandFn && connectedDeviceId) {
        sendCommandFn("S").catch(console.error);
        lastCommandRef.current = null;

        // Set MAX speed based on gear - reduced to prevent motor overload
        const maxSpeed = gear === "2" ? 180 : 100; // Gear 2: 180 (~70%), Gear 1 & R: 100 (~40%)
        setTimeout(() => {
          sendCommandFn(`MAX:${maxSpeed}`).catch(console.error);
          console.log(`Gear ${gear}: MAX speed set to ${maxSpeed}`);
        }, 100); // Small delay after stop command
      }
    },
    [setGear, sendCommandFn, connectedDeviceId]
  );

  /**
   * Handle claw toggle
   */
  const handleClawToggle = useCallback(
    (isOpen: boolean) => {
      toggleClaw();
      if (sendCommandFn && connectedDeviceId) {
        // Send servo commands: "O" for Open, "C" for Close
        // Alternative formats if these don't work:
        // - "SERVO:180" for open, "SERVO:0" for close
        // - "G" for grip (close), "U" for ungrip (open)
        const command = isOpen ? "O" : "C";
        console.log(`Claw command: ${command} (${isOpen ? "OPEN" : "CLOSE"})`);
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
      {/* Header */}
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

      {/* Main Controls */}
      <View style={styles.mainContent}>
        {/* Left Side - Joystick */}
        <View style={styles.leftSection}>
          <Joystick
            size={180}
            onMove={handleJoystickMove}
            onStop={handleJoystickStop}
            deadzone={0.1}
          />
        </View>

        {/* Right Side - Controls */}
        <View style={styles.rightSection}>
          <View style={styles.controlRow}>
            <GearSelector onGearChange={handleGearChange} size={200} />
            <ClawControl onToggle={handleClawToggle} size={120} />
          </View>
        </View>
      </View>

      {/* Status Bar */}
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
    gap: 24,
  },
  leftSection: {
    flex: 1.2,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  rightSection: {
    flex: 0.8,
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: 16,
  },
  controlRow: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
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
