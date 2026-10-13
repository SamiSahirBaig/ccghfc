/**
 * CityClean Civic Issue Reporting Platform
 * Arduino Uno Serial Node (Path B)
 * 
 * Hardware:
 * - Arduino Uno (ATmega328P)
 * - MQ135 Gas Sensor connected to Analog Pin A0
 * - Powered via USB 5V
 * 
 * Output:
 * Prints one newline-delimited JSON string per sample interval at 9600 baud.
 * Read by the CityClean Python Serial Gateway (hardware/gateway/gateway.py).
 */

const int MQ135_PIN = A0;
const char* DEVICE_ID = "NODE-001";
const unsigned long SAMPLE_INTERVAL_MS = 5000; // 5 seconds

void setup() {
  Serial.begin(9600);
  while (!Serial) {
    ; // Wait for serial port connection
  }

  // Pre-heat stabilization notice
  Serial.println(F("{\"status\":\"INITIALIZING\",\"msg\":\"MQ135 warming up...\"}"));
  delay(2000);
}

void loop() {
  // Read MQ135 analog value (0 - 1023)
  int rawValue = analogRead(MQ135_PIN);

  // Format and print JSON line
  Serial.print(F("{\"deviceId\":\""));
  Serial.print(DEVICE_ID);
  Serial.print(F("\",\"mq135_raw\":"));
  Serial.print(rawValue);
  Serial.println(F("}"));

  delay(SAMPLE_INTERVAL_MS);
}
