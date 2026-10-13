'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Camera,
  Cpu,
  Clock,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  MapPin,
  AlertCircle,
  Wind,
  CheckCircle2,
} from 'lucide-react';
import LeafletMap from '@/components/map/LeafletMap';
import { ApiClient } from '@/lib/api-client';

export default function LandingPage() {
  const [stats, setStats] = useState({
    totalGrievances: 142,
    resolvedCount: 118,
    averageResolutionHours: 28.4,
    overallSlaCompliance: 96,
  });
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);

  useEffect(() => {
    // Fetch live public stats and map data
    ApiClient.get('/public/stats')
      .then((res) => {
        if (res.data) setStats(res.data);
      })
      .catch(() => {});

    ApiClient.get('/public/map')
      .then((res) => {
        if (res.data) {
          setMapMarkers(
            res.data.slice(0, 25).map((c: any) => ({
              id: c.id,
              lat: c.latitude,
              lng: c.longitude,
              title: c.title,
              priorityLabel: c.priorityLabel,
              status: c.status,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-16 py-6 md:py-12">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 rounded-3xl text-white p-8 md:p-14 shadow-2xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Full-Stack Civic Redressal &bull; 72-Hour Enforced SLA</span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Clean Streets. Accountable Governance. <br className="hidden sm:inline" />
              <span className="text-emerald-400">Guaranteed 72h SLA.</span>
            </h1>

            <p className="text-base md:text-lg text-emerald-100/90 leading-relaxed max-w-2xl">
              Photograph garbage pile-ups, overflowing drains, or hazardous smoke. Our AI instantly validates authenticity, routes to the ward officer, and automatically escalates to the District Magistrate if unresolved at 72 hours.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                href="/report"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95 text-base"
              >
                <Camera className="w-5 h-5 text-slate-950" />
                <span>Report in 30 Seconds</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/transparency"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 backdrop-blur-md transition-all active:scale-95 text-base"
              >
                <TrendingUp className="w-5 h-5 text-emerald-300" />
                <span>Public Transparency Map</span>
              </Link>
            </div>
          </div>

          {/* Live KPI Counters */}
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/10">
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-white">{stats.resolvedCount}</div>
              <div className="text-xs text-emerald-200/80 mt-1">Resolved Issues</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-white">{stats.averageResolutionHours}h</div>
              <div className="text-xs text-emerald-200/80 mt-1">Average Resolution Time</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-emerald-400">{stats.overallSlaCompliance}%</div>
              <div className="text-xs text-emerald-200/80 mt-1">SLA Compliance Rate</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-extrabold text-white">3 Nodes</div>
              <div className="text-xs text-emerald-200/80 mt-1">IoT Gas Sensors Active</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works: 3 Steps */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">How CityClean Resolves Civic Grievances</h2>
          <p className="text-sm text-slate-600 mt-2">
            Engineered with strict accountability safeguards, preventing complaints from being ignored or closed prematurely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-emerald-300 transition-colors">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Step 1</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Snap Photo & Pin GPS</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Citizens capture 1–4 photos with instant client-side compression. Camera EXIF provides a location hint, complemented by Nominatim reverse-geocoding.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-emerald-300 transition-colors">
            <div className="w-12 h-12 bg-sky-100 text-sky-700 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">Step 2</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">AI Verification & Urgency</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Multimodal vision inspects defect type, flags stock photos/memes, checks pHash duplicates, and computes a composite priority score (0–100).
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm relative group hover:border-emerald-300 transition-colors">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Step 3</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">72h SLA & DM Escalation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              BullMQ delayed jobs enforce milestones: T+24h reminder, T+48h warning, and T+72h automated escalation dispatch directly to the District Magistrate.
            </p>
          </div>
        </div>
      </section>

      {/* IoT Environmental Nodes Highlight */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="bg-slate-900 rounded-3xl p-8 md:p-12 text-white flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
              <Wind className="w-3.5 h-3.5" />
              <span>Autonomous IoT Hardware Layer</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Foul Smell & Toxic Gas Hotspots Filed Without Humans
            </h2>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              Deployable Arduino Uno & ESP32 nodes equipped with MQ135 semiconductor sensors monitor ambient NH3, NOx, and sewer gas. When critical thresholds are breached for consecutive intervals, CityClean auto-generates a municipal complaint and triggers the ward officer's 72h timer.
            </p>
            <div className="flex gap-4 pt-2">
              <Link
                href="/admin"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all"
              >
                View Live IoT Gauges
              </Link>
            </div>
          </div>

          <div className="w-full lg:w-96 bg-slate-800/80 rounded-2xl p-6 border border-slate-700 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Node NODE-001 (Connaught)</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-bold">ONLINE</span>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white">142.8 <span className="text-xs text-slate-400">PPM</span></div>
              <div className="text-[11px] text-emerald-400 font-medium">Ambient Urban Air Quality (Normal)</div>
            </div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[35%]" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Warn: 250 PPM</span>
              <span>Critical: 400 PPM</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Map Preview */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Active Civic Hotspots Map</h2>
            <p className="text-xs text-slate-600 mt-1">
              Real-time geospatial overview of civic grievances across municipal wards.
            </p>
          </div>
          <Link
            href="/transparency"
            className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
          >
            Open Full Screen Transparency Map &rarr;
          </Link>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
          <LeafletMap markers={mapMarkers} className="h-[420px] w-full" />
        </div>
      </section>
    </div>
  );
}
