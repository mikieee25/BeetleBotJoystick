import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS } from "react-native-reanimated";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HapticService } from "@services/hapticService";

interface SpeedControlProps {
  onSpeedChange?: (speed: number) => void;
  size?: number;
}

export function SpeedControl({ onSpeedChange, size = 120 }: SpeedControlProps) {
  const [speed, setSpeed] = useState(50);

  const handleIncrease = useCallback(async () => {
    if (speed < 100) {
      await HapticService.lightTap();
      const newSpeed = Math.min(100, speed + 10);
      setSpeed(newSpeed);
      onSpeedChange?.(newSpeed);
    }
  }, [onSpeedChange, speed]);

  const handleDecrease = useCallback(async () => {
    if (speed > 0) {
      await HapticService.lightTap();
      const newSpeed = Math.max(0, speed - 10);
      setSpeed(newSpeed);
      onSpeedChange?.(newSpeed);
    }
  }, [onSpeedChange, speed]);

  const decreaseGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(350)
        .simultaneousWithExternalGesture()
        .onEnd(() => {
          "worklet";
          runOnJS(handleDecrease)();
        }),
    [handleDecrease]
  );

  const increaseGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(350)
        .simultaneousWithExternalGesture()
        .onEnd(() => {
          "worklet";
          runOnJS(handleIncrease)();
        }),
    [handleIncrease]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>SPEED</Text>
      <View style={styles.controlsContainer}>
        <GestureDetector gesture={decreaseGesture}>
          <Animated.View
            style={[styles.button, styles.decreaseButton, { width: size * 0.35 }]}
          >
            <MaterialCommunityIcons
              name="minus"
              size={size * 0.25}
              color="#999"
            />
          </Animated.View>
        </GestureDetector>

        <View style={[styles.speedDisplay, { width: size * 0.25 }]}>
          <Text style={styles.speedText}>{speed}</Text>
        </View>

        <GestureDetector gesture={increaseGesture}>
          <Animated.View
            style={[styles.button, styles.increaseButton, { width: size * 0.35 }]}
          >
            <MaterialCommunityIcons
              name="plus"
              size={size * 0.25}
              color="#999"
            />
          </Animated.View>
        </GestureDetector>
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
