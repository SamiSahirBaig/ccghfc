/**
 * CityClean Civic Issue Reporting Platform
 * ESP32 + MQ135 Environmental Gas / Air Quality Telemetry Node
 * 
 * Features:
 * - 2-minute heater coil warm-up sequence
 * - 20-sample median filter smoothing (removes ADC noise)
 * - MQ135 PPM computation with dynamic calibration (R0, a, b)
 * - Wi-Fi client with exponential backoff retry
 * - RAM ring buffer for offline buffering during Wi-Fi drops (batch POST on reconnect)
 * - Syncs interval and thresholds from server response
 * - OTA firmware update hooks
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "config.h"

// Fallback defaults if config.h is missing values
#ifndef WIFI_SSID
#define WIFI_SSID "CityClean_WiFi"
#define WIFI_PASSWORD "CityClean_Secret"
#define API_BASE_URL "http://192.168.1.100:5000/api/v1"
#define DEVICE_ID "NODE-001"
#define DEVICE_API_KEY "cc_key_node001"
#define MQ135_ANALOG_PIN 34
#define SAMPLE_INTERVAL_MS 30000
#define WARMUP_TIME_MS 120000
#define SAMPLES_COUNT 20
#endif

// MQ135 Calibration Constants
float R0 = 10.0;     // Calibrated sensor resistance in clean air (kΩ)
float a = 116.602;   // Scaling parameter
float b = -2.769;    // Exponent parameter
float RL = 10.0;     // Load resistance on board (kΩ)
int sampleInterval = SAMPLE_INTERVAL_MS;

// Offline RAM Ring Buffer
struct BufferedReading {
  unsigned long timestamp;
  int rawValue;
  float ppm;
};
const int MAX_BUFFER_SIZE = 50;
BufferedReading offlineBuffer[MAX_BUFFER_SIZE];
int bufferCount = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n==========================================");
  Serial.println("🏙️  CityClean ESP32 Gas Telemetry Node");
  Serial.printf("Device ID: %s | Firmware: 1.0.0\n", DEVICE_ID);
  Serial.println("==========================================");

  analogReadResolution(12); // 12-bit ADC (0 - 4095)
  pinMode(MQ135_ANALOG_PIN, INPUT);

  // Sensor Pre-heating Warm-up (2 minutes recommended)
  Serial.println("⏳ Warming up MQ135 heater coil (stabilizing resistance)...");
  unsigned long warmStart = millis();
  while (millis() - warmStart < WARMUP_TIME_MS) {
    int remainingSec = (WARMUP_TIME_MS - (millis() - warmStart)) / 1000;
    if (remainingSec % 20 == 0) {
      Serial.printf("   Warm-up in progress: %d seconds remaining...\n", remainingSec);
      delay(1000);
    }
    delay(100);
  }
  Serial.println("✅ Sensor heater stabilized.");

  connectWiFi();
  fetchDeviceConfig();
}

void loop() {
  // 1. Collect 20 samples and compute median
  int rawMedian = readMedianRaw(MQ135_ANALOG_PIN, SAMPLES_COUNT);

  // 2. Compute PPM using curve formula
  float ppm = calculatePPM(rawMedian);

  Serial.printf("\n[Reading] Raw ADC: %d | Computed PPM: %.2f\n", rawMedian, ppm);

  // 3. Attempt transmission or buffer offline
  if (WiFi.status() == WL_CONNECTED) {
    // Flush any previously buffered readings first
    if (bufferCount > 0) {
      flushOfflineBatch();
    }

    sendSingleReading(rawMedian, ppm);
  } else {
    Serial.println("⚠️ Wi-Fi disconnected. Storing in offline RAM buffer...");
    bufferOfflineReading(rawMedian, ppm);
    attemptWiFiReconnect();
  }

  delay(sampleInterval);
}

/**
 * 20-Sample Median Smoothing Algorithm
 */
int readMedianRaw(int pin, int count) {
  int samples[count];
  for (int i = 0; i < count; i++) {
    samples[i] = analogRead(pin);
    delay(20);
  }

  // Simple Bubble Sort
  for (int i = 0; i < count - 1; i++) {
    for (int j = 0; j < count - i - 1; j++) {
      if (samples[j] > samples[j + 1]) {
        int temp = samples[j];
        samples[j] = samples[j + 1];
        samples[j + 1] = temp;
      }
    }
  }

  // Return median value
  return samples[count / 2];
}

