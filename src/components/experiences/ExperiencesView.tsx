'use client';

import { useState } from 'react';
import type { Contact, LuxuryExperience } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import {
  Gem, Sparkles, MapPin, Send, Loader2,
  ChevronDown, ChevronUp, CheckCircle2, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExperiencesViewProps {
  contacts: Contact[];
  userId: string;
}

const MOOD_OPTIONS = [
  { label: 'Silencio & Naturaleza', value: 'silencio naturaleza' },
  { label: 'Aventura Extrema', value: 'aventura adrenalina' },
  { label: 'Gastronomía & Arte', value: 'gastronomia cultura arte' },
  { label: 'Romance & Intimidad', value: 'romantico intimo pareja' },
  { label: 'Familia & Conexión', value: 'familia generaciones recuerdos' },
  { label: 'Lujo & Exclusividad', value: 'lujo exclusivo privilegiado' },
  { label: 'Exploración & Cultura', value: 'exploracion cultura historia' },
  { label: 'Bienestar & Descanso', value: 'wellness spa descanso' },
];

export default function ExperiencesView({ contacts }: ExperiencesViewProps) {
  const [selectedContactId, setSelectedContactId] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [experiences, setExperiences] = useState<LuxuryExperience[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendingToPortal, setSendingToPortal] = useState<string | null>(null);

  const toggleMood = (mood: string) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  };

  const loadExperiences = async (contactId: string) => {
    setSelectedContactId(contactId);
    if (!contactId) { setExperiences([]); return; }
    setLoadingHistory(true);
    const { data } = await supabase
      .from('luxury_experiences')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    setExperiences((data ?? []) as LuxuryExperience[]);
    setLoadingHistory(false);
  };

  const handleGenerate = async () => {
    if (!selectedContactId) return;
    setGenerating(true);

    const res = await fetch('/api/ai/generate-experience', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: selectedContactId,
        destination,
        mood_tags: selectedMoods,
        additional_notes: additionalNotes,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      setExperiences(prev => [data, ...prev]);
      setExpandedId(data.id);
      // Reset form
      setDestination('');
      setSelectedMoods([]);
      setAdditionalNotes('');
    } else {
      console.error('Error generating:', data.error);
    }
    setGenerating(false);
  };

  const sendToPortal = async (experience: LuxuryExperience) => {
    setSendingToPortal(experience.id);
    // Update portal mood_narrative
    const { data: portal } = await supabase
      .from('client_portals')
      .select('id')
      .eq('contact_id', experience.contact_id)
      .single();

    if (portal) {
      await supabase
        .from('client_portals')
        .update({ mood_narrative: experience.narrative, destination: experience.destination })
        .eq('id', portal.id);
    }

    // Mark experience as sent
    await supabase
      .from('luxury_experiences')
      .update({ sent_to_portal: true })
      .eq('id', experience.id);

    setExperiences(prev => prev.map(e => e.id === experience.id ? { ...e, sent_to_portal: true } : e));

    // Send Telegram notification to client
    await fetch('/api/telegram/client-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_id: experience.contact_id,
        message: `Hemos preparado algo especial para usted. Acceda a su portal privado para descubrir su próxima experiencia.`,
        type: 'experience',
      }),
    }).catch(() => {});

    setSendingToPortal(null);
  };

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: 'var(--tsc-text-primary)' }}>
          Experiencias Luxury
        </h2>
        <p className="text-sm" style={{ color: 'var(--tsc-text-muted)' }}>
          Genera narrativas inmersivas personalizadas con Groq AI. Envíalas directamente al portal del cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Generator form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client selector */}
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}>
            <p className="section-label mb-3">Cliente</p>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {contacts.map(c => (
                <button key={c.id} onClick={() => loadExperiences(c.id)}
                  className={cn('w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                    selectedContactId === c.id ? 'nav-active' : 'hover:bg-white/[0.04]')}
                  style={selectedContactId !== c.id ? { color: 'var(--tsc-text-secondary)' } : {}}>
                  <p className="truncate">{c.name}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedContactId && (
            <>
              {/* Destination */}
              <div className="rounded-2xl p-5 space-y-4"
                style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}>
                <p className="section-label">Destino (opcional)</p>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tsc-text-muted)' }} />
                  <input
                    className="input-luxury pl-9 text-sm"
                    placeholder="Ej: Antártida, Japón rural, Sahara…"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                  />
                </div>

                {/* Mood tags */}
                <div>
                  <p className="section-label mb-2">Sensaciones</p>
                  <div className="flex flex-wrap gap-2">
                    {MOOD_OPTIONS.map(mood => (
                      <button key={mood.value}
                        onClick={() => toggleMood(mood.value)}
                        className="text-[10px] px-3 py-1.5 rounded-full font-semibold transition-all"
                        style={selectedMoods.includes(mood.value)
                          ? { background: 'var(--tsc-gold-muted)', color: 'var(--tsc-gold-light)', border: '1px solid rgba(201,169,110,0.4)' }
                          : { background: 'var(--tsc-border)', color: 'var(--tsc-text-muted)', border: '1px solid transparent' }}>
                        {mood.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional notes */}
                <div>
                  <p className="section-label mb-2">Contexto adicional</p>
                  <textarea
                    className="input-luxury text-sm resize-none"
                    rows={3}
                    placeholder="Ocasión especial, aniversario, preferencias…"
                    value={additionalNotes}
                    onChange={e => setAdditionalNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="btn-gold w-full flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><Loader2 size={16} className="animate-spin" /> Generando narrativa…</>
                ) : (
                  <><Sparkles size={14} /> Generar Experiencia Luxury</>
                )}
              </button>
            </>
          )}
        </div>

        {/* Right: History */}
        <div className="lg:col-span-3">
          {!selectedContactId ? (
            <div className="h-64 rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}>
              <Gem size={40} style={{ color: 'var(--tsc-text-muted)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--tsc-text-muted)' }}>
                Selecciona un cliente para ver sus experiencias
              </p>
            </div>
          ) : loadingHistory ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin" style={{ color: 'var(--tsc-gold)' }} />
            </div>
          ) : experiences.length === 0 ? (
            <div className="h-64 rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}>
              <Sparkles size={36} style={{ color: 'var(--tsc-text-muted)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--tsc-text-muted)' }}>
                Aún no hay experiencias para {selectedContact?.name}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map(exp => {
                const isExpanded = expandedId === exp.id;
                return (
                  <div key={exp.id} className="rounded-2xl overflow-hidden"
                    style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}>
                    {/* Card header */}
                    <div className="flex items-start gap-3 p-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : exp.id)}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: 'var(--tsc-gold-muted)' }}>
                        <Gem size={14} style={{ color: 'var(--tsc-gold)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-sm font-semibold truncate" style={{ color: 'var(--tsc-text-primary)' }}>
                          {exp.feeling_title || exp.destination || 'Experiencia Luxury'}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          {exp.destination && (
                            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tsc-text-muted)' }}>
                              <MapPin size={10} /> {exp.destination}
                            </span>
                          )}
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--tsc-text-muted)' }}>
                            <Clock size={10} />
                            {exp.created_at ? new Date(exp.created_at).toLocaleDateString('es-ES') : ''}
                          </span>
                          {exp.sent_to_portal && (
                            <span className="text-xs flex items-center gap-1" style={{ color: '#5CBFA4' }}>
                              <CheckCircle2 size={10} /> En portal
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--tsc-text-muted)' }} />
                        : <ChevronDown size={16} style={{ color: 'var(--tsc-text-muted)' }} />}
                    </div>

                    {/* Expanded narrative */}
                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4 animate-fade-in"
                        style={{ borderTop: '1px solid var(--tsc-border)' }}>
                        <p className="font-serif text-sm leading-relaxed pt-4 italic"
                          style={{ color: 'var(--tsc-text-secondary)' }}>
                          {exp.narrative}
                        </p>
                        {exp.mood_tags && exp.mood_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {exp.mood_tags.map((tag, i) => (
                              <span key={i} className="badge-gold text-[9px]">{tag}</span>
                            ))}
                          </div>
                        )}
                        {!exp.sent_to_portal && (
                          <button
                            onClick={() => sendToPortal(exp)}
                            disabled={sendingToPortal === exp.id}
                            className="btn-ghost flex items-center gap-2 text-xs"
                          >
                            {sendingToPortal === exp.id
                              ? <><Loader2 size={12} className="animate-spin" /> Enviando…</>
                              : <><Send size={12} /> Enviar al Portal del Cliente</>}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
