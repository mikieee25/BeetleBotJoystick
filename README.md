# BeetleBot Joystick - Android Build Guide

Build guide for the BeetleBot Joystick Android app on Fedora Gnome with zsh shell.

## Prerequisites

### 1. Install Java Development Kit (JDK 21)

```zsh
# Install Java 21
sudo dnf install java-21-openjdk java-21-openjdk-devel

# Verify installation
java -version
```

Set the JAVA_HOME environment variable:

```zsh
# Add to ~/.zshrc
echo 'export JAVA_HOME=/usr/lib/jvm/java-21-openjdk' >> ~/.zshrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.zshrc

# Reload configuration
source ~/.zshrc

# Verify
echo $JAVA_HOME
```

### 2. Install Android SDK Command-line Tools

```zsh
# Create Android SDK directory
mkdir -p ~/Android/Sdk
cd ~/Android/Sdk

# Download command-line tools (check for latest version at https://developer.android.com/studio)
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip

# Extract and organize
unzip commandlinetools-linux-11076708_latest.zip -d cmdline-tools
mv cmdline-tools/cmdline-tools cmdline-tools/latest

# Clean up
rm commandlinetools-linux-11076708_latest.zip
```

### 3. Install Android SDK Platform and Build Tools

```zsh
# Navigate to SDK manager
cd ~/Android/Sdk/cmdline-tools/latest/bin

# Accept licenses
yes | ./sdkmanager --licenses

# Install required SDK components
./sdkmanager "platform-tools"
./sdkmanager "platforms;android-34"
./sdkmanager "build-tools;34.0.0"
./sdkmanager "cmdline-tools;latest"

# Optional: Install emulator
./sdkmanager "emulator"
./sdkmanager "system-images;android-34;google_apis;x86_64"
```

### 4. Set Android Environment Variables

```zsh
# Add to ~/.zshrc
echo 'export ANDROID_HOME=$HOME/Android/Sdk' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.zshrc

# Reload configuration
source ~/.zshrc

# Verify
echo $ANDROID_HOME
adb --version
```

### 5. Install Node.js and npm

```zsh
# Install Node.js (version 18 or higher)
sudo dnf install nodejs npm

# Verify installation
node --version
npm --version
```

### 6. Setup Android Device

#### For Physical Device:

1. **Enable Developer Options**:

   - Go to Settings → About Phone
   - Tap "Build Number" 7 times

2. **Enable USB Debugging**:

   - Settings → Developer Options → USB Debugging (ON)

3. **Connect device via USB**:
   ```zsh
   # Check if device is detected
   adb devices
   ```

## App Installation

```zsh
# Navigate to project directory
cd /path/to/BeetleBotJoystick

# Install npm packages
npm install
```

## Building and Running the App

### Development Build

```zsh
# Build and run on connected device or emulator
npm run android
```

This command will:

1. Compile the Android APK
2. Automatically install on device/emulator
3. Launch the app

### Troubleshooting

#### "JAVA_HOME not set" error:

```zsh
# Verify JAVA_HOME
echo $JAVA_HOME

# If empty, set it again
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
source ~/.zshrc
```

#### "SDK location not found" error:

```zsh
# Create local.properties file
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
```

#### ADB permission issues:

```zsh
# Add user to plugdev group
sudo usermod -aG plugdev $USER

# Install Android tools
sudo dnf install android-tools

# Logout and login again for group changes to take effect
```

#### Gradle issues:

```zsh
# Clear Gradle cache
cd android
./gradlew clean

# Rebuild
cd ..
npm run android
```

#### Device not detected:

```zsh
# Check USB connection
adb devices

# Restart adb server
adb kill-server
adb start-server
adb devices
```

#### Build fails with "Unable to detect java version":

```zsh
# Make sure Java 21 is the active version
sudo alternatives --config java

# Select Java 21 from the list
```

## Additional Notes

- **Location Services** must be enabled on your phone for Bluetooth scanning to work
- App is designed for landscape orientation
- Requires Android 7.0 (API 24) or higher
