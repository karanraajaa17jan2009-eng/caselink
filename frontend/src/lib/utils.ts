import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateTimeStr?: string | null): string {
  if (!dateTimeStr) return 'N/A';
  try {
    const d = new Date(dateTimeStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateTimeStr;
  }
}

export function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'Received':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'Under Process':
      return 'bg-blue-50 text-blue-700 border-blue-300';
    case 'Pending':
      return 'bg-amber-50 text-amber-700 border-amber-300';
    case 'Transferred':
      return 'bg-purple-50 text-purple-700 border-purple-300';
    case 'Escalated':
      return 'bg-red-50 text-red-700 border-red-300 font-semibold';
    case 'Disposed':
      return 'bg-emerald-50 text-emerald-700 border-emerald-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

export function getBureauBadgeStyle(bureauCode?: string) {
  switch (bureauCode) {
    case 'RB':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PGRC':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'AB':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'ACAD':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'FIN':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    case 'LEGAL':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'VIG':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'RO':
      return 'bg-teal-100 text-teal-800 border-teal-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function getPriorityStyle(priority: string) {
  switch (priority) {
    case 'Critical':
      return { dot: 'bg-red-600', text: 'text-red-700', bg: 'bg-red-50' };
    case 'High':
      return { dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' };
    case 'Medium':
      return { dot: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50' };
    case 'Low':
      return { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' };
    default:
      return { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-50' };
  }
}
