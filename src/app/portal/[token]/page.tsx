'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { ClientPortal, Contact, Document, PortalTask } from '@/lib/types';
import { 
  User, MapPin, Calendar, ShieldCheck, 
  ChevronRight, X, Loader2, FileText, 
  MessageSquare, Compass, Play, Gem,
  CheckCircle2, Circle, ChevronDown, ChevronUp, Download, Globe
} from 'lucide-react';
import Image from 'next/image';

// --- Funciones de ayuda ---
function getDaysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

// --- Componentes UI ---
function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#F9F8F6]">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse bg-stone-900 shadow-xl">
        <Gem size={28} className="text-amber-500" />
      </div>
      <div className="text-center">
        <p className="font-serif text-xl tracking-widest uppercase text-stone-900 mb-2">The Singular Choice</p>
        <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">Preparando su experiencia...</p>
      </div>
    </div>
  );
}

function NotFoundScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 text-center bg-[#F9F8F6]">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-rose-50 border border-rose-100">
        <Gem size={28} className="text-rose-500" />
      </div>
      <div>
        <h1 className="font-serif text-3xl mb-2 text-stone-900">Acceso Restringido</h1>
        <p className="text-sm max-w-sm text-stone-500">
          El enlace no es válido o ha sido desactivado por seguridad. Contacte con su concierge privado.
        </p>
      </div>
    </div>
  );
}

