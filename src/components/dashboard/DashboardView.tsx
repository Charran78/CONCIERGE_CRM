import { Users, Mail, Sparkles, ArrowRight, History, Check, Calendar, ExternalLink, Clock, TrendingUp, AlertCircle, PieChart as PieIcon, Activity } from 'lucide-react';
import type { Contact, CalendarEvent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';

interface DashboardMetrics {
  total_contacts: number;
  leads_frios: number;
  clientes_activos: number;
  portals_active: number;
  revenue_month: number;
  conversion_rate: number;
}

interface DashboardViewProps {
  contacts: Contact[];
  events: CalendarEvent[];
  metrics?: DashboardMetrics;
  onOpenContact?: (contactId: string) => void;
}

function StatCard({
  label,
  value,
  icon,
  colorClass,
  trend,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
  trend?: {
    value: string;
    positive: boolean;
  };
}) {
  return (
    <div className={cn("p-6 rounded-[2rem] border shadow-sm transition-all hover:shadow-md", colorClass)}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm">
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-black px-2 py-1 rounded-lg",
            trend.positive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          )}>
            {trend.value}
          </span>
        )}
      </div>
      <span className="text-[10px] font-black uppercase tracking-[0.1em] opacity-60 block mb-1">{label}</span>
      <h3 className="text-3xl font-black tracking-tight">{value}</h3>
    </div>
  );
}

