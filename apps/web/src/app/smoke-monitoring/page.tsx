import React from 'react';
import type { Metadata } from 'next';
import SmartSmokeMonitoring from '@/components/iot/SmartSmokeMonitoring';
import { Wind, ShieldAlert, Cpu, Activity, Info } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Smart Smoke Monitoring | CityClean IoT',
  description: 'Live sensor telemetry and historical smoke alert logs streamed via ThingSpeak IoT.',
};

export default function SmokeMonitoringPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
            <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">IoT Telemetry</span>
            <span>/</span>
            <span className="text-emerald-700 font-semibold">Smart Smoke Monitoring</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Smart Smoke &amp; Gas Telemetry
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time optical &amp; electrochemical air monitoring from deployed municipal MQ135 nodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/report"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Report Smoke Incident</span>
          </Link>
        </div>
      </div>

      {/* Main Smart Smoke Monitoring Component */}
      <SmartSmokeMonitoring />

      {/* Sensor Legend & Hardware Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Chart 1: Live Sensor Reading</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Streams analog gas concentration from Field 1 of ThingSpeak. Values are calibrated in Parts Per Million (PPM) against clean reference air.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Normal Baseline:</span>
            <span className="font-bold text-emerald-600">&lt; 250 PPM</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Chart 2: Alert History</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Logs spike frequencies and threshold violation events from Field 2. Sustained high readings trigger automated municipal dispatch.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Critical Alarm:</span>
            <span className="font-bold text-rose-600">&gt; 400 PPM</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Hardware Integration</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Powered by ESP32 / Arduino Uno nodes running the CityClean firmware. Nodes publish via REST API directly to your ThingSpeak channel.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Firmware Spec:</span>
            <span className="font-bold text-sky-600">MQ135 Gas V2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
