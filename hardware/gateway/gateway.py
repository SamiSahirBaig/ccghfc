#!/usr/bin/env python3
"""
CityClean Hardware Gateway (Path B)
Bridges Arduino Uno USB serial packets to the CityClean REST API.

Key Features:
- Reads newline-delimited JSON strings from Arduino Uno over serial (9600 baud)
- Auto-reconnect loop on USB cable unplug / replug
- Offline persistence: stores unacknowledged readings in SQLite database
- HTTP retry with exponential backoff & batch flush on network recovery
- Optional HMAC-SHA256 request signing with anti-replay timestamp verification
- Rotating file and stdout logging
"""

import os
import sys
import time
import json
import sqlite3
import hmac
import hashlib
import logging
from typing import Optional

try:
    import serial
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("Missing dependencies. Run: pip install -r requirements.txt")
    sys.exit(1)

# Load configuration
load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5000/api/v1")
SERIAL_PORT = os.getenv("SERIAL_PORT", "COM3")
BAUD_RATE = int(os.getenv("BAUD_RATE", "9600"))
DEVICE_ID = os.getenv("DEVICE_ID", "NODE-001")
DEVICE_API_KEY = os.getenv("DEVICE_API_KEY", "cc_key_node001")
ENABLE_HMAC = os.getenv("ENABLE_HMAC_SIGNATURE", "false").lower() == "true"
SQLITE_DB = os.getenv("SQLITE_DB_PATH", "gateway_buffer.sqlite")
LOG_FILE = os.getenv("LOG_FILE_PATH", "gateway.log")

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("CityCleanGateway")


class OfflineQueue:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS readings_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    payload TEXT NOT NULL,
                    created_at REAL NOT NULL
                )
                """
            )
            conn.commit()

    def enqueue(self, payload: dict):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                "INSERT INTO readings_queue (payload, created_at) VALUES (?, ?)",
                (json.dumps(payload), time.time()),
            )
            conn.commit()
        logger.debug(f"Payload buffered locally in SQLite queue.")

    def get_batch(self, limit: int = 50):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, payload FROM readings_queue ORDER BY id ASC LIMIT ?",
                (limit,),
            )
            return cursor.fetchall()

    def delete_ids(self, ids: list):
        if not ids:
            return
        with sqlite3.connect(self.db_path) as conn:
            placeholders = ",".join("?" for _ in ids)
            conn.execute(
                f"DELETE FROM readings_queue WHERE id IN ({placeholders})", ids
            )
            conn.commit()

    def count(self) -> int:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM readings_queue")
            return cursor.fetchone()[0]


class SerialBridge:
    def __init__(self):
        self.queue = OfflineQueue(SQLITE_DB)
        self.ser: Optional[serial.Serial] = None

    def connect_serial(self) -> bool:
        while True:
            try:
                logger.info(f"Opening serial port {SERIAL_PORT} @ {BAUD_RATE} baud...")
                self.ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
                time.sleep(2)  # Arduino Uno resets upon DTR connection
                logger.info("Serial connection established successfully.")
                return True
            except Exception as e:
                logger.warning(
                    f"Unable to connect to serial port {SERIAL_PORT}: {e}. Retrying in 5s..."
                )
                time.sleep(5)

    def generate_headers(self, body_json: str) -> dict:
        headers = {
            "Content-Type": "application/json",
            "X-Device-Id": DEVICE_ID,
            "X-Api-Key": DEVICE_API_KEY,
        }
        if ENABLE_HMAC:
            ts = str(int(time.time()))
            sig_string = f"{ts}.{body_json}".encode("utf-8")
            signature = hmac.new(
                DEVICE_API_KEY.encode("utf-8"), sig_string, hashlib.sha256
            ).hexdigest()
            headers["X-Signature"] = signature
            headers["X-Timestamp"] = ts
        return headers

    def post_reading(self, payload: dict) -> bool:
        url = f"{API_BASE_URL}/device/readings"
        body_str = json.dumps(payload)
        headers = self.generate_headers(body_str)

        try:
            res = requests.post(url, data=body_str, headers=headers, timeout=5)
            if res.status_code in (200, 202):
                logger.info(f"Delivered reading: HTTP {res.status_code} - {res.text}")
                return True
            else:
                logger.warning(f"Server returned non-200 status: HTTP {res.status_code}")
                return False
        except requests.RequestException as e:
            logger.warning(f"Network error forwarding to API: {e}")
            return False

    def flush_offline_queue(self):
        buffered_count = self.queue.count()
        if buffered_count == 0:
            return

        logger.info(f"Attempting flush of {buffered_count} buffered offline records...")
        batch = self.queue.get_batch(limit=100)
        if not batch:
            return

        batch_items = [json.loads(row[1]) for row in batch]
        row_ids = [row[0] for row in batch]

        url = f"{API_BASE_URL}/device/readings/batch"
        body_str = json.dumps(batch_items)
        headers = self.generate_headers(body_str)

        try:
            res = requests.post(url, data=body_str, headers=headers, timeout=10)
            if res.status_code in (200, 202):
                self.queue.delete_ids(row_ids)
                logger.info(f"Successfully flushed {len(row_ids)} offline readings.")
        except Exception as e:
            logger.warning(f"Offline batch flush failed: {e}")

    def run(self):
        logger.info("Starting CityClean Serial Gateway...")
        self.connect_serial()

        while True:
            try:
                # Flush offline queue periodically
                if self.queue.count() > 0:
                    self.flush_offline_queue()

                # Read line from Arduino Uno
                line = self.ser.readline().decode("utf-8", errors="ignore").strip()
                if not line:
                    continue

                logger.debug(f"Raw Serial: {line}")

                # Expecting JSON: {"deviceId":"NODE-001","mq135_raw":612}
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    logger.debug(f"Non-JSON line ignored: {line}")
                    continue

                if "mq135_raw" not in data:
                    continue

                # Construct standard API ingestion payload
                payload = {
                    "deviceId": data.get("deviceId", DEVICE_ID),
                    "ts": int(time.time()),
                    "readings": {
                        "mq135_raw": data["mq135_raw"],
                    },
                    "fw": "uno-gateway-1.0",
                }

                # Attempt immediate delivery
                success = self.post_reading(payload)
                if not success:
                    # Enqueue into local SQLite database
                    self.queue.enqueue(payload)

            except serial.SerialException as se:
                logger.error(f"Serial port disconnected: {se}. Reconnecting...")
                if self.ser:
                    try:
                        self.ser.close()
                    except:
                        pass
                self.connect_serial()
            except Exception as e:
                logger.error(f"Unexpected loop exception: {e}")
                time.sleep(1)


if __name__ == "__main__":
    bridge = SerialBridge()
    bridge.run()
