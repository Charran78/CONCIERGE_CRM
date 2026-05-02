'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Files, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Clock,
  ArrowRight,
  Layout,
  Check,
  ChevronRight,
  ChevronLeft,
  Receipt,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientPortal, PortalTask, PortalResource, Quote } from '@/lib/types';
import { usePortals } from '@/hooks/usePortals';
import { supabase } from '@/lib/supabase';

interface ClientPortalViewProps {
  portal: ClientPortal & { tasks: PortalTask[], resources: PortalResource[], contact?: { name: string; quotes?: Quote[] } };
  professionalName: string;
}

export default function ClientPortalView({ portal: initialPortal, professionalName }: ClientPortalViewProps) {
  const { saveTask, logActivity } = usePortals();
  const [portal, setPortal] = useState(initialPortal);
  const [celebrate, setCelebrate] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const quotes = portal.contact?.quotes || [];
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const activeQuote = quotes[activeQuoteIndex];
  
  const [activeTab, setActiveTab] = useState<'roadmap' | 'proposal'>('roadmap');

  const completedTasks = portal.tasks.filter(t => t.is_completed).length;
  const totalTasks = portal.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleNextQuote = () => {
    if (activeQuoteIndex < quotes.length - 1) {
      setActiveQuoteIndex(activeQuoteIndex + 1);
    }
  };

  const handlePrevQuote = () => {
    if (activeQuoteIndex > 0) {
      setActiveQuoteIndex(activeQuoteIndex - 1);
    }
  };

  useEffect(() => {
    // Registrar acceso al abrir el portal
    logActivity(portal.id, 'portal_accessed', 'El cliente accedió al portal');
  }, []); // Solo al montar

  const handleToggleTask = async (task: PortalTask) => {
    const isNowCompleted = !task.is_completed;
    const updated = await saveTask({
      ...task,
      is_completed: isNowCompleted,
      completed_at: isNowCompleted ? new Date().toISOString() : undefined
    });

    if (updated) {
      setPortal(prev => ({
        ...prev,
        tasks: prev.tasks.map(t => t.id === task.id ? updated : t)
      }));

      // Log activity
      if (isNowCompleted) {
        logActivity(portal.id, 'task_completed', `El cliente completó: ${task.title}`);
        if (progress < 100 && Math.round(((completedTasks + 1) / totalTasks) * 100) === 100) {
           setCelebrate(true);
           setTimeout(() => setCelebrate(false), 5000);
        }
      }
    }
  };

  const handleAcceptQuote = async (quote: Quote) => {
    if (!confirm('Al aceptar esta cotización, confirmas tu intención de avanzar con el proyecto. ¿Continuar?')) return;
    
    setIsAccepting(true);
    try {
      // Updates quote status
      const { data: updatedQuote, error: quoteError } = await supabase
        .from('quotes')
        .update({ status: 'Aceptado' })
        .eq('id', quote.id)
        .select()
        .single();
      
      if (quoteError) throw quoteError;

      // Update local state immediately
      setPortal(prev => {
        if (!prev.contact) return prev;
        const updatedQuotes = prev.contact.quotes?.map(q => q.id === quote.id ? (updatedQuote as Quote) : q);
        return {
          ...prev,
          contact: { ...prev.contact, quotes: updatedQuotes }
        };
      });
      
      // Updates contact status automatically to 'Cliente Activo'
      if (portal.contact_id) {
         await supabase.from('contacts').update({ status: 'Cliente Activo' }).eq('id', portal.contact_id);
         logActivity(portal.id, 'quote_accepted', `¡El cliente ha aceptado la cotización ${quote.quote_number}!`);
      }

      setCelebrate(true);
      setTimeout(() => {
        setCelebrate(false);
      }, 5000);
    } catch (error) {
      console.error('Error accepting quote:', error);
      alert('Hubo un error al procesar la firma. Por favor, inténtalo de nuevo.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      {/* Branded Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 md:px-6 md:py-6 flex justify-between items-center sticky top-0 z-50 shadow-sm print:hidden">
        <img 
          src="/branding/lead_converter.png" 
          alt="TOTAL PRO Lead Converter" 
          className="h-12 md:h-16 w-auto object-contain" 
        />
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portal Activo</span>
        </div>
      </div>

      {/* Dynamic Header / Hero */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-fade-in print:hidden">
                <ShieldCheck size={12} /> Espacio Seguro de {professionalName}
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-[1.1]">
                {activeTab === 'roadmap' ? 'Tu Plan de Éxito' : 'Tu Propuesta Comercial'} <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">
                  {activeTab === 'roadmap' ? 'Paso a Paso' : 'Detallada'}
                </span>
              </h1>
              <p className="text-slate-500 font-medium max-w-md">
                {activeTab === 'roadmap' 
                  ? 'Bienvenido a tu portal personalizado. Aquí podrás seguir el progreso de nuestro sprint y acceder a todos los recursos acordados.'
                  : 'Revisa detalladamente la propuesta económica para avanzar con tu proyecto.'
                }
              </p>
            </div>
            
            {activeTab === 'roadmap' && (
              <div className="bg-slate-900 text-white px-4 py-4 md:p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-200 min-w-[240px] relative overflow-hidden group print:hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                   <Sparkles size={64} />
                 </div>
                 <div className="relative z-10">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Progreso Total</span>
                      <span className="text-3xl font-black">{progress}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400 transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {completedTasks} de {totalTasks} Hitos Alcanzados
                    </p>
                 </div>
              </div>
            )}
          </div>

          {/* Nav Tabs & Quote Selector */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100 print:hidden">
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('roadmap')} 
                className={cn("px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all", activeTab === 'roadmap' ? "bg-slate-900 text-white shadow-xl" : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700")}
              >
                Plan de Acción
              </button>
              <button 
                onClick={() => setActiveTab('proposal')} 
                className={cn("px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all", activeTab === 'proposal' ? "bg-indigo-600 text-white shadow-xl shadow-indigo-200" : "bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100")}
              >
                {quotes.length > 1 ? `Propuestas (${quotes.length})` : 'Ver Propuesta'}
                {activeQuote?.status === 'Aceptado' && <CheckCircle2 size={12} className="inline ml-2 mb-0.5" />}
              </button>
            </div>

            {activeTab === 'proposal' && quotes.length > 1 && (
              <div className="flex items-center gap-4 bg-white border border-slate-100 p-1.5 rounded-full shadow-sm animate-fade-in">
                <button 
                  onClick={handlePrevQuote} 
                  disabled={activeQuoteIndex === 0}
                  className="p-2 hover:bg-slate-50 rounded-full disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex flex-col items-center min-w-[100px]">
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Propuesta</span>
                  <span className="text-[10px] font-black text-slate-700">{activeQuoteIndex + 1} de {quotes.length}</span>
                </div>
                <button 
                  onClick={handleNextQuote} 
                  disabled={activeQuoteIndex === quotes.length - 1}
                  className="p-2 hover:bg-slate-50 rounded-full disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-12">
        
        {/* Quote Section (If Exists) */}
        {activeQuote && activeTab === 'proposal' && (
          <section className="space-y-8 bg-white border border-indigo-100 rounded-[2.5rem] px-4 py-6 md:p-12 shadow-2xl relative overflow-hidden print:shadow-none print:border-none print:p-0">
            {/* Print Header Hide/Show logic using Tailwind print classes */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500 print:hidden" />
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-8 border-b border-slate-100">
               <div>
                 <span className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 print:hidden">
                    <CheckCircle2 size={12} /> Propuesta Económica
                 </span>
                 <h2 className="text-2xl md:text-3xl font-black text-slate-800">{activeQuote.title}</h2>
                 <p className="text-sm font-bold text-slate-400 mt-2">Cotización Nº: {activeQuote.quote_number}</p>
                 <p className="text-xs font-bold text-slate-400 mt-1">Validez hasta: {activeQuote.valid_until}</p>
               </div>
               <div className="flex gap-2 print:hidden">
                  <button onClick={() => window.print()} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-slate-200 transition-all">
                    Descargar PDF
                  </button>
               </div>
            </div>

            <div className="py-6 space-y-6">
               {/* Items Table */}
               <div className="overflow-x-auto w-full">
                 <div className="min-w-[600px] md:min-w-full">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="border-b border-slate-200">
                         <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Concepto</th>
                         <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center px-4">Cant.</th>
                         <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Precio Ud.</th>
                         <th className="py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total</th>
                        </tr>
                     </thead>
                     <tbody>
                       {activeQuote.items.map((item, idx) => (
                         <tr key={idx} className="border-b border-slate-100/50 group hover:bg-slate-50 transition-colors">
                           <td className="py-4 pr-4">
                             <p className="text-sm font-black text-slate-800">{item.name}</p>
                             {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                           </td>
                           <td className="py-4 text-center text-sm font-black text-slate-600 px-4">{item.qty}</td>
                           <td className="py-4 text-right text-sm font-bold text-slate-600">${Number(item.unit_price).toFixed(2)}</td>
                           <td className="py-4 text-right text-sm font-black text-indigo-600">${Number(item.total).toFixed(2)}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>

               {/* Totals & Conditions */}
               <div className="flex flex-col md:flex-row gap-8 justify-between pt-6">
                 <div className="flex-1 space-y-6">
                   {activeQuote.payment_terms && (
                     <div className="space-y-2">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Condiciones de Pago</h4>
                       <p className="text-xs font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl">{activeQuote.payment_terms}</p>
                     </div>
                   )}
                   {activeQuote.notes && (
                     <div className="space-y-2">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Notas del Profesional</h4>
                       <p className="text-xs font-medium text-slate-600 leading-relaxed">{activeQuote.notes}</p>
                     </div>
                   )}
                 </div>
                 
                 <div className="w-full md:w-64 space-y-3 bg-slate-50 p-6 rounded-3xl">
                   <div className="flex justify-between text-xs font-bold text-slate-500">
                     <span>Subtotal</span>
                     <span>${Number(activeQuote.subtotal).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-xs font-bold text-slate-500">
                     <span>Impuestos</span>
                     <span>${Number(activeQuote.tax_total).toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-lg md:text-xl font-black text-slate-800 pt-3 border-t border-slate-200">
                     <span>TOTAL</span>
                     <span className="text-indigo-600">${Number(activeQuote.total).toFixed(2)}</span>
                   </div>
                 </div>
               </div>
            </div>

            {/* CTA */}
            {activeQuote.status !== 'Aceptado' && (
              <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end print:hidden">
                <button 
                  onClick={() => handleAcceptQuote(activeQuote)} 
                  disabled={isAccepting}
                  className={cn(
                    "px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all text-sm w-full md:w-auto flex items-center justify-center gap-2",
                    isAccepting && "opacity-50 cursor-not-allowed scale-100"
                  )}
                >
                  {isAccepting ? <Loader2 className="animate-spin" size={18} /> : 'Firmar y Aceptar Propuesta'}
                </button>
              </div>
            )}
            {activeQuote.status === 'Aceptado' && (
              <div className="mt-8 p-6 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center gap-3 print:hidden">
                <ShieldCheck className="text-emerald-500" size={24} />
                <span className="text-emerald-700 font-black uppercase tracking-widest text-sm">Propuesta Aceptada</span>
              </div>
            )}
          </section>
        )}

        {/* Task Section */}
        {activeTab === 'roadmap' && (
          <section className="space-y-8">
            <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
              <CheckCircle2 size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-800">Checklist de Implementación</h2>
          </div>

          <div className="space-y-4">
            {portal.tasks.map((task, i) => (
              <div 
                key={task.id}
                onClick={() => handleToggleTask(task)}
                className={cn(
                  "group flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 p-4 md:p-6 bg-white border rounded-[2rem] cursor-pointer transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]",
                  task.is_completed ? "border-emerald-100 bg-emerald-50/20" : "border-slate-100 shadow-sm"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 shrink-0",
                  task.is_completed 
                    ? "bg-emerald-500 text-white rotate-[360deg] shadow-lg shadow-emerald-100" 
                    : "bg-slate-50 text-slate-200 border-2 border-slate-100 group-hover:border-indigo-300"
                )}>
                  {task.is_completed ? <Check size={20} strokeWidth={4} /> : (i + 1)}
                </div>
                
                <div className="flex-1">
                  <h3 className={cn(
                    "font-black text-base md:text-lg transition-all",
                    task.is_completed ? "text-slate-400 line-through" : "text-slate-800"
                  )}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs md:text-sm text-slate-400 mt-1">{task.description}</p>
                  )}
                </div>

                <div className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0",
                  task.is_completed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100"
                )}>
                  {task.is_completed ? 'Completado' : 'Marcar como hecho'}
                </div>
              </div>
            ))}

            {portal.tasks.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white">
                <Layout size={48} className="mx-auto mb-4 text-slate-200" />
                <p className="text-sm font-bold text-slate-400">Tu plan de trabajo se está preparando...</p>
              </div>
            )}
          </div>
        </section>
        )}

        {/* Resources Section */}
        {activeTab === 'roadmap' && portal.resources.length > 0 && (
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                <Files size={24} />
              </div>
              <h2 className="text-2xl font-black text-slate-800">Recursos y Documentación</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portal.resources.map(resource => (
                <a 
                  key={resource.id}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <ExternalLink size={20} />
                    </div>
                    <span className="font-black text-slate-700">{resource.title}</span>
                  </div>
                  <ArrowRight size={20} className="text-slate-200 group-hover:text-indigo-600 transition-all -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Support Footer */}
        <footer className="pt-20 pb-12 text-center space-y-4">
          <div className="w-12 h-px bg-slate-200 mx-auto" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
            Desarrollado por {professionalName} con Total Pro Lead Converter
          </p>
        </footer>
      </main>

      {/* Celebration Overlay */}
      {celebrate && (
        <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
          <div className="animate-bounce bg-white p-8 rounded-full shadow-2xl border-4 border-emerald-500">
            <Sparkles size={64} className="text-emerald-500" />
          </div>
        </div>
      )}
    </div>
  );
}