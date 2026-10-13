import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Pre-computed bcrypt hash of "password123"
const DEMO_PASSWORD_HASH = bcrypt.hashSync('password123', 10);

export class InMemoryDB {
  public zones: any[] = [];
  public wards: any[] = [];
  public departments: any[] = [];
  public categories: any[] = [];
  public users: any[] = [];
  public devices: any[] = [];
  public sensorReadings: any[] = [];
  public sensorAlerts: any[] = [];
  public complaints: any[] = [];
  public complaintMedia: any[] = [];
  public aiVerifications: any[] = [];
  public statusHistories: any[] = [];
  public comments: any[] = [];
  public upvotes: any[] = [];
  public escalationLogs: any[] = [];
  public settings: any[] = [];
  public auditLogs: any[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    // 1. Zones
    this.zones = [
      { id: 'zone-1', name: 'North Civic Zone', description: 'Northern administrative district' },
      { id: 'zone-2', name: 'South Civic Zone', description: 'Southern municipal district' },
    ];

    // 2. Wards
    this.wards = [
      {
        id: 'ward-1',
        name: 'Ward 1 - Connaught Central',
        zoneId: 'zone-1',
        boundaryGeoJson: JSON.stringify({ type: 'Polygon', coordinates: [[[77.2, 28.61], [77.25, 28.61], [77.25, 28.65], [77.2, 28.65], [77.2, 28.61]]] }),
      },
      {
        id: 'ward-2',
        name: 'Ward 2 - Civil Lines',
        zoneId: 'zone-1',
        boundaryGeoJson: JSON.stringify({ type: 'Polygon', coordinates: [[[77.2, 28.65], [77.25, 28.65], [77.25, 28.7], [77.2, 28.7], [77.2, 28.65]]] }),
      },
      {
        id: 'ward-3',
        name: 'Ward 3 - Karol Bagh',
        zoneId: 'zone-1',
        boundaryGeoJson: JSON.stringify({ type: 'Polygon', coordinates: [[[77.15, 28.63], [77.2, 28.63], [77.2, 28.68], [77.15, 28.68], [77.15, 28.63]]] }),
      },
      {
        id: 'ward-4',
        name: 'Ward 4 - Lajpat Nagar',
        zoneId: 'zone-2',
        boundaryGeoJson: JSON.stringify({ type: 'Polygon', coordinates: [[[77.22, 28.54], [77.26, 28.54], [77.26, 28.58], [77.22, 28.58], [77.22, 28.54]]] }),
      },
      {
        id: 'ward-5',
        name: 'Ward 5 - Hauz Khas',
        zoneId: 'zone-2',
        boundaryGeoJson: JSON.stringify({ type: 'Polygon', coordinates: [[[77.18, 28.52], [77.22, 28.52], [77.22, 28.56], [77.18, 28.56], [77.18, 28.52]]] }),
      },
      {
        id: 'ward-6',
        name: 'Ward 6 - Saket Urban',
        zoneId: 'zone-2',
        boundaryGeoJson: JSON.stringify({ type: 'Polygon', coordinates: [[[77.19, 28.5], [77.23, 28.5], [77.23, 28.54], [77.19, 28.54], [77.19, 28.5]]] }),
      },
    ];

    // 3. Department & Categories
    this.departments = [
      {
        id: 'dept-1',
        name: 'Department of Sanitation & Environmental Safety',
        code: 'SAN-ENV',
        contactEmail: 'sanitation@cityclean.gov',
      },
    ];

    this.categories = [
      { id: 'cat-1', name: 'Garbage Pileup & Illegal Dumping', departmentId: 'dept-1', defaultSlaHours: 72, icon: 'trash-2' },
      { id: 'cat-2', name: 'Sewage Blockage & Overflowing Drains', departmentId: 'dept-1', defaultSlaHours: 48, icon: 'droplet' },
      { id: 'cat-3', name: 'Dead Animal Removal', departmentId: 'dept-1', defaultSlaHours: 24, icon: 'alert-triangle' },
      { id: 'cat-4', name: 'Burning Waste & Toxic Smoke', departmentId: 'dept-1', defaultSlaHours: 24, icon: 'flame' },
      { id: 'cat-5', name: 'Foul Gas / Air Quality Hazard (IoT)', departmentId: 'dept-1', defaultSlaHours: 48, icon: 'wind' },
      { id: 'cat-6', name: 'Potholes & Waterlogged Dips', departmentId: 'dept-1', defaultSlaHours: 72, icon: 'activity' },
    ];

    // 4. Demo Users
    this.users = [
      {
        id: 'user-admin',
        name: 'Municipal Administrator',
        email: 'admin@cityclean.gov',
        phone: '+919811000001',
        passwordHash: DEMO_PASSWORD_HASH,
        role: 'ADMIN',
        wardId: 'ward-1',
        trustScore: 1.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-supervisor',
        name: 'Rajesh Verma (Zone Supervisor)',
        email: 'supervisor@cityclean.gov',
        phone: '+919811000002',
        passwordHash: DEMO_PASSWORD_HASH,
        role: 'SUPERVISOR',
        wardId: 'ward-1',
        trustScore: 1.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-officer',
        name: 'Sunil Kumar (Ward Officer)',
        email: 'officer@cityclean.gov',
        phone: '+919811000003',
        passwordHash: DEMO_PASSWORD_HASH,
        role: 'OFFICER',
        wardId: 'ward-1',
        trustScore: 1.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'user-citizen',
        name: 'Aarav Sharma (Citizen)',
        email: 'citizen@cityclean.gov',
        phone: '+919811000004',
        passwordHash: DEMO_PASSWORD_HASH,
        role: 'CITIZEN',
        wardId: 'ward-1',
        trustScore: 1.0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // 5. IoT Devices (SHA256 of cc_key_node001, cc_key_node002, cc_key_node003)
    this.devices = [
      {
        id: 'device-1',
        deviceCode: 'NODE-001',
        name: 'Connaught Plaza Air Quality Node',
        latitude: 28.6315,
        longitude: 77.2167,
        wardId: 'ward-1',
        apiKeyHash: crypto.createHash('sha256').update('cc_key_node001').digest('hex'),
        status: 'ONLINE',
        firmwareVersion: '1.0.0',
        calibration: JSON.stringify({ R0: 10.0, a: 116.602, b: -2.769, RL: 10.0 }),
        sampleIntervalSec: 2,
        warnThresholdPpm: 250.0,
        criticalThresholdPpm: 400.0,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'device-2',
        deviceCode: 'NODE-002',
        name: 'Lajpat Market Waste Station Node',
        latitude: 28.5677,
        longitude: 77.2433,
        wardId: 'ward-4',
        apiKeyHash: crypto.createHash('sha256').update('cc_key_node002').digest('hex'),
        status: 'ONLINE',
        firmwareVersion: '1.0.0',
        calibration: JSON.stringify({ R0: 10.0, a: 116.602, b: -2.769, RL: 10.0 }),
        sampleIntervalSec: 2,
        warnThresholdPpm: 250.0,
        criticalThresholdPpm: 400.0,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'device-3',
        deviceCode: 'NODE-003',
        name: 'Hauz Khas Drain Monitor',
        latitude: 28.5494,
        longitude: 77.2001,
        wardId: 'ward-5',
        apiKeyHash: crypto.createHash('sha256').update('cc_key_node003').digest('hex'),
        status: 'ONLINE',
        firmwareVersion: '1.0.0',
        calibration: JSON.stringify({ R0: 10.0, a: 116.602, b: -2.769, RL: 10.0 }),
        sampleIntervalSec: 2,
        warnThresholdPpm: 250.0,
        criticalThresholdPpm: 400.0,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Seed readings for each device
    const now = Date.now();
    for (const d of this.devices) {
      for (let i = 0; i < 20; i++) {
        const timeOffset = (20 - i) * 60 * 1000;
        const raw = 320 + Math.floor(Math.random() * 40);
        this.sensorReadings.push({
          id: `reading-${d.id}-${i}`,
          deviceId: d.id,
          recordedAt: new Date(now - timeOffset),
          rawValue: raw,
          ppm: Math.round(raw * 0.35 * 10) / 10,
          temperatureC: 28.0 + Math.random() * 3,
          humidity: 62 + Math.random() * 8,
          batteryV: 3.9,
          createdAt: new Date(now - timeOffset),
        });
      }
    }

    // 6. Sample Complaints
    const statuses = ['SUBMITTED', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'SLA_BREACHED'];
    const sampleTitles = [
      'Massive garbage accumulation behind residential apartments',
      'Open storm drain clogged with plastic bottles and black sludge',
      'Stray animal carcass causing extreme foul odor near kindergarten',
      'Illegal nocturnal burning of plastic wire waste',
      'Overflowing municipal dumpster spilling onto pedestrian footway',
      'High gas odor emanating from blocked underground sewer main',
      'Deep waterlogged pothole blocking two lanes of traffic',
      'Commercial restaurant dumping untreated cooking fat in roadside drain',
    ];

    for (let i = 1; i <= 25; i++) {
      const st = statuses[i % statuses.length];
      const cat = this.categories[i % this.categories.length];
      const ward = this.wards[i % this.wards.length];
      const latOffset = (Math.sin(i) * 0.04);
      const lngOffset = (Math.cos(i) * 0.04);
      const priorityScore = 35 + ((i * 13) % 60);
      const priorityLabel = priorityScore >= 80 ? 'CRITICAL' : priorityScore >= 60 ? 'HIGH' : priorityScore >= 35 ? 'MEDIUM' : 'LOW';
      const createdAt = new Date(now - (i * 4 * 3600 * 1000));
      const slaDeadline = new Date(createdAt.getTime() + 72 * 3600 * 1000);
      const complaintId = `comp-${i}`;

      this.complaints.push({
        id: complaintId,
        publicCode: `CC-2026-${String(1000 + i).padStart(6, '0')}`,
        reporterId: 'user-citizen',
        source: i % 8 === 0 ? 'SENSOR' : 'CITIZEN',
        categoryId: cat.id,
        title: sampleTitles[i % sampleTitles.length],
        description: `Detailed report: Civilians in ${ward.name} have flagged ongoing sanitation issues at this site.`,
        latitude: 28.6139 + latOffset,
        longitude: 77.2090 + lngOffset,
        address: `Sector ${i * 2}, ${ward.name}, New Delhi`,
        landmark: `Near Metro Pillar ${i}`,
        wardId: ward.id,
        status: st,
        priorityScore,
        priorityLabel,
        aiSeverity: Math.min(10, Math.max(1, Math.floor(priorityScore / 10))),
        slaDeadline,
        escalationLevel: st === 'SLA_BREACHED' ? 1 : 0,
        assignedOfficerId: 'user-officer',
        upvoteCount: (i * 3) % 15,
        resolvedAt: st === 'RESOLVED' ? new Date(now - 3600000) : null,
        parentComplaintId: null,
        createdAt,
        updatedAt: createdAt,
      });

      this.complaintMedia.push({
        id: `media-before-${i}`,
        complaintId,
        url: `https://picsum.photos/seed/civic${i}/800/600`,
        type: 'BEFORE',
        phash: crypto.randomBytes(8).toString('hex'),
        createdAt,
      });

      if (st === 'RESOLVED') {
        this.complaintMedia.push({
          id: `media-after-${i}`,
          complaintId,
          url: `https://picsum.photos/seed/civic_after${i}/800/600`,
          type: 'AFTER',
          phash: crypto.randomBytes(8).toString('hex'),
          createdAt,
        });
      }

      this.statusHistories.push({
        id: `sh-${i}`,
        complaintId,
        fromStatus: 'SUBMITTED',
        toStatus: st,
        actorId: 'user-officer',
        note: `Status updated to ${st}.`,
        createdAt,
      });
    }

    // 7. Settings
    this.settings = [
      { id: 'set-1', key: 'SLA_HOURS_DEFAULT', value: JSON.stringify(72), description: 'Default SLA hours before DM escalation' },
      { id: 'set-2', key: 'DM_OFFICE_EMAIL', value: JSON.stringify('dm-office@district.gov.in'), description: 'District Magistrate escalation inbox' },
      { id: 'set-3', key: 'AI_VERIFICATION_ENABLED', value: JSON.stringify(true), description: 'Run automated AI photo verification' },
      { id: 'set-4', key: 'MQ135_CRITICAL_PPM', value: JSON.stringify(400), description: 'PPM threshold for autonomous SENSOR complaint dispatch' },
    ];
  }

  // --- Generic Model Query Helper ---
  public createModelProxy(collectionName: string) {
    const getCollection = (): any[] => (this as any)[collectionName] || [];

    return {
      findUnique: async (args: any) => {
        const items = getCollection();
        const found = items.find((item) => matchesWhere(item, args?.where));
        return found ? enrichItem(found, args?.include, this) : null;
      },

      findFirst: async (args: any) => {
        const items = getCollection();
        const found = items.find((item) => matchesWhere(item, args?.where));
        return found ? enrichItem(found, args?.include, this) : null;
      },

      findMany: async (args?: any) => {
        let items = getCollection();
        if (args?.where) {
          items = items.filter((item) => matchesWhere(item, args.where));
        }

        if (args?.orderBy) {
          items = sortItems(items, args.orderBy);
        }

        const skip = args?.skip || 0;
        const take = args?.take !== undefined ? args.take : items.length;
        const sliced = items.slice(skip, skip + take);

        return sliced.map((item) => enrichItem(item, args?.include, this));
      },

      count: async (args?: any) => {
        let items = getCollection();
        if (args?.where) {
          items = items.filter((item) => matchesWhere(item, args.where));
        }
        return items.length;
      },

      create: async (args: any) => {
        const items = getCollection();
        const id = args.data.id || `${collectionName}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newItem = {
          id,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        items.push(newItem);
        return enrichItem(newItem, args?.include, this);
      },

      createMany: async (args: any) => {
        const items = getCollection();
        const created: any[] = [];
        for (const d of args.data || []) {
          const id = d.id || `${collectionName}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const newItem = {
            id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...d,
          };
          items.push(newItem);
          created.push(newItem);
        }
        return { count: created.length };
      },

      update: async (args: any) => {
        const items = getCollection();
        const index = items.findIndex((item) => matchesWhere(item, args.where));
        if (index === -1) {
          throw new Error(`Record not found in ${collectionName} for update`);
        }
        const updated = {
          ...items[index],
          ...args.data,
          updatedAt: new Date(),
        };
        items[index] = updated;
        return enrichItem(updated, args?.include, this);
      },

      upsert: async (args: any) => {
        const items = getCollection();
        const index = items.findIndex((item) => matchesWhere(item, args.where));
        if (index >= 0) {
          const updated = {
            ...items[index],
            ...args.update,
            updatedAt: new Date(),
          };
          items[index] = updated;
          return enrichItem(updated, args?.include, this);
        } else {
          const id = args.create.id || `${collectionName}-${Date.now()}`;
          const created = {
            id,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...args.create,
          };
          items.push(created);
          return enrichItem(created, args?.include, this);
        }
      },
    };
  }
}

function matchesWhere(item: any, where?: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;

  for (const [key, val] of Object.entries(where)) {
    if (key === 'OR' && Array.isArray(val)) {
      const orMatched = val.some((subWhere) => matchesWhere(item, subWhere));
      if (!orMatched) return false;
      continue;
    }

    if (key === 'AND' && Array.isArray(val)) {
      const andMatched = val.every((subWhere) => matchesWhere(item, subWhere));
      if (!andMatched) return false;
      continue;
    }

    const itemVal = item[key];

    if (val !== null && typeof val === 'object') {
      const objVal = val as any;
      if (objVal.in && Array.isArray(objVal.in)) {
        if (!objVal.in.includes(itemVal)) return false;
      } else if (objVal.notIn && Array.isArray(objVal.notIn)) {
        if (objVal.notIn.includes(itemVal)) return false;
      } else if (objVal.contains !== undefined) {
        const targetStr = String(itemVal || '').toLowerCase();
        const searchStr = String(objVal.contains).toLowerCase();
        if (!targetStr.includes(searchStr)) return false;
      } else if (objVal.not !== undefined) {
        if (objVal.not === null && (itemVal === null || itemVal === undefined)) return false;
        if (objVal.not !== null && itemVal === objVal.not) return false;
      } else if (objVal.gte !== undefined) {
        const targetTime = new Date(itemVal).getTime();
        const gteTime = new Date(objVal.gte).getTime();
        if (targetTime < gteTime) return false;
      } else if (objVal.lte !== undefined) {
        const targetTime = new Date(itemVal).getTime();
        const lteTime = new Date(objVal.lte).getTime();
        if (targetTime > lteTime) return false;
      }
    } else {
      if (itemVal !== val) return false;
    }
  }

  return true;
}

function sortItems(items: any[], orderBy: any): any[] {
  const clone = [...items];
  const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];

  clone.sort((a, b) => {
    for (const order of orderList) {
      for (const [key, dir] of Object.entries(order)) {
        const valA = a[key];
        const valB = b[key];
        if (valA === valB) continue;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        const comp = valA > valB ? 1 : -1;
        return dir === 'desc' ? -comp : comp;
      }
    }
    return 0;
  });

  return clone;
}

function enrichItem(item: any, include: any, db: InMemoryDB): any {
  if (!include || typeof include !== 'object') return { ...item };
  const enriched = { ...item };

  if (include.category) {
    enriched.category = db.categories.find((c) => c.id === item.categoryId) || null;
  }
  if (include.ward) {
    enriched.ward = db.wards.find((w) => w.id === item.wardId) || null;
  }
  if (include.media) {
    enriched.media = db.complaintMedia.filter((m) => m.complaintId === item.id);
  }
  if (include.aiVerifications) {
    enriched.aiVerifications = db.aiVerifications.filter((a) => a.complaintId === item.id);
  }
  if (include.statusHistory) {
    enriched.statusHistory = db.statusHistories
      .filter((s) => s.complaintId === item.id)
      .map((sh) => ({
        ...sh,
        actor: db.users.find((u) => u.id === sh.actorId) || null,
      }));
  }
  if (include.comments) {
    enriched.comments = db.comments
      .filter((c) => c.complaintId === item.id)
      .map((cm) => ({
        ...cm,
        user: db.users.find((u) => u.id === cm.userId) || null,
      }));
  }
  if (include.assignedOfficer) {
    enriched.assignedOfficer = db.users.find((u) => u.id === item.assignedOfficerId) || null;
  }
  if (include.reporter) {
    const rep = db.users.find((u) => u.id === item.reporterId);
    enriched.reporter = rep ? { id: rep.id } : null;
  }

  return enriched;
}

export const inMemoryDb = new InMemoryDB();
