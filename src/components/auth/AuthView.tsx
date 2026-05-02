'use client';

import { useState } from 'react';
import { Mail, Lock, Loader2, Eye, EyeOff, Gem } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function AuthView() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ text: error.message, type: 'error' });
      } else {
        setMessage({
          text: 'Cuenta creada. Revisa tu email para confirmar el acceso.',
          type: 'success',
        });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ text: 'Credenciales incorrectas. Por favor, inténtelo de nuevo.', type: 'error' });
      }
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--tsc-black)' }}
    >
      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gold orbs */}
        <div
          className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-3xl"
          style={{ background: 'var(--tsc-gold)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full opacity-[0.03] blur-3xl"
          style={{ background: 'var(--tsc-gold-light)' }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(var(--tsc-gold) 1px, transparent 1px), linear-gradient(90deg, var(--tsc-gold) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative w-full max-w-md animate-zoom-in">
        {/* Header brand */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-6">
            <Image
              src="/TSC.png"
              alt="The Singular Choice"
              width={180}
              height={60}
              className="object-contain"
              priority
            />
          </div>
          <div className="divider-gold mx-auto w-24 mb-6" />
          <p className="section-label tracking-[0.3em]">Acceso Concierge</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--tsc-text-muted)' }}>
            {mode === 'login' ? 'Bienvenido de vuelta, asesor' : 'Solicitar acceso al sistema'}
          </p>
        </div>

        {/* Card */}
        <div
          className="glass-card px-8 py-8 shadow-2xl"
          style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,169,110,0.08)' }}
        >
          {/* Mode tabs */}
          <div
            className="flex rounded-xl p-1 mb-7"
            style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}
          >
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                id={`auth-tab-${m}`}
                onClick={() => { setMode(m); setMessage(null); }}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all tracking-wider uppercase"
                style={
                  mode === m
                    ? { background: 'var(--tsc-gold-muted)', color: 'var(--tsc-gold-light)', border: '1px solid rgba(201,169,110,0.25)' }
                    : { color: 'var(--tsc-text-muted)' }
                }
              >
                {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--tsc-text-muted)' }}
              />
              <input
                id="auth-email"
                type="email"
                required
                placeholder="su@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-luxury pl-11"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--tsc-text-muted)' }}
              />
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Contraseña segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-luxury pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--tsc-text-muted)' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Message */}
            {message && (
              <div
                className="px-4 py-3 rounded-xl text-xs font-medium"
                style={
                  message.type === 'error'
                    ? { background: 'rgba(139,74,82,0.15)', border: '1px solid rgba(139,74,82,0.3)', color: '#E08090' }
                    : { background: 'rgba(61,125,107,0.15)', border: '1px solid rgba(61,125,107,0.3)', color: '#5CBFA4' }
                }
              >
                {message.text}
              </div>
            )}

            <button
              id="btn-auth-submit"
              type="submit"
              disabled={loading}
              className="btn-gold w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <Gem size={14} />
                  {mode === 'login' ? 'Acceder al Sistema' : 'Solicitar Acceso'}
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--tsc-border)' }}>
            <p className="text-center text-xs" style={{ color: 'var(--tsc-text-muted)' }}>
              Acceso exclusivo para el equipo de{' '}
              <span style={{ color: 'var(--tsc-gold)' }}>The Singular Choice</span>
            </p>
          </div>
        </div>

        {/* Bottom emblem */}
        <div className="mt-8 text-center">
          <Image
            src="/Emblema-TSC.png"
            alt="TSC Emblem"
            width={32}
            height={32}
            className="mx-auto opacity-30"
          />
        </div>
      </div>
    </div>
  );
}