import { useState, useEffect, useRef } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device, Characteristic } from "react-native-ble-plx";
import * as Location from "expo-location";
import base64 from "base-64";

const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
const CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

interface UseBleReturn {
  device: Device | null;
  devicesMap: Map<string, Device>;
  isScanning: boolean;
  connectedDeviceId: string | null;
  showDeviceModal: boolean;
  setShowDeviceModal: (show: boolean) => void;
  scanForDevices: () => Promise<void>;
  stopScan: () => void;
  connectToDevice: (device: Device) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  sendCommand: (command: string) => Promise<void>;
}

export const useBle = (): UseBleReturn => {
  const bleManagerRef = useRef<BleManager | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [devicesMap, setDevicesMap] = useState<Map<string, Device>>(new Map());
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(
    null
  );
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  useEffect(() => {
    bleManagerRef.current = new BleManager();

    return () => {
      if (bleManagerRef.current) {
        bleManagerRef.current.destroy();
      }
    };
  }, []);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      if (Platform.Version >= 31) {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          permissions["android.permission.BLUETOOTH_SCAN"] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          permissions["android.permission.BLUETOOTH_CONNECT"] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          permissions["android.permission.ACCESS_FINE_LOCATION"] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }

    if (Platform.OS === "ios") {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    }

    return true;
  };

  const scanForDevices = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      console.log("Permissions not granted");
      return;
    }

    setDevicesMap(new Map());
    setIsScanning(true);
    setShowDeviceModal(true);

    bleManagerRef.current?.startDeviceScan(
      null,
      null,
      (error, scannedDevice) => {
        if (error) {
          console.error("Scan error:", error);
          setIsScanning(false);
          return;
        }

        if (scannedDevice && scannedDevice.name) {
          setDevicesMap((prevMap) => {
            const newMap = new Map(prevMap);
            newMap.set(scannedDevice.id, scannedDevice);
            return newMap;
          });
        }
      }
    );

    // Auto-stop scan after 10 seconds
    setTimeout(() => {
      stopScan();
    }, 10000);
  };

  const stopScan = () => {
    bleManagerRef.current?.stopDeviceScan();
    setIsScanning(false);
  };

  const connectToDevice = async (deviceToConnect: Device) => {
    try {
      stopScan();

      const connectedDevice = await bleManagerRef.current?.connectToDevice(
        deviceToConnect.id
      );
      if (!connectedDevice) {
        throw new Error("Failed to connect to device");
      }

      await connectedDevice.discoverAllServicesAndCharacteristics();

      // List all services and characteristics
      console.log("🔍 Discovering services...");
      const services = await connectedDevice.services();
      console.log(`Found ${services.length} services:`);

      for (const service of services) {
        console.log(`  📦 Service: ${service.uuid}`);
        const characteristics = await service.characteristics();
        console.log(`     Found ${characteristics.length} characteristics:`);
        for (const char of characteristics) {
          console.log(`       📝 Characteristic: ${char.uuid}`);
          console.log(`          - isReadable: ${char.isReadable}`);
          console.log(
            `          - isWritableWithResponse: ${char.isWritableWithResponse}`
          );
          console.log(
            `          - isWritableWithoutResponse: ${char.isWritableWithoutResponse}`
          );
          console.log(`          - isNotifiable: ${char.isNotifiable}`);
        }
      }

      deviceRef.current = connectedDevice;
      setDevice(connectedDevice);
      setConnectedDeviceId(connectedDevice.id);
      setShowDeviceModal(false);

      console.log(
        "Connected to device:",
        connectedDevice.name || connectedDevice.id
      );
    } catch (error) {
      console.error("Connection error:", error);
      deviceRef.current = null;
      setDevice(null);
      setConnectedDeviceId(null);
    }
  };

  const disconnectDevice = async () => {
    if (deviceRef.current) {
      try {
        await bleManagerRef.current?.cancelDeviceConnection(
          deviceRef.current.id
        );
        deviceRef.current = null;
        setDevice(null);
        setConnectedDeviceId(null);
        console.log("Disconnected from device");
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    }
  };

  const sendCommand = async (command: string) => {
    // Use ref to avoid closure issues with state
    const currentDevice = deviceRef.current;

    if (!currentDevice) {
      console.warn("No device connected");
      return;
    }

    try {
      console.log("Sending command:", command);
      console.log("Service UUID:", SERVICE_UUID);
      console.log("Characteristic UUID:", CHARACTERISTIC_UUID);

      // Convert string to base64 for BLE transmission
      const encodedCommand = base64.encode(command);
      console.log("Base64 encoded:", encodedCommand);

      // Try WITH response first (more reliable)
      try {
        await currentDevice.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          encodedCommand
        );
        console.log("✓ Command sent WITH response");
      } catch (withResponseError) {
        console.warn("Write with response failed, trying without response...");
        // Fallback to without response
        await currentDevice.writeCharacteristicWithoutResponseForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          encodedCommand
        );
        console.log("✓ Command sent WITHOUT response");
      }
    } catch (error: any) {
      console.error("Send command error:", error);
      console.error("Error details:", {
        message: error?.message,
        reason: error?.reason,
        errorCode: error?.errorCode,
      });

      // Try to reconnect if write failed
      if (error instanceof Error && error.message.includes("disconnected")) {
        deviceRef.current = null;
        setDevice(null);
        setConnectedDeviceId(null);
      }
    }
  };

  return {
    device,
    devicesMap,
    isScanning,
    connectedDeviceId,
    showDeviceModal,
    setShowDeviceModal,
    scanForDevices,
    stopScan,
    connectToDevice,
    disconnectDevice,
    sendCommand,
  };
};