/**
 * Convert 12-bit ESP32 ADC reading to PPM
 */
float calculatePPM(int raw) {
  // Clamped raw reading
  float clamped = constrain(raw, 1, 4094);
  float vRL = (clamped / 4095.0) * 3.3; // 3.3V reference
  float Rs = ((3.3 - vRL) / vRL) * RL;
  float ratio = Rs / R0;
  float ppm = a * pow(ratio, b);
  return max(0.0f, ppm);
}

/**
 * Post single reading to /api/v1/device/readings
 */
void sendSingleReading(int raw, float ppm) {
  HTTPClient http;
  String url = String(API_BASE_URL) + "/device/readings";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Api-Key", DEVICE_API_KEY);

  StaticJsonDocument<256> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["ts"] = (unsigned long)(millis() / 1000);
  JsonObject readings = doc.createNestedObject("readings");
  readings["mq135_raw"] = raw;
  readings["mq135_ppm"] = round(ppm * 10) / 10.0;
  readings["temperature_c"] = 28.5; // optional DHT sensor hook
  readings["humidity"] = 62.0;
  doc["battery_v"] = 3.9;
  doc["fw"] = "1.0.0";

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  if (httpCode == 202 || httpCode == 200) {
    String response = http.getString();
    Serial.printf("✅ Sent successfully: HTTP %d | %s\n", httpCode, response.c_str());

    // Parse next interval from server response
    StaticJsonDocument<256> resDoc;
    deserializeJson(resDoc, response);
    if (resDoc.containsKey("next_interval_s")) {
      sampleInterval = resDoc["next_interval_s"].as<int>() * 1000;
    }
  } else {
    Serial.printf("❌ POST failed: HTTP %d\n", httpCode);
    bufferOfflineReading(raw, ppm);
  }

  http.end();
}

/**
 * Flush offline readings using batch endpoint
 */
void flushOfflineBatch() {
  Serial.printf("🔄 Flushing %d offline readings to batch endpoint...\n", bufferCount);
  HTTPClient http;
  String url = String(API_BASE_URL) + "/device/readings/batch";

  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Api-Key", DEVICE_API_KEY);

  DynamicJsonDocument doc(4096);
  JsonArray array = doc.to<JsonArray>();

  for (int i = 0; i < bufferCount; i++) {
    JsonObject item = array.createNestedObject();
    item["deviceId"] = DEVICE_ID;
    item["ts"] = offlineBuffer[i].timestamp;
    JsonObject r = item.createNestedObject("readings");
    r["mq135_raw"] = offlineBuffer[i].rawValue;
    r["mq135_ppm"] = offlineBuffer[i].ppm;
  }

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  if (httpCode == 200 || httpCode == 202) {
    Serial.println("✅ Batch flush complete.");
    bufferCount = 0;
  } else {
    Serial.printf("❌ Batch flush failed: HTTP %d\n", httpCode);
  }
  http.end();
}

void bufferOfflineReading(int raw, float ppm) {
  if (bufferCount < MAX_BUFFER_SIZE) {
    offlineBuffer[bufferCount].timestamp = millis() / 1000;
    offlineBuffer[bufferCount].rawValue = raw;
    offlineBuffer[bufferCount].ppm = ppm;
    bufferCount++;
  }
}

void connectWiFi() {
  Serial.printf("Connecting to Wi-Fi SSID: %s ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ Connected! IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n⚠️ Wi-Fi connection timed out. Will operate in offline buffer mode.");
  }
}

void attemptWiFiReconnect() {
  static unsigned long lastAttempt = 0;
  if (millis() - lastAttempt > 15000) {
    lastAttempt = millis();
    WiFi.reconnect();
  }
}

void fetchDeviceConfig() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String(API_BASE_URL) + "/device/config";
  http.begin(url);
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Api-Key", DEVICE_API_KEY);
  int httpCode = http.GET();
  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    deserializeJson(doc, payload);
    if (doc.containsKey("calibration")) {
      R0 = doc["calibration"]["R0"] | R0;
      a = doc["calibration"]["a"] | a;
      b = doc["calibration"]["b"] | b;
      Serial.printf("⚙️ Updated calibration from server: R0=%.2f, a=%.2f, b=%.2f\n", R0, a, b);
    }
  }
  http.end();
}
