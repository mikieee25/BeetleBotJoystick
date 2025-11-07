import { useState, useEffect, useRef } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, Device, Characteristic } from "react-native-ble-plx";
import * as Location from "expo-location";
import base64 from "base-64";

// ESP32 BLE service and characteristic UUIDs
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

  // Initialize BLE manager on mount
  useEffect(() => {
    bleManagerRef.current = new BleManager();

    return () => {
      if (bleManagerRef.current) {
        bleManagerRef.current.destroy();
      }
    };
  }, []);

  // Request required Bluetooth and location permissions
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

  // Start BLE device scan and show modal with results
  const scanForDevices = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
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

        // Collect all devices with names
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

  // Stop active BLE scan
  const stopScan = () => {
    bleManagerRef.current?.stopDeviceScan();
    setIsScanning(false);
  };

  // Connect to BLE device and discover services/characteristics
  const connectToDevice = async (deviceToConnect: Device) => {
    try {
      stopScan();

      const connectedDevice = await bleManagerRef.current?.connectToDevice(
        deviceToConnect.id
      );
      if (!connectedDevice) {
        throw new Error("Failed to connect to device");
      }

      // Discover all available services and characteristics
      await connectedDevice.discoverAllServicesAndCharacteristics();

      deviceRef.current = connectedDevice;
      setDevice(connectedDevice);
      setConnectedDeviceId(connectedDevice.id);
      setShowDeviceModal(false);
    } catch (error) {
      console.error("Connection error:", error);
      deviceRef.current = null;
      setDevice(null);
      setConnectedDeviceId(null);
    }
  };

  // Disconnect from currently connected BLE device
  const disconnectDevice = async () => {
    if (deviceRef.current) {
      try {
        await bleManagerRef.current?.cancelDeviceConnection(
          deviceRef.current.id
        );
        deviceRef.current = null;
        setDevice(null);
        setConnectedDeviceId(null);
      } catch (error) {
        console.error("Disconnect error:", error);
      }
    }
  };

  // Send command string to ESP32 via BLE (base64 encoded)
  const sendCommand = async (command: string) => {
    const currentDevice = deviceRef.current;

    if (!currentDevice) {
      console.warn("No device connected");
      return;
    }

    try {
      // Encode command to base64 for BLE transmission
      const encodedCommand = base64.encode(command);

      // Try write with response first (more reliable), fallback to without response
      try {
        await currentDevice.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          encodedCommand
        );
      } catch (withResponseError) {
        // Fallback to write without response if with-response fails
        await currentDevice.writeCharacteristicWithoutResponseForService(
          SERVICE_UUID,
          CHARACTERISTIC_UUID,
          encodedCommand
        );
      }
    } catch (error: any) {
      console.error("Send command error:", error);

      // Clear connection if device was disconnected
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
