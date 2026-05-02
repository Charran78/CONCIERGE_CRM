'use client';

import { useState } from 'react';
import { Mail, Sparkles, Loader2, Send, Check } from 'lucide-react';
import { fetchAI, extractJSON } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Contact, EmailRecord } from '@/lib/types';

interface EmailHubViewProps {
  contacts: Contact[];
  addEmailToHistory: (contactId: string, email: EmailRecord) => void;
}

interface Draft {
  subject: string;
  body: string;
}

export default function EmailHubView({ contacts, addEmailToHistory }: EmailHubViewProps) {
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sent, setSent] = useState(false);

  const selectedContact = contacts.find((c) => c.id === selectedId);

  const generateEmail = async () => {
    if (!selectedContact) return;
    setLoading(true);
    setSent(false);
    setDraft(null);

    const aiNotes = selectedContact.notes?.[0]?.key_points?.join(', ') ?? 'Ninguna';
    const prompt = `Redacta un email estratégico de seguimiento en español para ${selectedContact.name}.
Estado CRM: ${selectedContact.status}.
Notas IA previas: ${aiNotes}.
Devuelve EXCLUSIVAMENTE un JSON puro, estricto y en UNA SOLA LÍNEA. Usa \\n para saltos de línea en el cuerpo, NO uses saltos de línea reales dentro del JSON. Formato: {"subject": "", "body": ""}`;

    try {
      const raw = await fetchAI(prompt, 'Eres un copywriter experto. Devuelve SIEMPRE JSON sintácticamente correcto.');
      const data: Draft = extractJSON(raw);
      setDraft(data);
    } catch (e) {
      console.error(e);
      alert('Error al generar el borrador. Verifica tu conexión de IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!draft || !selectedId) return;
    setLoading(true);

    // Save to Supabase
    const { error } = await supabase.from('email_history').insert({
      contact_id: selectedId,
      subject: draft.subject,
      body: draft.body,
    });

    if (!error) {
      addEmailToHistory(selectedId, {
        ...draft,
        sent_at: new Date().toISOString(),
        contact_id: selectedId,
      });
      setSent(true);
    } else {
      alert('Error al registrar el envío. Intenta de nuevo.');
    }
    setLoading(false);
  };

  const handleSaveAndOpen = async () => {
    if (!draft || !selectedId || !selectedContact) return;
    const mailtoUrl = `mailto:${selectedContact.email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
    await handleSend(); // Save record
    window.location.href = mailtoUrl;
  };

  const reset = () => {
    setDraft(null);
    setSent(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl px-4 py-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Mail size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              Email Marketing Estratégico
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              ProInsight AI redacta emails personalizados según el historial del lead.
            </p>
          </div>
          <div className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Sparkles size={12} /> IA Conectada
          </div>
        </div>

        {/* Selector + Button */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Seleccionar Destinatario
            </label>
            <select
              id="email-contact-select"
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); reset(); }}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 font-semibold text-sm transition-all"
            >
              <option value="">-- Elige un contacto --</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              id="btn-generate-email"
              onClick={generateEmail}
              disabled={loading || !selectedId}
              className="w-full h-[54px] bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading && !draft ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
              Redactar con ProInsight AI
            </button>
          </div>
        </div>

        {/* Draft */}
        {draft && !sent && (
          <div className="space-y-0 animate-slide-up border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-slate-300 text-xs font-mono flex flex-col md:flex-row items-start md:items-center gap-2">
              <Mail size={14} className="text-indigo-400 shrink-0" />
              <span className="text-slate-500 shrink-0">Asunto:</span>
              <span className="text-white font-bold break-all">{draft.subject}</span>
            </div>
            <textarea
              id="email-body-editor"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="p-6 bg-slate-50 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-serif italic min-h-36 w-full outline-none focus:ring-2 focus:ring-indigo-100 transition-all border-none"
            />
            <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(draft.body);
                  alert('Cuerpo del correo copiado');
                }}
                className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all w-full sm:w-auto"
              >
                Copiar Texto
              </button>
              <button
                id="btn-send-email"
                onClick={handleSaveAndOpen}
                disabled={loading}
                className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 w-full sm:w-auto"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
                Abrir en mi Correo
              </button>
            </div>
          </div>
        )}

        {/* Success state */}
        {sent && (
          <div className="bg-emerald-50 border border-emerald-100 p-12 rounded-2xl text-center space-y-4 animate-zoom-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Check size={32} />
            </div>
            <h4 className="text-xl font-black text-emerald-900">¡Email Registrado!</h4>
            <p className="text-sm text-emerald-700">
              Se ha guardado en el historial del contacto y en las estadísticas del dashboard.
            </p>
            <button
              id="btn-send-another"
              onClick={reset}
              className="text-xs font-bold text-emerald-600 underline underline-offset-4 hover:text-emerald-800"
            >
              Redactar otro email
            </button>
          </div>
        )}
      </div>

      {/* Email history for selected contact */}
      {selectedContact && (selectedContact.emailHistory?.length ?? 0) > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 animate-fade-in">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">
            Historial de Emails — {selectedContact.name}
          </h3>
          <div className="space-y-3">
            {selectedContact.emailHistory!.map((email, i) => (
              <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-1">
                  <p className="text-xs font-bold text-slate-800 break-all">{email.subject}</p>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                    {email.sent_at ? new Date(email.sent_at).toLocaleString('es-ES') : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 italic">{email.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}