import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Text,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  Alert,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import type { Device } from "react-native-ble-plx";
import type { BluetoothDevice } from "../types";
import { HapticService } from "@services/hapticService";
import { bluetoothService } from "@services/bluetoothService";

interface BluetoothConnectorProps {
  isConnected: boolean;
  onConnect?: (device: BluetoothDevice) => void;
  onDisconnect?: () => void;
  connectedDevice?: BluetoothDevice | null;
}

export function BluetoothConnector({
  isConnected,
  onConnect,
  onDisconnect,
  connectedDevice,
}: BluetoothConnectorProps) {
  const [showDevices, setShowDevices] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<BluetoothDevice[]>(
    []
  );

  // Start scanning when modal opens
  useEffect(() => {
    if (showDevices && !scanning) {
      requestPermissionsAndScan();
    }
  }, [showDevices]);

  const requestPermissionsAndScan = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted = Object.values(granted).every(
          (status) => status === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          Alert.alert(
            "Permissions Required",
            "Bluetooth and Location permissions are required to scan for devices. Please enable them in Settings.",
            [{ text: "OK" }]
          );
          return;
        }
      } catch (err) {
        console.warn("Permission error:", err);
        return;
      }
    }

    startScan();
  };

  const startScan = async () => {
    setScanning(true);
    setAvailableDevices([]);

    try {
      await bluetoothService.scanForDevices(
        (device: Device) => {
          // Convert BLE device to our BluetoothDevice type
          const bleDevice: BluetoothDevice = {
            id: device.id,
            name: device.name || "Unknown Device",
            address: device.id,
            isConnected: false,
            lastConnected: null,
            signalStrength: device.rssi || -100,
          };

          // Add device if not already in list
          setAvailableDevices((prev) => {
            const exists = prev.find((d) => d.id === bleDevice.id);
            if (exists) {
              // Update RSSI if device already exists
              return prev.map((d) =>
                d.id === bleDevice.id
                  ? { ...d, signalStrength: bleDevice.signalStrength }
                  : d
              );
            }
            return [...prev, bleDevice];
          });
        },
        10000 // Scan for 10 seconds
      );
    } catch (error) {
      console.error("Scan error:", error);
    } finally {
      setTimeout(() => setScanning(false), 10000);
    }
  };

  const handleDeviceSelect = async (device: BluetoothDevice) => {
    await HapticService.mediumTap();
    onConnect?.(device);
    setShowDevices(false);
  };

  const handleDisconnect = async () => {
    await HapticService.mediumTap();
    onDisconnect?.();
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, isConnected && styles.buttonConnected]}
        onPress={() =>
          isConnected ? handleDisconnect() : setShowDevices(true)
        }
      >
        <FontAwesome
          name="bluetooth"
          size={20}
          color={isConnected ? "#10b981" : "#999"}
        />
        <Text
          style={[styles.buttonText, isConnected && styles.buttonTextConnected]}
        >
          {isConnected ? "Connected" : "Connect"}
        </Text>
      </Pressable>

      <Modal
        visible={showDevices}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDevices(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {scanning ? "Scanning..." : "Select Device"}
              </Text>
              <Pressable onPress={() => setShowDevices(false)}>
                <FontAwesome name="close" size={20} color="#999" />
              </Pressable>
            </View>

            {scanning && availableDevices.length === 0 && (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color="#FF9E42" />
                <Text style={styles.scanningText}>
                  Looking for BeetleBot devices...
                </Text>
              </View>
            )}

            <FlatList
              data={availableDevices}
              keyExtractor={(item: BluetoothDevice) => item.id}
              ListEmptyComponent={
                !scanning ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No devices found</Text>
                    <Pressable style={styles.rescanButton} onPress={startScan}>
                      <Text style={styles.rescanText}>Scan Again</Text>
                    </Pressable>
                  </View>
                ) : null
              }
              renderItem={({ item }: { item: BluetoothDevice }) => (
                <Pressable
                  style={styles.deviceItem}
                  onPress={() => handleDeviceSelect(item)}
                >
                  <FontAwesome name="bluetooth" size={18} color="#FF9E42" />
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{item.name}</Text>
                    <Text style={styles.deviceAddress}>{item.address}</Text>
                  </View>
                  <Text style={styles.signalStrength}>
                    {item.signalStrength}dBm
                  </Text>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonConnected: {
    backgroundColor: "#DCF9E8",
    borderColor: "#10b981",
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
  },
  buttonTextConnected: {
    color: "#10b981",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  deviceAddress: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  signalStrength: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  scanningContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scanningText: {
    marginTop: 16,
    fontSize: 14,
    color: "#666",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginBottom: 16,
  },
  rescanButton: {
    backgroundColor: "#FF9E42",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
