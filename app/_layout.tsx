import React from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BluetoothProvider } from "@contexts/bluetoothContext";
import { VehicleControlProvider } from "@contexts/vehicleControlContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BluetoothProvider>
          <VehicleControlProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#fafafa" },
              }}
            >
              <Stack.Screen name="index" />
            </Stack>
          </VehicleControlProvider>
        </BluetoothProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
