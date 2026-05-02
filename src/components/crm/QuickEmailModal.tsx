'use client';

import { useState } from 'react';
import { Mail, Sparkles, Loader2, Send, X } from 'lucide-react';
import { cn, fetchAI, extractJSON } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Contact, EmailRecord, Quote } from '@/lib/types';

interface QuickEmailModalProps {
  contact: Contact;
  onClose: () => void;
  onSent: (email: EmailRecord) => void;
  contextQuote?: Quote;
}

export default function QuickEmailModal({ contact, onClose, onSent, contextQuote }: QuickEmailModalProps) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerated, setIsGenerated] = useState(false);

  const generateAIEmail = async () => {
    setLoading(true);
    const aiNotes = contact.notes?.[0]?.key_points?.join(', ') ?? 'Ninguna';
    
    let prompt = `Redacta un email estratégico de seguimiento profesional para ${contact.name}.
    Estado CRM: ${contact.status}.
    Resumen IA previo: ${contact.summary_ai || 'Ninguno'}.`;

    if (contextQuote) {
      prompt = `Actúa como un cerrador de ventas experto. Acabo de preparar la cotización ${contextQuote.quote_number} por un importe total de $${contextQuote.total.toLocaleString()} para ${contact.name}.
      Redacta un email persuasivo invitándole a revisar la propuesta en su portal personal.
      Menciona que la propuesta es válida hasta el ${contextQuote.valid_until}.
      Resumen del contacto: ${contact.summary_ai || 'Ninguno'}.`;
    }

    prompt += `\nDevuelve EXCLUSIVAMENTE un JSON puro y válido. NO incluyas texto antes o después del JSON. NO uses bloques de código markdown. Formato: {"subject": "asunto", "body": "cuerpo del email"}`;

    try {
      const raw = await fetchAI(prompt, 'Eres un experto en ventas y copywriting. Tu respuesta debe ser ÚNICAMENTE el objeto JSON, sin explicaciones ni markdown. Asegúrate de que todas las propiedades tengan comillas dobles y no haya comas finales.');
      const data = extractJSON<{subject: string, body: string}>(raw);
      setSubject(data.subject);
      setBody(data.body);
      setIsGenerated(true);
    } catch (e) {
      console.error(e);
      alert('Error generando el borrador con IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!subject || !body) return;
    setLoading(true);

    const emailData = {
      contact_id: contact.id,
      subject,
      body,
    };

    // 1. Guardar en Supabase
    const { data, error } = await supabase.from('email_history').insert(emailData).select().single();

    if (!error) {
      // 2. Notificar al padre para actualizar timeline
      onSent({
        ...emailData,
        sent_at: new Date().toISOString(),
        id: data?.id
      } as EmailRecord);

      // 3. Abrir en gestor de correo
      const mailtoUrl = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      // Forma más segura de abrir mailto en entornos de iframe/preview
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.target = '_self'; // Evita abrir pestañas innecesarias pero dispara el protocolo
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onClose();
    } else {
      console.error(error);
      alert('Error al registrar el email.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[80] flex items-center justify-center p-4 overflow-hidden animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl border border-white/20 overflow-hidden animate-zoom-in">
        <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
              <Mail size={16} />
            </div>
            <h3 className="font-black text-slate-800 text-sm italic">Redactar Email Estratégico</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-600" />
              <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest">IA Copywriting</p>
            </div>
            <button 
              onClick={generateAIEmail}
              disabled={loading}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              {loading && !isGenerated ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {isGenerated ? 'Regenerar con IA' : 'Redactar con ProInsight AI'}
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Asunto</label>
              <input 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: Seguimiento de nuestra sesión..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-100 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Mensaje</label>
              <textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe tu mensaje o usa la IA..."
                className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-3 md:px-6 md:py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 w-full sm:w-auto">Cancelar</button>
          <button 
            onClick={handleSend}
            disabled={loading || !subject || !body}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 w-full sm:w-auto"
          >
            {loading && isGenerated ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Abrir y Registrar
          </button>
        </div>
      </div>
    </div>
  );
}