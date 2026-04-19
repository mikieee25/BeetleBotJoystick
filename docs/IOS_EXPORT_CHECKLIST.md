# iOS Export Checklist

This project can be exported to iOS locally with Xcode. It does not require EAS.

## What Is Already Ready

- Native iOS project exists in `ios/`.
- Bundle identifier is set to `com.beetlebot.improved`.
- Marketing version is `2.0.0`.
- Bluetooth and location permission strings are present in `Info.plist`.
- Static validation passes locally:
  - `npm run lint`
  - `npx tsc --noEmit`

## What You Need On The Mac

Install these before opening Xcode:

1. Xcode from the Mac App Store
2. Xcode Command Line Tools
3. Node.js 20 LTS or newer
4. CocoaPods

Suggested install commands:

```bash
xcode-select --install
brew install node cocoapods
```

If CocoaPods is already installed but outdated:

```bash
pod --version
pod repo update
```

## First-Time Setup On The Mac

From the project root:

```bash
npm ci
npm run ios:pods
```

That should generate:

- `ios/Podfile.lock`
- `ios/BeetleBotImproved.xcworkspace`

If `npx pod-install ios` gives trouble, use:

```bash
cd ios
pod install
cd ..
```

## Open The Correct Xcode File

Always open:

```text
ios/BeetleBotImproved.xcworkspace
```

Do not use the `.xcodeproj` once Pods are installed.

## Signing Setup

In Xcode:

1. Select the `BeetleBotImproved` project
2. Select the `BeetleBotImproved` target
3. Open `Signing & Capabilities`
4. Enable `Automatically manage signing`
5. Choose your Apple Team
6. Confirm the bundle identifier is still `com.beetlebot.improved`

If the bundle ID is already taken under your team, change it to something unique like:

```text
com.yourname.beetlebotimproved
```

If you change the bundle identifier in Xcode, keep the same value when you archive/export from that Mac.

## Device Testing

This app uses Bluetooth, so test on a real iPhone, not only the simulator.

Recommended flow:

```bash
npm run ios:device
```

Or run directly from Xcode on a connected iPhone.

On first launch, verify:

1. The app opens in landscape
2. Bluetooth permission prompt appears
3. Location prompt appears if scanning requires it
4. The BeetleBot device appears in scan results
5. Connect and basic commands work

## Archive And Export Without EAS

Once device testing is good:

1. In Xcode, choose `Any iOS Device (arm64)` or your connected device
2. Use `Product > Archive`
3. Wait for Organizer to open
4. Choose `Distribute App`
5. Pick your export type:
   - `Development` for personal/device installs
   - `Ad Hoc` for limited testers
   - `App Store Connect` if you plan to submit

## Known Project Notes

- This repo currently does not include `ios/Pods`, so `pod install` is expected on the Mac.
- This repo also does not currently include `ios/Podfile.lock`; it will be created after the first pod install.
- `react-native-bluetooth-classic` is installed, but the active screen flow currently uses BLE via `react-native-ble-plx`.
- The ESP32 docs and current app code are aligned around BLE device discovery and communication.

## Fast Pre-Flight Before Borrowing The Mac

Have these ready ahead of time:

1. Apple ID signed into Xcode
2. iPhone cable or trusted wireless device pairing
3. BeetleBot hardware powered on
4. A unique fallback bundle identifier if signing fails

## If Something Fails

Useful recovery commands:

```bash
rm -rf ios/Pods
rm -f ios/Podfile.lock
npm run ios:pods
```

```bash
cd ios
pod deintegrate
pod install
cd ..
```

```bash
npx expo run:ios --device
```

## Recommended Order Next Week

1. Clone or copy this repo onto the Mac
2. Run `npm ci`
3. Run `npm run ios:pods`
4. Open `ios/BeetleBotImproved.xcworkspace`
5. Fix signing if needed
6. Test on a real iPhone
7. Archive from Xcode
