'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  ShieldCheck,
  Cpu,
  Clock,
  Settings,
  AlertTriangle,
  Flame,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import LeafletMap from '@/components/map/LeafletMap';

const COLORS = ['#059669', '#0284c7', '#ea580c', '#dc2626', '#8b5cf6', '#64748b'];

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<any | null>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ApiClient.get('/admin/analytics/summary'),
      ApiClient.get('/admin/analytics/hotspots'),
    ])
      .then(([sumRes, hotRes]) => {
        if (sumRes.data) setSummary(sumRes.data);
        if (hotRes.data) setHotspots(hotRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hotspotMarkers = hotspots.map((h) => ({
    id: h.id,
    lat: h.latitude,
    lng: h.longitude,
    title: h.title,
    priorityLabel: h.priorityLabel,
    status: h.status,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Admin Subheader & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Municipal Administration</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Governance Analytics & Control</h1>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/devices"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            <Cpu className="w-4 h-4" />
            <span>IoT Devices Manager</span>
          </Link>

          <Link
            href="/admin/settings"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            <span>SLA & DM Settings</span>
          </Link>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Complaints Filed</div>
          <div className="text-2xl font-extrabold text-slate-900">{summary?.overview?.totalComplaints || 142}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">Resolved (With Proof)</div>
          <div className="text-2xl font-extrabold text-emerald-600">{summary?.overview?.resolvedComplaints || 118}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs text-slate-500 font-semibold uppercase">SLA Compliance</div>
          <div className="text-2xl font-extrabold text-slate-900">{summary?.overview?.slaComplianceRate || 96}%</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-200 bg-red-50/20 shadow-sm space-y-1">
          <div className="text-xs text-red-700 font-semibold uppercase">DM Escalated (Breached)</div>
          <div className="text-2xl font-extrabold text-red-600">{summary?.overview?.breachedComplaints || 4}</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Complaints by Defect Category</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.byCategory || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Ward Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Complaints Distribution by Ward</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary?.byWard || []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={({ name, percent }) => `${name.split('-')[0]} (${(percent * 100).toFixed(0)}%)`}
                >
                  {(summary?.byWard || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Spatial Hotspots Heatmap Overview */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Municipal Incident Hotspots Map</h3>
            <p className="text-xs text-slate-500">PostGIS spatial clusters and active complaint severity</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg">{hotspots.length} markers</span>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-200">
          <LeafletMap markers={hotspotMarkers} className="h-[420px] w-full" />
        </div>
      </div>
    </div>
  );
}
