import * as Haptics from "expo-haptics";

// Provides standardized haptic feedback for user interactions
export class HapticService {
  // Light impact feedback for subtle interactions
  static async lightTap(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  // Medium impact feedback for standard interactions
  static async mediumTap(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  // Strong impact feedback for important actions
  static async heavyTap(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  // Success notification pattern
  static async success(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  // Warning notification pattern
  static async warning(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }

  // Error notification pattern
  static async error(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.warn("Haptic feedback not available:", error);
    }
  }
}