export default function PortalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [portal, setPortal] = useState<ClientPortal | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const loadPortal = useCallback(async () => {
    if (!token) return;

    // Fetch portal by share_token
    const { data: portalData, error } = await supabase
      .from('client_portals')
      .select('*, tasks:portal_tasks(*), resources:portal_resources(*)')
      .eq('share_token', token)
      .eq('active', true)
      .single();

    if (error || !portalData) {
      setLoading(false);
      return;
    }

    setPortal(portalData as ClientPortal);

    // Fetch contact
    const { data: contactData } = await supabase
      .from('contacts')
      .select('name, email, phone, telegram_chat_id, lifestyle_prefs')
      .eq('id', portalData.contact_id)
      .single();

    if (contactData) setContact(contactData as Contact);

    // Fetch documents
    const { data: docsData } = await supabase
      .from('documents')
      .select('*')
      .eq('portal_id', portalData.id)
      .order('created_at', { ascending: false });

    setDocuments((docsData ?? []) as Document[]);

    // Log access
    await supabase.from('portal_activity').insert({
      portal_id: portalData.id,
      activity_type: 'portal_accessed',
      description: `Acceso desde token público`,
    });

    setLoading(false);
  }, [token]);

  useEffect(() => { loadPortal(); }, [loadPortal]);

  const handleDownload = async (doc: Document) => {
    try {
      const res = await fetch(`/api/documents/download/${doc.id}`);
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch {
      console.error('Error downloading document');
    }
  };

  if (loading) return <LoadingScreen />;
  if (!portal || !contact) return <NotFoundScreen />;

  const daysUntil = getDaysUntil(portal.travel_start);
  const sortedTasks = [...(portal.tasks || [])].sort((a, b) => a.task_order - b.task_order);
  const firstTaskImage = sortedTasks.find(t => t.image_url)?.image_url || 'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&q=80';

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans selection:bg-amber-100 overflow-x-hidden">
      
      {/* Navegación */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-stone-200 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <Gem className="text-amber-600 hidden md:block" size={20} />
              <span className="text-sm md:text-lg font-serif tracking-[0.2em] md:tracking-[0.3em] uppercase">The Singular Choice</span>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-amber-700">Miembro Exclusivo</p>
              <p className="text-xs font-bold text-stone-600">{contact.name}</p>
            </div>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
              <User size={16} className="text-stone-400" />
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 md:pt-32 pb-20 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
          
          {/* --- Columna Izquierda: Dashboard Central --- */}
          <div className="lg:col-span-8 space-y-8 md:space-y-12">
            
            {/* Cabecera */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-[1px] w-8 bg-amber-600"></span>
                <p className="text-amber-700 text-[9px] md:text-[10px] uppercase tracking-[0.4em] font-black italic">Operación Confidencial</p>
              </div>
              <h1 className="text-4xl md:text-6xl font-serif mb-4 tracking-tight break-words">Bienvenido, {contact.name.split(' ')[0]}</h1>
              <p className="text-stone-500 max-w-md text-sm leading-relaxed">
                Su próximo destino es <span className="text-stone-900 font-bold">{portal.destination || 'una aventura exclusiva'}</span>. 
                Todo está siendo orquestado minuciosamente para su llegada.
              </p>
            </section>

            {/* Hero Image / Countdown */}
            <div className="relative overflow-hidden rounded-[2rem] md:rounded-[3rem] bg-stone-900 text-white p-6 md:p-12 min-h-[300px] md:min-h-[400px] flex flex-col justify-between shadow-2xl group w-full">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-1000"
                style={{ backgroundImage: `url('${firstTaskImage}')` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/60 to-transparent"></div>
              
              <div className="relative z-10 w-full">
                <div className="flex justify-between items-start mb-8">
                  <span className="bg-white/10 backdrop-blur-md border border-white/20 px-3 md:px-4 py-1.5 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest">
                    {daysUntil === 0 ? 'En curso' : 'Preparación'}
                  </span>
                  {daysUntil !== null && (
                    <div className="text-right">
                      <p className="text-3xl md:text-5xl font-serif text-amber-400 leading-none">{daysUntil}</p>
                      <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-white/70">Días restantes</p>
                    </div>
                  )}
                </div>
                <h2 className="text-3xl md:text-5xl font-serif w-full max-w-full md:max-w-xl leading-tight mb-4 break-words">{portal.destination || 'Su Destino'}</h2>
                <div className="flex flex-wrap gap-4 md:gap-8 text-xs md:text-sm text-stone-300">
                  {portal.travel_start && <div className="flex items-center gap-2"><Calendar size={14} className="text-amber-500" /> {formatDate(portal.travel_start)}</div>}
                  <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-amber-500" /> Logística Privada</div>
                </div>
              </div>
            </div>

            {/* Narrativa IA (Motor de Emociones) */}
            {portal.mood_narrative && (
              <section className="bg-white border border-stone-200 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 lg:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Compass size={120} />
                </div>
                <div className="relative z-10 space-y-6 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <Gem size={16} className="text-amber-600" />
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-amber-800">Su Visión Exclusiva</span>
                  </div>
                  <p className="text-lg md:text-2xl font-serif leading-relaxed italic text-stone-800">
                    "{portal.mood_narrative}"
                  </p>
                  <div className="w-12 h-1 bg-amber-500/30 rounded-full"></div>
                </div>
              </section>
            )}

            {/* Roadmap / Itinerario Interactivo */}
            <section className="space-y-6 md:space-y-8">
               <div className="flex items-center justify-between">
                 <h3 className="text-2xl md:text-3xl font-serif italic text-stone-900">Roadmap Operativo</h3>
               </div>
               
               <div className="space-y-4">
                 {sortedTasks.map((task, idx) => {
                   const isExpanded = expandedTask === task.id;
                   const hasDetails = task.level2_logistics || task.level3_narrative || task.image_url;
                   
                   return (
                     <div key={task.id} className="bg-white border border-stone-200 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden transition-all hover:shadow-lg hover:border-amber-200 group">
                       <div 
                         className="flex items-center gap-4 p-4 md:p-6 cursor-pointer"
                         onClick={() => hasDetails && setExpandedTask(isExpanded ? null : task.id)}
                       >
                         <div className={`w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-2xl flex items-center justify-center font-bold text-xs md:text-sm transition-colors ${task.is_completed ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-400'}`}>
                           {task.is_completed ? <CheckCircle2 size={18} /> : idx + 1}
                         </div>
                         <div className="flex-1 min-w-0 pr-2">
                           <p className="font-serif text-base md:text-xl text-stone-900 truncate">{task.level1_title || task.title}</p>
                           {task.due_date && <p className="text-xs text-stone-500 mt-1 flex items-center gap-1"><Calendar size={12}/> {formatDate(task.due_date)}</p>}
                         </div>
                         {hasDetails && (
                           <div className="shrink-0 text-stone-300 group-hover:text-amber-600 transition-colors">
                             {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                           </div>
                         )}
                       </div>
                       
                       {/* Detalles Expandidos */}
                       {isExpanded && hasDetails && (
                         <div className="px-4 pb-4 md:px-6 md:pb-6 pt-2 border-t border-stone-100 bg-stone-50/50 animate-in fade-in slide-in-from-top-2">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mt-4">
                             <div className="space-y-4">
                               {task.level2_logistics && (
                                 <div>
                                   <p className="text-[9px] uppercase tracking-widest font-black text-stone-400 mb-2">Detalles Logísticos</p>
                                   <p className="text-sm text-stone-600 leading-relaxed">{task.level2_logistics}</p>
                                 </div>
                               )}
                               {task.level3_narrative && (
                                 <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                                   <p className="text-[9px] uppercase tracking-widest font-black text-amber-700 mb-2 flex items-center gap-1"><Gem size={10} /> The Singular Touch</p>
                                   <p className="font-serif text-sm italic text-stone-700">{task.level3_narrative}</p>
                                 </div>
                               )}
                             </div>
                             {task.image_url && (
                               <div className="h-40 md:h-auto min-h-[150px] relative rounded-2xl overflow-hidden shadow-inner">
                                 <img src={task.image_url} alt={task.title} className="absolute inset-0 w-full h-full object-cover" />
                               </div>
                             )}
                           </div>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
            </section>
          </div>

          {/* --- Columna Derecha: Bóveda y Concierge --- */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Box Concierge */}
            <div className="bg-stone-900 rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full blur-[80px] opacity-20 -mr-10 -mt-10"></div>
              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center border-2 border-amber-500/30">
                  <User size={24} className="text-amber-500" />
                </div>
                <div>
                  <h4 className="font-serif text-xl mb-1">Asistencia Global</h4>
                  <p className="text-xs text-stone-400">Su equipo de concierge está disponible 24/7 para cualquier modificación operativa.</p>
                </div>
                {contact.telegram_chat_id ? (
                  <a href={`https://t.me/${contact.telegram_chat_id}`} target="_blank" rel="noopener noreferrer" className="w-full mt-4 bg-amber-600 hover:bg-amber-500 text-white py-3 md:py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg">
                    <MessageSquare size={14} /> Contactar Privado
                  </a>
                ) : (
                  <button className="w-full mt-4 bg-stone-800 text-stone-500 py-3 md:py-4 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed border border-stone-700">
                    Canal Pendiente
                  </button>
                )}
              </div>
            </div>

            {/* Bóveda de Documentos */}
            <div className="bg-white border border-stone-200 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6 md:mb-8">
                <h5 className="font-serif text-xl md:text-2xl text-stone-900">Bóveda Digital</h5>
                <ShieldCheck size={24} className="text-emerald-500 opacity-80" />
              </div>
              
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleDownload(doc)}
                      className="flex items-center justify-between p-3 md:p-4 bg-stone-50 rounded-2xl border border-stone-100 hover:border-amber-400 hover:bg-amber-50/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 w-full pr-2">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-stone-400 group-hover:text-amber-600 transition-colors shrink-0">
                          <FileText size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-tight text-stone-800 truncate">{doc.name}</p>
                          <p className="text-[9px] text-stone-400 truncate">Encriptado AES-256 • {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : 'Doc'}</p>
                        </div>
                      </div>
                      <Download size={16} className="text-stone-300 group-hover:text-amber-600 transition-colors shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <ShieldCheck size={24} className="mx-auto text-stone-300 mb-2" />
                  <p className="text-xs text-stone-500 font-medium">Su bóveda está vacía.</p>
                </div>
              )}
            </div>
            
            {/* Preparativos (Progress) */}
            {portal.preparation_steps && portal.preparation_steps.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-[2rem] p-6 md:p-8 shadow-sm">
                <h5 className="font-serif text-lg text-stone-900 mb-6">Status de Preparación</h5>
                <div className="space-y-4">
                  {portal.preparation_steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {step.done ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Circle size={16} className="text-stone-300 shrink-0" />
                      )}
                      <span className={`text-sm ${step.done ? 'text-stone-800 font-medium' : 'text-stone-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      <footer className="border-t border-stone-200 py-12 md:py-20 px-6 bg-white mt-12 md:mt-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-8 md:gap-12">
          <div className="max-w-sm text-center md:text-left">
            <span className="text-lg md:text-xl font-serif tracking-[0.3em] uppercase mb-4 md:mb-6 block text-stone-900">The Singular Choice</span>
            <p className="text-stone-400 text-xs md:text-sm leading-relaxed italic">
              "El lujo no es lo que tienes, es cómo lo experimentas. Aseguramos que cada segundo sea una obra maestra."
            </p>
          </div>
          <div className="text-center md:text-right space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Plataforma Asegurada</p>
            <p className="text-xs text-stone-300">Conexión Privada Encriptada P2P</p>
          </div>
        </div>
      </footer>
    </div>
  );
}