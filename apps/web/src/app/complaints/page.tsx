'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Clock,
  ThumbsUp,
  MapPin,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { formatTimeRemaining, getPriorityBadge } from '@/lib/utils';

export default function ComplaintsListPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchComplaints = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('limit', '100');
    params.append('sort', 'newest');
    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);
    if (search) params.append('search', search);

    ApiClient.get(`/complaints?${params.toString()}`)
      .then((res) => {
        if (res.data) setComplaints(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, [statusFilter, priorityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComplaints();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Civic Grievances & Live Timeline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track reported sanitation problems across municipal wards, verify SLA resolution timers, and upvote affected issues.
          </p>
        </div>
        <Link
          href="/report"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
        >
          <span>+ Report New Issue</span>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Complaint ID, title, or street..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
          />
        </form>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="SLA_BREACHED">SLA Breached</option>
            <option value="REOPENED">Reopened</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical (&ge;80)</option>
            <option value="HIGH">High (60-79)</option>
            <option value="MEDIUM">Medium (35-59)</option>
            <option value="LOW">Low (&lt;35)</option>
          </select>
        </div>
      </div>

      {/* Complaints Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-slate-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Complaints Match Your Filters</h3>
          <p className="text-xs text-slate-500">Try adjusting your search criteria or report a new issue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {complaints.map((c) => {
            const timeSla = formatTimeRemaining(c.slaDeadline);
            const priorityBadge = getPriorityBadge(c.priorityLabel);
            const photoUrl = c.media?.[0]?.url || 'https://picsum.photos/seed/civic1/400/300';

            return (
              <Link
                key={c.id}
                href={`/complaints/${c.id}`}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col group"
              >
                {/* Photo Header */}
                <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
                  <img
                    src={photoUrl}
                    alt={c.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${priorityBadge.className}`}>
                      {priorityBadge.label}
                    </span>
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${timeSla.badgeColor}`}>
                      {timeSla.text}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
                      <span className="font-mono font-bold text-slate-700">{c.publicCode}</span>
                      <span>{c.ward?.name || 'Central Ward'}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 line-clamp-2 transition-colors">
                      {c.title}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.upvoteCount} affected</span>
                    </div>
                    <span className="text-emerald-700 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-0.5 text-[11px]">
                      View Timeline <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
