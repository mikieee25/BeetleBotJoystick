import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import type { JoystickData, GearType } from "../types";

interface VehicleControlContextType {
  // Joystick state
  joystickData: JoystickData | null;
  setJoystickData: (data: JoystickData | null) => void;

  // Gear state
  currentGear: GearType;
  setGear: (gear: GearType) => void;

  // Claw state
  clawOpen: boolean;
  toggleClaw: () => void;

  // Speed multiplier
  speedMultiplier: number;
  setSpeedMultiplier: (multiplier: number) => void;

  // Reset all controls
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

  const setGear = useCallback((gear: GearType) => {
    setCurrentGear(gear);
  }, []);

  const toggleClaw = useCallback(() => {
    setClawOpen((prev: boolean) => !prev);
  }, []);

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

export function useVehicleControl() {
  const context = useContext(VehicleControlContext);
  if (context === undefined) {
    throw new Error(
      "useVehicleControl must be used within a VehicleControlProvider"
    );
  }
  return context;
}
