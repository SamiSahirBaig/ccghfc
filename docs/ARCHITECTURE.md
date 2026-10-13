# CityClean Civic Issue Reporting Platform - Architecture Plan

## 1. Executive Summary & Vision
CityClean is a comprehensive, production-grade civic issue reporting and IoT-enabled municipal grievance redressal system. It bridges citizens, municipal field officers, ward supervisors, district magistrates (DM), and autonomous IoT environmental sensors into a transparent, accountable lifecycle with an automated 72-hour SLA and escalation chain.

---

## 2. System Architecture & Component Diagram

```mermaid
flowchart TD
    subgraph Citizens & Public
        CitizenUI["Next.js Web PWA (Citizen / Public Portal)"]
        PublicMap["Public Transparency Map & Leaderboard"]
    end

    subgraph Hardware & IoT
        ESP32["ESP32 / ESP8266 + MQ135 (Wi-Fi Node)"]
        Uno["Arduino Uno + MQ135 (Serial Node)"]
        Gateway["Python Serial Gateway (SQLite Buffer + HMAC)"]
        Simulator["IoT Device Simulator (Normal/Spike/Rising)"]
    end

    subgraph Municipal Staff & Governance
        OfficerUI["Officer Kanban & Assigned Map"]
        SupervisorUI["Supervisor Zone Overview & Reassignment"]
        AdminUI["Admin Analytics, Device Mgr, Audit Logs"]
        DMEmail["District Magistrate (DM) Office (Automated Escalation)"]
    end

    subgraph Backend Core (Node.js 20 + Express + TypeScript)
        API["Express REST API (/api/v1) + Swagger (/api/docs)"]
        AuthSvc["Auth & RBAC (JWT, bcrypt, API Keys, HMAC)"]
        ComplaintSvc["Complaint Service (Geo-clustering, pHash, Duplicates)"]
        AISvc["AI Service (Pluggable: Mock / Gemini / Claude Vision)"]
        DeviceSvc["Device Ingestion & MQ135 Gas PPM Processor"]
        StreamSvc["Server-Sent Events (SSE) Stream Controller"]
    end

    subgraph Storage & Infrastructure
        PG["PostgreSQL 15 + PostGIS (Geo queries, Spatial indexing)"]
        Redis["Redis (Cache & BullMQ queue state)"]
        BullMQ["BullMQ Workers (SLA Timers, Escalations, AI Verification)"]
        MinIO["S3-Compatible Object Store (MinIO / AWS S3)"]
        Mail["SMTP Server (Nodemailer / Mailpit)"]
    end

    ESP32 -->|"POST /api/v1/device/readings"| API
    Uno -->|"9600 Baud Serial"| Gateway
    Gateway -->|"POST /api/v1/device/readings"| API
    Simulator -->|"HTTP Batch/Realtime"| API

    CitizenUI -->|"REST /api/v1"| API
    OfficerUI -->|"REST & SSE"| API
    SupervisorUI -->|"REST"| API
    AdminUI -->|"REST & SSE"| API

    API --> AuthSvc
    API --> ComplaintSvc
    API --> AISvc
    API --> DeviceSvc
    API --> StreamSvc

    API --> PG
    API --> MinIO
    API --> Redis
    Redis --> BullMQ
    BullMQ --> Mail
    Mail --> DMEmail
```

---

## 3. Core Modules & Subsystems

### 3.1 Database & Spatial Engine (PostgreSQL 15 + PostGIS)
- **Spatial Indexing**: `location geography(Point, 4326)` for complaints and devices; `boundary geography(Polygon, 4326)` for wards.
- **Duplicate Clustering**: `ST_DWithin(c1.location, c2.location, 50)` to cluster nearby complaints within 50 meters of the same category, linking child complaints to an active parent complaint.
- **Auditing & History**: `status_history`, `escalation_logs`, and `audit_logs` track every state transition, email delivery, and administrative change.

