import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import type { JoystickData, GearType } from "../types";

// Global vehicle control state (joystick, gear, claw, speed)
interface VehicleControlContextType {
  joystickData: JoystickData | null;
  setJoystickData: (data: JoystickData | null) => void;

  currentGear: GearType;
  setGear: (gear: GearType) => void;

  clawOpen: boolean;
  toggleClaw: () => void;

  speedMultiplier: number;
  setSpeedMultiplier: (multiplier: number) => void;

  // Reset all controls to default state
  resetControls: () => void;
}

const VehicleControlContext = createContext<
  VehicleControlContextType | undefined
>(undefined);

export function VehicleControlProvider({ children }: { children: ReactNode }) {
  const [joystickData, setJoystickData] = useState<JoystickData | null>(null);
  const [currentGear, setCurrentGear] = useState<GearType>("1");
  const [clawOpen, setClawOpen] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

  // Update current gear selection
  const setGear = useCallback((gear: GearType) => {
    setCurrentGear(gear);
  }, []);

  // Toggle claw open/closed state
  const toggleClaw = useCallback(() => {
    setClawOpen((prev: boolean) => !prev);
  }, []);

  // Reset all state to initial values
  const resetControls = useCallback(() => {
    setJoystickData(null);
    setCurrentGear("1");
    setClawOpen(false);
    setSpeedMultiplier(1);
  }, []);

  return (
    <VehicleControlContext.Provider
      value={{
        joystickData,
        setJoystickData,
        currentGear,
        setGear,
        clawOpen,
        toggleClaw,
        speedMultiplier,
        setSpeedMultiplier,
        resetControls,
      }}
    >
      {children}
    </VehicleControlContext.Provider>
  );
}

// Hook to access vehicle control context
export function useVehicleControl() {
  const context = useContext(VehicleControlContext);
  if (context === undefined) {
    throw new Error(
      "useVehicleControl must be used within a VehicleControlProvider"
    );
  }
  return context;
}
