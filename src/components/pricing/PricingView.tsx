'use client';

import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface PricingViewProps {
  userId: string;
}

type PlanName = 'Free' | 'Pro' | 'Team';

const PLANS: Array<{
  name: PlanName;
  price: string;
  target: string;
  features: string[];
  highlighted?: boolean;
}> = [
  {
    name: 'Free',
    price: '0EUR / mes',
    target: 'Curiosos / Solopreneurs',
    features: ['Hasta 5 leads activos', '1 portal de estrategia', 'IA basica (limitada)'],
  },
  {
    name: 'Pro',
    price: '29EUR / mes',
    target: 'Vendedores Pro',
    features: ['Leads ilimitados', 'Portales personalizados', 'Memoria evolutiva completa'],
    highlighted: true,
  },
  {
    name: 'Team',
    price: '79EUR / mes',
    target: 'Pequenas agencias',
    features: ['Hasta 5 usuarios', 'Dashboard de equipo', 'Analitica avanzada de portales'],
  },
];

export default function PricingView({ userId }: PricingViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanName | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adminStats, setAdminStats] = useState<null | { total: number; last24h: number; byPlan: Record<string, number> }>(null);
  const [adminStatus, setAdminStatus] = useState<'idle' | 'ok' | 'unauth' | 'forbidden' | 'error'>('idle');
  const [adminMessage, setAdminMessage] = useState('');

  const handlePlanClick = async (plan: PlanName) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('price_intentions').insert({
        user_id: userId,
        plan_name: plan,
        source: 'pricing_page',
      });
      if (error) console.error('Error tracking price intention:', error);
    } catch (error) {
      console.error('Unexpected error tracking price intention:', error);
    } finally {
      setSelectedPlan(plan);
      setModalOpen(true);
      loadAdminStats();
      setSubmitting(false);
    }
  };

  const loadAdminStats = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        setAdminStatus('unauth');
        setAdminMessage('Sesion no lista todavia. Recarga la pestana de Precios.');
        return;
      }

      const res = await fetch('/api/admin/pricing-intentions', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (res.status === 403) {
          setAdminStatus('forbidden');
          setAdminMessage('Tu cuenta no figura como admin en ADMIN_EMAILS.');
          return;
        }
        if (res.status === 401) {
          setAdminStatus('unauth');
          setAdminMessage('No autorizado. Vuelve a iniciar sesion.');
          return;
        }
        setAdminStatus('error');
        setAdminMessage(payload?.error || 'Error cargando panel admin.');
        return;
      }
      const payload = await res.json();
      setAdminStats(payload);
      setAdminStatus('ok');
      setAdminMessage('');
    } catch (error) {
      console.error('Error loading admin pricing stats:', error);
      setAdminStatus('error');
      setAdminMessage('Error de red cargando panel admin.');
    }
  };

  useEffect(() => {
    loadAdminStats();
    const t = setTimeout(() => loadAdminStats(), 1500);
    return () => clearTimeout(t);
  }, [userId]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10 px-4 md:px-0">
      <div className="bg-white rounded-[2.5rem] border border-slate-200 px-4 py-4 md:p-8 shadow-sm">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Validacion de Precios</h2>
        <p className="mt-2 text-slate-500 font-medium text-sm md:text-base">
          Elige el plan que mejor encaje contigo. Estamos habilitando los pagos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              'rounded-[2rem] border shadow-sm bg-white flex flex-col',
              plan.highlighted ? 'border-indigo-300 shadow-indigo-100' : 'border-slate-200',
              'px-4 py-4 md:p-7'
            )}
          >
            <div className="mb-6">
              <h3 className="text-xl font-black text-slate-800">{plan.name}</h3>
              <p className="text-2xl font-black text-indigo-600 mt-1">{plan.price}</p>
              <p className="text-xs uppercase tracking-widest text-slate-400 font-black mt-2">{plan.target}</p>
            </div>

            <ul className="space-y-2 flex-1">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                  <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              id={`choose-plan-${plan.name.toLowerCase()}`}
              disabled={submitting}
              onClick={() => handlePlanClick(plan.name)}
              className={cn(
                'mt-6 w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all',
                plan.highlighted
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              Elegir Plan
            </button>
          </div>
        ))}
      </div>

      {adminStats && (
        <div className="bg-slate-900 text-white rounded-[2rem] px-4 py-4 md:p-6 border border-slate-800">
          <p className="text-[10px] uppercase tracking-widest font-black text-indigo-300 mb-4">Panel Admin (Privado)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Total clics</p>
              <p className="text-2xl font-black">{adminStats.total}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Ultimas 24h</p>
              <p className="text-2xl font-black">{adminStats.last24h}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Pro</p>
              <p className="text-2xl font-black">{adminStats.byPlan.Pro || 0}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Team</p>
              <p className="text-2xl font-black">{adminStats.byPlan.Team || 0}</p>
            </div>
          </div>
        </div>
      )}

      {!adminStats && adminStatus !== 'idle' && adminStatus !== 'forbidden' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-widest font-black text-amber-700">Estado panel admin</p>
          <p className="text-sm text-amber-800 mt-1">
            {adminMessage || 'Panel admin no disponible por configuracion.'}
          </p>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl px-4 py-4 md:p-7 border border-slate-200 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Interes registrado</p>
                <h4 className="text-xl font-black text-slate-800 mt-2">Gracias por tu interes en {selectedPlan}</h4>
              </div>
              <button
                id="btn-close-pricing-modal"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-slate-50"
              >
                <X size={14} />
              </button>
            </div>
            <p className="mt-3 text-slate-600 text-sm">
              Estamos habilitando los pagos. Te avisaremos en cuanto tu cuenta Pro este lista.
            </p>
            <button
              id="btn-accept-pricing-modal"
              onClick={() => setModalOpen(false)}
              className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}