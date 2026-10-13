'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { formatTimeRemaining, getPriorityBadge } from '@/lib/utils';

export default function SupervisorPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reassignModal, setReassignModal] = useState<any | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      ApiClient.get('/complaints'),
      ApiClient.get('/admin/users?role=OFFICER'),
    ])
      .then(([compRes, userRes]) => {
        if (compRes.data) setComplaints(compRes.data);
        if (userRes.data) {
          setOfficers(userRes.data);
          if (userRes.data.length > 0) setSelectedOfficerId(userRes.data[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModal || !selectedOfficerId) return;

    try {
      await ApiClient.post(`/complaints/${reassignModal.id}/assign`, {
        officerId: selectedOfficerId,
      });
      setReassignModal(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const warnedComplaints = complaints.filter(
    (c) => c.status !== 'RESOLVED' && c.status !== 'CLOSED' && formatTimeRemaining(c.slaDeadline).text.includes('24h')
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-sky-700 uppercase tracking-wider">Zonal Operations</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Supervisor Oversight Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor ward queues, inspect 48-hour SLA breach risks, and reassign officers.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Zone Data</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs text-slate-500 font-semibold uppercase">Total Zone Grievances</div>
          <div className="text-2xl font-extrabold text-slate-900">{complaints.length}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm space-y-2">
          <div className="text-xs text-amber-800 font-semibold uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> 48h Warning Watchlist
          </div>
          <div className="text-2xl font-extrabold text-amber-900">{warnedComplaints.length}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs text-slate-500 font-semibold uppercase">Field Officers Active</div>
          <div className="text-2xl font-extrabold text-slate-900">{officers.length}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="text-xs text-slate-500 font-semibold uppercase">Average Turnaround</div>
          <div className="text-2xl font-extrabold text-emerald-600">26.2 hrs</div>
        </div>
      </div>

      {/* Complaints Table with Reassignment */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900">Zone Complaints Queue</h3>
          <span className="text-xs text-slate-500">{complaints.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Title & Ward</th>
                <th className="p-3.5">Assigned Officer</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">SLA Timer</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {complaints.map((c) => {
                const timeSla = formatTimeRemaining(c.slaDeadline);
                const pBadge = getPriorityBadge(c.priorityLabel);

                return (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-800">{c.publicCode}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 line-clamp-1">{c.title}</div>
                      <div className="text-[11px] text-slate-400">{c.ward?.name}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-700">{c.assignedOfficer?.name || 'Unassigned'}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${pBadge.className}`}>
                        {pBadge.label} ({c.priorityScore})
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${timeSla.badgeColor}`}>
                        {timeSla.text}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-700">{c.status}</td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setReassignModal(c)}
                        className="px-3 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 rounded-lg font-semibold text-[11px] transition-colors"
                      >
                        Reassign
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* REASSIGN MODAL */}
      {reassignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Reassign Grievance: {reassignModal.publicCode}</h3>
            <p className="text-xs text-slate-600">{reassignModal.title}</p>

            <form onSubmit={handleReassign} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select New Ward Officer</label>
                <select
                  value={selectedOfficerId}
                  onChange={(e) => setSelectedOfficerId(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 outline-none"
                >
                  {officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.ward?.name || 'Ward'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-md"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
