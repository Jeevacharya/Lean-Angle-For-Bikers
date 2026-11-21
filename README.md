# 🏍️ MotoLean - Motorcycle Lean Angle Android App (APK)

A native Android APK and high-precision motorcycle lean angle meter for bikers.

---

## 📦 Download the APK

The compiled and signed Android APK is ready directly in this folder:
- **File**: [`MotoLean.apk`](file:///J:/Lean%20Angle%20app/Lean-Angle-For-Bikers/MotoLean.apk) (approx 25 KB)

### 📲 How to Install on Your Android Phone:

#### Option A: Copy Directly via USB / Chat
1. Copy `MotoLean.apk` from `J:\Lean Angle app\Lean-Angle-For-Bikers\MotoLean.apk` to your phone (via USB cable, WhatsApp, Telegram, Google Drive, or Bluetooth).
2. Tap on `MotoLean.apk` on your phone to install it.
3. Open **Moto Lean** from your app drawer.

#### Option B: Download Directly Over Wi-Fi
1. On your PC, run:
   ```bash
   npm start
   ```
2. On your phone's browser, open:
   ```
   http://192.168.0.2:3000/MotoLean.apk
   ```
3. Tap **Download** and **Install**.

---

## ✨ Native Android Features

- **🚫 No Runtime Permissions**: Starts immediately without asking you to accept any permission popups!
- **🔄 Landscape & Portrait Support**: Works whether you mount your phone upright (portrait) or sideways (landscape) on your handlebars.
- **🎯 One-Tap Zero Calibration (`CALIBRATE (ZERO)`)**: Hold bike straight, tap the button, and the angle locks to **`0.0°`**.
- **🧭 Sign Convention**:
  - **Right Lean**: **Positive (+ve)** values (e.g. `+32.5°`)
  - **Left Lean**: **Negative (-ve)** values (e.g. `-28.0°`)
  - **Upright / Straight**: **`0.0°`**
- **📊 Left & Right Peak Hold (Max Lean Angles)**:
  - Tracks your maximum left lean (e.g. `-45.2°`) and maximum right lean (e.g. `+46.8°`).
  - One-tap **"RESET MAX"** button.
- **🔒 Screen Keeps Awake**: Automatically keeps the screen turned on while riding so it never goes to sleep.
- **⚡ Hardware IMU Sensor Fusion**: Uses Android's internal `Sensor.TYPE_ROTATION_VECTOR` at high frequency (100Hz) with vibration damping.
- **🔨 Rebuild Script**: If you ever want to rebuild the APK from source, just run `powershell -File .\build-apk.ps1`.

---

## 🚀 How to Run and Open on Your Phone

### Step 1: Start the Local Server on your PC
Make sure your phone and computer are on the same Wi-Fi network. In this folder, run:

```bash
npm start
```
*(Or `node server.js`)*

The server will display your local network addresses, for example:
```
======================================================
   🏍️  MOTO LEAN ANGLE - BIKER GAUGE SERVER RUNNING   
======================================================
💻 Open on this computer:
   http://localhost:3000

📱 Open on your Mobile Phone (on same Wi-Fi):
   http://192.168.0.2:3000
======================================================
```

### Step 2: Open on Your Phone
1. Open your smartphone browser (Safari on iPhone, Chrome on Android).
2. Enter the phone URL shown in your terminal (or on your PC browser click **"📱 CONNECT"** to view and scan the QR code).
3. Tap **"Allow Motion & Orientation"** if prompted (especially on iOS).

### Step 3: Install to Home Screen (Standalone App Mode)
- **iPhone (Safari)**: Tap the **Share** button (box with upward arrow) -> tap **"Add to Home Screen"** -> tap **Add**.
- **Android (Chrome)**: Tap the **three dots menu** (⋮) -> tap **"Add to Home Screen"** or **"Install app"**.

Now launch MotoLean directly from your home screen like any native app—it will run full-screen without address bars and works completely offline!

---

## 🛠️ How to Calibrate on Your Bike

1. **Mount Phone**: Secure your phone in your phone holder (Quad Lock, RAM mount, etc.) in Portrait or Landscape.
2. **Mount the Motorcycle**: Sit on your bike with both feet down, or balance the bike perfectly upright and straight.
3. **Tap `CALIBRATE (ZERO)`**: 
   - Tap the large blue button at the bottom.
   - The app instantly samples the 3D gravity vector relative to your mount's tilt and sets the current angle to **`0.0°`**.
4. **Ride!**
   - Leaning into right turns displays positive **`+ve`** angles (e.g. `+35°`).
   - Leaning into left turns displays negative **`-ve`** angles (e.g. `-35°`).

---

## 📐 Sensor Mathematics & Accuracy

Unlike simple apps that only measure 2D screen roll, MotoLean performs full 3D rotation projection:
1. When you mount your phone tilted back towards your eyes (e.g. 45° pitch angle on the handlebar), simple roll would read incorrectly.
2. MotoLean projects the 3D Earth gravity vector onto the motorcycle's calibrated transverse plane perpendicular to forward travel.
3. An exponential moving average low-pass filter suppresses engine vibrations and road bumps without adding lag.

---

## ☁️ Free Permanent Hosting (Optional)

If you'd like to access MotoLean on your phone anywhere without running your PC:
1. Push this folder to a GitHub repository.
2. In GitHub repository settings -> **Pages**, choose the `main` branch and `/public` folder.
3. You will get an instant HTTPS URL (e.g. `https://yourusername.github.io/Lean-Angle-For-Bikers/`) that works globally!
