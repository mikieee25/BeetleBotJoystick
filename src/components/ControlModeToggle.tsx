import React from "react";
import { StyleSheet, TouchableOpacity, Text } from "react-native";
import type { ControlMode } from "../types";

interface ControlModeToggleProps {
  mode: ControlMode;
  onModeChange: (mode: ControlMode) => void;
}

export function ControlModeToggle({
  mode,
  onModeChange,
}: ControlModeToggleProps) {
  const isGyro = mode === "gyro";

  return (
    <TouchableOpacity
      style={[styles.button, isGyro && styles.buttonActive]}
      onPress={() => onModeChange(isGyro ? "joystick" : "gyro")}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, isGyro && styles.textActive]}>
        {isGyro ? "GYRO" : "JOYSTICK"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  buttonActive: {
    backgroundColor: "#FF9E42",
    borderColor: "#ff8c1f",
  },
  text: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
    letterSpacing: 0.5,
  },
  textActive: {
    color: "#fff",
  },
});
