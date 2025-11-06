import { BleManager, Device, Characteristic } from "react-native-ble-plx";
import type { MotorCommand, GearType } from "../types";

// ESP32 BLE Service and Characteristic UUIDs
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

/**
 * Bluetooth communication service for ESP32
 * Handles sending motor commands and receiving telemetry
 */
export class BluetoothService {
  private static instance: BluetoothService;
  private bleManager: BleManager;
  private isConnected = false;
  private connectedDevice: Device | null = null;
  private commandQueue: MotorCommand[] = [];
  private sendInterval: ReturnType<typeof setInterval> | null = null;
  private writeCharacteristic: Characteristic | null = null;

  private constructor() {
    this.bleManager = new BleManager();
  }

  static getInstance(): BluetoothService {
    if (!BluetoothService.instance) {
      BluetoothService.instance = new BluetoothService();
    }
    return BluetoothService.instance;
  }

  /**
   * Initialize BLE Manager
   */
  async initialize(): Promise<void> {
    const state = await this.bleManager.state();
    if (state !== "PoweredOn") {
      console.log("Bluetooth is not powered on. Waiting...");
      await new Promise<void>((resolve) => {
        const subscription = this.bleManager.onStateChange((newState) => {
          if (newState === "PoweredOn") {
            subscription.remove();
            resolve();
          }
        }, true);
      });
    }
  }

  /**
   * Scan for ESP32 devices
   */
  async scanForDevices(
    onDeviceFound: (device: Device) => void,
    durationMs: number = 10000
  ): Promise<void> {
    await this.initialize();

    console.log("Starting BLE scan...");

    this.bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Scan error:", error);
        return;
      }

      if (device && device.name && device.name.includes("BeetleBot")) {
        console.log("Found device:", device.name, device.id);
        onDeviceFound(device);
      }
    });

    // Stop scanning after duration
    setTimeout(() => {
      this.bleManager.stopDeviceScan();
      console.log("Scan stopped");
    }, durationMs);
  }

  /**
   * Connect to ESP32 device
   */
  async connect(deviceId: string): Promise<boolean> {
    try {
      console.log("Connecting to device:", deviceId);

      // Stop any ongoing scan
      this.bleManager.stopDeviceScan();

      // Connect to device
      const device = await this.bleManager.connectToDevice(deviceId, {
        timeout: 10000,
      });

      console.log("Connected to:", device.name);
      this.connectedDevice = device;

      // Discover services and characteristics
      await device.discoverAllServicesAndCharacteristics();

      // Get the write characteristic
      const characteristics = await device.characteristicsForService(
        SERVICE_UUID
      );

      this.writeCharacteristic =
        characteristics.find((c) => c.uuid === CHARACTERISTIC_UUID) || null;

      if (!this.writeCharacteristic) {
        throw new Error("Write characteristic not found");
      }

      console.log("BLE characteristic ready");
      this.isConnected = true;
      this.startCommandQueue();

      return true;
    } catch (error) {
      console.error("Connection failed:", error);
      this.isConnected = false;
      this.connectedDevice = null;
      return false;
    }
  }

  /**
   * Disconnect from ESP32 device
   */
  async disconnect(): Promise<void> {
    try {
      this.isConnected = false;
      this.stopCommandQueue();

      if (this.connectedDevice) {
        await this.connectedDevice.cancelConnection();
        console.log("Disconnected from device");
        this.connectedDevice = null;
        this.writeCharacteristic = null;
      }
    } catch (error) {
      console.error("Disconnection failed:", error);
    }
  }

  /**
   * Send motor command to ESP32
   */
  sendMotorCommand(
    leftSpeed: number,
    rightSpeed: number,
    gear: GearType
  ): void {
    if (!this.isConnected) {
      console.warn("Not connected to device");
      return;
    }

    const command: MotorCommand = {
      type: "joystick",
      leftSpeed: Math.max(-100, Math.min(100, leftSpeed)),
      rightSpeed: Math.max(-100, Math.min(100, rightSpeed)),
      gear,
      clawOpen: false,
      timestamp: Date.now(),
    };

    this.commandQueue.push(command);
  }

  /**
   * Send stop command
   */
  sendStopCommand(): void {
    if (!this.isConnected) return;

    const command: MotorCommand = {
      type: "stop",
      leftSpeed: 0,
      rightSpeed: 0,
      gear: "1",
      clawOpen: false,
      timestamp: Date.now(),
    };

    this.commandQueue.push(command);
  }

  /**
   * Send brake command
   */
  sendBrakeCommand(): void {
    if (!this.isConnected) return;

    const command: MotorCommand = {
      type: "brake",
      leftSpeed: 0,
      rightSpeed: 0,
      gear: "1",
      clawOpen: false,
      timestamp: Date.now(),
    };

    this.commandQueue.push(command);
  }

  /**
   * Change gear
   */
  changeGear(gear: GearType): void {
    if (!this.isConnected) return;

    const command: MotorCommand = {
      type: "gear",
      leftSpeed: 0,
      rightSpeed: 0,
      gear,
      clawOpen: false,
      timestamp: Date.now(),
    };

    this.commandQueue.push(command);
  }

  /**
   * Toggle claw
   */
  toggleClaw(isOpen: boolean): void {
    if (!this.isConnected) return;

    const command: MotorCommand = {
      type: "claw",
      leftSpeed: 0,
      rightSpeed: 0,
      gear: "1",
      clawOpen: isOpen,
      timestamp: Date.now(),
    };

    this.commandQueue.push(command);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Process command queue
   */
  private startCommandQueue(): void {
    this.sendInterval = setInterval(() => {
      if (this.commandQueue.length > 0) {
        const command = this.commandQueue.shift();
        this.processCommand(command!);
      }
    }, 50); // Send commands at 20Hz
  }

  /**
   * Stop processing command queue
   */
  private stopCommandQueue(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
    this.commandQueue = [];
  }

  /**
   * Process individual command
   */
  private async processCommand(command: MotorCommand): Promise<void> {
    if (
      !this.isConnected ||
      !this.writeCharacteristic ||
      !this.connectedDevice
    ) {
      return;
    }

    try {
      // Convert command to JSON string
      const jsonCommand = JSON.stringify(command);

      // Convert to base64 for BLE transmission
      const base64Command = Buffer.from(jsonCommand).toString("base64");

      // Write to characteristic
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        CHARACTERISTIC_UUID,
        base64Command
      );

      // Uncomment for debugging
      // console.log("Sent command:", command.type);
    } catch (error) {
      console.error("Failed to send command:", error);
    }
  }

  /**
   * Stop BLE manager (cleanup)
   */
  async destroy(): Promise<void> {
    await this.disconnect();
    this.bleManager.destroy();
  }
}

export const bluetoothService = BluetoothService.getInstance();
