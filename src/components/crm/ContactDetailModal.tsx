'use client';

import { useState, useEffect } from 'react';
import { X, Save, Mail, Sparkles, Download, Clock, FileText, Check, Loader2, Calendar, Phone, Send, Receipt, Share2, Copy, MessageSquarePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusBadge, QuoteStatusBadge } from '@/components/ui/StatusComponents';
import { cn, fetchAI, extractJSON } from '@/lib/utils';
import type { Contact, EmailRecord, ContactNote, CalendarEvent, ContactStatus, ClientPortal, PortalTask, PortalResource } from '@/lib/types';
import ScheduleModal from '../calendar/ScheduleModal';
import PhoneCallModal from './PhoneCallModal';
import QuickEmailModal from './QuickEmailModal';
import QuoteBuilderModal from './QuoteBuilderModal';
import { usePortals } from '@/hooks/usePortals';

interface ContactDetailModalProps {
  contactId: string;
  onClose: () => void;
  onUpdate: (contact: Contact) => void;
  addCalendarEvent?: (event: CalendarEvent) => void;
}

export default function ContactDetailModal({ contactId, onClose, onUpdate, addCalendarEvent }: ContactDetailModalProps) {
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedQuoteForEdit, setSelectedQuoteForEdit] = useState<any>(null);
  const [selectedQuoteForEmail, setSelectedQuoteForEmail] = useState<any>(null);

  const [hasMoreActivity, setHasMoreActivity] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [activeTab, setActiveTab] = useState<'activity' | 'portal' | 'quotes'>('activity');
  const [exportMode, setExportMode] = useState<'short' | 'full'>('short');
  const [portal, setPortal] = useState<(ClientPortal & { tasks: PortalTask[], resources: PortalResource[] }) | null>(null);
  const [strategyAdvice, setStrategyAdvice] = useState<{ reasoning: string, tasks: string[], resources: string[] } | null>(null);
  const [portalActivities, setPortalActivities] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingResourceTitle, setEditingResourceTitle] = useState('');
  const [editingResourceUrl, setEditingResourceUrl] = useState('');
  const [newActivityDescription, setNewActivityDescription] = useState('');
  const [newActivityType, setNewActivityType] = useState<'comment' | 'task_completed' | 'resource_viewed' | 'portal_accessed' | 'quote_accepted'>('comment');
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityDescription, setEditingActivityDescription] = useState('');
  const [editingActivityType, setEditingActivityType] = useState<'comment' | 'task_completed' | 'resource_viewed' | 'portal_accessed' | 'quote_accepted'>('comment');
  const [editingTimelineKey, setEditingTimelineKey] = useState<string | null>(null);
  const [editingTimelineValue, setEditingTimelineValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editingTaskImageUrl, setEditingTaskImageUrl] = useState('');
  const [editingPortalDestination, setEditingPortalDestination] = useState('');
  const [editingPortalNarrative, setEditingPortalNarrative] = useState('');
  const { getPortalByContactId, activatePortal, saveTask, saveResource, deleteResource } = usePortals();

  useEffect(() => {
    async function loadContact() {
      // Saneamiento de la ID para evitar el Error 400
      const sanitizedId = contactId.replace(/\s/g, '').split(':')[0];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', sanitizedId)
        .single();

      if (data) {
        // Carga "Lazy" (limitada) de historial para evitar saturación de memoria en el cliente
        // Solo traemos los últimos 10 elementos de cada tabla para el modal inicial
        const [{ data: notes }, { data: emails }, { data: events }, { data: quotes }] = await Promise.all([
          supabase.from('contact_notes').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }).limit(10),
          supabase.from('email_history').select('*').eq('contact_id', contactId).order('sent_at', { ascending: false }).limit(10),
          supabase.from('calendar_events').select('*').eq('contact_id', contactId).order('start_time', { ascending: false }).limit(10),
          supabase.from('quotes').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }), // Quotes sí las traemos todas por ahora
        ]);

        const fullContact: Contact = {
          ...data,
          notes: (notes ?? []) as ContactNote[],
          emailHistory: (emails ?? []) as EmailRecord[],
          events: (events ?? []) as CalendarEvent[],
          quotes: (quotes ?? []) as any[],
        };
        setContact(fullContact);
        setTempNotes(data.notes_text ?? '');
        setEditName(data.name);
        setEditEmail(data.email);
        setEditPhone(data.phone ?? '');

        // Lógica corregida: Si alguna de las consultas llegó al límite de 10, es probable que haya más
        const hasMore = (notes?.length === 10) || (emails?.length === 10) || (events?.length === 10);
        setHasMoreActivity(hasMore);

        const portalData = await getPortalByContactId(contactId);
        if (portalData) {
          setPortal({ ...portalData, tasks: [], resources: [] });
          setEditingPortalDestination(portalData.destination || '');
          setEditingPortalNarrative(portalData.mood_narrative || '');
        }
      }
      setLoading(false);
    }
    loadContact();

    // Real-time subscription for quote updates
    const quotesChannel = supabase
      .channel('quote-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: `contact_id=eq.${contactId}`
        },
        (payload) => {
          setContact(prev => {
            if (!prev) return prev;
            const updatedQuotes = prev.quotes?.map(q => q.id === payload.new.id ? { ...q, ...payload.new } : q);
            return { ...prev, quotes: updatedQuotes };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contacts',
          filter: `id=eq.${contactId.replace(/\s/g, '').split(':')[0]}`
        },
        (payload) => {
          setContact(prev => {
            if (!prev) return prev;
            return { ...prev, ...payload.new };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(quotesChannel);
    };
  }, [contactId]);

  useEffect(() => {
    const loadPortalActivity = async () => {
      if (!portal) return;
      const { data, error } = await supabase
        .from('portal_activity')
        .select('*')
        .eq('portal_id', portal.id)
        .order('created_at', { ascending: false });
      if (!error) setPortalActivities(data ?? []);
    };
    loadPortalActivity();
  }, [portal?.id]);

  const timelineEvents = [
    ...(contact?.notes?.map(n => ({ type: 'ai', date: new Date(n.created_at || ''), data: n })) || []),
    ...(contact?.emailHistory?.map(e => ({ type: 'email', date: new Date(e.sent_at || ''), data: e })) || []),
    ...(contact?.events?.map(ev => ({ type: 'calendar', date: new Date(ev.start_time), data: ev })) || []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const formatDate = (value?: string) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('es-ES');
  };

  const leadExportBase = () => {
    if (!contact) return { plainText: '', markdown: '', safeName: 'lead' };
    const notes = contact.notes ?? [];
    const emails = contact.emailHistory ?? [];
    const events = contact.events ?? [];
    const quotes = contact.quotes ?? [];
    const safeName = contact.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') || 'lead';

    const plainText = [
      `LEAD: ${contact.name}`,
      `Estado: ${contact.status}`,
      `Email: ${contact.email}`,
      `Telefono: ${contact.phone || 'N/A'}`,
      `Ultima interaccion: ${String(contact.last_interaction || 'N/A')}`,
      '',
      'RESUMEN AI',
      contact.summary_ai || 'Sin resumen.',
      '',
      'NOTAS INTERNAS',
      contact.notes_text || 'Sin notas internas.',
      '',
      `ANALISIS/NOTAS AI (${notes.length})`,
      ...(notes.length
        ? notes.slice(0, 20).map((n, i) => `${i + 1}. [${formatDate(n.created_at)}] ${n.reasoning || 'Sin contenido'}`)
        : ['Sin analisis AI.']),
      '',
      `EMAILS (${emails.length})`,
      ...(emails.length
        ? emails.slice(0, 20).map((e, i) => `${i + 1}. [${formatDate(e.sent_at)}] ${e.subject || 'Sin asunto'}`)
        : ['Sin emails.']),
      '',
      `EVENTOS/CITAS (${events.length})`,
      ...(events.length
        ? events.slice(0, 20).map((ev, i) => `${i + 1}. [${formatDate(ev.start_time)}] ${ev.title || 'Sin titulo'}`)
        : ['Sin eventos.']),
      '',
      `COTIZACIONES (${quotes.length})`,
      ...(quotes.length
        ? quotes.map((q: any, i: number) => `${i + 1}. ${q.quote_number || q.id} | Estado: ${q.status} | Total: ${q.total ?? 'N/A'}`)
        : ['Sin cotizaciones.']),
    ].join('\n');

    const markdown = [
      `# Lead: ${contact.name}`,
      '',
      `- **Estado:** ${contact.status}`,
      `- **Email:** ${contact.email}`,
      `- **Telefono:** ${contact.phone || 'N/A'}`,
      `- **Ultima interaccion:** ${String(contact.last_interaction || 'N/A')}`,
      '',
      '## Resumen AI',
      contact.summary_ai || 'Sin resumen.',
      '',
      '## Notas Internas',
      contact.notes_text || 'Sin notas internas.',
      '',
      `## Analisis/Notas AI (${notes.length})`,
      ...(notes.length
        ? notes.slice(0, 20).map((n, i) => `${i + 1}. **${formatDate(n.created_at)}** - ${n.reasoning || 'Sin contenido'}`)
        : ['Sin analisis AI.']),
      '',
      `## Emails (${emails.length})`,
      ...(emails.length
        ? emails.slice(0, 20).map((e, i) => `${i + 1}. **${formatDate(e.sent_at)}** - ${e.subject || 'Sin asunto'}`)
        : ['Sin emails.']),
      '',
      `## Eventos/Citas (${events.length})`,
      ...(events.length
        ? events.slice(0, 20).map((ev, i) => `${i + 1}. **${formatDate(ev.start_time)}** - ${ev.title || 'Sin titulo'}`)
        : ['Sin eventos.']),
      '',
      `## Cotizaciones (${quotes.length})`,
      ...(quotes.length
        ? quotes.map((q: any, i: number) => `${i + 1}. **${q.quote_number || q.id}** - Estado: ${q.status} - Total: ${q.total ?? 'N/A'}`)
        : ['Sin cotizaciones.']),
    ].join('\n');

    return { plainText, markdown, safeName };
  };

  const leadExportShort = () => {
    if (!contact) return { plainText: '', markdown: '', safeName: 'lead' };
    const lastNote = contact.notes?.[0];
    const safeName = contact.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') || 'lead';

    const plainText = [
      `LEAD: ${contact.name}`,
      `Estado: ${contact.status}`,
      `Email: ${contact.email}`,
      `Telefono: ${contact.phone || 'N/A'}`,
      '',
      'RESUMEN RAPIDO',
      contact.summary_ai || 'Sin resumen AI.',
      '',
      'ULTIMO INSIGHT AI',
      lastNote?.reasoning || 'Sin analisis reciente.',
      '',
      'SIGUIENTE PASO SUGERIDO',
      lastNote?.next_steps?.[0] || 'Agendar seguimiento.',
    ].join('\n');

    const markdown = [
      `# Lead: ${contact.name}`,
      '',
      `- **Estado:** ${contact.status}`,
      `- **Email:** ${contact.email}`,
      `- **Telefono:** ${contact.phone || 'N/A'}`,
      '',
      '## Resumen rapido',
      contact.summary_ai || 'Sin resumen AI.',
      '',
      '## Ultimo insight AI',
      lastNote?.reasoning || 'Sin analisis reciente.',
      '',
      '## Siguiente paso sugerido',
      lastNote?.next_steps?.[0] || 'Agendar seguimiento.',
    ].join('\n');

    return { plainText, markdown, safeName };
  };

  const getExportPayload = () => (exportMode === 'short' ? leadExportShort() : leadExportBase());

  const downloadFile = (content: string, filename: string, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadLeadTxt = () => {
    const { plainText, safeName } = getExportPayload();
    const suffix = exportMode === 'short' ? 'resumen' : 'completo';
    downloadFile(plainText, `lead-${safeName}-${suffix}.txt`);
  };

  const handleDownloadLeadMd = () => {
    const { markdown, safeName } = getExportPayload();
    const suffix = exportMode === 'short' ? 'resumen' : 'completo';
    downloadFile(markdown, `lead-${safeName}-${suffix}.md`, 'text/markdown;charset=utf-8');
  };

  const handleCopyLead = async () => {
    const { plainText } = getExportPayload();
    try {
      await navigator.clipboard.writeText(plainText);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (e) {
      console.error('No se pudo copiar al portapapeles:', e);
      alert('No se pudo copiar. Prueba con descargar el archivo.');
    }
  };

  const handleShareLead = async () => {
    const { plainText } = getExportPayload();
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Lead ${contact?.name ?? ''}`,
          text: plainText,
        });
      } else {
        await navigator.clipboard.writeText(plainText);
        alert('Tu navegador no soporta compartir directo. Copiado al portapapeles.');
      }
    } catch (e) {
      console.error('No se pudo compartir:', e);
    }
  };

  const handleShareWhatsApp = () => {
    const { plainText } = getExportPayload();
    const encoded = encodeURIComponent(plainText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareEmail = () => {
    const { plainText } = getExportPayload();
    const subject = encodeURIComponent(`Seguimiento Lead: ${contact?.name ?? ''}`);
    const body = encodeURIComponent(plainText);
    window.location.href = `mailto:${contact?.email || ''}?subject=${subject}&body=${body}`;
  };

  const handleSaveProfile = async () => {
    if (!contact) return;
    setSaving(true);
    const { error } = await supabase.from('contacts').update({ name: editName, email: editEmail, phone: editPhone }).eq('id', contact.id);
    if (!error) {
      setContact({ ...contact, name: editName, email: editEmail, phone: editPhone });
      onUpdate({ ...contact, name: editName, email: editEmail, phone: editPhone });
      setIsEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    if (!contact) return;
    if ((contact.notes_text || '') === tempNotes) return;
    setSaving(true);
    const { error } = await supabase.from('contacts').update({ notes_text: tempNotes }).eq('id', contact.id);
    if (!error) {
      setContact({ ...contact, notes_text: tempNotes });
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleAIAnalysis = async () => {
    if (!contact) return;
    setIsAnalyzing(true);
    const pastNotes = contact.notes?.map(n => `- ${n.reasoning}`).join('\n') || 'Sin notas previas.';
    const systemPrompt = `Actúa como un experto analista CRM. 
    Tu objetivo es analizar la evolución del lead basándote en la nueva nota y el historial.
    IMPORTANTE sobre el estado ('suggestedStatus'):
    - Estados disponibles: 'Lead Frío', 'Llamada Agendada', 'Cliente Potencial', 'Cliente Activo'.
    - NUNCA bajes el nivel de un lead (ej: de 'Cliente Potencial' a 'Lead Frío') a menos que el cliente haya expresado desinterés total.
    - Si no hay cambios claros, mantén el estado actual.
    
    Tu respuesta debe ser ÚNICAMENTE un objeto JSON puro y válido: {
      "keyPoints": [], 
      "nextSteps": [], 
      "suggestedStatus": "", 
      "reasoning": "", 
      "updatedSummary": "",
      "sentimentScore": 0.5,
      "aiHealthScore": 75
    }
    
    * sentimentScore: Número entre -1 (muy negativo) y 1 (muy positivo).
    * aiHealthScore: Número entre 0 (lead muerto) y 100 (cierre inminente).`;
    
    const userContext = `Lead: ${contact.name}
    Estado Actual: ${contact.status}
    Resumen previo: ${contact.summary_ai}
    Notas previas:
    ${pastNotes}
    Nueva nota:
    ${tempNotes}`;

    try {
      const rawRes = await fetchAI(userContext, systemPrompt);
      const parsed = extractJSON<any>(rawRes);
      
      // Validar estado sugerido y blindar contra regresión de etapa.
      const validStatuses = ['Lead Frío', 'Llamada Agendada', 'Cliente Potencial', 'Cliente Activo'];
      const statusRank: Record<string, number> = {
        'Lead Frío': 1,
        'Llamada Agendada': 2,
        'Cliente Potencial': 3,
        'Cliente Activo': 4,
      };
      const suggestedStatus = (parsed.suggestedStatus && validStatuses.includes(parsed.suggestedStatus))
        ? parsed.suggestedStatus
        : contact.status;
      const currentRank = statusRank[contact.status] ?? 1;
      const suggestedRank = statusRank[suggestedStatus] ?? currentRank;
      const finalStatus = suggestedRank >= currentRank ? suggestedStatus : contact.status;

      const { data: newNote } = await supabase.from('contact_notes').insert({ 
         contact_id: contact.id, 
         key_points: parsed.keyPoints, 
         next_steps: parsed.nextSteps, 
         suggested_status: finalStatus, 
         reasoning: parsed.reasoning,
         sentiment_score: parsed.sentimentScore || 0,
         ai_health_score: parsed.aiHealthScore || 50
       }).select().single();

      if (newNote) {
        // Ejecutar actualización de perfil en segundo plano sin esperar (Fire and forget)
        supabase.from('contacts').update({ 
          summary_ai: parsed.updatedSummary, 
          status: finalStatus 
        }).eq('id', contact.id).then(({ error }) => {
          if (error) console.error('Error actualizando contacto en background:', error);
        });

        const updated = { 
          ...contact, 
          summary_ai: parsed.updatedSummary, 
          status: finalStatus as ContactStatus, 
          notes: [newNote as ContactNote, ...(contact.notes || [])] 
        };
        setContact(updated);
        onUpdate(updated);
        
        // Notificación no bloqueante
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 3000);
      }
    } catch (e: any) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Error al consolidar la memoria.');
    } finally { 
      setIsAnalyzing(false); 
      // Si la UI está cerrada o el usuario cambió de pestaña, el estado local ya se actualizó
    }
  };

  const handleAIStrategyAdvice = async () => {
    if (!contact || !portal) return;
    setIsAnalyzing(true);
    const historyText = timelineEvents.slice(0, 10).map(ev => `[${ev.date.toLocaleDateString()}] ${ev.type}: ${ev.type === 'ai' ? (ev.data as any).reasoning : (ev.data as any).subject || (ev.data as any).title}`).join('\n');
    const existingTasks = portal.tasks.map(t => t.title).join(', ');
    const prompt = `Actúa como Estratega de Customer Success. Historial: ${historyText}\nResumen: ${contact.summary_ai}\nPortal actual: ${existingTasks}\nSugiere 3 tareas nuevas y 2 recursos en JSON EXCLUSIVO: {"tasks": [], "resources": [], "reasoning": ""}. No uses bloques de código markdown.`;
    try {
      const raw = await fetchAI(prompt, 'Estratega Omnisciente. Responde ÚNICAMENTE con el objeto JSON válido.');
      const data = extractJSON<any>(raw);
      const normalizeItem = (item: any) => {
        const fromObject = (obj: any) =>
          String(
            obj?.description ||
            obj?.nombre ||
            obj?.title ||
            obj?.name ||
            obj?.text ||
            obj?.task ||
            ''
          ).trim();

        if (typeof item === 'string') {
          const cleaned = item.replace(/^\s*[\+\-\*\d\.\)]\s*/, '').trim();
          if ((cleaned.startsWith('{') && cleaned.endsWith('}')) || (cleaned.startsWith('[') && cleaned.endsWith(']'))) {
            try {
              const parsed = JSON.parse(cleaned);
              if (Array.isArray(parsed)) {
                return parsed.map((p) => (typeof p === 'string' ? p : fromObject(p))).filter(Boolean).join(' | ');
              }
              if (parsed && typeof parsed === 'object') return fromObject(parsed) || cleaned;
            } catch {
              // Si no parsea, devolvemos limpio.
            }
          }
          return cleaned;
        }

        if (item && typeof item === 'object') {
          return fromObject(item) || '';
        }

        return String(item ?? '').trim();
      };
      const normalized = {
        reasoning: typeof data?.reasoning === 'string' ? data.reasoning : 'Sin razonamiento disponible.',
        tasks: Array.isArray(data?.tasks) ? data.tasks.map(normalizeItem).filter(Boolean) : [],
        resources: Array.isArray(data?.resources) ? data.resources.map(normalizeItem).filter(Boolean) : [],
      };
      setStrategyAdvice(normalized);
    } catch (e: any) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Error en la consultoría IA.');
    } finally { setIsAnalyzing(false); }
  };

  const handleActivatePortal = async () => {
    if (!contact) return;
    setSaving(true);
    const newPortal = await activatePortal(contact.id);
    if (newPortal) setPortal({ ...newPortal, tasks: [], resources: [] });
    setSaving(false);
  };

  const handleFileUpload = async (file: File) => {
    if (!portal) {
      alert("Debes activar el portal antes de subir documentos.");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('portal_id', portal.id);
      
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Error al subir documento');
      const data = await res.json();
      
      // Update portal activity
      await supabase.from('portal_activity').insert({
        portal_id: portal.id,
        activity_type: 'comment',
        description: `Documento subido: ${file.name}`
      });
      
      alert('Documento subido correctamente. El cliente podrá verlo en su Bóveda.');
      // Refresh portal activities to show it
      const { data: newActivity } = await supabase.from('portal_activity').select('*').eq('portal_id', portal.id).order('created_at', { ascending: false });
      if (newActivity) setPortalActivities(newActivity);
      
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddTask = async (title: string) => {
    if (!portal) return;
    const newTask = await saveTask({ portal_id: portal.id, title, is_completed: false });
    if (newTask) setPortal({ ...portal, tasks: [...portal.tasks, newTask] });
  };

  const handleUpdateTask = async (task: PortalTask, title: string, imageUrl?: string) => {
    if (!portal || !title.trim()) return;
    const updated = await saveTask({ ...task, title: title.trim(), image_url: imageUrl || null });
    if (updated) {
      setPortal({ ...portal, tasks: portal.tasks.map((t) => (t.id === updated.id ? updated : t)) });
      setEditingTaskId(null);
      setEditingTaskTitle('');
      setEditingTaskImageUrl('');
    }
  };

  const handleUpdatePortalSettings = async () => {
    if (!portal) return;
    setSaving(true);
    const { error } = await supabase.from('client_portals')
      .update({ destination: editingPortalDestination, mood_narrative: editingPortalNarrative })
      .eq('id', portal.id);
    if (!error) {
      setPortal({ ...portal, destination: editingPortalDestination, mood_narrative: editingPortalNarrative });
      alert('Ajustes del portal actualizados.');
    }
    setSaving(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!portal) return;
    if (!confirm('¿Eliminar esta tarea del roadmap?')) return;
    const { error } = await supabase.from('portal_tasks').delete().eq('id', taskId);
    if (!error) setPortal({ ...portal, tasks: portal.tasks.filter((t) => t.id !== taskId) });
  };

  const handleAddResource = async (title: string, url: string) => {
    if (!portal) return;
    const newRes = await saveResource({ portal_id: portal.id, title, url });
    if (newRes) setPortal({ ...portal, resources: [...portal.resources, newRes] });
  };

  const handleUpdateResource = async (resourceId: string, title: string, url: string) => {
    if (!portal || !title.trim() || !url.trim()) return;
    const { data, error } = await supabase
      .from('portal_resources')
      .update({ title: title.trim(), url: url.trim() })
      .eq('id', resourceId)
      .select()
      .single();
    if (!error && data) {
      setPortal({ ...portal, resources: portal.resources.map((r) => (r.id === resourceId ? data : r)) });
      setEditingResourceId(null);
      setEditingResourceTitle('');
      setEditingResourceUrl('');
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!portal) return;
    if (!confirm('¿Eliminar este material?')) return;
    const success = await deleteResource(resourceId);
    if (success) {
      setPortal({ ...portal, resources: portal.resources.filter((r) => r.id !== resourceId) });
    }
  };

  const handleToggleTask = async (task: PortalTask) => {
    if (!portal) return;
    const updated = await saveTask({ ...task, is_completed: !task.is_completed });
    if (updated) setPortal({ ...portal, tasks: portal.tasks.map(t => t.id === updated.id ? updated : t) });
  };

  const handleCreateActivity = async () => {
    if (!portal || !newActivityDescription.trim()) return;
    const { data, error } = await supabase
      .from('portal_activity')
      .insert({
        portal_id: portal.id,
        activity_type: newActivityType,
        description: newActivityDescription.trim(),
      })
      .select()
      .single();
    if (!error && data) {
      setPortalActivities((prev) => [data, ...prev]);
      setNewActivityDescription('');
      setNewActivityType('comment');
    }
  };

  const handleUpdateActivity = async (activityId: string, description: string, activityType: 'comment' | 'task_completed' | 'resource_viewed' | 'portal_accessed' | 'quote_accepted') => {
    if (!description.trim()) return;
    const { data, error } = await supabase
      .from('portal_activity')
      .update({ description: description.trim(), activity_type: activityType })
      .eq('id', activityId)
      .select()
      .single();
    if (!error && data) {
      setPortalActivities((prev) => prev.map((a) => (a.id === activityId ? data : a)));
      setEditingActivityId(null);
      setEditingActivityDescription('');
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('¿Eliminar esta actividad del historial?')) return;
    const { error } = await supabase.from('portal_activity').delete().eq('id', activityId);
    if (!error) setPortalActivities((prev) => prev.filter((a) => a.id !== activityId));
  };

  const beginTimelineEdit = (type: 'ai' | 'email' | 'calendar', item: any) => {
    const key = `${type}:${item.id}`;
    setEditingTimelineKey(key);
    const currentValue =
      type === 'ai' ? String(item.reasoning || '') :
      type === 'email' ? String(item.subject || '') :
      String(item.title || '');
    setEditingTimelineValue(currentValue);
  };

  const saveTimelineEdit = async (type: 'ai' | 'email' | 'calendar', item: any) => {
    if (!contact || !item?.id || !editingTimelineValue.trim()) return;
    const value = editingTimelineValue.trim();
    if (type === 'ai') {
      const { error } = await supabase.from('contact_notes').update({ reasoning: value }).eq('id', item.id);
      if (!error) setContact({ ...contact, notes: (contact.notes || []).map((n) => (n.id === item.id ? { ...n, reasoning: value } : n)) });
    } else if (type === 'email') {
      const { error } = await supabase.from('email_history').update({ subject: value }).eq('id', item.id);
      if (!error) setContact({ ...contact, emailHistory: (contact.emailHistory || []).map((e) => (e.id === item.id ? { ...e, subject: value } : e)) });
    } else {
      const { error } = await supabase.from('calendar_events').update({ title: value }).eq('id', item.id);
      if (!error) setContact({ ...contact, events: (contact.events || []).map((ev) => (ev.id === item.id ? { ...ev, title: value } : ev)) });
    }
    setEditingTimelineKey(null);
    setEditingTimelineValue('');
  };

  const deleteTimelineItem = async (type: 'ai' | 'email' | 'calendar', item: any) => {
    if (!contact || !item?.id) return;
    if (!confirm('¿Eliminar este registro del historial?')) return;
    if (type === 'ai') {
      const { error } = await supabase.from('contact_notes').delete().eq('id', item.id);
      if (!error) setContact({ ...contact, notes: (contact.notes || []).filter((n) => n.id !== item.id) });
    } else if (type === 'email') {
      const { error } = await supabase.from('email_history').delete().eq('id', item.id);
      if (!error) setContact({ ...contact, emailHistory: (contact.emailHistory || []).filter((e) => e.id !== item.id) });
    } else {
      const { error } = await supabase.from('calendar_events').delete().eq('id', item.id);
      if (!error) setContact({ ...contact, events: (contact.events || []).filter((ev) => ev.id !== item.id) });
    }
  };

  const handleLoadMoreActivity = async () => {
    if (!contact || loadingMore) return;
    setLoadingMore(true);
    
    try {
      // Cargamos el resto de elementos (sin el límite de 10)
      const [{ data: notes }, { data: emails }, { data: events }] = await Promise.all([
        supabase.from('contact_notes').select('*').eq('contact_id', contactId).order('created_at', { ascending: false }).range(10, 100),
        supabase.from('email_history').select('*').eq('contact_id', contactId).order('sent_at', { ascending: false }).range(10, 100),
        supabase.from('calendar_events').select('*').eq('contact_id', contactId).order('start_time', { ascending: false }).range(10, 100),
      ]);

      const updatedContact: Contact = {
        ...contact,
        notes: [...(contact.notes || []), ...(notes || [])] as ContactNote[],
        emailHistory: [...(contact.emailHistory || []), ...(emails || [])] as EmailRecord[],
        events: [...(contact.events || []), ...(events || [])] as CalendarEvent[],
      };
      
      setContact(updatedContact);
      setHasMoreActivity(false); // Por ahora cargamos hasta 100 más y asumimos que es suficiente
    } catch (e) {
      console.error('Error al cargar más actividad:', e);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) return <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70]"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  if (!contact) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4 lg:p-10 overflow-hidden animate-fade-in">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-full flex flex-col border border-white/20 overflow-hidden relative min-h-0">
        {/* Header */}
        <div className="px-4 py-4 md:px-8 md:py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shrink-0">
          <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
             <button onClick={onClose} className="p-2 rounded-xl border border-slate-200 hover:bg-indigo-50 text-slate-400 group transition-all"><X size={14} /></button>
             <div className="flex items-center gap-4 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">{contact.name.charAt(0).toUpperCase()}</div>
                {isEditing ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-400" htmlFor="edit-name">Nombre</label>
                      <input id="edit-name" name="name" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none px-3" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-400" htmlFor="edit-email">Email</label>
                      <input id="edit-email" name="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none px-3" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-400" htmlFor="edit-phone">Teléfono</label>
                      <input id="edit-phone" name="phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none px-3" placeholder="No registrado" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-lg font-black text-slate-800 leading-none">{contact.name}</h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap"><span className="text-[10px] text-slate-400 font-bold">{contact.email}</span><StatusBadge status={contact.status} /></div>
                  </div>
                )}
             </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleAIAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-100 hover:bg-purple-700 disabled:opacity-70"
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Compactar Memoria
            </button>
            {isEditing ? <button onClick={handleSaveProfile} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Guardar</button> : <button onClick={() => setIsEditing(true)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-500">Editar Perfil</button>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 px-4 pt-2 md:px-8 gap-1 border-b border-slate-100 shrink-0 overflow-x-auto">
          <button onClick={() => setActiveTab('activity')} className={cn("px-6 py-2.5 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'activity' ? "bg-white text-indigo-600 shadow-sm border-x border-t border-slate-100" : "text-slate-400")}>Actividad</button>
          <button onClick={() => setActiveTab('portal')} className={cn("px-6 py-2.5 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'portal' ? "bg-white text-amber-600 shadow-sm border-x border-t border-slate-100" : "text-slate-400")}>Portal VIP</button>
          <button onClick={() => setActiveTab('quotes')} className={cn("px-6 py-2.5 rounded-t-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap", activeTab === 'quotes' ? "bg-white text-emerald-600 shadow-sm border-x border-t border-slate-100" : "text-slate-400")}>Cotizaciones</button>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left sidebar */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50 p-4 md:p-6 overflow-y-auto space-y-6 min-h-0 max-h-[35vh] md:max-h-none">
             <section className="space-y-3">
               <div className="flex items-center justify-between flex-wrap gap-2">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><FileText size={12} className="inline mr-2" /> Notas Rápidas de Seguimiento</h4>
                 <button
                   onClick={handleSaveNotes}
                   disabled={saving || justSaved}
                   className={cn("px-3 py-1.5 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-60 transition-colors", justSaved ? "bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-700")}
                 >
                   {justSaved ? <><Check size={12} className="inline mr-1" /> Guardado</> : "Guardar"}
                 </button>
               </div>
               <p className="text-[11px] text-slate-500">
                 Úsalo para llamadas, correos, reuniones o cualquier avance comercial. Tip: <span className="font-bold">Ctrl/Cmd + Enter</span> para guardar rápido.
               </p>
               <div className="grid grid-cols-1 gap-2">
                 <button
                   type="button"
                   onClick={() => setTempNotes((prev) => `${prev ? `${prev}\n\n` : ''}Contexto: \nResultado: \nSiguiente paso: `)}
                   className="w-full py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:border-indigo-200 hover:text-indigo-600"
                 >
                   <MessageSquarePlus size={12} /> Insertar plantilla rápida
                 </button>
               </div>
               <textarea
                 value={tempNotes}
                 onChange={(e) => setTempNotes(e.target.value)}
                 onBlur={handleSaveNotes}
                 onKeyDown={(e) => {
                   if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                     e.preventDefault();
                     handleSaveNotes();
                   }
                 }}
                 placeholder="Ejemplo: Email enviado con propuesta de 2 opciones. Cliente responde interés parcial. Próximo paso: seguimiento mañana 10:00."
                 className="w-full h-44 p-4 bg-white border border-slate-200 rounded-2xl text-xs outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 text-slate-900"
               />
               {tempNotes.trim().length === 0 && (
                 <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                   <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                     Consejo: guardar notas de cada interacción mejora seguimiento y calidad de IA.
                   </p>
                 </div>
               )}
             </section>
             <div className="h-px bg-slate-200" />
             <section className="space-y-3">
                <button onClick={() => setIsQuoteModalOpen(true)} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg hover:brightness-110"><FileText size={14} /> Nueva Cotización</button>
                <button onClick={() => setIsEmailModalOpen(true)} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg hover:brightness-110"><Mail size={14} /> Redactar Email</button>
                <button onClick={() => setIsPhoneModalOpen(true)} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Phone size={14} /> Llamar</button>
                <button onClick={() => setIsScheduleModalOpen(true)} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Calendar size={14} /> Agendar Cita</button>
                <div className="rounded-2xl border border-slate-200 bg-white p-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 pb-2">Modo de exportación</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportMode('short')}
                      className={cn(
                        "w-full py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                        exportMode === 'short' ? "bg-indigo-600 text-white" : "bg-slate-50 border border-slate-200 text-slate-500"
                      )}
                    >
                      Resumen
                    </button>
                    <button
                      onClick={() => setExportMode('full')}
                      className={cn(
                        "w-full py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                        exportMode === 'full' ? "bg-indigo-600 text-white" : "bg-slate-50 border border-slate-200 text-slate-500"
                      )}
                    >
                      Completo
                    </button>
                  </div>
                </div>
                <div className="pt-1 grid grid-cols-2 gap-2">
                  <button onClick={handleShareWhatsApp} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Send size={13} /> WhatsApp</button>
                  <button onClick={handleShareEmail} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Mail size={13} /> Email</button>
                  <button onClick={handleShareLead} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Share2 size={13} /> Compartir</button>
                  <button onClick={handleCopyLead} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Copy size={13} /> Copiar</button>
                  <button onClick={handleDownloadLeadTxt} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Download size={13} /> TXT</button>
                  <button onClick={handleDownloadLeadMd} className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"><Download size={13} /> MD</button>
                </div>
             </section>
          </div>

          {/* Right content area */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-white">
             {activeTab === 'activity' ? (
               <div className="p-4 md:p-10 space-y-10 min-w-[400px] md:min-w-0">
                 {contact.summary_ai && <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] text-white shadow-xl"><h4 className="text-[10px] font-black opacity-70 uppercase tracking-widest mb-3">Contexto ProInsight AI</h4><p className="text-sm leading-relaxed">{contact.summary_ai}</p></div>}
                 <div className="space-y-8 relative">
                   <div className="absolute left-[17px] top-0 bottom-0 w-px bg-slate-100" />
                   {timelineEvents.map((ev, i) => (
                     <div key={i} className="flex gap-8 relative animate-fade-in group">
                       <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center z-10 shrink-0 border-2 border-white shadow-md", ev.type === 'ai' ? "bg-purple-100 text-purple-600" : ev.type === 'email' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600")}>{ev.type === 'ai' ? <Sparkles size={16} /> : ev.type === 'email' ? <Mail size={16} /> : <Calendar size={16} />}</div>
                       <div className="flex-1 bg-white border border-slate-100 p-4 md:p-6 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all">
                         <div className="flex justify-between mb-2 flex-wrap gap-2"><span className="text-[10px] font-black uppercase text-slate-400">{ev.type}</span><span className="text-[10px] text-slate-300">{ev.date.toLocaleDateString()}</span></div>
                        {editingTimelineKey === `${ev.type}:${(ev.data as any).id}` ? (
                          <div className="space-y-2">
                            <input
                              id={`timeline-edit-${ev.type}-${(ev.data as any).id}`}
                              name={`timelineEdit-${ev.type}-${(ev.data as any).id}`}
                              value={editingTimelineValue}
                              onChange={(e) => setEditingTimelineValue(e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                            />
                            <div className="flex justify-end gap-3">
                              <button onClick={() => saveTimelineEdit(ev.type as any, ev.data)} className="text-[10px] font-black text-emerald-600 uppercase">Guardar</button>
                              <button onClick={() => { setEditingTimelineKey(null); setEditingTimelineValue(''); }} className="text-[10px] font-black text-slate-500 uppercase">Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-slate-700">{ev.type === 'ai' ? (ev.data as any).reasoning : (ev.data as any).subject || (ev.data as any).title}</p>
                            {!!(ev.data as any).id && (
                              <div className="mt-3 flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => beginTimelineEdit(ev.type as any, ev.data)} className="text-[10px] font-black text-indigo-500 uppercase">Editar</button>
                                <button onClick={() => deleteTimelineItem(ev.type as any, ev.data)} className="text-[10px] font-black text-rose-500 uppercase">Borrar</button>
                              </div>
                            )}
                          </>
                        )}
                       </div>
                     </div>
                   ))}
                   
                   {hasMoreActivity && (
                     <div className="flex justify-center pt-4">
                       <button 
                         onClick={handleLoadMoreActivity}
                         disabled={loadingMore}
                         className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-100 transition-all flex items-center gap-2 shadow-sm"
                       >
                         {loadingMore ? (
                           <>
                             <Loader2 size={14} className="animate-spin" />
                             Cargando Historial...
                           </>
                         ) : (
                           <>
                             <Clock size={14} />
                             Cargar Actividad Antigua
                           </>
                         )}
                       </button>
                     </div>
                   )}
                  </div>
               </div>
             ) : activeTab === 'portal' ? (
              <div className="p-4 md:p-10 space-y-8 animate-fade-in min-w-[400px] md:min-w-0">
                 {!portal ? (
                   <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                     <Sparkles size={32} className="mx-auto mb-4 text-indigo-400" />
                     <h3 className="text-xl font-black text-slate-800">Activar Portal de Estrategia</h3>
                     <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto">Comparte un espacio de trabajo con este lead.</p>
                     <button onClick={handleActivatePortal} className="px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-indigo-700">Activar</button>
                   </div>
                 ) : (
                   <div className="space-y-8">
                     <div className="p-4 md:p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
                        <div>
                          <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Link de Acceso</p>
                          <a
                            href={`/portal/${portal.share_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono text-amber-400 select-all hover:text-amber-300 underline underline-offset-4 break-all"
                          >
                            /portal/{portal.share_token}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                          <a
                            href={`/portal/${portal.share_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all text-amber-50"
                          >
                            Abrir Portal
                          </a>
                          <button onClick={handleAIStrategyAdvice} className="px-6 py-3 bg-amber-600 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-amber-500 shadow-lg text-white"><Sparkles size={14} /> Estrategia Inteligente</button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Configuración del Portal */}
                        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sparkles size={14} /> The Singular Choice (Hero)</h4>
                           <div>
                             <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Destino (Hero Label)</label>
                             <input value={editingPortalDestination} onChange={e => setEditingPortalDestination(e.target.value)} placeholder="Ej: Desierto de Atacama" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                           </div>
                           <div>
                             <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Mood Narrative (IA)</label>
                             <textarea value={editingPortalNarrative} onChange={e => setEditingPortalNarrative(e.target.value)} placeholder="Narrativa de la experiencia..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm h-24 resize-none" />
                           </div>
                           <button onClick={handleUpdatePortalSettings} disabled={saving} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50">Guardar Ajustes</button>
                        </div>

                        {/* Bóveda Digital Upload */}
                        <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Download size={14} /> Subir a Bóveda Digital</h4>
                           <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors relative">
                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]) }} />
                              {isUploading ? (
                                <>
                                  <Loader2 size={24} className="text-amber-500 animate-spin mb-2" />
                                  <p className="text-sm font-bold text-slate-700">Subiendo...</p>
                                </>
                              ) : (
                                <>
                                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-3"><Download size={18} /></div>
                                  <p className="text-sm font-bold text-slate-700">Arrastra archivos aquí o haz clic</p>
                                  <p className="text-xs text-slate-400 mt-1">PDFs, Billetes, Imágenes para el cliente</p>
                                </>
                              )}
                           </div>
                        </div>
                     </div>
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial de Actividad (editable)</h4>
                    <div className="flex flex-col md:flex-row gap-2">
                      <select
                        id="new-activity-type"
                        name="newActivityType"
                        value={newActivityType}
                        onChange={(e) => setNewActivityType(e.target.value as any)}
                        className="p-3 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                      >
                        <option value="comment">Comentario</option>
                        <option value="task_completed">Tarea completada</option>
                        <option value="resource_viewed">Recurso visto</option>
                        <option value="portal_accessed">Portal accedido</option>
                        <option value="quote_accepted">Cotización aceptada</option>
                      </select>
                      <input
                        id="new-activity-description"
                        name="newActivityDescription"
                        value={newActivityDescription}
                        onChange={(e) => setNewActivityDescription(e.target.value)}
                        placeholder="Nueva actividad..."
                        className="flex-1 p-3 border border-slate-200 rounded-xl text-sm"
                      />
                      <button onClick={handleCreateActivity} className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Añadir</button>
                    </div>
                    <div className="space-y-2">
                      {portalActivities.map((act) => (
                        <div key={act.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <div className="flex flex-col md:flex-row items-start justify-between gap-3">
                            <div className="flex-1 w-full">
                              {editingActivityId === act.id ? (
                                <div className="space-y-2">
                                  <select
                                    id={`edit-activity-type-${act.id}`}
                                    name={`editActivityType-${act.id}`}
                                    value={editingActivityType}
                                    onChange={(e) => setEditingActivityType(e.target.value as any)}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold"
                                  >
                                    <option value="comment">Comentario</option>
                                    <option value="task_completed">Tarea completada</option>
                                    <option value="resource_viewed">Recurso visto</option>
                                    <option value="portal_accessed">Portal accedido</option>
                                    <option value="quote_accepted">Cotización aceptada</option>
                                  </select>
                                  <input
                                    id={`edit-activity-desc-${act.id}`}
                                    name={`editActivityDescription-${act.id}`}
                                    value={editingActivityDescription}
                                    onChange={(e) => setEditingActivityDescription(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                  />
                                </div>
                              ) : (
                                <p className="text-sm font-bold text-slate-700">{act.description || 'Sin descripción'}</p>
                              )}
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                {String(act.activity_type).replace('_', ' ')} · {act.created_at ? new Date(act.created_at).toLocaleString('es-ES') : 'sin fecha'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {editingActivityId === act.id ? (
                                <button onClick={() => handleUpdateActivity(act.id, editingActivityDescription, editingActivityType)} className="text-[10px] font-black text-emerald-600 uppercase">Guardar</button>
                              ) : (
                                <button onClick={() => { setEditingActivityId(act.id); setEditingActivityDescription(act.description || ''); setEditingActivityType((act.activity_type || 'comment') as any); }} className="text-[10px] font-black text-indigo-500 uppercase">Editar</button>
                              )}
                              <button onClick={() => handleDeleteActivity(act.id)} className="text-[10px] font-black text-rose-500 uppercase">Borrar</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {portalActivities.length === 0 && (
                        <p className="text-sm text-slate-400">Sin actividad registrada aún.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-800">
                        <section className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Check size={14} /> Roadmap</h4>
                           <div className="flex flex-col sm:flex-row gap-2">
                             <input
                               value={newTaskTitle}
                               onChange={(e) => setNewTaskTitle(e.target.value)}
                               placeholder="Nueva tarea..."
                               className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm"
                             />
                             <button
                               onClick={() => {
                                 if (!newTaskTitle.trim()) return;
                                 handleAddTask(newTaskTitle.trim());
                                 setNewTaskTitle('');
                               }}
                               className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase"
                             >
                               Añadir
                             </button>
                           </div>
                            <div className="space-y-3">
                             {portal.tasks.map(t => (
                              <div key={t.id} className="flex flex-col gap-3 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                <div className="flex items-start sm:items-center gap-3">
                                   <input type="checkbox" checked={t.is_completed} onChange={() => handleToggleTask(t)} className="w-5 h-5 rounded-lg border-slate-200 text-amber-600 shrink-0" />
                                  {editingTaskId === t.id ? (
                                    <input
                                      value={editingTaskTitle}
                                      onChange={(e) => setEditingTaskTitle(e.target.value)}
                                      placeholder="Título del hito"
                                      className="flex-1 p-2 border border-slate-200 rounded-lg text-sm w-full"
                                    />
                                  ) : (
                                    <span className={cn("text-sm font-bold flex-1", t.is_completed && "text-slate-300 line-through")}>
                                      {String(t.title)}
                                    </span>
                                  )}
                                  <div className="flex gap-2 shrink-0">
                                    {editingTaskId === t.id ? (
                                      <button onClick={() => handleUpdateTask(t, editingTaskTitle, editingTaskImageUrl)} className="text-[10px] font-black text-emerald-600 uppercase">Guardar</button>
                                    ) : (
                                      <button onClick={() => { setEditingTaskId(t.id); setEditingTaskTitle(String(t.title)); setEditingTaskImageUrl(t.image_url || ''); }} className="text-[10px] font-black text-amber-600 uppercase">Editar</button>
                                    )}
                                    <button onClick={() => handleDeleteTask(t.id)} className="text-[10px] font-black text-rose-500 uppercase">Borrar</button>
                                  </div>
                                </div>
                                {editingTaskId === t.id && (
                                  <div className="pl-8">
                                    <input
                                      value={editingTaskImageUrl}
                                      onChange={(e) => setEditingTaskImageUrl(e.target.value)}
                                      placeholder="URL de Imagen (opcional)"
                                      className="w-full p-2 border border-slate-200 rounded-lg text-xs text-slate-500 bg-slate-50"
                                    />
                                  </div>
                                )}
                                {!editingTaskId && t.image_url && (
                                  <div className="pl-8 text-xs text-slate-400 truncate"><Sparkles size={10} className="inline mr-1" />{t.image_url}</div>
                                )}
                               </div>
                             ))}
                           </div>
                        </section>
                        <section className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Download size={14} /> Materiales</h4>
                           <div className="grid grid-cols-1 gap-2">
                             <input
                               value={newResourceTitle}
                               onChange={(e) => setNewResourceTitle(e.target.value)}
                               placeholder="Título del recurso..."
                               className="p-3 bg-white border border-slate-200 rounded-xl text-sm"
                             />
                             <div className="flex flex-col sm:flex-row gap-2">
                               <input
                                 value={newResourceUrl}
                                 onChange={(e) => setNewResourceUrl(e.target.value)}
                                 placeholder="https://..."
                                 className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-sm"
                               />
                               <button
                                 onClick={() => {
                                   if (!newResourceTitle.trim() || !newResourceUrl.trim()) return;
                                   handleAddResource(newResourceTitle.trim(), newResourceUrl.trim());
                                   setNewResourceTitle('');
                                   setNewResourceUrl('');
                                 }}
                                 className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase"
                               >
                                 Añadir
                               </button>
                             </div>
                           </div>
                           <div className="space-y-2">
                             {portal.resources.map(r => (
                               <div key={r.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 group">
                                {editingResourceId === r.id ? (
                                  <div className="w-full space-y-2">
                                    <input value={editingResourceTitle} onChange={(e) => setEditingResourceTitle(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                                    <input value={editingResourceUrl} onChange={(e) => setEditingResourceUrl(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                                    <div className="flex gap-2 justify-end">
                                      <button onClick={() => handleUpdateResource(r.id, editingResourceTitle, editingResourceUrl)} className="text-[10px] font-black text-emerald-600 uppercase">Guardar</button>
                                      <button onClick={() => { setEditingResourceId(null); setEditingResourceTitle(''); setEditingResourceUrl(''); }} className="text-[10px] font-black text-slate-500 uppercase">Cancelar</button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold truncate">{String(r.title)}</p>
                                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-500 truncate block">{r.url}</a>
                                    </div>
                                    <div className="flex gap-3 shrink-0">
                                      <button onClick={() => { setEditingResourceId(r.id); setEditingResourceTitle(String(r.title)); setEditingResourceUrl(String(r.url)); }} className="text-[10px] font-black text-indigo-500 uppercase">Editar</button>
                                      <button onClick={() => handleDeleteResource(r.id)} className="text-[10px] font-black text-rose-500 uppercase">Borrar</button>
                                    </div>
                                  </>
                                )}
                               </div>
                             ))}
                           </div>
                        </section>
                     </div>

                     {/* AI Strategic Advice Integrated Card */}
                     {strategyAdvice && (
                       <div className="p-4 md:p-8 bg-indigo-50 border border-indigo-100 rounded-[2rem] shadow-sm animate-zoom-in relative">
                         <button onClick={() => setStrategyAdvice(null)} className="absolute top-6 right-6 p-1 text-indigo-300 hover:text-indigo-600 transition-colors"><X size={16} /></button>
                         <div className="flex items-center gap-3 mb-4">
                           <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Sparkles size={20} /></div>
                           <div>
                             <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest">Recomendación ProInsight AI</h4>
                             <p className="text-[10px] text-indigo-400 font-bold">Insight Estratégico de Valor Real</p>
                           </div>
                         </div>
                         <p className="text-sm text-indigo-800 leading-relaxed mb-6 font-medium italic">"{strategyAdvice.reasoning}"</p>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-3">
                             <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Sugerencias de Roadmap</h5>
                             <div className="flex flex-wrap gap-2">
                               {strategyAdvice.tasks.map((task, i) => (
                                 <button key={i} onClick={() => handleAddTask(task)} className="px-3 py-2 bg-white border border-indigo-100 rounded-xl text-[11px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2">
                                   + {task}
                                 </button>
                               ))}
                             </div>
                           </div>
                           <div className="space-y-3">
                             <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Recursos Recomendados</h5>
                             <div className="flex flex-wrap gap-2">
                               {strategyAdvice.resources.map((res, i) => (
                                 <button key={i} onClick={() => handleAddResource(res, '#')} className="px-3 py-2 bg-white border border-indigo-100 rounded-xl text-[11px] font-bold text-indigo-400 hover:bg-indigo-400 hover:text-white transition-all shadow-sm flex items-center gap-2">
                                   + {res}
                                 </button>
                               ))}
                             </div>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                 )}
               </div>
             ) : (
               <div className="p-4 md:p-10 space-y-8 animate-fade-in">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <h3 className="text-xl font-black text-slate-800">Historial de Cotizaciones</h3>
                   <button onClick={() => setIsQuoteModalOpen(true)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:brightness-110">
                     <FileText size={14} /> Nueva Cotización
                   </button>
                 </div>

                 {(!contact.quotes || contact.quotes.length === 0) ? (
                   <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                     <Receipt size={32} className="mx-auto mb-4 text-slate-300" />
                     <p className="text-sm text-slate-400">No hay cotizaciones registradas para este contacto.</p>
                   </div>
                 ) : (
                   <div className="overflow-x-auto w-full">
                     <div className="min-w-[600px] md:min-w-full">
                       <table className="w-full text-left bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                         <thead className="bg-slate-50 border-b border-slate-100">
                           <tr>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                             <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-50">
                           {contact.quotes.map((q: any) => (
                             <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                               <td className="px-6 py-4 font-bold text-sm text-slate-700">{q.quote_number}</td>
                               <td className="px-6 py-4">
                                 <QuoteStatusBadge status={q.status} />
                               </td>
                               <td className="px-6 py-4 text-xs text-slate-500">{new Date(q.created_at).toLocaleDateString()}</td>
                               <td className="px-6 py-4 font-black text-sm text-emerald-600">${q.total.toLocaleString()}</td>
                               <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button 
                                     onClick={() => {
                                       setSelectedQuoteForEdit(q);
                                       setIsQuoteModalOpen(true);
                                     }}
                                     className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                     title="Editar Cotización"
                                   >
                                     <FileText size={14} />
                                   </button>
                                   <button 
                                     onClick={() => {
                                       setSelectedQuoteForEmail(q);
                                       setIsEmailModalOpen(true);
                                     }}
                                     className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" 
                                     title="Enviar al Cliente"
                                   >
                                     <Send size={14} />
                                   </button>
                                   <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"><X size={14} /></button>
                                 </div>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      </div>

      {isScheduleModalOpen && <ScheduleModal onClose={() => setIsScheduleModalOpen(false)} contacts={[contact]} initialContactId={contact.id} onAdd={(ev) => { if (addCalendarEvent) addCalendarEvent(ev); setContact({ ...contact, events: [...(contact.events || []), ev] }); }} />}
      {isEmailModalOpen && (
        <QuickEmailModal 
          contact={contact} 
          contextQuote={selectedQuoteForEmail}
          onClose={() => {
            setIsEmailModalOpen(false);
            setSelectedQuoteForEmail(null);
          }} 
          onSent={(m) => setContact({ ...contact, emailHistory: [m, ...(contact.emailHistory || [])] })} 
        />
      )}
      {isPhoneModalOpen && <PhoneCallModal onClose={() => setIsPhoneModalOpen(false)} phone={contact.phone || ''} name={contact.name} />}
      {isQuoteModalOpen && (
        <QuoteBuilderModal 
          contact={contact} 
          initialQuote={selectedQuoteForEdit}
          onClose={() => {
            setIsQuoteModalOpen(false);
            setSelectedQuoteForEdit(null);
          }} 
          onSaved={(q) => { 
            // Update local state
            const updatedQuotes = contact.quotes?.map(quote => quote.id === q.id ? q : quote) || [];
            if (!contact.quotes?.find(quote => quote.id === q.id)) {
              updatedQuotes.unshift(q);
            }

            // Mock the note addition locally to see it in timeline without refetching immediately
            const note: ContactNote = {
              id: 'temp-'+Date.now(),
              contact_id: contact.id,
              reasoning: `Se ha ${selectedQuoteForEdit ? 'actualizado' : 'redactado'} y generado la cotización ${q.quote_number} por un importe de $${q.total.toFixed(2)}.`,
              key_points: ['Cobro', 'Propuesta'],
              next_steps: ['Hacer seguimiento sobre la cotización en 2 días'],
              suggested_status: contact.status,
              created_at: new Date().toISOString()
            };
            setContact({...contact, quotes: updatedQuotes, notes: [note, ...(contact.notes || [])]});
          }} 
        />
      )}
    </div>
  );
}