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

      // Get joystick position: +x = Right, -x = Left, +y = Forward, -y = Backward
      const { x, y } = data;

      // Thresholds
      const deadzone = 0.15; // Minimum joystick movement to register
      const turnThreshold = 0.6; // X must be > 0.6 to trigger turn (very sideways)
      let directionCommand = "S";

      // Determine command based on joystick position
      // Priority: Forward movement unless joystick is strongly sideways

      // Check if joystick is strongly tilted sideways (near horizontal)
      const isStrongSidewaysMovement = Math.abs(x) > turnThreshold;
      const hasForwardMovement = Math.abs(y) > deadzone;

      if (isStrongSidewaysMovement && Math.abs(x) > Math.abs(y)) {
        // Strong sideways tilt AND more sideways than forward = Turn
        if (x > 0) {
          directionCommand = "R"; // +x = Right turn (pivot)
        } else {
          directionCommand = "L"; // -x = Left turn (pivot)
        }
      } else if (hasForwardMovement) {
        // Forward/backward movement (including diagonals)
        // Check gear to determine direction
        const shouldMoveForward = currentGear === "1" || currentGear === "2";
        const shouldMoveBackward = currentGear === "R";

        if (y > 0 && shouldMoveForward) {
          directionCommand = "F"; // +y in forward gears = Forward
        } else if (y > 0 && shouldMoveBackward) {
          directionCommand = "B"; // +y in reverse gear = Backward
        }
        // Ignore -y (backward joystick movement) since we use gears for reverse
      }

      // Send direction command if it changed
      if (directionCommand !== lastCommandRef.current) {
        sendCommandFn(directionCommand).catch(console.error);
        lastCommandRef.current = directionCommand;
        speedSentRef.current = false; // Reset speed flag when direction changes
      }

      // Send speed command based on gear and direction (only once per movement)
      if (directionCommand !== "S" && !speedSentRef.current) {
        // Adjust speed differently for forward vs turning
        const isTurning = directionCommand === "L" || directionCommand === "R";

        if (currentGear === "2") {
          // High speed
          if (isTurning) {
            // Turning: 2× + commands
            sendCommandFn("+").catch(console.error);
            setTimeout(() => sendCommandFn("+").catch(console.error), 100);
          } else {
            // Forward: 4× + commands (faster than turning)
            sendCommandFn("+").catch(console.error);
            setTimeout(() => sendCommandFn("+").catch(console.error), 80);
            setTimeout(() => sendCommandFn("+").catch(console.error), 160);
            setTimeout(() => sendCommandFn("+").catch(console.error), 240);
          }
        } else if (currentGear === "1") {
          // Medium speed
          if (isTurning) {
            // Turning: 1× + command
            sendCommandFn("+").catch(console.error);
          } else {
            // Forward: 2× + commands (faster than turning)
            sendCommandFn("+").catch(console.error);
            setTimeout(() => sendCommandFn("+").catch(console.error), 100);
          }
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

        // Set MAX speed based on gear
        const maxSpeed = gear === "2" ? 255 : 100; // Gear 2: 255 (full power), Gear 1 & R: 100 (~40%)
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
          <View style={styles.joystickWrapper}>
            <Joystick
              size={180}
              onMove={handleJoystickMove}
              onStop={handleJoystickStop}
              deadzone={0.1}
            />
          </View>
        </View>

        {/* Right Side - Controls */}
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
