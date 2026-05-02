'use client';

import { CalendarDays, LayoutList, Rocket } from 'lucide-react';

const CONFIG: Record<string, { icon: React.ReactNode; title: string; desc: string; phase: string }> = {
  calendar: {
    icon: <CalendarDays size={36} className="text-indigo-400" />,
    title: 'Calendario Inteligente',
    desc: 'Configura tus horarios disponibles, genera un enlace público para que tus leads agenden llamadas directamente y recibe confirmaciones automáticas.',
    phase: 'Fase 2',
  },
  portals: {
    icon: <LayoutList size={36} className="text-purple-400" />,
    title: 'Portales de Cliente',
    desc: 'Entrega tu Sprint de 21 días dentro de la app. Checklists personalizados, seguimiento de progreso y comunicación directa con cada cliente.',
    phase: 'Fase 3',
  },
};

export default function PlaceholderView({ tab }: { tab: string }) {
  const config = CONFIG[tab] ?? CONFIG.calendar;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-fade-in px-4 md:px-8 py-4">
      <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center border border-slate-200">
        {config.icon}
      </div>
      <div className="max-w-sm space-y-3">
        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full">
          {config.phase} · Próximamente
        </span>
        <h2 className="text-2xl font-black text-slate-800">{config.title}</h2>
        <p className="text-slate-500 text-sm leading-relaxed">{config.desc}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-4 py-2.5 rounded-full">
        <Rocket size={14} />
        En desarrollo activo · Disponible en breve
      </div>
    </div>
  );
}