### 3.2 72-Hour SLA & Multi-Tier Escalation Engine
- **T+0**: Immediate notification sent to the assigned Ward Officer and Supervisor upon verification.
- **T+24h**: Reminder triggered if status remains `ASSIGNED` without officer action.
- **T+48h**: High-priority warning dispatched to officer and supervisor ("24 hours remaining").
- **T+72h (Breach)**: Status updated to `SLA_BREACHED`, escalation level set to 1. Idempotent email dispatched to the District Magistrate (DM) office (Mailpit captured in dev) with complaint details, photos, GPS map links, and affected citizen upvote counts.
- **T+120h (Breach L2)**: Escalation level 2 dispatched to District Commissioner / State oversight.
- **Reopened Complaints**: Shorter 24-hour turnaround timer with accelerated escalation.
- **Resilience**: Idempotent jobs via deterministic BullMQ job IDs (`sla-${complaintId}-warning`, `sla-${complaintId}-breach`), cancellation on resolution, and server-boot reconciliation.

### 3.3 AI Verification & Emergency Ranking Engine
- **Pluggable Architecture**: `IAIProvider` interface with `MockAIProvider` (deterministic heuristic fallback) and multimodal LLM vision implementations (Google Gemini / Anthropic Claude).
- **Legitimacy Checks**: Image relevance detection, category matching, indoor/stock photo/screenshot flags, perceptual hashing (pHash) against existing complaint media, EXIF freshness and GPS proximity verification.
- **Emergency Priority Formula (0-100)**:
  $$\text{Priority} = 0.40 \cdot \text{AI Severity} + 0.20 \cdot \text{Sensitive POI} + 0.15 \cdot \text{Duplicates \& Upvotes} + 0.15 \cdot \text{SLA Age} + 0.10 \cdot \text{IoT Gas Sensor}$$
  Categorized as **CRITICAL** ($\ge 80$), **HIGH** ($60-79$), **MEDIUM** ($35-59$), and **LOW** ($< 35$).

### 3.4 Hardware & IoT Ingestion (MQ135 Gas Sensor)
- **PPM Calculation**: Implements the MQ135 sensor curve equation:
  $$\text{PPM} = a \cdot \left(\frac{R_s}{R_0}\right)^b$$
- **Dual Connection Paths**:
  - **Path A**: ESP32 Wi-Fi microcontroller directly posting JSON payloads with SHA-256 HMAC signature headers.
  - **Path B**: Arduino Uno sending serial packets at 9600 baud, connected via a resilient Python gateway (`hardware/gateway/gateway.py`) with local SQLite offline buffering.
- **Automatic Complaint Generation**: $N$ consecutive readings exceeding `critical_threshold` trigger a verified municipal complaint with source `SENSOR`, assigning the ward officer and initiating the 72-hour SLA.
- **Real-Time Telemetry**: Server-Sent Events (SSE) streaming live device readings to the Admin Dashboard gauge and charts.

### 3.5 User Roles & Permissions
| Role | Capabilities |
| :--- | :--- |
| **CITIZEN** | Register, submit complaints with camera/GPS, track status, upvote, comment, confirm/reject resolution. |
| **OFFICER** | View assigned ward complaints sorted by priority score, update status, upload mandatory 'after' photo for resolution. |
| **SUPERVISOR** | Oversee all ward queues in zone, reassign officers, inspect officer SLA performance, receive 48h warnings. |
| **ADMIN** | System analytics, device management, ward/category configuration, SLA overrides, audit log inspection. |
| **DEVICE** | Hardware telemetry ingestion using device ID + API key / HMAC verification. |

---

## 4. Implementation Phasing & Milestones
1. **Database Schema & PostGIS Migrations**: Prisma schema with PostGIS models, seed data (zones, wards, categories, users, complaints, devices).
2. **Backend Core & REST API**: Express 20 + TypeScript, Zod validation, JWT + RBAC, Swagger UI OpenAPI 3 docs.
3. **Queue & SLA Engine**: Redis BullMQ delayed jobs, reconciliation on restart, Nodemailer/Mailpit integration.
4. **AI Vision & Scoring Service**: Pluggable provider, pHash, priority formula calculator.
5. **IoT Ingestion & Real-Time Streams**: MQ135 PPM formula, auto-complaint rules, debounce/cooldown, SSE streaming.
6. **Frontend Web PWA (Next.js 14 App Router)**: Tailwind CSS, shadcn/ui, Leaflet OSM maps, Recharts, i18n (English + Hindi), offline draft cache.
7. **Hardware Deliverables & Simulation**: Arduino Uno sketch, ESP32 sketch, Python gateway, node simulator (`npm run simulate`), and comprehensive wiring guide (`HARDWARE_GUIDE.md`).
8. **Testing & Verification**: Automated unit, integration, and E2E verification suites.
