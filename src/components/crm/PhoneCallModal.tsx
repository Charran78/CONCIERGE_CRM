'use client';

import { Phone, X, Check } from 'lucide-react';

interface PhoneCallModalProps {
  onClose: () => void;
  phone: string;
  name: string;
}

export default function PhoneCallModal({ onClose, phone, name }: PhoneCallModalProps) {
  const handleCall = () => {
    window.location.href = `tel:${phone}`;
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-sm px-4 py-4 md:p-8 shadow-2xl animate-zoom-in border border-slate-100">
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Phone size={24} />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 mb-8 text-center">
          <h3 className="text-xl font-black text-slate-800">¿Quieres llamar ahora?</h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            Se abrirá tu aplicación de llamadas para contactar a <span className="text-indigo-600 font-bold">{name}</span>.
          </p>
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 font-mono text-lg font-black text-slate-700 tracking-wider break-all">
            {phone}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCall}
            className="py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Check size={16} /> Llamar
          </button>
        </div>
      </div>
    </div>
  );
}