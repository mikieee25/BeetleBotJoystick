import React from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Text,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { HapticService } from "@services/hapticService";
import { useBle } from "../hooks/useBle";
import type { Device } from "react-native-ble-plx";

interface BluetoothConnectorV2Props {
  onConnected?: (
    deviceId: string,
    sendCommand: (cmd: string) => Promise<void>
  ) => void;
  onDisconnected?: () => void;
}

export function BluetoothConnectorV2({
  onConnected,
  onDisconnected,
}: BluetoothConnectorV2Props) {
  const {
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
  } = useBle();

  const handleDeviceSelect = async (selectedDevice: Device) => {
    await HapticService.mediumTap();
    await connectToDevice(selectedDevice);
    if (onConnected) {
      onConnected(selectedDevice.id, sendCommand);
    }
  };

  const handleDisconnect = async () => {
    await HapticService.mediumTap();
    await disconnectDevice();
    if (onDisconnected) {
      onDisconnected();
    }
  };

  const handleConnectPress = async () => {
    if (connectedDeviceId) {
      await handleDisconnect();
    } else {
      await scanForDevices();
    }
  };

  const isConnected = !!connectedDeviceId;
  const devicesList = Array.from(devicesMap.values());

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.button, isConnected && styles.buttonConnected]}
        onPress={handleConnectPress}
      >
        <FontAwesome
          name="bluetooth"
          size={20}
          color={isConnected ? "#10b981" : "#999"}
        />
        <Text
          style={[styles.buttonText, isConnected && styles.buttonTextConnected]}
        >
          {isConnected ? device?.name || "Connected" : "Connect"}
        </Text>
      </Pressable>

      <Modal
        visible={showDeviceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeviceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isScanning ? "Scanning..." : "Select Device"}
              </Text>
              <Pressable
                onPress={() => {
                  stopScan();
                  setShowDeviceModal(false);
                }}
              >
                <FontAwesome name="close" size={20} color="#999" />
              </Pressable>
            </View>

            {isScanning && devicesList.length === 0 && (
              <View style={styles.scanningContainer}>
                <ActivityIndicator size="large" color="#FF9E42" />
                <Text style={styles.scanningText}>
                  Looking for Bluetooth devices...
                </Text>
              </View>
            )}

            <FlatList<Device>
              data={devicesList}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                !isScanning ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No devices found</Text>
                    <Pressable
                      style={styles.rescanButton}
                      onPress={scanForDevices}
                    >
                      <Text style={styles.rescanText}>Scan Again</Text>
                    </Pressable>
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <Pressable
                  style={styles.deviceItem}
                  onPress={() => handleDeviceSelect(item)}
                >
                  <FontAwesome name="bluetooth" size={18} color="#FF9E42" />
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>
                      {item.name || item.localName || "Unknown Device"}
                    </Text>
                    <Text style={styles.deviceAddress}>{item.id}</Text>
                  </View>
                  {item.rssi && (
                    <Text style={styles.signalStrength}>{item.rssi}dBm</Text>
                  )}
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
