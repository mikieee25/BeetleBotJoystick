"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View, Text } from "react-native";
import {
  Gesture,
  GestureDetector,
  PanGesture,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import type { JoystickData } from "../types";
import { JoystickMath } from "@utils/joystickMath";
import { HapticService } from "@services/hapticService";

interface JoystickProps {
  size?: number;
  onMove?: (data: JoystickData) => void;
  onStop?: () => void;
  deadzone?: number;
}

export function Joystick({
  size = 150,
  onMove,
  onStop,
  deadzone = 0.1,
}: JoystickProps) {
  const radius = size / 2;
  const stickSize = size / 3;
  const maxDistance = radius - stickSize / 2;

  // Shared animation values for joystick stick position
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Track if joystick is actively being moved
  const isMovingRef = useRef(false);

  // Normalize joystick input and trigger callback with haptic feedback
  const updateJoystickPosition = useCallback(
    (dx: number, dy: number) => {
      const data = JoystickMath.normalize(dx, dy, maxDistance, deadzone);

      // Trigger haptic feedback on initial movement
      if (data.distance > 0.1 && !isMovingRef.current) {
        isMovingRef.current = true;
        HapticService.lightTap();
      }

      if (onMove) {
        onMove(data);
      }
    },
    [maxDistance, deadzone, onMove]
  );

  // Reset joystick and trigger stop callback
  const handleJoystickStop = useCallback(() => {
    isMovingRef.current = false;
    if (onStop) {
      onStop();
    }
    HapticService.lightTap();
  }, [onStop]);

  // Pan gesture: detect touch movement and constrain to circular boundary
  const panGesture = Gesture.Pan()
    .maxPointers(2)
    .minPointers(1)
    .simultaneousWithExternalGesture(Gesture.Native())
    .onUpdate((event: any) => {
      "worklet";
      const dx = event.translationX;
      const dy = event.translationY;

      // Calculate distance and constrain stick to circle boundary
      const distance = Math.sqrt(dx * dx + dy * dy);

      let newX = dx;
      let newY = dy;

      if (distance > maxDistance) {
        const angle = Math.atan2(dy, dx);
        newX = Math.cos(angle) * maxDistance;
        newY = Math.sin(angle) * maxDistance;
      }

      // Update animated position
      translateX.value = newX;
      translateY.value = newY;

      runOnJS(updateJoystickPosition)(newX, newY);
    })
    .onEnd(() => {
      "worklet";
      // Animate stick back to center smoothly
      translateX.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });

      runOnJS(handleJoystickStop)();
    });

  // Animated style for stick position updates
  const stickAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
    };
  });

  return (
    <View style={[styles.wrapper, { width: size + 40, height: size + 40 }]}>
      <View style={[styles.container, { width: size, height: size }]}>
        {/* Outer base circle with crosshairs */}
        <View
          style={[
            styles.base,
            {
              width: size,
              height: size,
              borderRadius: radius,
            },
          ]}
        >
          {/* Cardinal direction guide lines */}
          <View style={styles.directionalLines}>
            <View
              style={[styles.line, styles.lineVertical, { height: size * 0.6 }]}
            />
            <View
              style={[
                styles.line,
                styles.lineHorizontal,
                { width: size * 0.6 },
              ]}
            />
          </View>

          {/* Cardinal direction indicators */}
          <Text
            style={[
              styles.directionLabel,
              styles.labelNorth,
              { fontSize: size * 0.12 },
            ]}
          >
            ↑
          </Text>
          <Text
            style={[
              styles.directionLabel,
              styles.labelSouth,
              { fontSize: size * 0.12 },
            ]}
          >
            ↓
          </Text>
          <Text
            style={[
              styles.directionLabel,
              styles.labelEast,
              { fontSize: size * 0.12 },
            ]}
          >
            →
          </Text>
          <Text
            style={[
              styles.directionLabel,
              styles.labelWest,
              { fontSize: size * 0.12 },
            ]}
          >
            ←
          </Text>

          {/* Center reference point */}
          <View
            style={[
              styles.centerDot,
              {
                width: size * 0.08,
                height: size * 0.08,
                borderRadius: (size * 0.08) / 2,
              },
            ]}
          />

          {/* Draggable stick (interactive element) */}
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.stick,
                {
                  width: stickSize,
                  height: stickSize,
                  borderRadius: stickSize / 2,
                },
                stickAnimatedStyle,
              ]}
            >
              <View style={styles.stickInner} />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    padding: 20,
  },
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  base: {
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  directionalLines: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
  },
  line: {
    backgroundColor: "#d0d0d0",
    position: "absolute",
  },
  lineVertical: {
    width: 1,
  },
  lineHorizontal: {
    height: 1,
  },
  centerDot: {
    backgroundColor: "#999",
    position: "absolute",
  },
  stick: {
    backgroundColor: "#FF9E42",
    borderWidth: 1,
    borderColor: "#ff8c1f",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    // @ts-ignore - touchAction is web-only
    touchAction: "none",
  },
  stickInner: {
    width: "60%",
    height: "60%",
    backgroundColor: "#FFB366",
    borderRadius: 999,
  },
  directionLabel: {
    position: "absolute",
    color: "#b0b0b0",
    fontWeight: "700",
  },
  labelNorth: {
    top: "8%",
    left: "50%",
    marginLeft: -8,
  },
  labelSouth: {
    bottom: "8%",
    left: "50%",
    marginLeft: -8,
  },
  labelEast: {
    right: "8%",
    top: "50%",
    marginTop: -12,
  },
  labelWest: {
    left: "8%",
    top: "50%",
    marginTop: -12,
  },
});
