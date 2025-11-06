import React, { useState, useRef, useCallback } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import type { GearType } from "../types";
import { HapticService } from "@services/hapticService";

interface GearSelectorProps {
  onGearChange?: (gear: GearType) => void;
  size?: number;
}

export function GearSelector({ onGearChange, size = 140 }: GearSelectorProps) {
  const [selectedGear, setSelectedGear] = useState<GearType>("1");

  const gears: GearType[] = ["2", "1", "R"];
  const sliderHeight = size - 60;
  const segmentHeight = sliderHeight / 2;

  // Shared values for slider position
  const translateY = useSharedValue(0);
  const startY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const updateGear = useCallback(
    (newGear: GearType) => {
      if (newGear !== selectedGear) {
        HapticService.mediumTap();
        setSelectedGear(newGear);
        onGearChange?.(newGear);
      }
    },
    [selectedGear, onGearChange]
  );

  const snapToGear = useCallback(
    (position: number) => {
      "worklet";
      let targetGear: GearType = "1";
      let targetPosition = 0;

      // Snap to nearest gear position
      if (position < -segmentHeight * 0.4) {
        targetGear = "2";
        targetPosition = -segmentHeight;
      } else if (position > segmentHeight * 0.4) {
        targetGear = "R";
        targetPosition = segmentHeight;
      } else {
        targetGear = "1";
        targetPosition = 0;
      }

      return { targetGear, targetPosition };
    },
    [segmentHeight]
  );

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onBegin(() => {
      "worklet";
      isDragging.value = true;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      "worklet";
      if (!isDragging.value) return;

      const newPosition = startY.value + event.translationY;

      // Clamp movement with slight overscroll
      const maxOverscroll = 10;
      const clampedY = Math.max(
        -segmentHeight - maxOverscroll,
        Math.min(segmentHeight + maxOverscroll, newPosition)
      );
      
      translateY.value = clampedY;
    })
    .onEnd(() => {
      "worklet";
      isDragging.value = false;

      const { targetGear, targetPosition } = snapToGear(translateY.value);

      // Smooth spring animation to snap position
      translateY.value = withSpring(
        targetPosition,
        {
          damping: 20,
          stiffness: 200,
          mass: 0.5,
        },
        () => {
          runOnJS(updateGear)(targetGear);
        }
      );
    })
    .onFinalize(() => {
      "worklet";
      isDragging.value = false;
    });

  const sliderAnimatedStyle = useAnimatedStyle(() => {
    // Add slight scale when dragging for better feedback
    const scale = isDragging.value ? 1.1 : 1;
    
    return {
      transform: [
        { translateY: translateY.value },
        { scale },
      ],
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={styles.title}>GEAR</Text>
      <View style={styles.sliderContainer}>
        {/* Gear labels on the left side */}
        <View style={[styles.gearLabelsLeft, { height: sliderHeight }]}>
          {/* Top - Gear 2 */}
          <View style={[styles.gearLabelLeft, { top: 0 }]}>
            <Text
              style={[
                styles.gearText,
                selectedGear === "2" && styles.gearTextActive,
              ]}
            >
              2
            </Text>
          </View>

          {/* Middle - Gear 1 */}
          <View
            style={[
              styles.gearLabelLeft,
              { top: "50%", transform: [{ translateY: -11 }] },
            ]}
          >
            <Text
              style={[
                styles.gearText,
                selectedGear === "1" && styles.gearTextActive,
              ]}
            >
              1
            </Text>
          </View>

          {/* Bottom - Reverse */}
          <View style={[styles.gearLabelLeft, { bottom: 0 }]}>
            <Text
              style={[
                styles.gearText,
                selectedGear === "R" && styles.gearTextActive,
              ]}
            >
              R
            </Text>
          </View>
        </View>

        {/* Slider track */}
        <View style={[styles.sliderTrack, { height: sliderHeight }]}>
          {/* Slider handle */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.sliderHandle, sliderAnimatedStyle]}>
              <View style={styles.handleInner} />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginBottom: 12,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sliderTrack: {
    width: 60,
    backgroundColor: "#e0e0e0",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "visible",
  },
  gearLabelsLeft: {
    position: "relative",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingRight: 8,
  },
  gearLabelLeft: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "flex-end",
    right: 0,
  },
  gearText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#666",
  },
  gearTextActive: {
    color: "#FF9E42",
    fontSize: 24,
  },
  sliderHandle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 3,
    borderColor: "#FF9E42",
    // @ts-ignore - touchAction is web-only
    touchAction: "none",
  },
  handleInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF9E42",
  },
});
