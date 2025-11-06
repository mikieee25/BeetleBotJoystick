import React, { useState } from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import { HapticService } from "@services/hapticService";

interface ClawControlProps {
  onToggle?: (isOpen: boolean) => void;
  size?: number;
}

export function ClawControl({ onToggle, size = 120 }: ClawControlProps) {
  const [isClosed, setIsClosed] = useState(false);

  const handlePress = async () => {
    await HapticService.mediumTap();
    const newState = !isClosed;
    setIsClosed(newState);
    onToggle?.(!newState); // Send opposite - when closed=true, send open=false
  };

  return (
    <Pressable
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        isClosed && styles.containerClosed,
      ]}
      onPress={handlePress}
    >
      {isClosed ? (
        <Svg width={size * 0.75} height={size * 0.75} viewBox="24 23 77 78">
          <Path
            d="M45.251 56.764l1.517 13.966c.76 7.003 7.131 12.01 14.115 11.095l-.478-10.294-2.868-1.707a10.975 10.975 0 01-5.274-10.833l.013-.104a11.294 11.294 0 013.698-7l3.069-2.727 2.908-9.82-8.098 3.191a13.707 13.707 0 00-8.602 14.233zM80.418 56.858l-1.64 13.953c-.823 6.995-7.237 11.946-14.213 10.97l.569-10.29 2.883-1.681a10.975 10.975 0 005.37-10.787l-.012-.104a11.294 11.294 0 00-3.637-7.032l-3.044-2.754-2.821-9.846 8.07 3.263a13.708 13.708 0 018.475 14.308z"
            fill="#FF9E42"
          />
        </Svg>
      ) : (
        <Svg width={size * 0.75} height={size * 0.75} viewBox="24 23 77 78">
          <Path
            d="M34.653 67.413l8.444 11.227c4.233 5.63 12.268 6.676 17.803 2.319l-5.674-8.603h-3.338a10.975 10.975 0 01-10.072-6.614l-.041-.096a11.294 11.294 0 01-.4-7.906l1.242-3.914-2.521-9.926-5.328 6.883a13.707 13.707 0 00-.115 16.63zM90.147 67.413L81.703 78.64c-4.234 5.63-12.269 6.676-17.803 2.319l5.674-8.603h3.338a10.975 10.975 0 0010.071-6.614l.042-.096a11.294 11.294 0 00.4-7.906l-1.242-3.914 2.521-9.926 5.328 6.883a13.707 13.707 0 01.115 16.63z"
            fill="#999"
          />
        </Svg>
      )}
      <Text style={[styles.label, isClosed && styles.labelClosed]}>
        {isClosed ? "CLOSE" : "OPEN"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  containerOpen: {
    backgroundColor: "#FFE5D0",
    borderColor: "#FF9E42",
  },
  containerClosed: {
    backgroundColor: "#FFE5D0",
    borderColor: "#FF9E42",
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#999",
    marginTop: 4,
  },
  labelOpen: {
    color: "#FF9E42",
  },
  labelClosed: {
    color: "#FF9E42",
  },
});
