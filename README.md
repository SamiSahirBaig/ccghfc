# CityClean - Civic Issue Reporting Platform (Full-Stack + IoT-Ready)

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%20PostGIS-blue.svg)](https://postgis.net/)
[![BullMQ](https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-red.svg)](https://bullmq.io/)
[![IoT](https://img.shields.io/badge/IoT-Arduino%20Uno%20%7C%20ESP32%20MQ135-orange.svg)](#hardware--iot-integration)

**CityClean** is a complete, production-grade civic issue reporting and municipal governance system with autonomous IoT environmental sensing. Citizens report civic sanitation defects with camera-first photo evidence; an AI vision engine verifies authenticity and ranks urgency; municipal officers are given a statutory **72-hour (3-day) SLA** to resolve issues; and unresolved complaints **automatically escalate directly to the District Magistrate (DM) office** with full photographic and spatial evidence.

---

## 1. System Architecture

```mermaid
flowchart TD
    subgraph Citizens & Governance
        Citizen["Citizen (Mobile PWA)"]
        Officer["Ward Officer"]
        Supervisor["Zone Supervisor"]
        Admin["Municipal Admin"]
        DM["District Magistrate (Automated Email)"]
    end

    subgraph IoT Environmental Nodes
        ESP32["ESP32 + MQ135 (Wi-Fi)"]
        Uno["Arduino Uno + MQ135 (USB)"]
        Gateway["Python Serial Gateway"]
        Sim["Simulator (npm run simulate)"]
    end

    subgraph Backend Core (Node 20 + Express)
        API["REST API (/api/v1) + Swagger (/api/docs)"]
        AISvc["AI Vision & Scoring Engine"]
        BullMQ["BullMQ 72h SLA & Escalation Workers"]
        SSE["Server-Sent Events Telemetry Stream"]
    end

    subgraph Persistence & Infrastructure
        PG[("PostgreSQL 15 + PostGIS")]
        Redis[("Redis 7 (Delayed Jobs)")]
        MinIO[("MinIO / S3 Storage")]
        Mailpit["Mailpit SMTP Inspector"]
    end

    Citizen -->|"3-Step Camera + GPS Report"| API
    Officer -->|"Mandatory After Photo"| API
    ESP32 -->|"POST /device/readings"| API
    Uno -->|"9600 Baud"| Gateway --> API
    Sim -->|"Spike Scenarios"| API

    API --> PG
    API --> MinIO
    API --> AISvc
    API --> Redis --> BullMQ
    BullMQ -->|"T+72h Breach"| Mailpit --> DM
    API --> SSE --> Admin
```

---

## 2. Key Features

- **Mobile-First Citizen Reporting**: 3-step stepper with `<input type="file" capture="environment">`, client-side Canvas compression ($\le 1.5\text{MB}$), and Nominatim reverse geocoding.
- **Multimodal AI Verification**: Pluggable `AIService` (`MockAIProvider`, Google Gemini, Anthropic Claude) analyzing defect type, filtering stock photos/memes, checking pHash duplicate photos, and calculating a composite 0–100 urgency score.
- **72-Hour Enforced SLA & Automated DM Escalation**:
  - **T+0**: Assignment notice to ward officer.
  - **T+24h**: Reminder if still pending.
  - **T+48h**: Warning notice to officer and supervisor.
  - **T+72h (Breach)**: Marks `SLA_BREACHED`, sets level 1, and dispatches detailed HTML escalation email to the District Magistrate inbox with photos, GPS links, and upvote counts.
  - **T+120h**: Escalation level 2 to State Commissioner oversight.
- **Accountable Resolution Proof**: Officers **must** upload an "after" resolution photo to mark complaints resolved. Citizens can confirm or reject ("Not really fixed!" -> reopens with accelerated 24-hour SLA).
- **Autonomous IoT Gas Ingestion**:
  - MQ135 air quality & sewer gas monitoring.
  - Implements standard semiconductor formula: $\text{PPM} = a \cdot (R_s / R_0)^b$.
  - Consecutive critical spikes auto-generate municipal grievances with source `SENSOR` and initiate the 72-hour SLA.
  - Real-time Server-Sent Events (SSE) telemetry charts.
- **Dual Hardware Paths**:
  - **Path A**: ESP32 Wi-Fi node (`hardware/esp32_mq135/`) with median filtering and offline RAM ring buffering.
  - **Path B**: Arduino Uno USB node (`hardware/uno_serial_node/`) with Python serial bridge (`hardware/gateway/`).
  - **Zero-Hardware Simulation**: Built-in simulator (`npm run simulate`).

---

## 3. Demo Credentials

The database seeds 4 role-based demo accounts:

| Role | Email | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@cityclean.gov` | `password123` | Report issues, track timeline, upvote, confirm/reject resolution |
| **Officer** | `officer@cityclean.gov` | `password123` | View assigned ward queue, update status, upload after-photo |
| **Supervisor** | `supervisor@cityclean.gov` | `password123` | Zonal overview, 48h warning monitor, officer reassignment |
| **Admin** | `admin@cityclean.gov` | `password123` | System analytics, device manager, calibration wizard, audit logs |

---

## 4. Quick Start (Docker Compose)

The complete stack starts with a single command:

```bash
# 1. Clone repository
git clone https://github.com/your-org/cityclean.git
cd cityclean

# 2. Copy environment file
cp .env.example .env

# 3. Spin up all services (Postgres PostGIS, Redis, MinIO, Mailpit, API, Web)
docker compose up --build
```

### Active Service Endpoints:
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **REST API Server**: [http://localhost:5000](http://localhost:5000)
- **Swagger OpenAPI Documentation**: [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Mailpit Webmail (DM Escalation Inbox)**: [http://localhost:8025](http://localhost:8025)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)

---

## 5. Local Development (Without Docker)

### Prerequisites:
- Node.js 20+ installed
- PostgreSQL 15 (or set `DATABASE_URL` in `.env`)
- Redis (optional; in-memory timer fallback active if Redis is offline)

```bash
# Install root dependencies
npm install

# Run database migrations and seed data
npm run prisma:generate
npm run prisma:push
npm run prisma:seed

# Run automated test suites (unit + integration)
npm test

# Run hardware node simulator (fires normal, rising, and critical spike readings)
npm run simulate

# Start development servers concurrently
npm run dev:all
```

---

## 6. Hardware & IoT Deployment

### Path A: ESP32 Wi-Fi Node
1. Navigate to **Admin Portal > Devices** ([http://localhost:3000/admin/devices](http://localhost:3000/admin/devices)).
2. Click **+ Register New Node**. Copy the generated `NODE-XXX` and One-Time API Key.
3. Open `hardware/esp32_mq135/config.h.example`, rename to `config.h`, and enter your Wi-Fi SSID, Device ID, and API Key.
4. Flash using Arduino IDE.

### Path B: Arduino Uno Serial Bridge
1. Flash `hardware/uno_serial_node/uno_serial_node.ino` to your Uno.
2. Install Python dependencies:
   ```bash
   cd hardware/gateway
   pip install -r requirements.txt
   cp .env.example .env
   python gateway.py
   ```

### Zero-Hardware Simulation
To demonstrate the entire hardware pipeline (telemetry -> spike detection -> auto complaint creation -> DM escalation alert) without any physical boards:
```bash
npm run simulate
```

---

## 7. Verification & Acceptance Testing

1. **Complaint Lifecycle**:
   - Log in as `citizen@cityclean.gov`.
   - Go to **Report Issue**, take/upload a photo, set category to *Garbage Pileup*, and submit.
   - Note the Complaint ID and AI verification result.
2. **Officer Resolution**:
   - Log in as `officer@cityclean.gov`.
   - Go to **Officer Queue**, click **Resolve Issue**, upload an "after" photo, and submit.
   - Switch to Citizen, view complaint, click **Confirm Resolution** to close.
3. **2-Minute SLA Escalation Demo**:
   - Set `SLA_OVERRIDE_MINUTES=2` in `.env`.
   - Submit a complaint.
   - Open Mailpit at [http://localhost:8025](http://localhost:8025).
   - At T+1m 20s, view the 48h warning email.
   - At T+2m, view the District Magistrate escalation email with photos and GPS links.

---

## 8. License & Governance
CityClean is distributed under the MIT License. Developed for municipal civic technology and open smart city infrastructure.