export default function DashboardView({ contacts, events, metrics, onOpenContact }: DashboardViewProps) {
  const contactsWithNotes = contacts.filter((c) => (c.notes?.length ?? 0) > 0);
  
  const coldLeadsCount = metrics ? metrics.leads_frios : contacts.filter(c => {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const lastInteraction = new Date(c.last_interaction);
    return lastInteraction < fortyEightHoursAgo && c.status !== 'Cliente Activo';
  }).length;

  const statusDistribution = [
    { name: 'Lead Frío', value: contacts.filter(c => c.status === 'Lead Frío').length },
    { name: 'Agendada', value: contacts.filter(c => c.status === 'Llamada Agendada').length },
    { name: 'Potencial', value: contacts.filter(c => c.status === 'Cliente Potencial').length },
    { name: 'Activo', value: contacts.filter(c => c.status === 'Cliente Activo').length },
  ];

  const totalLeads = metrics ? metrics.total_contacts : contacts.length;
  const portalsActive = metrics ? metrics.portals_active : contacts.filter(c => c.portal?.active).length;
  const conversionRate = metrics ? metrics.conversion_rate : 0;
  const revenueMonth = metrics ? metrics.revenue_month : 0;

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const coldLeads = contacts.filter(c => {
    const lastInteraction = new Date(c.last_interaction);
    return lastInteraction < fortyEightHoursAgo && c.status !== 'Cliente Activo';
  });

  // Próximas citas (futuras)
  const upcomingEvents = events
    .filter((e) => {
      const eventDate = new Date(e.start_time);
      return !Number.isNaN(eventDate.getTime()) && eventDate > new Date();
    })
    .sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">
      {/* Header section with motivation */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative overflow-hidden px-4 py-4 md:px-8 md:py-8 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">Panel Concierge</h1>
          <p className="text-slate-500 font-medium text-lg">
            Bienvenido al centro de mando de <span className="font-serif italic" style={{ color: 'var(--tsc-gold-dark)' }}>The Singular Choice</span>.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3 relative z-10">
          <img 
            src="/branding/proinsight2.png" 
            alt="ProInsight AI Growth" 
            className="h-32 md:h-48 w-auto max-w-full object-contain hover:scale-110 transition-transform duration-500 drop-shadow-2xl" 
          />
          <div className="flex gap-2">
            {coldLeadsCount > 0 && (
              <div className="px-4 py-2 bg-amber-50 border border-orange-100 rounded-xl flex items-center gap-2 animate-pulse shadow-sm">
                <AlertCircle size={14} className="text-orange-500" />
                <span className="text-[10px] font-black text-orange-700 uppercase tracking-widest">{coldLeadsCount} Leads enfriándose</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-indigo-50/50 to-transparent pointer-events-none" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tasa Conversión VIP"
          value={`${conversionRate}%`}
          icon={<Sparkles size={18} style={{ color: 'var(--tsc-gold)' }} />}
          colorClass="bg-white border-slate-200 text-slate-800"
        />
        <StatCard
          label="Ingresos Mes"
          value={`${revenueMonth}€`}
          icon={<TrendingUp size={18} className="text-emerald-600" />}
          colorClass="bg-white border-slate-200 text-slate-800"
        />
        <StatCard
          label="Portales Activos"
          value={portalsActive}
          icon={<PieIcon size={18} className="text-indigo-600" />}
          colorClass="bg-white border-slate-200 text-slate-800"
        />
        <StatCard
          label="Total Clientes"
          value={totalLeads}
          icon={<Users size={18} className="text-slate-600" />}
          colorClass="bg-white border-slate-200 text-slate-800"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución del Pipeline */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-indigo-600" />
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Estado del Pipeline</h3>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 6, 6]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Eliminar métrica Sentimiento AI antigua, ahora un placeholder de lujo */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[400px]">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles size={18} style={{ color: 'var(--tsc-gold)' }} />
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Experiencia Premium</h3>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--tsc-gold-muted)' }}>
              <Users size={24} style={{ color: 'var(--tsc-gold)' }} />
            </div>
            <h4 className="font-serif text-xl text-slate-800 mb-2">Creando Narrativas</h4>
            <p className="text-sm text-slate-500 mb-6">Utiliza la pestaña de Experiencias Luxury para generar historias impulsadas por Groq AI.</p>
            <div className="badge-gold text-xs px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
              {contacts.filter(c => c.portal?.active).length} Portales listos
            </div>
          </div>
        </div>

        {/* Alertas y Próximos Pasos */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] shadow-xl p-8 text-white overflow-hidden relative">
            <Sparkles className="absolute -right-4 -top-4 w-24 h-24 opacity-10 rotate-12" />
            <h3 className="font-black text-white uppercase text-[10px] tracking-[0.2em] mb-6 flex items-center gap-2">
              <History size={14} /> Memoria Reciente
            </h3>
            <div className="space-y-4 relative z-10">
              {contactsWithNotes.length > 0 ? contactsWithNotes.slice(0, 1).map(c => (
                <div key={c.id}>
                  <p className="text-sm font-medium leading-relaxed opacity-90 italic">
                    &ldquo;{c.notes![0].reasoning.substring(0, 120)}...&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-6">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-[10px]">
                      {c.name.charAt(0)}
                    </div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">
                      {c.name}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-100">
                    Aún no hay memoria reciente
                  </p>
                  <p className="mt-2 text-xs text-indigo-100/80">
                    Cuando registres actividad o análisis en un lead, aparecerá aquí.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white">
            <h3 className="font-black text-white uppercase text-[10px] tracking-widest mb-6 flex items-center gap-2">
              <AlertCircle size={14} className="text-orange-400" /> Foco Urgente
            </h3>
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {coldLeads.length > 0 ? (
                coldLeads.map(c => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => onOpenContact?.(c.id)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all text-left"
                  >
                    <div>
                      <p className="text-xs font-bold">{c.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase font-black mt-1">Sin contacto hace 2 días</p>
                    </div>
                    <ArrowRight size={14} className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-all" />
                  </button>
                ))
              ) : (
                <p className="text-[10px] text-slate-500 uppercase font-black text-center py-4">Todo al día</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Agenda Section */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl">
              <Calendar size={18} className="text-emerald-600" />
            </div>
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Agenda Próxima</h3>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-black tracking-widest">
            {upcomingEvents.length} CITAS PROGRAMADAS
          </span>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => {
              const contact = contacts.find(c => c.id === event.contact_id);
              return (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => {
                    if (event.contact_id) onOpenContact?.(event.contact_id);
                  }}
                  className="w-full flex items-center gap-4 p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:border-emerald-300 hover:bg-white hover:shadow-xl transition-all group text-left"
                >
                  <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl min-w-[64px] shadow-sm group-hover:bg-emerald-50 group-hover:border-emerald-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase group-hover:text-emerald-600">
                      {new Date(event.start_time).toLocaleString('es-ES', { month: 'short' })}
                    </span>
                    <span className="text-xl font-black text-slate-800 group-hover:text-emerald-700">
                      {new Date(event.start_time).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-slate-800 text-sm leading-tight truncate">{event.title}</h4>
                    <p className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5 mt-1">
                      <Clock size={10} /> {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                    </p>
                    {contact && <p className="text-[9px] text-indigo-500 font-black uppercase mt-1 truncate">{contact.name}</p>}
                  </div>
                  {event.meeting_link && (
                    <a 
                      href={event.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </button>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 text-slate-300 border-2 border-dashed border-slate-100 rounded-[2rem]">
              <Calendar size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-sm font-bold">No tienes citas agendadas.</p>
              <p className="text-[10px] uppercase tracking-widest mt-1 opacity-60">Usa el CRM para programar llamadas.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}