import { useState, useEffect, useRef, useCallback } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import RNBluetoothClassic, {
  BluetoothDevice,
} from "react-native-bluetooth-classic";

interface UseBluetoothClassicReturn {
  device: BluetoothDevice | null;
  devicesMap: Map<string, BluetoothDevice>;
  isScanning: boolean;
  connectedDeviceId: string | null;
  showDeviceModal: boolean;
  setShowDeviceModal: (show: boolean) => void;
  scanForDevices: () => Promise<void>;
  stopScan: () => void;
  connectToDevice: (device: BluetoothDevice) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  sendCommand: (command: string) => Promise<void>;
}

export const useBluetoothClassic = (): UseBluetoothClassicReturn => {
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [devicesMap, setDevicesMap] = useState<Map<string, BluetoothDevice>>(
    new Map()
  );
  const [isScanning, setIsScanning] = useState(false);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(
    null
  );
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  useEffect(() => {
    // Initialize Bluetooth
    const initBluetooth = async () => {
      try {
        const enabled = await RNBluetoothClassic.isBluetoothEnabled();
        if (!enabled) {
          await RNBluetoothClassic.requestBluetoothEnabled();
        }
      } catch (error) {
        console.error("Bluetooth initialization error:", error);
      }
    };

    initBluetooth();
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

    try {
      // Get bonded (paired) devices
      const bonded = await RNBluetoothClassic.getBondedDevices();
      console.log("Bonded devices:", bonded.length);

      const newMap = new Map<string, BluetoothDevice>();
      bonded.forEach((dev) => {
        console.log(`  - ${dev.name} (${dev.address})`);
        newMap.set(dev.address, dev);
      });

      // Start discovery for new devices
      const unpaired = await RNBluetoothClassic.startDiscovery();
      console.log("Discovered unpaired devices:", unpaired.length);

      unpaired.forEach((dev) => {
        console.log(`  - ${dev.name || "Unknown"} (${dev.address})`);
        newMap.set(dev.address, dev);
      });

      setDevicesMap(newMap);
      setIsScanning(false);
    } catch (error) {
      console.error("Scan error:", error);
      setIsScanning(false);
    }
  };

  const stopScan = () => {
    RNBluetoothClassic.cancelDiscovery();
    setIsScanning(false);
  };

  const connectToDevice = async (deviceToConnect: BluetoothDevice) => {
    try {
      stopScan();

      console.log(
        "Connecting to:",
        deviceToConnect.name,
        deviceToConnect.address
      );
      console.log("Device info:", JSON.stringify(deviceToConnect, null, 2));

      // Check if device is already bonded (paired)
      const bonded = deviceToConnect.bonded;
      console.log("Device bonded status:", bonded);

      // If not bonded, try to pair first
      if (!bonded) {
        console.log("Device not paired, attempting to pair...");
        try {
          const paired = await RNBluetoothClassic.pairDevice(
            deviceToConnect.address
          );
          if (paired) {
            console.log("✓ Successfully paired with device");
            // Wait a moment for the pairing to stabilize
            console.log("Waiting 3 seconds before connecting...");
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Re-fetch device to get updated bonded status
            const bondedDevices = await RNBluetoothClassic.getBondedDevices();
            const updatedDevice = bondedDevices.find(
              (d) => d.address === deviceToConnect.address
            );
            if (updatedDevice) {
              console.log("Using updated bonded device");
              deviceToConnect = updatedDevice;
            }
          } else {
            console.warn("Pairing failed, trying to connect anyway...");
          }
        } catch (pairError) {
          console.warn("Pairing error:", pairError);
          console.log("Attempting connection anyway...");
        }
      }

      // Retry connection up to 3 times
      let connected = false;
      let lastError = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`Connection attempt ${attempt}/3...`);

          // Try simple connection first (some modules don't like options)
          if (attempt === 1) {
            connected = await deviceToConnect.connect();
          } else {
            // On retry, try with explicit options
            connected = await deviceToConnect.connect({
              connectorType: "rfcomm",
              DELIMITER: "\n",
              DEVICE_CHARSET: "utf-8",
            });
          }

          if (connected) {
            console.log("✓ Connection successful!");
            break;
          }
        } catch (connError) {
          lastError = connError;
          console.warn(`Attempt ${attempt} failed:`, connError);

          if (attempt < 3) {
            console.log("Retrying in 1 second...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      if (!connected) {
        throw (
          lastError || new Error("Failed to connect to device after 3 attempts")
        );
      }

      deviceRef.current = deviceToConnect;
      setDevice(deviceToConnect);
      setConnectedDeviceId(deviceToConnect.address);
      setShowDeviceModal(false);

      console.log(
        "✓ Connected to device:",
        deviceToConnect.name || deviceToConnect.address
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
        await deviceRef.current.disconnect();
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
    const currentDevice = deviceRef.current;

    if (!currentDevice) {
      console.warn("No device connected");
      return;
    }

    try {
      console.log("Sending command:", command);

      // Send command followed by newline (common for Arduino Serial)
      const success = await currentDevice.write(command + "\n");

      if (success) {
        console.log("✓ Command sent successfully");
      } else {
        console.warn("Failed to send command");
      }
    } catch (error: any) {
      console.error("Send command error:", error);
      console.error("Error details:", error?.message);

      // Check if device disconnected
      if (error?.message?.includes("disconnect")) {
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
