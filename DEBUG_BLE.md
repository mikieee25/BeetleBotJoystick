# BLE Debugging Checklist

## If devices still not appearing:

### 1. Check Device Settings

```bash
# Run this to check if location is actually enabled:
adb shell settings get secure location_mode
# Should return: 3 (for high accuracy)
# If 0, enable location in phone settings
```

### 2. Check Bluetooth State

```bash
# Check if Bluetooth is on
adb shell settings get global bluetooth_on
# Should return: 1
```

### 3. Clear Bluetooth Cache

On your phone:

- Settings → Apps → Bluetooth → Storage → Clear Cache
- Settings → Apps → [Your App Name] → Storage → Clear Cache
- Restart phone

### 4. Test with nRF Connect App

- Install "nRF Connect" from Play Store
- See if it can find your Arduino BLE module
- If it can, check what services/characteristics it shows

### 5. Arduino BLE Module Settings

Make sure your Arduino is:

- Advertising with a name (set a BLE device name)
- Using standard BLE advertising (not custom)
- Not in a sleep/low-power mode
- Within 5-10 meters range

### 6. View Live Logs

```bash
# See all app logs in real-time:
npx react-native log-android

# Or filter for BLE only:
adb logcat | grep -i "ble\|bluetooth"
```

### 7. Check Android Version Compatibility

Your device: Infinix_X6711

- If Android 12+, some BLE features may be restricted
- Check if Developer Options → "Bluetooth debugging" is available

### 8. Try Manual BLE Test

Add this to your code to test raw BLE:

```javascript
// In scanForDevices, before startDeviceScan:
const devices = await bleManagerRef.current?.devices([]);
console.log("Connected/Known devices:", devices);
```

## Expected Logs After Update:

```
Initializing BLE Manager...
BLE State changed to: PoweredOn
Permissions - Scan: true Connect: true Location: true
BLE State before scan: PoweredOn
Starting BLE device scan with aggressive parameters...
Platform: android Version: [your version]
Device found: [name] [id] RSSI: [signal]
```
