import { runSimulation } from './services/device/simulator.js';

runSimulation(8, 2000).catch((err: any) => {
  console.error('Simulation error:', err);
  process.exit(1);
});
