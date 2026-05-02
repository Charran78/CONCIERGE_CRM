'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { fetchAI } from '@/lib/utils';
import { StatusBadge } from '@/components/ui/StatusComponents';
import type { Contact, ContactNote, ContactStatus } from '@/lib/types';
import { supabase } from '@/lib/supabase';

interface AIModalProps {
  contact: Contact;
  onClose: () => void;
  updateContactStatus: (id: string, status: ContactStatus) => void;
  addContactNote: (id: string, note: ContactNote) => void;
}

export default function AIModal({
  contact,
  onClose,
  updateContactStatus,
  addContactNote,
}: AIModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<ContactNote | null>(null);
  const [saved, setSaved] = useState(false);

  const handleAnalyze = async () => {
    if (!notes.trim()) return;
    setLoading(true);

    const historyContext = `
      - Notas Manuales: ${contact.notes_text || 'Ninguna'}
      - Emails anteriores: ${contact.emailHistory?.slice(0, 3).map(e => e.subject).join(', ') || 'Ninguno'}
      - Conclusiones de análisis pasados: ${contact.notes?.slice(0, 2).map(n => n.reasoning).join(' | ') || 'Ninguna'}
    `;

    const systemPrompt = `Eres un experto en CRM y estrategia de ventas. 
    Tu objetivo es analizar las NOTAS ACTUALES y compararlas con el RESUMEN MAESTRO del lead para dar un diagnóstico preciso y generar un NUEVO RESUMEN MAESTRO actualizado.
    
    RESUMEN MAESTRO ACTUAL:
    ${contact.summary_ai || 'Lead recién creado sin historial.'}

    OTRO CONTEXTO (Manual):
    ${contact.notes_text || 'Ninguna'}

    Devuelve SOLO un JSON válido con esta estructura:
    {
      "keyPoints": ["p1", "p2"], 
      "nextSteps": ["a1", "a2"], 
      "suggestedStatus": "Estado Sugerido", 
      "reasoning": "explicación breve",
      "updatedSummary": "Genera aquí el nuevo Resumen Maestro compacto (máx 200 palabras) integrando la nueva información de forma coherente con el pasado."
    }
    
    No incluyas markdown. Solo el JSON.`;

    try {
      const raw = await fetchAI(
        `Nuevas notas de interacción con ${contact.name}: "${notes}"`,
        systemPrompt
      );
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleaned);

      const noteData: ContactNote = {
        contact_id: contact.id,
        key_points: data.keyPoints ?? [],
        next_steps: data.nextSteps ?? [],
        suggested_status: data.suggestedStatus as ContactStatus,
        reasoning: data.reasoning ?? '',
        timestamp: new Date().toLocaleString('es-ES'),
      };

      setSummary(noteData);
      addContactNote(contact.id, noteData);

      // Guardar nota y actualizar el Resumen Maestro en el contacto
      await Promise.all([
        supabase.from('contact_notes').insert({
          contact_id: contact.id,
          key_points: noteData.key_points,
          next_steps: noteData.next_steps,
          suggested_status: noteData.suggested_status,
          reasoning: noteData.reasoning,
        }),
        supabase.from('contacts').update({ 
          summary_ai: data.updatedSummary 
        }).eq('id', contact.id)
      ]);
    } catch (e) {
      console.error(e);
      alert('Error procesando con ProInsight AI. Verifica tus notas o la API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmStatus = async () => {
    if (!summary) return;
    updateContactStatus(contact.id, summary.suggested_status);

    await supabase
      .from('contacts')
      .update({ status: summary.suggested_status })
      .eq('id', contact.id);

    setSaved(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-zoom-in">
        {/* Header */}
        <div className="px-4 py-4 md:px-8 md:py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-3xl">
          <div>
            <h3 className="font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="text-purple-600" size={20} />
              Analista IA — ProInsight AI
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Procesando información de{' '}
              <span className="font-bold text-indigo-600">{contact.name}</span>
            </p>
          </div>
          <button
            id="btn-close-ai-modal"
            onClick={onClose}
            className="p-2 hover:bg-white/80 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-4 md:p-8 overflow-y-auto flex-1">
          {!summary ? (
            <div className="space-y-5">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 leading-relaxed">
                <strong>Consejo:</strong> No importa si tus notas son desordenadas. Pégalas aquí
                y la IA extraerá los puntos clave, siguientes pasos y te sugerirá un estado de CRM.
              </div>
              <textarea
                id="ai-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: 'Hablé con él hoy. Está cansado de su mentor actual. El precio le parece bien pero necesita hablar con su socia. Quiere empezar en enero...'"
                className="w-full h-48 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none resize-none transition-all leading-relaxed"
              />
            </div>
          ) : (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 bg-purple-50 rounded-2xl border border-purple-100">
                  <h4 className="text-[10px] font-black text-purple-900 uppercase tracking-widest mb-3">
                    Insights Clave
                  </h4>
                  <ul className="space-y-2">
                    {summary.key_points.map((p, i) => (
                      <li key={i} className="text-xs text-purple-800 flex gap-2">
                        <span className="shrink-0">✦</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest mb-3">
                    Próximos Pasos
                  </h4>
                  <ul className="space-y-2">
                    {summary.next_steps.map((s, i) => (
                      <li key={i} className="text-xs text-emerald-800 flex gap-2">
                        <span className="shrink-0">✅</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Recomendación de CRM
                </p>
                <StatusBadge status={summary.suggested_status} />
                <p className="text-xs text-slate-600 italic leading-relaxed">
                  &ldquo;{summary.reasoning}&rdquo;
                </p>
                <button
                  id="btn-confirm-status"
                  onClick={handleConfirmStatus}
                  disabled={saved}
                  className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    saved
                      ? 'bg-emerald-100 text-emerald-700 cursor-default'
                      : 'bg-slate-800 text-white hover:bg-slate-900 shadow-lg active:scale-95'
                  }`}
                >
                  {saved ? '✓ CRM Actualizado' : 'Confirmar y Actualizar CRM'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-4 md:px-8 md:py-5 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex justify-end gap-3">
          {!summary ? (
            <button
              id="btn-run-analysis"
              onClick={handleAnalyze}
              disabled={loading || !notes.trim()}
              className="px-7 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Analizar con ProInsight AI
            </button>
          ) : (
            <button
              id="btn-close-after-analysis"
              onClick={onClose}
              className="px-7 py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-900 transition-all"
            >
              Finalizar Análisis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}