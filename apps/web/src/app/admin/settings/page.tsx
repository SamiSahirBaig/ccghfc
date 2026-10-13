'use client';

import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Mail, Clock, Cpu, Save } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    SLA_HOURS_DEFAULT: 72,
    DM_OFFICE_EMAIL: 'dm-office@district.gov.in',
    AI_VERIFICATION_ENABLED: true,
    MQ135_CRITICAL_PPM: 400,
    STATE_OVERSIGHT_EMAIL: 'commissioner@civic.state.gov.in',
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    ApiClient.get('/admin/settings')
      .then((res) => {
        if (res.data) setSettings((prev) => ({ ...prev, ...res.data }));
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await ApiClient.put('/admin/settings', settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Governance Configuration</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">System & Escalation Settings</h1>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
        {saveSuccess && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800">
            &check; Settings successfully updated and applied across BullMQ workers.
          </div>
        )}

        {/* SLA Config */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>SLA & Escalation Timing</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Municipal Resolution SLA (Hours)
              </label>
              <input
                type="number"
                value={settings.SLA_HOURS_DEFAULT}
                onChange={(e) => setSettings({ ...settings, SLA_HOURS_DEFAULT: parseInt(e.target.value, 10) })}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Statutory default 72 hours (3 days).</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                District Magistrate (DM) Office Escalation Email
              </label>
              <input
                type="email"
                value={settings.DM_OFFICE_EMAIL}
                onChange={(e) => setSettings({ ...settings, DM_OFFICE_EMAIL: e.target.value })}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">In dev, captured by Mailpit.</span>
            </div>
          </div>
        </div>

        {/* IoT Thresholds */}
        <div className="space-y-3 pb-6 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <span>IoT Sensor Auto-Complaint Thresholds</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                MQ135 Critical Gas Spike (PPM)
              </label>
              <input
                type="number"
                value={settings.MQ135_CRITICAL_PPM}
                onChange={(e) => setSettings({ ...settings, MQ135_CRITICAL_PPM: parseFloat(e.target.value) })}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Readings exceeding this threshold for consecutive intervals auto-create verified SENSOR complaints.
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
