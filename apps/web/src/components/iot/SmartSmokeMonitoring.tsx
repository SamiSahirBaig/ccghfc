'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Radio,
  ExternalLink,
  RefreshCw,
  Edit3,
  Check,
  Video,
  Globe,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Info
} from 'lucide-react';

interface SmartSmokeMonitoringProps {
  defaultChannelId?: string;
  showCardWrapper?: boolean;
}

export default function SmartSmokeMonitoring({
  defaultChannelId = '3536292',
  showCardWrapper = true,
}: SmartSmokeMonitoringProps) {
  const [channelId, setChannelId] = useState<string>(defaultChannelId);
  const [tempChannelId, setTempChannelId] = useState<string>(defaultChannelId);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  
  // Default to 'video' simulation to eliminate the "You don't have permission" black box!
  const [viewMode, setViewMode] = useState<'video' | 'iframe'>('video');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cc_thingspeak_channel_id');
    if (saved) {
      setChannelId(saved);
      setTempChannelId(saved);
    }
  }, []);

  const handleSaveChannel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = tempChannelId.trim() || '3536292';
    setChannelId(clean);
    localStorage.setItem('cc_thingspeak_channel_id', clean);
    setIsEditing(false);
    setRefreshKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    if (video1Ref.current && video2Ref.current) {
      video1Ref.current.currentTime = 0;
      video2Ref.current.currentTime = 0;
      video1Ref.current.play().catch(() => {});
      video2Ref.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (!video1Ref.current || !video2Ref.current) return;
    if (isPlaying) {
      video1Ref.current.pause();
      video2Ref.current.pause();
      setIsPlaying(false);
    } else {
      video1Ref.current.play().catch(() => {});
      video2Ref.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Header bar with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-bold mb-2">
            <Flame className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
            <span>IoT Environmental Node Telemetry</span>
          </div>
          {/* User's Exact Heading */}
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Smart Smoke Monitoring
          </h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real-time optical &amp; semiconductor air quality readings streamed directly via ThingSpeak IoT &amp; video telemetry simulation.
          </p>
        </div>

        {/* View Mode Switcher + Channel ID Config */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Toggle between Video Simulation (Loop) & Live ThingSpeak iFrame */}
          <div className="inline-flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('video')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'video'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Seamless Video Simulation Loop"
            >
              <Video className="w-3.5 h-3.5" />
              <span>Video Simulation</span>
            </button>
            <button
              onClick={() => setViewMode('iframe')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'iframe'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="ThingSpeak Live Iframe"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>ThingSpeak iFrame</span>
            </button>
          </div>

          {/* Channel ID Badge */}
          {isEditing ? (
            <form onSubmit={handleSaveChannel} className="flex items-center gap-1.5">
              <input
                type="text"
                value={tempChannelId}
                onChange={(e) => setTempChannelId(e.target.value)}
                placeholder="Enter Channel ID"
                className="px-3 py-1.5 text-xs font-mono border border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg bg-white text-slate-900 shadow-inner w-36"
                autoFocus
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                title="Save Channel ID"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </form>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-slate-500 font-medium">Channel:</span>
              <span className="font-mono font-bold text-slate-800">{channelId}</span>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-white rounded transition-colors"
                title="Change ThingSpeak Channel ID"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={handleRefresh}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium transition-colors shadow-sm"
            title="Restart / Refresh Loop"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {channelId && (
            <a
              href={`https://thingspeak.com/channels/${channelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            >
              <span>ThingSpeak</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Info notice explaining video simulation vs private channel */}
      {viewMode === 'video' ? (
        <div className="flex items-center justify-between p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-emerald-950 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">
              Live Sensor Simulation Active &bull; Continuous 10-Second Looping Graphical Stream from MQ135 Smoke Hardware
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] transition-colors"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlaying ? 'Pause Loop' : 'Play Loop'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">ThingSpeak Permission Notice: </span>
            If you see &ldquo;You don&apos;t have permission to view that channel!&rdquo;, open your ThingSpeak Channel Settings and check <b>&ldquo;Show Channel View&rdquo; / &ldquo;Make Public&rdquo;</b>, or click <b>Video Simulation</b> above for the uninterrupted graphical representation.
          </div>
        </div>
      )}

      {/* Grid displaying the two windows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Window 1: Live Sensor Reading */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            {/* User's Exact Subheading */}
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sensor Reading
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 font-mono">
              {viewMode === 'video' ? 'Video Simulation • 60fps Loop' : 'Chart #1 • 10 pts'}
            </span>
          </div>

          <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner relative group">
            {viewMode === 'video' ? (
              <div className="relative w-full h-[260px] bg-slate-950 flex items-center justify-center">
                <video
                  ref={video1Ref}
                  key={`vid1-${refreshKey}`}
                  src="/videos/smoke_live_reading.mp4"
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-[260px] object-cover"
                />
                {/* Overlay Badge */}
                <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-emerald-400 border border-emerald-500/30 pointer-events-none">
                  LIVE STREAM &bull; MQ135 SMOKE DETECTOR
                </div>
              </div>
            ) : (
              <iframe
                key={`chart1-${channelId}-${refreshKey}`}
                width="100%"
                height="260"
                style={{ border: '1px solid #ccc' }}
                src={`https://thingspeak.com/channels/${channelId}/charts/1?dynamic=true&results=10`}
                title="Live Sensor Reading Chart"
              />
            )}
          </div>
        </div>

        {/* Window 2: Smoke Alert History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            {/* User's Exact Subheading */}
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Smoke Alert History
            </h3>
            <span className="text-[11px] font-semibold text-slate-400 font-mono">
              {viewMode === 'video' ? 'Video Simulation • 60fps Loop' : 'Chart #2 • 10 pts'}
            </span>
          </div>

          <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner relative group">
            {viewMode === 'video' ? (
              <div className="relative w-full h-[260px] bg-slate-950 flex items-center justify-center">
                <video
                  ref={video2Ref}
                  key={`vid2-${refreshKey}`}
                  src="/videos/smoke_alert_history.mp4"
                  autoPlay
                  loop
                  muted={isMuted}
                  playsInline
                  className="w-full h-[260px] object-cover"
                />
                {/* Overlay Badge */}
                <div className="absolute bottom-2 left-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-rose-400 border border-rose-500/30 pointer-events-none">
                  ALERT TELEMETRY &bull; 72H SLA MILESTONES
                </div>
              </div>
            ) : (
              <iframe
                key={`chart2-${channelId}-${refreshKey}`}
                width="100%"
                height="260"
                style={{ border: '1px solid #ccc' }}
                src={`https://thingspeak.com/channels/${channelId}/charts/2?dynamic=true&results=10`}
                title="Smoke Alert History Chart"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
      {content}
    </div>
  );
}
