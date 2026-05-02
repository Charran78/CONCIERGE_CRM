'use client';

import { useState } from 'react';
import { X, Send, Plus, Trash2, Calculator, Settings, Receipt, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Contact, Quote, QuoteItem } from '@/lib/types';
import { fetchAI, extractJSON } from '@/lib/utils'; // if you still have this, if not, remove or adapt

interface QuoteBuilderModalProps {
  contact: Contact;
  onClose: () => void;
  onSaved: (quote: Quote) => void;
  initialQuote?: Quote;
}

export default function QuoteBuilderModal({ contact, onClose, onSaved, initialQuote }: QuoteBuilderModalProps) {
  const [loading, setLoading] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  
  // Header details
  const [title, setTitle] = useState(initialQuote?.title || `Propuesta de Servicios Comerciales`);
  const [validUntil, setValidUntil] = useState(initialQuote?.valid_until || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 15 días
  
  // Footer details
  const [paymentTerms, setPaymentTerms] = useState(initialQuote?.payment_terms || 'Transferencia bancaria a 30 días.');
  const [notes, setNotes] = useState(initialQuote?.notes || 'Incluye soporte básico durante el periodo acordado.');

  // Items
  const [items, setItems] = useState<QuoteItem[]>(initialQuote?.items || [
    { name: '', description: '', delivery_time: '', qty: 1, unit_price: 0, tax_rate: 21, total: 0 }
  ]);

  const handleAddItem = () => {
    setItems([...items, { name: '', description: '', delivery_time: '', qty: 1, unit_price: 0, tax_rate: 21, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    // Recalcular total de línea
    if (field === 'qty' || field === 'unit_price') {
      item.total = Number(item.qty) * Number(item.unit_price);
    }
    newItems[index] = item;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + (Number(item.qty) * Number(item.unit_price)), 0);
    const tax_total = items.reduce((acc, item) => {
      const lineTotal = Number(item.qty) * Number(item.unit_price);
      return acc + (lineTotal * (Number(item.tax_rate) / 100));
    }, 0);
    const total = subtotal + tax_total;
    return { subtotal, tax_total, total };
  };

  const { subtotal, tax_total, total } = calculateTotals();

  // AI Assistant for Notes/Terms
  const handleAIAssist = async () => {
    setIsAIGenerating(true);
    try {
      const prompt = `Actúa como un experto cerrador de ventas B2B. Redacta un texto muy corto y persuasivo (2-3 frases) para las 'Notas' de una propuesta comercial dirigida a ${contact.name}. Enfatiza la garantía y la rapidez. Genera un JSON: {"notes": "texto generado", "paymentTerms": "Condición de pago sugerida estricta"}. Devuélvelo en UNA línea, con \n para saltos.`;
      const raw = await fetchAI(prompt, 'Experto Legal/Comercial. Genera JSON puro.');
      
      const resp = extractJSON<{notes: string, paymentTerms: string}>(raw);
      
      if(resp.notes) setNotes(resp.notes);
      if(resp.paymentTerms) setPaymentTerms(resp.paymentTerms);
    } catch(e) {
      console.error(e);
      alert('Error contactando con ProInsight AI.');
    }
    setIsAIGenerating(false);
  };

  const handleSave = async () => {
    if(items.length === 0 || items.some(i => !i.name)) {
      alert("Añade al menos un concepto válido.");
      return;
    }
    setLoading(true);
    let quote_number = initialQuote?.quote_number;
    if (!quote_number) {
      const year = new Date().getFullYear();
      const prefix = `COT-${year}-`;
      const { data: latestQuote } = await supabase
        .from('quotes')
        .select('quote_number')
        .ilike('quote_number', `${prefix}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastCorrelative = latestQuote?.quote_number
        ? parseInt(String(latestQuote.quote_number).replace(prefix, ''), 10)
        : 0;
      const nextCorrelative = Number.isFinite(lastCorrelative) ? lastCorrelative + 1 : 1;
      quote_number = `${prefix}${String(nextCorrelative).padStart(4, '0')}`;
    }
    
    // Save Quote
    const quoteData = {
      contact_id: contact.id,
      quote_number: quote_number!,
      title,
      issue_date: initialQuote?.issue_date || new Date().toISOString().split('T')[0],
      valid_until: validUntil,
      items,
      subtotal,
      tax_total,
      total,
      payment_terms: paymentTerms,
      notes,
      status: initialQuote?.status || 'Borrador'
    };

    let savedQuote, error;
    if (initialQuote?.id) {
      const res = await supabase.from('quotes').update(quoteData).eq('id', initialQuote.id).select().single();
      savedQuote = res.data;
      error = res.error;
    } else {
      const res = await supabase.from('quotes').insert([quoteData]).select().single();
      savedQuote = res.data;
      error = res.error;
    }

    if (error) {
      console.error(error);
      alert('Error guardando cotización en Supabase. Revisa DB policies.');
    } else {
      // Registrar evento
      await supabase.from('contact_notes').insert([
        {
          contact_id: contact.id,
          user_id: contact.user_id,
          reasoning: `Se ha redactado y generado la cotización ${quote_number} por un importe de $${total.toFixed(2)}.`,
          key_points: ['Cobro', 'Propuesta'],
          next_steps: ['Seguimiento comercial']
        }
      ]);
      onSaved(savedQuote as Quote);
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex justify-center items-start overflow-y-auto p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl animate-zoom-in relative my-4 md:my-10 overflow-hidden">
        
        {/* Header */}
        <div className="px-4 py-4 md:px-8 md:py-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10 w-full">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Receipt size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Constructor de Cotización</h2>
              <p className="text-xs font-bold text-slate-400 capitalize">Para: {contact.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-8 space-y-8 md:space-y-10">
          
          {/* General Info */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título del Proyecto</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 ring-indigo-100" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validez de la oferta (Límite)</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 ring-indigo-100" />
            </div>
          </section>

          {/* Line Items */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Líneas de Concepto</h3>
              <button onClick={handleAddItem} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black uppercase flex items-center gap-2 hover:bg-indigo-100 transition-colors">
                <Plus size={14} /> Añadir Fila
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
                  <button onClick={() => handleRemoveItem(idx)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                  
                  <div className="w-full space-y-2">
                    <input placeholder="Nombre del concepto..." value={item.name} onChange={(e) => handleItemChange(idx, 'name', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm font-bold" />
                    <input placeholder="Breve descripción o alcance..." value={item.description} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} className="w-full p-2 bg-transparent text-xs text-slate-500 outline-none" />
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-400">Plazo</span>
                      <input placeholder="Ej: 3 Días" value={item.delivery_time} onChange={(e) => handleItemChange(idx, 'delivery_time', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-center" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-400">Uds</span>
                      <input type="number" min="0.1" step="0.1" value={item.qty} onChange={(e) => handleItemChange(idx, 'qty', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-400">Precio Und</span>
                      <input type="number" min="0" step="1" value={item.unit_price} onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-center font-bold" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-black text-slate-400">Impuesto</span>
                      <select value={item.tax_rate} onChange={(e) => handleItemChange(idx, 'tax_rate', e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs text-center outline-none">
                        <option value="21">IVA 21%</option>
                        <option value="10">IVA 10%</option>
                        <option value="7">IGIC 7%</option>
                        <option value="0">Exento 0%</option>
                      </select>
                    </div>
                    <div className="space-y-1 flex items-end justify-end">
                      <p className="text-sm font-black text-slate-800">${item.total.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Subtotals & Conditions */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 bg-slate-50 p-4 md:p-6 rounded-3xl border border-slate-100">
            {/* Context & Notes */}
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><Settings size={12} className="inline mr-1" /> Condiciones</h4>
                <button onClick={handleAIAssist} disabled={isAIGenerating} className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-2 py-1 rounded flex items-center gap-1 uppercase">
                  {isAIGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} ProInsight AI
                </button>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Condición de Pago</span>
                <input value={paymentTerms} onChange={(e)=>setPaymentTerms(e.target.value)} className="w-full p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold" />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Términos Adicionales</span>
                <textarea rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full p-3 bg-white rounded-xl border border-slate-200 text-xs" />
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="flex flex-col justify-end space-y-4">
              <div className="space-y-2 w-full max-w-sm ml-auto">
                <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Subtotal</span>
                  <span className="text-sm font-black text-slate-700">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Impuestos</span>
                  <span className="text-sm font-black text-slate-500">${tax_total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Total Final</span>
                  <span className="text-2xl md:text-3xl font-black text-indigo-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Footer actions */}
        <div className="px-4 py-4 md:px-8 md:py-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0">
          <button onClick={onClose} className="px-5 py-3 text-xs font-black uppercase text-slate-400 hover:text-slate-600 w-full sm:w-auto">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Calculator size={16} />} Generar Cotización
          </button>
        </div>
      </div>
    </div>
  );
}