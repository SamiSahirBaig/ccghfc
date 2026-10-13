import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeRemaining(slaDeadlineStr: string): {
  text: string;
  badgeColor: string;
  isBreached: boolean;
} {
  const deadline = new Date(slaDeadlineStr).getTime();
  const now = Date.now();
  const diffHours = (deadline - now) / (1000 * 60 * 60);

  if (diffHours <= 0) {
    return {
      text: 'BREACHED',
      badgeColor: 'bg-black text-white border-black',
      isBreached: true,
    };
  }

  if (diffHours > 48) {
    return {
      text: `${Math.round(diffHours)}h left`,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      isBreached: false,
    };
  }

  if (diffHours > 24) {
    return {
      text: `${Math.round(diffHours)}h left`,
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-300',
      isBreached: false,
    };
  }

  return {
    text: `${Math.round(diffHours)}h left`,
    badgeColor: 'bg-red-50 text-red-700 border-red-300 animate-pulse',
    isBreached: false,
  };
}

export function getPriorityBadge(priorityLabel: string) {
  switch (priorityLabel) {
    case 'CRITICAL':
      return { label: 'CRITICAL', className: 'bg-red-100 text-red-800 border-red-300' };
    case 'HIGH':
      return { label: 'HIGH', className: 'bg-orange-100 text-orange-800 border-orange-300' };
    case 'MEDIUM':
      return { label: 'MEDIUM', className: 'bg-amber-100 text-amber-800 border-amber-300' };
    default:
      return { label: 'LOW', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  }
}
