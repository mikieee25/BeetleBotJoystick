import { useState, useEffect, useRef } from "react";
import { PermissionsAndroid, Platform, Alert, Linking } from "react-native";
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
    const initBle = async () => {
      console.log("Initializing BLE Manager...");
      bleManagerRef.current = new BleManager({
        restoreStateIdentifier: "beetlebot-ble-manager",
        restoreStateFunction: (restoredState) => {
          console.log("BLE state restored:", restoredState);
        },
      });

      // Check BLE state and wait for it to be powered on
      const subscription = bleManagerRef.current.onStateChange((state) => {
        console.log("BLE State changed to:", state);
        if (state === "PoweredOn") {
          subscription.remove();
        } else if (state === "PoweredOff") {
          console.log("Bluetooth is powered off");
        }
      }, true);
    };

    initBle();

    return () => {
      if (bleManagerRef.current) {
        console.log("Destroying BLE Manager...");
        bleManagerRef.current.destroy();
      }
    };
  }, []);

  // Request required Bluetooth and location permissions
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      if (Platform.Version >= 31) {
        // Android 12+ requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const scanGranted =
          permissions["android.permission.BLUETOOTH_SCAN"] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const connectGranted =
          permissions["android.permission.BLUETOOTH_CONNECT"] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const locationGranted =
          permissions["android.permission.ACCESS_FINE_LOCATION"] ===
          PermissionsAndroid.RESULTS.GRANTED;

        console.log(
          "Permissions - Scan:",
          scanGranted,
          "Connect:",
          connectGranted,
          "Location:",
          locationGranted
        );

        return scanGranted && connectGranted && locationGranted;
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

  // Check if location services are enabled (required for BLE scanning on Android)
  const checkLocationEnabled = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        const locationEnabled = await Location.hasServicesEnabledAsync();
        if (!locationEnabled) {
          Alert.alert(
            "Location Required",
            "BLE scanning requires Location services to be enabled. Please enable Location in your device settings.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
          return false;
        }
      }
    }
    return true;
  };

  // Start BLE device scan and show modal with results
  const scanForDevices = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      console.error("Permissions not granted");
      return;
    }

    // Check if location services are enabled
    const locationEnabled = await checkLocationEnabled();
    if (!locationEnabled) {
      console.error("Location services not enabled");
      return;
    }

    // Stop any existing scan
    if (bleManagerRef.current) {
      bleManagerRef.current.stopDeviceScan();
    }

    // Check if BLE is available and powered on
    const state = await bleManagerRef.current?.state();
    console.log("BLE State before scan:", state);
    if (state !== "PoweredOn") {
      console.error("Bluetooth is not enabled. Current state:", state);
      return;
    }

    setDevicesMap(new Map());
    setIsScanning(true);
    setShowDeviceModal(true);

    console.log("Starting BLE device scan with aggressive parameters...");
    console.log("Platform:", Platform.OS, "Version:", Platform.Version);

    // Try to scan for devices with multiple strategies
    bleManagerRef.current?.startDeviceScan(
      null, // Service UUIDs filter (null = all devices)
      {
        allowDuplicates: true, // Allow seeing same device multiple times
        scanMode: 2, // SCAN_MODE_LOW_LATENCY (most aggressive)
        callbackType: 1, // CALLBACK_TYPE_ALL_MATCHES
        legacyScan: true, // Use legacy scan mode for better compatibility
      },
      (error, scannedDevice) => {
        if (error) {
          console.error("Scan error:", error);
          setIsScanning(false);
          return;
        }

        // Collect only devices with names
        if (scannedDevice && scannedDevice.name) {
          console.log(
            "Device found:",
            scannedDevice.name,
            scannedDevice.id,
            "RSSI:",
            scannedDevice.rssi
          );

          setDevicesMap((prevMap) => {
            const newMap = new Map(prevMap);
            newMap.set(scannedDevice.id, scannedDevice);
            return newMap;
          });
        }
      }
    );

    // Auto-stop scan after 30 seconds
    setTimeout(() => {
      console.log("Scan timeout - stopping scan");
      stopScan();
    }, 30000);
  };

  // Stop active BLE scan
  const stopScan = () => {
    console.log("Stopping BLE scan. Devices found:", devicesMap.size);
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
