'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Upload,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  Flame,
  Search,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import LeafletMap from '@/components/map/LeafletMap';
import { formatTimeRemaining, getPriorityBadge } from '@/lib/utils';

export default function OfficerDashboardPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [afterPhotoFile, setAfterPhotoFile] = useState<File | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'map'>('queue');

  const fetchAssigned = () => {
    setLoading(true);
    ApiClient.get('/complaints?status=ASSIGNED,IN_PROGRESS,REOPENED,SLA_BREACHED')
      .then((res) => {
        if (res.data) setComplaints(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssigned();
  }, []);

  const handleStartWork = async (complaintId: string) => {
    try {
      await ApiClient.patch(`/complaints/${complaintId}/status`, {
        status: 'IN_PROGRESS',
        note: 'Officer commenced field sanitation work.',
      });
      fetchAssigned();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!afterPhotoFile) {
      alert('Mandatory Requirement: You must upload an "after" resolution photo to prove the site is clean.');
      return;
    }

    setIsResolving(true);
    const formData = new FormData();
    formData.append('status', 'RESOLVED');
    formData.append('note', resolutionNote || 'Sanitation work completed; after photo uploaded.');
    formData.append('afterPhoto', afterPhotoFile);

    try {
      await ApiClient.patch(`/complaints/${selectedComplaint.id}/status`, formData);
      setSelectedComplaint(null);
      setAfterPhotoFile(null);
      setResolutionNote('');
      fetchAssigned();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsResolving(false);
    }
  };

  const mapMarkers = complaints.map((c) => ({
    id: c.id,
    lat: c.latitude,
    lng: c.longitude,
    title: c.title,
    priorityLabel: c.priorityLabel,
    status: c.status,
    onClick: () => setSelectedComplaint(c),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Ward Field Staff</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Assigned Grievance Queue</h1>
          <p className="text-xs text-slate-500 mt-1">
            Sort by urgency score. 72-hour SLA timer running. Unresolved issues trigger automatic DM office alerts.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'queue' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Queue List ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              activeTab === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ward Map View
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'map' ? (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-md">
          <LeafletMap markers={mapMarkers} className="h-[540px] w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-slate-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : complaints.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Queue Clean! No Active Grievances Pending</h3>
              <p className="text-xs text-slate-500">All assigned ward issues are currently resolved within SLA targets.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => {
                const timeSla = formatTimeRemaining(c.slaDeadline);
                const priorityBadge = getPriorityBadge(c.priorityLabel);

                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {c.publicCode}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${priorityBadge.className}`}>
                          {priorityBadge.label} (Score: {c.priorityScore})
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${timeSla.badgeColor}`}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {timeSla.text}
                        </span>
                        <span className="text-xs text-slate-500">&bull; {c.ward?.name}</span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {c.status === 'ASSIGNED' && (
                        <button
                          onClick={() => handleStartWork(c.id)}
                          className="flex-1 md:flex-initial px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm"
                        >
                          Start Work
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedComplaint(c)}
                        className="flex-1 md:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm"
                      >
                        Resolve Issue
                      </button>

                      <Link
                        href={`/complaints/${c.id}`}
                        className="p-2 text-slate-400 hover:text-slate-700 rounded-lg"
                        title="View Details"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* RESOLUTION MODAL WITH MANDATORY AFTER PHOTO */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-xs text-slate-500 font-bold">{selectedComplaint.publicCode}</span>
                <h3 className="text-lg font-bold text-slate-900">Mark Complaint as RESOLVED</h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              {/* Mandatory After Photo Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Upload &quot;After&quot; Resolution Photo * (Required by Municipal Rule)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  required
                  onChange={(e) => setAfterPhotoFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Field Resolution Notes</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Cleared 2 tons of wet garbage, disinfected surrounding street area..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isResolving ? 'Uploading & Resolving...' : 'Confirm & Mark Resolved'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
