import * as Haptics from "expo-haptics";

/**
 * Haptic feedback service
 * Provides standardized haptic feedback for user interactions
 */
export class HapticService {
  static async lightTap(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async mediumTap(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async heavyTap(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async success(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async warning(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  static async error(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }
}
