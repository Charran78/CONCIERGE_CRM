'use client';

import { useState } from 'react';
import { X, Calendar, Clock, User, Link as LinkIcon, Sparkles, Plus, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Contact, CalendarEvent } from '@/lib/types';

interface ScheduleModalProps {
  onClose: () => void;
  contacts: Contact[];
  onAdd: (event: CalendarEvent) => void;
  onUpdate?: (event: CalendarEvent) => void;
  onDelete?: (id: string, contactId?: string) => void;
  initialEvent?: CalendarEvent;
  initialContactId?: string;
}

export default function ScheduleModal({ 
  onClose, 
  contacts, 
  onAdd, 
  onUpdate, 
  onDelete, 
  initialEvent, 
  initialContactId 
}: ScheduleModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState(initialContactId || initialEvent?.contact_id || '');
  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [date, setDate] = useState(initialEvent ? new Date(initialEvent.start_time).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(initialEvent ? new Date(initialEvent.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '10:00');
  const [duration, setDuration] = useState(initialEvent ? (new Date(initialEvent.end_time).getTime() - new Date(initialEvent.start_time).getTime()) / 60000 : 30);
  const [status, setStatus] = useState<CalendarEvent['status']>(initialEvent?.status || 'Pendiente');

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  const formatGCDate = (dateStr: string, timeStr: string) => {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const handleSave = async () => {
    setLoading(true);
    
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + duration * 60000);

    const eventData = {
      user_id: (await supabase.auth.getUser()).data.user?.id,
      contact_id: selectedContactId || null,
      title: title || `Llamada con ${selectedContact?.name || 'Lead'}`,
      description: description,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: status,
    };

    if (initialEvent) {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(eventData)
        .eq('id', initialEvent.id)
        .select()
        .single();

      if (!error && data && onUpdate) {
        onUpdate(data as CalendarEvent);
        onClose();
      } else {
        console.error(error);
        alert('Error al actualizar la cita.');
      }
    } else {
      const { data, error } = await supabase
        .from('calendar_events')
        .insert(eventData)
        .select()
        .single();

      if (!error && data) {
        onAdd(data as CalendarEvent);

        // Generate Magic Link
        const gStart = formatGCDate(date, time);
        const gEnd = new Date(start.getTime() + duration * 60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventData.title)}&details=${encodeURIComponent(description)}&dates=${gStart}/${gEnd}${selectedContact ? `&add=${encodeURIComponent(selectedContact.email)}` : ''}`;
        
        window.open(gUrl, '_blank');
        onClose();
      } else {
        console.error(error);
        alert('Error al agendar la cita.');
      }
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!initialEvent || !confirm('¿Eliminar esta cita permanentemente?')) return;
    setLoading(true);
    const { error } = await supabase.from('calendar_events').delete().eq('id', initialEvent.id);
    if (!error) {
      if (onDelete) onDelete(initialEvent.id, initialEvent.contact_id || undefined);
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg mx-auto px-4 py-4 md:p-8 shadow-2xl animate-zoom-in border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
               <Calendar size={20} />
             </div>
             <h3 className="text-xl font-black text-slate-800">{initialEvent ? 'Editar Cita' : 'Agendar Cita'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5">
           <section>
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
               Estado de la Cita
             </label>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
               {(['Pendiente', 'Confirmada', 'Completada', 'Cancelada'] as const).map(s => (
                 <button 
                   key={s}
                   onClick={() => setStatus(s)}
                   className={cn(
                     "py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all",
                     status === s 
                       ? "bg-slate-800 text-white shadow-md ring-2 ring-slate-100" 
                       : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                   )}
                 >
                   {s}
                 </button>
               ))}
             </div>
           </section>

           <section>
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
               Lead Asociado
             </label>
             <select 
               value={selectedContactId}
               onChange={(e) => setSelectedContactId(e.target.value)}
               className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
             >
               <option value="">-- Seleccionar Lead --</option>
               {contacts.map(c => (
                 <option key={c.id} value={c.id}>{c.name}</option>
               ))}
             </select>
           </section>

           <section>
             <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
               Título
             </label>
             <input 
               placeholder="Ej: Análisis de requerimientos"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
             />
           </section>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <section>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                 Fecha
               </label>
               <input 
                 type="date"
                 value={date}
                 onChange={(e) => setDate(e.target.value)}
                 className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
               />
             </section>
             <section>
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                 Hora
               </label>
               <input 
                 type="time"
                 value={time}
                 onChange={(e) => setTime(e.target.value)}
                 className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
               />
             </section>
           </div>

           <div className="flex flex-col md:flex-row gap-3 pt-3">
             {initialEvent && (
                <button 
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full md:w-auto px-6 py-4 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
             )}
             <button 
               onClick={handleSave}
               disabled={loading}
               className="flex-1 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3"
             >
               {loading ? (initialEvent ? 'Actualizando...' : 'Agendando...') : (
                 <>
                   {initialEvent ? <Check size={18} /> : <Plus size={18} />} 
                   {initialEvent ? 'Guardar Cambios' : 'Confirmar y Abrir Calendar'}
                 </>
               )}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}