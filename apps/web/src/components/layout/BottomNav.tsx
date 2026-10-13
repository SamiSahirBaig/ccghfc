'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, ListOrdered, BarChart2, User } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAppStore();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/report', label: 'Report', icon: PlusCircle, isPrimary: true },
    { href: '/complaints', label: 'My Issues', icon: ListOrdered },
    { href: user?.role === 'OFFICER' ? '/officer' : user?.role === 'ADMIN' ? '/admin' : '/transparency', label: user?.role ? 'Dashboard' : 'Public', icon: BarChart2 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 py-1.5 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        if (item.isPrimary) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center -mt-5 group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-active:scale-95 transition-transform">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 mt-1">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
              isActive ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
