# CityClean REST API Specification (v1)

Base URL: `/api/v1`  
OpenAPI / Swagger UI: `/api/docs`

All responses follow a consistent JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142
  }
}
```

---

## 1. Authentication & Session (`/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register new Citizen (name, email, password, phone) |
| `POST` | `/auth/login` | Public | Login with email + password, returns Access & Refresh JWT tokens |
| `POST` | `/auth/refresh` | Public | Refresh expired access token using refresh token |
| `POST` | `/auth/logout` | Authenticated | Revoke refresh token and invalidate session |
| `GET` | `/auth/me` | Authenticated | Get currently authenticated user profile and roles |

---

## 2. Civic Complaints (`/complaints`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/complaints` | Citizen / Officer | Create complaint (multipart/form-data: photos, title, desc, coords, category) |
| `GET` | `/complaints` | Authenticated | List complaints with filters (`status`, `wardId`, `categoryId`, `priority`, `source`, `bbox`, `mine`, `search`) |
| `GET` | `/complaints/:id` | Authenticated | Retrieve full complaint details, media, verification, and timeline |
| `PATCH` | `/complaints/:id/status` | Officer / Sup / Admin | Update status (`IN_PROGRESS`, `RESOLVED` with mandatory after photo) |
| `POST` | `/complaints/:id/assign` | Supervisor / Admin | Reassign complaint to specific ward officer |
| `POST` | `/complaints/:id/comments` | Authenticated | Add citizen or internal officer comment |
| `POST` | `/complaints/:id/upvote` | Citizen | Upvote ("I'm affected too") – increments weight and recalculates priority |
| `POST` | `/complaints/:id/confirm-resolution` | Citizen (Reporter) | Confirm complaint was fixed satisfactorily (marks `CLOSED`) |
| `POST` | `/complaints/:id/reject-resolution` | Citizen (Reporter) | Reject resolution ("Not fixed"), reopens with 24h accelerated SLA |
| `POST` | `/complaints/:id/appeal` | Citizen (Reporter) | Appeal an AI rejection (`REJECTED_SPAM` -> `NEEDS_REVIEW`) |
| `GET` | `/complaints/nearby` | Public / Auth | Spatial search for existing open issues within radius (meters) |

---

## 3. IoT Hardware & Sensor API (`/device`)

Authentication:
- `X-Device-Id`: Device identifier (e.g., `NODE-001`)
- `X-Api-Key`: Device pre-shared secret key
- Optional `X-Signature`: `HMAC-SHA256(body, secret)`
- Optional `X-Timestamp`: Unix seconds (verified against $\pm 5$ min skew)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/device/readings` | Ingest single reading payload `{ ts, readings: { mq135_raw, mq135_ppm, temperature_c, humidity }, battery_v, fw }` |
| `POST` | `/device/readings/batch` | Offline buffer batch ingestion (up to 200 items) |
| `POST` | `/device/heartbeat` | Health check + synchronize server time and active configuration |
| `GET` | `/device/config` | Pull active calibration parameters (`R0`, `a`, `b`) and sample interval |

---

## 4. Real-Time Streaming (`/stream`)

| Method | Endpoint | Protocol | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/stream/complaints` | SSE | Real-time complaint state transitions for Officer/Supervisor dashboard |
| `GET` | `/stream/devices/:id` | SSE | Live telemetry stream for admin gauge and real-time PPM charting |

---

## 5. Administrative Operations (`/admin`)

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `GET/POST` | `/admin/users` | Admin | List, filter, and invite municipal staff (Officers, Supervisors) |
| `GET/POST` | `/admin/wards` | Admin | Configure wards, geospatial boundaries, and assigned departments |
| `GET/POST` | `/admin/categories` | Admin | Manage issue categories, icons, and default SLA durations |
| `GET/PUT` | `/admin/settings` | Admin | Configure SLA breach hours, DM Office email, AI thresholds |
| `GET/POST` | `/admin/devices` | Admin | Register IoT nodes (generates API key), edit calibration, test alert |
| `GET` | `/admin/analytics/summary`| Admin / Sup | High-level metrics: total complaints, resolution rate, SLA breach % |
| `GET` | `/admin/analytics/hotspots`| Admin / Sup | PostGIS spatial clustering heatmap data |
| `GET` | `/admin/audit-logs` | Admin | Comprehensive security and administrative audit log viewer |

---

## 6. Public Transparency Portal (`/public`)

No authentication required. Sanitized to exclude all citizen PII.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/public/stats` | Global civic metrics: resolved this week, average resolution time, SLA compliance |
| `GET` | `/public/map` | Anonymized active complaints with GPS coordinates and priority status |
| `GET` | `/public/leaderboard` | Ward performance ranking based on SLA turnaround speed |
