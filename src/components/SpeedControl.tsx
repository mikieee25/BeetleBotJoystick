import React, { useState } from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HapticService } from "@services/hapticService";

interface SpeedControlProps {
  onSpeedChange?: (speed: number) => void;
  size?: number;
}

export function SpeedControl({ onSpeedChange, size = 120 }: SpeedControlProps) {
  const [speed, setSpeed] = useState(50);

  const handleIncrease = async () => {
    if (speed < 100) {
      await HapticService.lightTap();
      const newSpeed = Math.min(100, speed + 10);
      setSpeed(newSpeed);
      onSpeedChange?.(newSpeed);
    }
  };

  const handleDecrease = async () => {
    if (speed > 0) {
      await HapticService.lightTap();
      const newSpeed = Math.max(0, speed - 10);
      setSpeed(newSpeed);
      onSpeedChange?.(newSpeed);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>SPEED</Text>
      <View style={styles.controlsContainer}>
        <Pressable
          style={[styles.button, styles.decreaseButton, { width: size * 0.35 }]}
          onPress={handleDecrease}
        >
          <MaterialCommunityIcons
            name="minus"
            size={size * 0.25}
            color="#999"
          />
        </Pressable>

        <View style={[styles.speedDisplay, { width: size * 0.25 }]}>
          <Text style={styles.speedText}>{speed}</Text>
        </View>

        <Pressable
          style={[styles.button, styles.increaseButton, { width: size * 0.35 }]}
          onPress={handleIncrease}
        >
          <MaterialCommunityIcons name="plus" size={size * 0.25} color="#999" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    gap: 8,
  },
  button: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 8,
  },
  decreaseButton: {},
  increaseButton: {},
  speedDisplay: {
    backgroundColor: "#FFE5D0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
  },
  speedText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF9E42",
  },
});
