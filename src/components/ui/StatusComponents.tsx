'use client';

import { cn, STATUS_STYLES, ALL_STATUSES } from '@/lib/utils';
import { ChevronDown, CheckCircle2, Clock, Send, XCircle, Eye } from 'lucide-react';
import type { ContactStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
        STATUS_STYLES[status] ?? 'bg-slate-100 border-slate-200 text-slate-600'
      )}
    >
      {status}
    </span>
  );
}

export function QuoteStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    'Borrador': 'bg-slate-100 border-slate-200 text-slate-500',
    'Enviado': 'bg-blue-50 border-blue-100 text-blue-600',
    'Abierto': 'bg-purple-50 border-purple-100 text-purple-600',
    'Aceptado': 'bg-emerald-100 border-emerald-200 text-emerald-700 shadow-sm shadow-emerald-100',
    'Rechazado': 'bg-red-50 border-red-100 text-red-600',
  };

  const icons: Record<string, any> = {
    'Borrador': Clock,
    'Enviado': Send,
    'Abierto': Eye,
    'Aceptado': CheckCircle2,
    'Rechazado': XCircle,
  };

  const Icon = icons[status] || Clock;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all',
        styles[status] ?? styles['Borrador']
      )}
    >
      <Icon size={10} strokeWidth={3} />
      {status}
    </span>
  );
}

export function StatusDropdown({
  currentStatus,
  onChange,
}: {
  currentStatus: ContactStatus;
  onChange: (s: ContactStatus) => void;
}) {
  return (
    <div className="relative inline-block w-full max-w-full">
      <select
        value={currentStatus}
        onChange={(e) => onChange(e.target.value as ContactStatus)}
        className={cn(
          'appearance-none outline-none cursor-pointer pr-9 pl-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all w-full max-w-full',
          STATUS_STYLES[currentStatus] ?? 'bg-slate-50 border-slate-200 text-slate-600'
        )}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s} className="bg-white text-slate-900 font-sans">
            {s}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
      />
    </div>
  );
}