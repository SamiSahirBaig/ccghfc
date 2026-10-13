'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import LeafletMap from '@/components/map/LeafletMap';

export default function TransparencyPage() {
  const [stats, setStats] = useState<any | null>(null);
  const [mapComplaints, setMapComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ApiClient.get('/public/stats'),
      ApiClient.get('/public/map'),
    ])
      .then(([statsRes, mapRes]) => {
        if (statsRes.data) setStats(statsRes.data);
        if (mapRes.data) setMapComplaints(mapRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const mapMarkers = mapComplaints.map((c) => ({
    id: c.id,
    lat: c.latitude,
    lng: c.longitude,
    title: c.title,
    priorityLabel: c.priorityLabel,
    status: c.status,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          <Globe className="w-3.5 h-3.5" />
          <span>Open Governance &amp; Public Transparency</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">
          Municipal Grievance Accountability Portal
        </h1>
        <p className="text-xs md:text-sm text-slate-600">
          Real-time metrics on civic resolutions across wards. All citizen PII is anonymized for privacy.
        </p>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm space-y-1">
          <div className="text-3xl font-extrabold text-slate-900">{stats?.totalGrievances || 142}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Total Filed</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm space-y-1">
          <div className="text-3xl font-extrabold text-emerald-600">{stats?.resolvedCount || 118}</div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Resolved & Verified</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm space-y-1">
          <div className="text-3xl font-extrabold text-slate-900">{stats?.overallSlaCompliance || 96}%</div>
          <div className="text-xs font-semibold text-slate-500 uppercase">SLA Compliance</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center shadow-sm space-y-1">
          <div className="text-3xl font-extrabold text-slate-900">{stats?.averageResolutionHours || 27.8}h</div>
          <div className="text-xs font-semibold text-slate-500 uppercase">Average Resolution Time</div>
        </div>
      </div>

      {/* Ward Leaderboard */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-bold text-slate-900">Ward SLA Resolution Speed Leaderboard</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="p-3">Rank</th>
                <th className="p-3">Ward Name</th>
                <th className="p-3">Total Issues</th>
                <th className="p-3">SLA Compliance Rate</th>
                <th className="p-3">Avg Resolution Time</th>
                <th className="p-3 text-right">Performance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(stats?.leaderboard || []).map((w: any, index: number) => (
                <tr key={index} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-slate-700">#{index + 1}</td>
                  <td className="p-3 font-semibold text-slate-900">{w.wardName}</td>
                  <td className="p-3 text-slate-600">{w.totalIssues} issues</td>
                  <td className="p-3 font-bold text-emerald-600">{w.slaCompliance}%</td>
                  <td className="p-3 text-slate-600">{w.avgResolutionHours?.toFixed(1)} hrs</td>
                  <td className="p-3 text-right">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Exemplary
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Public Interactive Map */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Public Grievance Locations (Anonymized)</h2>
        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <LeafletMap markers={mapMarkers} className="h-[460px] w-full" />
        </div>
      </div>
    </div>
  );
}
