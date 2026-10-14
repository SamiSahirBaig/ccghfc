'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Plus,
  Sliders,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Key,
  Flame,
  Radio,
  Copy,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ApiClient } from '@/lib/api-client';
import LeafletMap from '@/components/map/LeafletMap';
import SmartSmokeMonitoring from '@/components/iot/SmartSmokeMonitoring';

export default function AdminDevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);

  // Register Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: '',
    latitude: '28.6139',
    longitude: '77.2090',
    warnThresholdPpm: '250',
    criticalThresholdPpm: '400',
    sampleIntervalSec: '30',
  });
  const [provisionResult, setProvisionResult] = useState<any | null>(null);

  // Calibration Modal State
  const [showCalibModal, setShowCalibModal] = useState(false);
  const [cleanAirRaw, setCleanAirRaw] = useState('320');
  const [calibResult, setCalibResult] = useState<any | null>(null);

  const fetchDevices = () => {
    setLoading(true);
    ApiClient.get('/admin/devices')
      .then((res) => {
        if (res.data) {
          setDevices(res.data);
          if (!selectedDevice && res.data.length > 0) {
            setSelectedDevice(res.data[0]);
          } else if (selectedDevice) {
            const updated = res.data.find((d: any) => d.id === selectedDevice.id);
            if (updated) setSelectedDevice(updated);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await ApiClient.post('/admin/devices', registerForm);
      if (res.success && res.data) {
        setProvisionResult(res.data);
        fetchDevices();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCalibrateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    try {
      const res = await ApiClient.post(`/admin/devices/${selectedDevice.id}/calibrate`, {
        cleanAirRaw,
      });
      if (res.success) {
        setCalibResult(res.data);
        fetchDevices();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const mapMarkers = devices.map((d) => ({
    id: d.id,
    lat: d.latitude,
    lng: d.longitude,
    title: `${d.deviceCode} (${d.name})`,
    priorityLabel: d.status === 'CRITICAL' ? 'CRITICAL' : d.status === 'WARNING' ? 'HIGH' : 'LOW',
    status: d.status,
    onClick: () => setSelectedDevice(d),
  }));

  const chartData = (selectedDevice?.readings || []).slice(0, 30).reverse().map((r: any) => ({
    time: new Date(r.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    ppm: r.ppm,
    raw: r.rawValue,
  }));

  const latestPpm = selectedDevice?.readings?.[0]?.ppm || 120.0;
  const criticalThreshold = selectedDevice?.criticalThresholdPpm || 400;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Environmental Hardware</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">MQ135 Gas Sensor Telemetry Manager</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setProvisionResult(null);
              setShowRegisterModal(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Node</span>
          </button>
        </div>
      </div>

      {/* Devices Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device List Column */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Registered Nodes ({devices.length})</h3>

          <div className="space-y-2">
            {devices.map((d) => {
              const isSelected = selectedDevice?.id === d.id;
              const isCritical = d.status === 'CRITICAL';
              const isWarning = d.status === 'WARNING';

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDevice(d)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-slate-900">{d.deviceCode}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        isCritical ? 'bg-red-100 text-red-700' : isWarning ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-1 mt-0.5">{d.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-slate-900">{d.readings?.[0]?.ppm || '120'} <span className="text-[10px] text-slate-500">PPM</span></div>
                    <div className="text-[10px] text-slate-400">{d.sampleIntervalSec}s rate</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Device Telemetry & Gauges Column */}
        {selectedDevice && (
          <div className="lg:col-span-2 space-y-6">
            {/* Live Gauge & KPI Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded">
                    {selectedDevice.deviceCode}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{selectedDevice.name}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Firmware {selectedDevice.firmwareVersion} &bull; Ward: {selectedDevice.ward?.name} &bull; Last seen:{' '}
                  {new Date(selectedDevice.lastSeen).toLocaleTimeString()}
                </div>
              </div>

              {/* PPM Dial Metric */}
              <div className="text-right">
                <div className={`text-4xl font-black ${
                  latestPpm >= criticalThreshold ? 'text-red-600 animate-pulse' : latestPpm >= 250 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {latestPpm} <span className="text-sm font-bold text-slate-500">PPM</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Critical Threshold: <b>{selectedDevice.criticalThresholdPpm} PPM</b>
                </div>
              </div>
            </div>

            {/* Live Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Live Gas Concentration Trend</h3>
                <button
                  onClick={() => setShowCalibModal(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Calibrate Clean Air R0</span>
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="ppm" stroke="#059669" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Device Map */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <LeafletMap markers={mapMarkers} className="h-[280px] w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Live ThingSpeak Smoke Monitoring Section */}
        <div className="pt-2">
          <SmartSmokeMonitoring />
        </div>
      </div>

      {/* REGISTER NODE MODAL WITH ONE-TIME API KEY */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Provision New MQ135 IoT Node</h3>

            {provisionResult ? (
              <div className="space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Node Provisioned Successfully!</h4>
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-left space-y-2">
                  <div className="text-[11px] font-bold text-amber-900 uppercase">One-Time Hardware API Key</div>
                  <div className="font-mono text-xs bg-white p-2.5 rounded-lg border border-amber-300 break-all select-all">
                    {provisionResult.oneTimeApiKey}
                  </div>
                  <p className="text-[10px] text-amber-800 italic">
                    ⚠️ Copy this key now into your ESP32 config.h or gateway .env file. It will not be shown again!
                  </p>
                </div>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Node Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Connaught Metro Gate Gas Monitor"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-200 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Latitude</label>
                    <input
                      type="text"
                      value={registerForm.latitude}
                      onChange={(e) => setRegisterForm({ ...registerForm, latitude: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Longitude</label>
                    <input
                      type="text"
                      value={registerForm.longitude}
                      onChange={(e) => setRegisterForm({ ...registerForm, longitude: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Warn Threshold (PPM)</label>
                    <input
                      type="number"
                      value={registerForm.warnThresholdPpm}
                      onChange={(e) => setRegisterForm({ ...registerForm, warnThresholdPpm: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Critical Spike (PPM)</label>
                    <input
                      type="number"
                      value={registerForm.criticalThresholdPpm}
                      onChange={(e) => setRegisterForm({ ...registerForm, criticalThresholdPpm: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-md"
                  >
                    Generate Credentials
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* CALIBRATION WIZARD MODAL */}
      {showCalibModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">MQ135 Clean-Air Calibration Wizard</h3>
            <p className="text-xs text-slate-600">
              Enter the raw ADC reading taken in fresh outdoor air. The system will compute R0 and update the sensor parameters over-the-air.
            </p>

            <form onSubmit={handleCalibrateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Raw Clean-Air ADC Reading (0 - 1023)</label>
                <input
                  type="number"
                  required
                  value={cleanAirRaw}
                  onChange={(e) => setCleanAirRaw(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 outline-none"
                />
              </div>

              {calibResult && (
                <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800">
                  &check; Calibrated R0: <b>{calibResult.computedR0} k&Omega;</b> updated successfully.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCalibModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-md"
                >
                  Calculate & Apply R0
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
