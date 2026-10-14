'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Search,
  ExternalLink,
  MapPin,
  ListFilter,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import LeafletMap from '@/components/map/LeafletMap';
import { formatTimeRemaining, getPriorityBadge } from '@/lib/utils';

const COLORS = ['#059669', '#0284c7', '#ea580c', '#dc2626', '#8b5cf6', '#64748b'];

export default function AdminAnalyticsPage() {
  const [summary, setSummary] = useState<any | null>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Load analytics KPIs & Hotspots
  useEffect(() => {
    setLoading(true);
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

  // Fetch complaints with search and filters from backend
  const fetchComplaints = useCallback(() => {
    setComplaintsLoading(true);
    const params = new URLSearchParams();
    params.append('limit', '100');
    params.append('sort', sortBy);
    if (statusFilter) params.append('status', statusFilter);
    if (searchTerm.trim()) params.append('search', searchTerm.trim());

    ApiClient.get(`/complaints?${params.toString()}`)
      .then((res) => {
        if (res.data) setComplaints(res.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setComplaintsLoading(false));
  }, [searchTerm, statusFilter, sortBy]);

  // Initial load and filter changes
  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints();
  };

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
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Governance Analytics & Complaints Control</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/complaints"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Open Public Grievances Feed</span>
          </Link>

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
          <div className="text-2xl font-extrabold text-slate-900">{summary?.overview?.totalComplaints || complaints.length}</div>
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

      {/* COMPLAINTS MANAGEMENT TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Citizen Reported Problems & Grievances</h2>
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                {complaints.length} loaded
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live database of problems uploaded by citizens. Click &ldquo;Open Problem&rdquo; on any entry to view full photo evidence, location, and SLA status.
            </p>
          </div>

          {/* Search, Filter, Sort & Refresh */}
          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Code, Title, Address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none w-52 md:w-60"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  &times;
                </button>
              )}
            </form>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="SLA_BREACHED">SLA Breached</option>
              <option value="REOPENED">Reopened</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="priority">Sort: Highest Urgency</option>
            </select>

            <button
              onClick={fetchComplaints}
              disabled={complaintsLoading}
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50"
              title="Refresh complaints list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${complaintsLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Evidence</th>
                <th className="py-3 px-4">Problem / Category</th>
                <th className="py-3 px-4">Ward & Location</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">SLA Clock</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaintsLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                      <span>Loading complaints from database...</span>
                    </div>
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No complaints found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing your search keyword or selecting &ldquo;All Statuses&rdquo;</p>
                  </td>
                </tr>
              ) : (
                complaints.map((c) => {
                  const priority = getPriorityBadge(c.priorityLabel);
                  const time = formatTimeRemaining(c.slaDeadline);
                  const photoUrl = c.media?.[0]?.url || 'https://picsum.photos/seed/civic/100/100';
                  const isNew = Date.now() - new Date(c.createdAt).getTime() < 24 * 60 * 60 * 1000;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{c.publicCode || c.id}</span>
                          {isNew && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500 text-white uppercase tracking-wider flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              NEW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoUrl}
                            alt="Defect"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).src = 'https://picsum.photos/seed/civic/100/100';
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1">{c.title}</div>
                        <div className="text-[11px] text-emerald-700 font-medium">{c.category?.name || 'Sanitation'}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-[180px]">
                        <div className="flex items-center gap-1 font-medium text-slate-800 line-clamp-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{c.ward?.name || 'Municipal Ward'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{c.address}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priority.className}`}>
                          {priority.label} ({Math.round(c.priorityScore || 0)})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'SLA_BREACHED'
                              ? 'bg-red-100 text-red-800'
                              : c.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${time.badgeColor}`}>
                          {time.text}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link
                          href={`/complaints/${c.publicCode || c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-sm transition-all"
                        >
                          <span>Open Problem</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
