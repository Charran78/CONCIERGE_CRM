'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, User, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent, Contact } from '@/lib/types';
import ScheduleModal from './ScheduleModal';

interface CalendarViewProps {
  events: CalendarEvent[];
  contacts: Contact[];
  onAdd: (event: CalendarEvent) => void;
  onUpdate: (event: CalendarEvent) => void;
  onDelete: (id: string, contactId?: string) => void;
}

export default function CalendarView({ events, contacts, onAdd, onUpdate, onDelete }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined);

  // Helper to get start of the week
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    return new Date(d.setDate(diff));
  };

  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });

  const nextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const prevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const hours = Array.from({ length: 15 }, (_, i) => i + 8); // 8:00 to 22:00

  return (
    <div className="flex flex-col h-full animate-fade-in space-y-4 md:space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white px-4 py-4 md:px-6 md:py-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Agenda Semanal</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button onClick={prevWeek} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors">
              Hoy
            </button>
            <button onClick={nextWeek} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
              <ChevronRight size={20} />
            </button>
          </div>
          <button 
            onClick={() => setIsScheduleModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Plus size={16} /> Nueva Cita
          </button>
        </div>
      </div>

      {/* Calendar Grid - Scrollable on mobile */}
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto w-full">
          <div className="min-w-[800px] md:min-w-full">
            {/* Days Header */}
            <div className="grid grid-cols-8 border-b border-slate-100">
              <div className="p-4 border-r border-slate-100 bg-slate-50/50"></div>
              {weekDays.map((date, i) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className={cn(
                    "p-4 text-center border-r border-slate-100 last:border-r-0 flex flex-col items-center gap-1",
                    isToday ? "bg-indigo-50/30" : ""
                  )}>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {date.toLocaleString('es-ES', { weekday: 'short' })}
                    </span>
                    <span className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-full text-sm font-black",
                      isToday ? "bg-indigo-600 text-white shadow-md" : "text-slate-700"
                    )}>
                      {date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Scrollable Hours Area */}
            <div className="relative">
              <div className="grid grid-cols-8 min-h-full">
                {/* Time Slots Column */}
                <div className="border-r border-slate-100 bg-slate-50/30">
                  {hours.map(h => (
                    <div key={h} className="h-20 p-2 text-right border-b border-slate-100 last:border-b-0">
                      <span className="text-[10px] font-bold text-slate-400">{h}:00</span>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                {weekDays.map((day, dayIdx) => (
                  <div key={dayIdx} className="relative border-r border-slate-100 last:border-r-0 bg-white group/col">
                    {hours.map(h => (
                      <div 
                        key={h} 
                        className="h-20 border-b border-slate-100/50 last:border-b-0 cursor-pointer hover:bg-slate-50/50 transition-colors"
                        onClick={() => {
                            // Set draft time and open modal?
                            setIsScheduleModalOpen(true);
                        }}
                      />
                    ))}

                    {/* Events in this day */}
                    {events
                      .filter(e => new Date(e.start_time).toDateString() === day.toDateString())
                      .map((event, eventIdx) => {
                        const start = new Date(event.start_time);
                        const end = new Date(event.end_time);
                        const startHour = start.getHours() + start.getMinutes() / 60;
                        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                        const top = (startHour - 8) * 80; // 80px per hour
                        const height = duration * 80;

                        return (
                          <div 
                            key={eventIdx}
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsScheduleModalOpen(true);
                            }}
                            className={cn(
                              "absolute left-1 right-1 p-2 rounded-xl border z-10 transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer group",
                              event.status === 'Confirmada' ? "bg-indigo-50 border-indigo-100" :
                              event.status === 'Completada' ? "bg-emerald-50 border-emerald-100" :
                              event.status === 'Cancelada' ? "bg-slate-50 border-slate-100 opacity-60" :
                              "bg-amber-50 border-amber-100"
                            )}
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <div className="flex flex-col h-full overflow-hidden">
                              <header className="flex justify-between items-start mb-1">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-tight truncate",
                                  event.status === 'Confirmada' ? "text-indigo-700" :
                                  event.status === 'Completada' ? "text-emerald-700" :
                                  event.status === 'Cancelada' ? "text-slate-500" :
                                  "text-amber-700"
                                )}>
                                  {event.title}
                                </span>
                                <div className="flex items-center gap-1">
                                   <span className={cn(
                                     "w-1.5 h-1.5 rounded-full",
                                     event.status === 'Confirmada' ? "bg-indigo-500" :
                                     event.status === 'Completada' ? "bg-emerald-500" :
                                     event.status === 'Cancelada' ? "bg-slate-400" :
                                     "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                   )} />
                                </div>
                              </header>
                              <div className={cn(
                                "text-[9px] font-bold flex items-center gap-1",
                                event.status === 'Confirmada' ? "text-indigo-600/70" :
                                event.status === 'Completada' ? "text-emerald-600/70" :
                                event.status === 'Cancelada' ? "text-slate-400" :
                                "text-amber-600/70"
                              )}>
                                <Clock size={10} /> {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isScheduleModalOpen && (
        <ScheduleModal 
           onClose={() => {
             setIsScheduleModalOpen(false);
             setSelectedEvent(undefined);
           }}
           contacts={contacts}
           onAdd={onAdd}
           onUpdate={onUpdate}
           onDelete={onDelete}
           initialEvent={selectedEvent}
           initialContactId={selectedEvent?.contact_id || undefined}
        />
      )}
    </div>
  );
}