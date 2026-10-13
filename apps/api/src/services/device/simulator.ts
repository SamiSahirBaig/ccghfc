/**
 * CityClean IoT Hardware Node Simulator Service
 * Simulates real-time telemetry from multiple MQ135 sensor nodes without physical hardware.
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

export interface SimulatedDevice {
  id: string;
  name: string;
  apiKey: string;
  scenario: 'normal' | 'rising' | 'spike';
  basePpm: number;
}

export const SIMULATED_DEVICES: SimulatedDevice[] = [
  {
    id: 'NODE-001',
    name: 'Connaught Plaza Air Quality Node',
    apiKey: 'cc_key_node001',
    scenario: 'normal',
    basePpm: 140,
  },
  {
    id: 'NODE-002',
    name: 'Lajpat Market Waste Station Node',
    apiKey: 'cc_key_node002',
    scenario: 'rising',
    basePpm: 230,
  },
  {
    id: 'NODE-003',
    name: 'Hauz Khas Drain Monitor',
    apiKey: 'cc_key_node003',
    scenario: 'spike',
    basePpm: 460, // Exceeds 400 PPM critical threshold!
  },
];

export async function sendTelemetry(device: SimulatedDevice, step: number) {
  let ppm = device.basePpm;
  let rawAdc = 300;

  if (device.scenario === 'normal') {
    ppm = device.basePpm + Math.sin(step) * 20 + Math.random() * 10;
    rawAdc = Math.round(ppm * 2.5);
  } else if (device.scenario === 'rising') {
    ppm = device.basePpm + step * 8 + Math.random() * 15;
    rawAdc = Math.round(ppm * 2.6);
  } else if (device.scenario === 'spike') {
    ppm = 480 + step * 15 + Math.random() * 30;
    rawAdc = Math.round(ppm * 2.8);
  }

  ppm = Math.round(ppm * 10) / 10;

  const payload = {
    deviceId: device.id,
    ts: Math.floor(Date.now() / 1000),
    readings: {
      mq135_raw: rawAdc,
      mq135_ppm: ppm,
      temperature_c: Math.round((28.0 + Math.random() * 3) * 10) / 10,
      humidity: Math.round((60.0 + Math.random() * 10) * 10) / 10,
    },
    battery_v: 3.92,
    fw: '1.0.0-sim',
  };

  try {
    const res = await fetch(`${API_BASE_URL}/device/readings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Device-Id': device.id,
        'X-Api-Key': device.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as any;
    const alertTag = data.alert ? '🚨 [ALERT TRIGGERED]' : '🟢 [NORMAL]';
    const color = ppm >= 400 ? '\x1b[31m' : ppm >= 250 ? '\x1b[33m' : '\x1b[32m';

    console.log(
      `${color}[${new Date().toLocaleTimeString()}] ${device.id} (${device.scenario.toUpperCase()}): Raw=${rawAdc} | PPM=${ppm} | HTTP ${res.status} ${alertTag}\x1b[0m`
    );

    if (device.scenario === 'spike' && data.alert) {
      console.log(
        `\x1b[35m>>> 🎯 CRITICAL EVENT: ${device.id} sustained critical readings! Municipal complaint generated & assigned with 72h SLA! <<<\x1b[0m`
      );
    }
  } catch (err: any) {
    console.error(`\x1b[31m[ERROR] Failed to post reading for ${device.id}: ${err.message}\x1b[0m`);
  }
}

export async function runSimulation(cycles: number = 8, intervalMs: number = 2000) {
  console.log('\n=============================================================');
  console.log('🏙️   CityClean Hardware / IoT Sensor Node Simulator');
  console.log(`Target API: ${API_BASE_URL}`);
  console.log(`Simulating ${SIMULATED_DEVICES.length} active environmental sensor nodes`);
  console.log('=============================================================\n');

  for (let step = 0; step < cycles; step++) {
    console.log(`\n--- Telemetry Transmission Cycle ${step + 1} of ${cycles} ---`);
    for (const dev of SIMULATED_DEVICES) {
      await sendTelemetry(dev, step);
    }
    if (step < cycles - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  console.log('\n=============================================================');
  console.log('✅ Simulation completed. Check Admin Dashboard live charts and complaints!');
  console.log('=============================================================\n');
}
