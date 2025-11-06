import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import type {
  BluetoothDevice,
  BluetoothState,
  VehicleTelemetry,
} from "../types";
import { bluetoothService } from "@services/bluetoothService";

interface BluetoothContextType {
  state: BluetoothState;
  connectedDevice: BluetoothDevice | null;
  telemetry: VehicleTelemetry | null;
  connect: (device: BluetoothDevice) => Promise<boolean>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
}

const BluetoothContext = createContext<BluetoothContextType | undefined>(
  undefined
);

export function BluetoothProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BluetoothState>("disconnected");
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDevice | null>(null);
  const [telemetry, setTelemetry] = useState<VehicleTelemetry | null>(null);

  const connect = useCallback(async (device: BluetoothDevice) => {
    setState("connecting");
    try {
      const success = await bluetoothService.connect(device.id); // Use device.id for BLE
      if (success) {
        setState("connected");
        setConnectedDevice(device);
        return true;
      } else {
        setState("error");
        return false;
      }
    } catch (error) {
      setState("error");
      console.error("Connection error:", error);
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await bluetoothService.disconnect();
      setState("disconnected");
      setConnectedDevice(null);
      setTelemetry(null);
    } catch (error) {
      setState("error");
      console.error("Disconnection error:", error);
    }
  }, []);

  const isConnected = useCallback(() => state === "connected", [state]);

  return (
    <BluetoothContext.Provider
      value={{
        state,
        connectedDevice,
        telemetry,
        connect,
        disconnect,
        isConnected,
      }}
    >
      {children}
    </BluetoothContext.Provider>
  );
}

export function useBluetooth() {
  const context = useContext(BluetoothContext);
  if (context === undefined) {
    throw new Error("useBluetooth must be used within a BluetoothProvider");
  }
  return context;
}
