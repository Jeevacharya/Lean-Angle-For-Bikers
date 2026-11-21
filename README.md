# 🏍️ MotoLean - Motorcycle Lean Angle Android App

A pure native Android APK designed for motorcycle riders to measure and track lean angles in real-time.

---

## 📥 Download the APK

The compiled and signed APK is ready to install:
👉 **[`MotoLean.apk`](./MotoLean.apk)** *(approx 25 KB)*

### How to Install:
1. Download or copy **`MotoLean.apk`** to your Android phone (via USB, WhatsApp, Telegram, or Google Drive).
2. Tap **`MotoLean.apk`** in your phone's File Manager or Downloads to install.
3. Open **Moto Lean** from your app drawer.

---

## ✨ Features

- **🎯 One-Tap Calibration (`CALIBRATE`)**:
  - Mount your phone on your bike.
  - Sit on the motorcycle, hold it straight and upright, and tap **CALIBRATE**.
  - The angle resets to **`0°`**.
- **🧭 Sign Convention**:
  - **Right Lean**: **Positive (+ve)** values (e.g. **`+32°`**) with cyan accent.
  - **Left Lean**: **Negative (-ve)** values (e.g. **`-28°`**) with crimson accent.
  - **Upright / Straight**: **`0°`** with safety green accent.
- **🔢 Whole Numbers (No Decimals)**:
  - Lean angles and peak values are displayed cleanly without decimals for fast, glanceable readability while riding.
- **⚡ 1-Axis Lateral Tilt Sensor**:
  - Uses only a single physical lateral axis (`Sensor.TYPE_ACCELEROMETER`).
  - Eliminates false readings caused by front-to-back pitch (acceleration/braking) or compass drift.
- **📱 Tailored Portrait & Landscape Layouts**:
  - **Portrait Mode**: 
    - Prominent central gauge and digital readout.
    - Single wide **`CALIBRATE (ZERO)`** button across the bottom for easy thumb access.
    - Max Left and Max Right peak cards with a center **`RESET MAX`** button.
  - **Landscape Mode**: 
    - Left side: **MAX LEFT** card, Left **`CALIBRATE`** button, Left **`RESET MAX`** button.
    - Middle: The **Motorcycle Animation & Arc Scale** are prominently in the center without being squeezed.
    - Right side: **MAX RIGHT** card, Right **`CALIBRATE`** button, Right **`RESET MAX`** button.
- **🚫 Zero Permission Prompts**:
  - Starts immediately without asking you to accept any runtime permissions or popups.
- **🔒 Screen Keeps Awake**:
  - Automatically prevents the phone screen from timing out or dimming while riding.
- **📊 Left & Right Peak Hold**:
  - Tracks your maximum left lean (e.g. **`-42°`**) and maximum right lean (e.g. **`+45°`**).

---

## 🛠️ How to Calibrate on Your Bike

1. Place your phone in your handlebar mount (Portrait or Landscape).
2. Sit on the bike and balance it upright and straight.
3. Tap either **`CALIBRATE`** button.
4. The reading locks to **`0°`**. As you ride into turns, right turns show positive (**`+ve`**) and left turns show negative (**`-ve`**).

---

## 🔨 Source Code & Rebuilding

The project is built natively using Android SDK build-tools and Java:
- Source code: [`android/`](./android)
- MainActivity: [`android/src/com/motolean/app/MainActivity.java`](./android/src/com/motolean/app/MainActivity.java)
- Custom Canvas Gauge: [`android/src/com/motolean/app/LeanGaugeView.java`](./android/src/com/motolean/app/LeanGaugeView.java)

To rebuild the APK from source on Windows:
```powershell
powershell -ExecutionPolicy Bypass -File .\build-apk.ps1
```
The script will compile resources, build DEX bytecode, align, and sign **`MotoLean.apk`** in seconds.
