'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Clock,
  ThumbsUp,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Send,
  User,
  ArrowLeft,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import LeafletMap from '@/components/map/LeafletMap';
import { formatTimeRemaining, getPriorityBadge } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

export default function ComplaintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAppStore();

  const [complaint, setComplaint] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const fetchComplaint = () => {
    ApiClient.get(`/complaints/${id}`)
      .then((res) => {
        if (res.data) setComplaint(res.data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) fetchComplaint();
  }, [id]);

  const handleUpvote = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setIsUpvoting(true);
    try {
      await ApiClient.post(`/complaints/${id}/upvote`);
      fetchComplaint();
    } catch (err: any) {
      alert(err.message || 'Already upvoted');
    } finally {
      setIsUpvoting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      await ApiClient.post(`/complaints/${id}/comments`, { content: commentText });
      setCommentText('');
      fetchComplaint();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmResolution = async () => {
    try {
      await ApiClient.post(`/complaints/${id}/confirm-resolution`);
      fetchComplaint();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRejectResolution = async () => {
    try {
      await ApiClient.post(`/complaints/${id}/reject-resolution`, { reason: rejectReason });
      setShowRejectModal(false);
      fetchComplaint();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span className="text-xs text-slate-500">Loading complaint timeline...</span>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold">Complaint Not Found</h2>
        <button onClick={() => router.push('/complaints')} className="text-xs text-emerald-700 font-semibold underline">
          &larr; Return to Complaints Feed
        </button>
      </div>
    );
  }

  const timeSla = formatTimeRemaining(complaint.slaDeadline);
  const priorityBadge = getPriorityBadge(complaint.priorityLabel);
  const beforePhoto = complaint.media?.find((m: any) => m.type === 'BEFORE')?.url || 'https://picsum.photos/seed/civic1/800/600';
  const afterPhoto = complaint.media?.find((m: any) => m.type === 'AFTER')?.url;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Back button & Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                {complaint.publicCode}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${priorityBadge.className}`}>
                {priorityBadge.label} ({complaint.priorityScore}/100)
              </span>
              <span className="text-xs text-slate-500 font-medium">&bull; {complaint.category?.name}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{complaint.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleUpvote}
              disabled={isUpvoting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
            >
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
              <span>Affected ({complaint.upvoteCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* SLA & Status Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 uppercase font-semibold">Statutory SLA Target (72 Hours)</div>
            <div className="text-sm font-extrabold text-slate-900">
              Deadline: {new Date(complaint.slaDeadline).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${timeSla.badgeColor}`}>
            {timeSla.text}
          </span>
          <span className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-bold">
            Status: {complaint.status}
          </span>
        </div>
      </div>

      {/* Before / After Photos Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Photographic Inspection Evidence</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Before Clean-Up (Submission)
            </div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              <img src={beforePhoto} alt="Before clean up" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> After Clean-Up (Authority Proof)
            </div>
            {afterPhoto ? (
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <img src={afterPhoto} alt="After clean up" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <ShieldCheck className="w-8 h-8 mb-2 text-slate-300" />
                <span className="text-xs font-medium">Pending field resolution by Ward Officer</span>
                <span className="text-[10px] mt-1">Resolution requires mandatory photographic verification</span>
              </div>
            )}
          </div>
        </div>

        {/* Citizen Confirm or Reject Resolution Buttons */}
        {complaint.status === 'RESOLVED' && (
          <div className="bg-emerald-50/70 p-5 rounded-xl border border-emerald-200 mt-4 space-y-3">
            <h4 className="text-xs font-bold text-emerald-950 uppercase">Citizen Verification: Is this grievance really fixed?</h4>
            <p className="text-xs text-emerald-800">
              Authorities have uploaded resolution proof. Please confirm if the site is clean, or reject to reopen the issue with accelerated priority.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmResolution}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                &check; Yes, It&apos;s Fixed (Close Grievance)
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20"
              >
                &times; No, Still Persists (Reject & Reopen with 24h SLA)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Reject Resolution & Reopen Complaint</h3>
            <p className="text-xs text-slate-600">
              Explain why this defect is not resolved. The complaint will immediately reopen with an accelerated 24-hour SLA and critical priority rating.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Garbage was only partially moved; drain remains blocked..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectResolution}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md"
              >
                Confirm Rejection & Escalate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vertical Status Timeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Accountability Timeline</h3>

        <div className="space-y-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {complaint.statusHistory?.map((h: any, i: number) => (
            <div key={i} className="relative group">
              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-sm" />
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>{h.toStatus}</span>
                <span className="text-[11px] font-normal text-slate-400">
                  {new Date(h.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{h.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Map & Location */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Geographic Incident Location</h3>
        <p className="text-xs text-slate-600">{complaint.address} {complaint.landmark ? `(Landmark: ${complaint.landmark})` : ''}</p>
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <LeafletMap
            center={[complaint.latitude, complaint.longitude]}
            zoom={16}
            markers={[
              {
                id: complaint.id,
                lat: complaint.latitude,
                lng: complaint.longitude,
                title: complaint.title,
                priorityLabel: complaint.priorityLabel,
              },
            ]}
            className="h-[260px] w-full"
          />
        </div>
      </div>

      {/* Comments & Discussion */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Community Updates & Comments ({complaint.comments?.length || 0})
        </h3>

        {/* Comment Input */}
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input
            type="text"
            placeholder="Add an observation or report update..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post</span>
          </button>
        </form>

        <div className="space-y-4">
          {complaint.comments?.map((c: any) => (
            <div key={c.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-800">{c.user?.name} ({c.user?.role})</span>
                <span className="text-slate-400">{new Date(c.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="text-xs text-slate-700">{c.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
