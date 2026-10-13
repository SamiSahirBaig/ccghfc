# CityClean IoT Hardware & MQ135 Sensor Deployment Guide

This guide provides end-to-end instructions for assembling, calibrating, provisioning, and operating air quality and foul gas monitoring nodes for the CityClean platform.

---

## 1. Supported Architecture Paths

CityClean supports two deployment paths:

### Path A: Direct Wi-Fi Node (Recommended)
- **Microcontroller**: ESP32 (or ESP8266 / NodeMCU)
- **Sensor**: MQ135 Hazardous Gas & Air Quality Sensor
- **Connectivity**: Direct HTTPS / HTTP REST transmission over Wi-Fi
- **Features**: 20-sample median filter, 2-minute heater warmup, offline RAM ring buffer with automatic batch upload upon reconnection.

### Path B: USB Serial Gateway
- **Microcontroller**: Arduino Uno (ATmega328P)
- **Sensor**: MQ135 Hazardous Gas Sensor (A0 pin)
- **Connectivity**: 9600-baud USB serial connected to a PC, industrial IPC, or Raspberry Pi.
- **Gateway**: `hardware/gateway/gateway.py` with local SQLite offline buffering and auto-reconnect upon USB disconnect.

---

## 2. Wiring Diagrams & Pinouts

### 2.1 Arduino Uno Wiring (Path B - 5V Native)

```
       +-----------------------+
       |      ARDUINO UNO      |
       |                       |
       |  5V  ---------------> VCC (MQ135)
       |  GND ---------------> GND (MQ135)
       |  A0  <--------------- AOUT (MQ135 Analog Out)
       |                       |
       +-----------------------+
```

| MQ135 Pin | Arduino Uno Pin | Purpose |
| :--- | :--- | :--- |
| **VCC** | `5V` | Sensor internal heater element (requires 5.0V $\pm 0.1\text{V}$, 150mA) |
| **GND** | `GND` | Common ground |
| **AOUT (AO)** | `A0` | Analog voltage output proportional to gas concentration |
| **DOUT (DO)** | *Not Connected* | Digital threshold comparator (unused; software handles thresholds) |

---

### 2.2 ESP32 Wiring (Path A - 3.3V ADC with Voltage Divider)

> [!WARNING]
> The MQ135 internal heater requires **5V VCC**, but the ESP32 ADC inputs are **3.3V maximum**. You **MUST** use a simple 2-resistor voltage divider (or level shifter) on the Analog Out pin to avoid damaging the ESP32 GPIO.

```
       +-----------------------+
       |         ESP32         |
       |                       |
       |  VIN/5V ------------> VCC (MQ135 - 5V)
       |  GND ---------------> GND (MQ135)
       |                       |
       |                       |        [10k Resistor]
       |  GPIO 34 <------------+-------/\/\/\/\--------+ AOUT (MQ135)
       |  (ADC1_CH6)           |                       |
       |                       \                       |
       |                       / [20k Resistor]        |
       |                       \                       |
       |                       |                       |
       |  GND -----------------+-----------------------+
       +-----------------------+
```

| MQ135 Pin | ESP32 Pin | Interface Circuit |
| :--- | :--- | :--- |
| **VCC** | `VIN` / `5V` | Direct 5V power supply from USB |
| **GND** | `GND` | Common Ground |
| **AOUT** | `GPIO 34` | Passed through $10\text{k}\Omega : 20\text{k}\Omega$ voltage divider ($V_{\text{out}} = V_{\text{in}} \times \frac{2}{3}$) |

---

## 3. MQ135 Physics, Burn-In & Calibration

### 3.1 24–48 Hour Burn-In Requirement
MQ135 sensors utilize a heated tin dioxide ($\text{SnO}_2$) semiconductor layer. New sensors straight from the factory have chemical impurities adsorbed on the surface.
1. Connect the sensor to 5V power for **at least 24 to 48 continuous hours** before initial deployment.
2. During each power-on cycle, allow **2 minutes of pre-heating** for the internal heater to reach thermal equilibrium ($\sim 150^\circ\text{C}$).

### 3.2 Sensor Resistance Curve Formula
$$\text{PPM} = a \cdot \left(\frac{R_s}{R_0}\right)^b$$
Where:
- $V_{\text{rl}} = \text{raw} \cdot \left(\frac{V_{cc}}{\text{ADC}_{\text{max}}}\right)$
- $R_s = \left(\frac{V_{cc} - V_{\text{rl}}}{V_{\text{rl}}}\right) \cdot R_L$
- $R_0 = \text{Sensor resistance in clean reference air}$ ($\sim 400\text{ PPM CO}_2$)
- Default parameters: $a = 116.602$, $b = -2.769$, $R_L = 10.0\text{ k}\Omega$.

### 3.3 Calibration Procedure
1. Place the burned-in sensor in clean outdoor ambient air away from vehicles or trash.
2. Note the raw ADC reading (e.g., `raw = 312`).
3. Open the **Admin Dashboard > Devices** page, click **Calibrate**, and input `312`.
4. The system calculates and stores $R_0$. All future readings automatically adjust without reflashing!

---

## 4. Hardware Provisioning (3-Step Flow)

1. **Register in Admin UI**:
   - Navigate to `/admin/devices`.
   - Click **+ Register New Node**.
   - Fill in location and ward. Copy the generated **Device ID** (e.g. `NODE-001`) and **One-Time API Key** (e.g. `cc_dev_abcdef...`).
2. **Update Firmware Config**:
   - For ESP32: Edit `hardware/esp32_mq135/config.h` and paste Wi-Fi SSID, Password, Device ID, and API Key.
   - For Gateway: Edit `hardware/gateway/.env` and paste Device ID and API Key.
3. **Flash**:
   - Open `esp32_mq135.ino` in Arduino IDE, select board *ESP32 Dev Module*, and click **Upload**.

---

## 5. Manual Testing with cURL

Test ingestion endpoint directly from your terminal:

```bash
# Ingest single telemetry reading
curl -X POST http://localhost:5000/api/v1/device/readings \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: NODE-001" \
  -H "X-Api-Key: cc_key_node001" \
  -d '{
    "deviceId": "NODE-001",
    "ts": 1760380000,
    "readings": {
      "mq135_raw": 612,
      "mq135_ppm": 187.4,
      "temperature_c": 31.2,
      "humidity": 64
    },
    "battery_v": 3.9,
    "fw": "1.0.0"
  }'
```

Expected Response:
```json
{
  "status": "accepted",
  "alert": false,
  "next_interval_s": 30
}
```

```bash
# Synchronize device heartbeat & fetch server configuration
curl -X POST http://localhost:5000/api/v1/device/heartbeat \
  -H "X-Device-Id: NODE-001" \
  -H "X-Api-Key: cc_key_node001"
```

---

## 6. Troubleshooting Matrix

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **HTTP 401 Unauthorized** | Incorrect `X-Device-Id` or `X-Api-Key` | Verify credentials generated on Admin Devices page. Note API key is case-sensitive. |
| **PPM reading stays at 0 or max** | Loose connection on Analog pin A0 / GPIO 34 | Check breadboard jumpers; ensure common GND between ESP32 and MQ135. |
| **Readings wildly fluctuating** | Sensor not warmed up or missing smoothing | Allow full 2-minute warmup; verify 20-sample median filter is enabled in code. |
| **Device marked OFFLINE** | Silent longer than $3 \times \text{sampleIntervalSec}$ | Check power supply and Wi-Fi signal at deployment site. |
| **False positive spike alarms** | Uncalibrated $R_0$ | Run the Clean Air Calibration wizard in Admin UI to recalculate $R_0$. |
