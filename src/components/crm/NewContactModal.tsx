'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { ALL_STATUSES } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Contact, ContactStatus } from '@/lib/types';

interface NewContactModalProps {
  onClose: () => void;
  onAdd: (contact: Contact) => void;
  userId: string;
}

export default function NewContactModal({ onClose, onAdd, userId }: NewContactModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<ContactStatus>('Lead Frío');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!userId) {
      setError('Error: Usuario no autenticado.');
      setLoading(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        status,
        last_interaction: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Supabase Error:', dbError);
      setError(`Error al guardar: ${dbError.message}`);
      setLoading(false);
      return;
    }

    onAdd({ ...data, notes: [], emailHistory: [], events: [] } as Contact);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md px-4 py-4 md:p-8 shadow-2xl animate-zoom-in relative">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-black text-slate-800">Nuevo Lead</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Nombre Completo
            </label>
            <input
              required
              placeholder="Ej: Maria García"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-semibold"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Email Corporativo
            </label>
            <input
              required
              type="email"
              placeholder="maria@empresa.com"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-semibold"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                placeholder="+34..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-semibold"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Estado
              </label>
              <select
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-sm font-bold"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContactStatus)}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Registrar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}