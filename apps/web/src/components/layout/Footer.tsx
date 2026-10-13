import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Cpu, Clock, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 text-white font-bold text-lg mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>CityClean Platform</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI-driven municipal accountability system with automated 72-hour District Magistrate escalation and autonomous MQ135 environmental IoT sensor integration.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Core Engines</h4>
          <ul className="text-xs space-y-2 text-slate-400">
            <li className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-emerald-400" /> 72-Hour BullMQ SLA Scheduler</li>
            <li className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-emerald-400" /> Multimodal Vision Verification</li>
            <li className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> PostGIS Spatial Clustering</li>
            <li className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-emerald-400" /> MQ135 Gas PPM Processor</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">Governance Portals</h4>
          <ul className="text-xs space-y-2 text-slate-400">
            <li><Link href="/transparency" className="hover:text-emerald-400 transition-colors">Public Transparency & Stats</Link></li>
            <li><Link href="/report" className="hover:text-emerald-400 transition-colors">Citizen 30s Report Flow</Link></li>
            <li><Link href="/officer" className="hover:text-emerald-400 transition-colors">Ward Officer Dashboard</Link></li>
            <li><Link href="/admin" className="hover:text-emerald-400 transition-colors">Admin & IoT Device Monitor</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white mb-3">District Authority</h4>
          <p className="text-xs text-slate-400 mb-2">District Magistrate Office Grievance Escalation Contact:</p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
            <Mail className="w-3.5 h-3.5" />
            <span>dm-office@district.gov.in</span>
          </div>
          <div className="mt-4 text-[11px] text-slate-500">
            &copy; 2026 CityClean Municipal Civic Redressal. Production Build.
          </div>
        </div>
      </div>
    </footer>
  );
}
