import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting CityClean database seed...');

  // 1. Create Zones
  const zoneNorth = await prisma.zone.create({
    data: { name: 'North Civic Zone', description: 'Northern administrative district' },
  });

  const zoneSouth = await prisma.zone.create({
    data: { name: 'South Civic Zone', description: 'Southern municipal district' },
  });

  // 2. Create Wards with GeoJSON Polygon boundaries
  const wardsData = [
    { name: 'Ward 1 - Connaught Central', zoneId: zoneNorth.id },
    { name: 'Ward 2 - Civil Lines', zoneId: zoneNorth.id },
    { name: 'Ward 3 - Karol Bagh', zoneId: zoneNorth.id },
    { name: 'Ward 4 - Lajpat Nagar', zoneId: zoneSouth.id },
    { name: 'Ward 5 - Hauz Khas', zoneId: zoneSouth.id },
    { name: 'Ward 6 - Saket Urban', zoneId: zoneSouth.id },
  ];

  const createdWards: any[] = [];
  for (const w of wardsData) {
    const ward = await prisma.ward.create({
      data: {
        name: w.name,
        zoneId: w.zoneId,
        boundaryGeoJson: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [77.20, 28.61],
              [77.25, 28.61],
              [77.25, 28.65],
              [77.20, 28.65],
              [77.20, 28.61],
            ],
          ],
        }),
      },
    });
    createdWards.push(ward);
  }

  // 3. Create Department & Categories
  const sanitationDept = await prisma.department.create({
    data: {
      name: 'Department of Sanitation & Environmental Safety',
      code: 'SAN-ENV',
      contactEmail: 'sanitation@cityclean.gov',
    },
  });

  const categoriesData = [
    { name: 'Garbage Pileup & Illegal Dumping', defaultSlaHours: 72, icon: 'trash-2' },
    { name: 'Sewage Blockage & Overflowing Drains', defaultSlaHours: 48, icon: 'droplet' },
    { name: 'Dead Animal Removal', defaultSlaHours: 24, icon: 'alert-triangle' },
    { name: 'Burning Waste & Toxic Smoke', defaultSlaHours: 24, icon: 'flame' },
    { name: 'Foul Gas / Air Quality Hazard (IoT)', defaultSlaHours: 48, icon: 'wind' },
    { name: 'Potholes & Waterlogged Dips', defaultSlaHours: 72, icon: 'activity' },
  ];

  const createdCategories: any[] = [];
  for (const c of categoriesData) {
    const cat = await prisma.category.create({
      data: {
        name: c.name,
        departmentId: sanitationDept.id,
        defaultSlaHours: c.defaultSlaHours,
        icon: c.icon,
      },
    });
    createdCategories.push(cat);
  }

  // 4. Create Demo Users
  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash('password123', salt);

  const admin = await prisma.user.create({
    data: {
      name: 'Municipal Administrator',
      email: 'admin@cityclean.gov',
      phone: '+919811000001',
      passwordHash: commonPasswordHash,
      role: 'ADMIN',
      wardId: createdWards[0].id,
      trustScore: 1.0,
    },
  });

  const supervisor = await prisma.user.create({
    data: {
      name: 'Rajesh Verma (Zone Supervisor)',
      email: 'supervisor@cityclean.gov',
      phone: '+919811000002',
      passwordHash: commonPasswordHash,
      role: 'SUPERVISOR',
      wardId: createdWards[0].id,
      trustScore: 1.0,
    },
  });

  const officer = await prisma.user.create({
    data: {
      name: 'Sunil Kumar (Ward Officer)',
      email: 'officer@cityclean.gov',
      phone: '+919811000003',
      passwordHash: commonPasswordHash,
      role: 'OFFICER',
      wardId: createdWards[0].id,
      trustScore: 1.0,
    },
  });

  const citizen = await prisma.user.create({
    data: {
      name: 'Aarav Sharma (Citizen)',
      email: 'citizen@cityclean.gov',
      phone: '+919811000004',
      passwordHash: commonPasswordHash,
      role: 'CITIZEN',
      wardId: createdWards[0].id,
      trustScore: 1.0,
    },
  });

  console.log('✅ Demo accounts seeded successfully:');
  console.log('   Admin:      admin@cityclean.gov      / password123');
  console.log('   Supervisor: supervisor@cityclean.gov / password123');
  console.log('   Officer:    officer@cityclean.gov    / password123');
  console.log('   Citizen:    citizen@cityclean.gov    / password123');

  // 5. Create 3 IoT Devices
  const devicesData = [
    {
      code: 'NODE-001',
      name: 'Connaught Plaza Air Quality Node',
      lat: 28.6315,
      lng: 77.2167,
      ward: createdWards[0],
      key: 'cc_key_node001',
    },
    {
      code: 'NODE-002',
      name: 'Lajpat Market Waste Station Node',
      lat: 28.5677,
      lng: 77.2433,
      ward: createdWards[3],
      key: 'cc_key_node002',
    },
    {
      code: 'NODE-003',
      name: 'Hauz Khas Drain Monitor',
      lat: 28.5494,
      lng: 77.2001,
      ward: createdWards[4],
      key: 'cc_key_node003',
    },
  ];

  const createdDevices: any[] = [];
  for (const d of devicesData) {
    const apiKeyHash = crypto.createHash('sha256').update(d.key).digest('hex');
    const device = await prisma.device.create({
      data: {
        deviceCode: d.code,
        name: d.name,
        apiKeyHash,
        latitude: d.lat,
        longitude: d.lng,
        wardId: d.ward.id,
        status: 'ONLINE',
        firmwareVersion: '1.0.0',
        calibration: JSON.stringify({ R0: 10.0, a: 116.602, b: -2.769, RL: 10.0 }),
        sampleIntervalSec: 30,
        warnThresholdPpm: 250.0,
        criticalThresholdPpm: 400.0,
        lastSeen: new Date(),
      },
    });
    createdDevices.push(device);

    // Seed 3 days of fake sensor readings
    const now = Date.now();
    const readings: any[] = [];
    for (let i = 0; i < 72; i++) {
      const timeOffset = (72 - i) * 60 * 60 * 1000;
      const baseRaw = 300 + Math.floor(Math.sin(i / 6) * 150) + Math.floor(Math.random() * 50);
      const ppm = Math.max(50, Math.round((baseRaw * 0.35) * 10) / 10);
      readings.push({
        deviceId: device.id,
        recordedAt: new Date(now - timeOffset),
        rawValue: baseRaw,
        ppm,
        temperatureC: 28.5 + (Math.sin(i / 12) * 4),
        humidity: 60 + (Math.cos(i / 12) * 15),
        batteryV: 3.9 - (i * 0.002),
      });
    }

    await prisma.sensorReading.createMany({ data: readings });
  }

  // 6. Seed 40 Sample Complaints across statuses & coordinates
  const statuses: any[] = [
    'SUBMITTED', 'NEEDS_REVIEW', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'SLA_BREACHED', 'REOPENED'
  ];

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

  const complaintsData: any[] = [];
  const now = Date.now();

  for (let i = 1; i <= 40; i++) {
    const status = statuses[i % statuses.length];
    const cat = createdCategories[i % createdCategories.length];
    const ward = createdWards[i % createdWards.length];
    const latOffset = (Math.random() - 0.5) * 0.08;
    const lngOffset = (Math.random() - 0.5) * 0.08;
    const priorityScore = 30 + Math.floor(Math.random() * 65);
    const priorityLabel = priorityScore >= 80 ? 'CRITICAL' : priorityScore >= 60 ? 'HIGH' : priorityScore >= 35 ? 'MEDIUM' : 'LOW';

    const createdAt = new Date(now - (i * 3 * 3600 * 1000));
    const slaDeadline = new Date(createdAt.getTime() + 72 * 3600 * 1000);

    const comp = await prisma.complaint.create({
      data: {
        publicCode: `CC-2026-${String(1000 + i).padStart(6, '0')}`,
        reporterId: citizen.id,
        source: i % 10 === 0 ? 'SENSOR' : 'CITIZEN',
        categoryId: cat.id,
        title: sampleTitles[i % sampleTitles.length],
        description: `Detailed report: Civilians in ${ward.name} have flagged ongoing sanitation issues at this site. Environmental parameters indicate immediate intervention is warranted.`,
        latitude: 28.6139 + latOffset,
        longitude: 77.2090 + lngOffset,
        address: `Sector ${i * 2}, ${ward.name}, New Delhi`,
        landmark: `Opposite Metro Pillar ${(i % 30) + 1}`,
        wardId: ward.id,
        status,
        priorityScore,
        priorityLabel: priorityLabel as any,
        aiSeverity: Math.min(10, Math.max(1, Math.floor(priorityScore / 10))),
        slaDeadline,
        escalationLevel: status === 'SLA_BREACHED' ? 1 : 0,
        assignedOfficerId: officer.id,
        upvoteCount: Math.floor(Math.random() * 25) + 1,
        resolvedAt: status === 'RESOLVED' ? new Date(now - 10000000) : null,
        createdAt,
      },
    });

    // Add media
    await prisma.complaintMedia.create({
      data: {
        complaintId: comp.id,
        url: `https://picsum.photos/seed/civic${i}/800/600`,
        type: 'BEFORE',
        phash: crypto.randomBytes(8).toString('hex'),
      },
    });

    if (status === 'RESOLVED') {
      await prisma.complaintMedia.create({
        data: {
          complaintId: comp.id,
          url: `https://picsum.photos/seed/civic_after${i}/800/600`,
          type: 'AFTER',
        },
      });
    }

    // Add status history
    await prisma.statusHistory.create({
      data: {
        complaintId: comp.id,
        fromStatus: 'SUBMITTED',
        toStatus: status,
        actorId: officer.id,
        note: `Status updated to ${status}.`,
        createdAt,
      },
    });
  }

  // 7. Seed Settings
  await prisma.setting.createMany({
    data: [
      { key: 'SLA_HOURS_DEFAULT', value: JSON.stringify(72), description: 'Default SLA hours before DM escalation' },
      { key: 'DM_OFFICE_EMAIL', value: JSON.stringify('dm-office@district.gov.in'), description: 'District Magistrate escalation inbox' },
      { key: 'AI_VERIFICATION_ENABLED', value: JSON.stringify(true), description: 'Run automated AI photo verification' },
      { key: 'MQ135_CRITICAL_PPM', value: JSON.stringify(400), description: 'PPM threshold for autonomous SENSOR complaint dispatch' },
    ],
  });

  console.log('🎉 Database seeding complete with 40 complaints and 3 IoT devices!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
