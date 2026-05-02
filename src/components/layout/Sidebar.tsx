'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Mail,
  CalendarDays,
  LayoutList,
  BadgeDollarSign,
  FolderOpen,
  Sparkles,
  LogOut,
  Gem,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export type Tab = 'dashboard' | 'crm' | 'emails' | 'calendar' | 'portals' | 'pricing' | 'documents' | 'experiences';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  userName: string;
  onLogout: () => void;
}

const NAV_ITEMS: { icon: React.ReactNode; label: string; tab: Tab; section?: string }[] = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard', tab: 'dashboard' },
  { icon: <Users size={18} />,          label: 'Clientes & Leads', tab: 'crm' },
  { icon: <LayoutList size={18} />,     label: 'Portales VIP', tab: 'portals' },
  { icon: <Gem size={18} />,            label: 'Experiencias', tab: 'experiences', section: 'luxury' },
  { icon: <FolderOpen size={18} />,     label: 'Documentos', tab: 'documents', section: 'luxury' },
  { icon: <Mail size={18} />,           label: 'Email Concierge', tab: 'emails', section: 'ops' },
  { icon: <CalendarDays size={18} />,   label: 'Agenda', tab: 'calendar', section: 'ops' },
  { icon: <BadgeDollarSign size={18} />,label: 'Propuestas', tab: 'pricing', section: 'ops' },
];

export default function Sidebar({ activeTab, onTabChange, userName, onLogout }: SidebarProps) {
  const [open, setOpen] = useState(false);

  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const renderNavItem = (item: typeof NAV_ITEMS[0]) => (
    <li key={item.tab}>
      <button
        id={`nav-${item.tab}`}
        onClick={() => { onTabChange(item.tab); setOpen(false); }}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold tracking-wide',
          activeTab === item.tab
            ? 'nav-active'
            : 'hover:bg-white/[0.04]'
        )}
        style={
          activeTab !== item.tab
            ? { color: 'var(--tsc-text-secondary)' }
            : {}
        }
      >
        <span style={{ color: activeTab === item.tab ? 'var(--tsc-gold)' : 'var(--tsc-text-muted)' }}>
          {item.icon}
        </span>
        {item.label}
        {activeTab === item.tab && (
          <span
            className="ml-auto w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--tsc-gold)' }}
          />
        )}
      </button>
    </li>
  );

  const coreItems = NAV_ITEMS.filter(i => !i.section);
  const luxuryItems = NAV_ITEMS.filter(i => i.section === 'luxury');
  const opsItems = NAV_ITEMS.filter(i => i.section === 'ops');

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-30 flex md:hidden items-center p-2 rounded-xl"
        style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}
        onClick={() => setOpen((x) => !x)}
        aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
      >
        {open ? (
          <svg viewBox="0 0 24 24" width={20} height={20} style={{ stroke: 'var(--tsc-text-secondary)' }}>
            <path strokeWidth={2} strokeLinecap="round" d="M6 6L18 18M6 18L18 6" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width={20} height={20} style={{ stroke: 'var(--tsc-text-secondary)' }}>
            <path strokeWidth={2} strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static z-20 top-0 left-0 h-screen w-64 flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{ background: 'var(--tsc-deep)', borderRight: '1px solid var(--tsc-border)' }}
      >
        {/* Logo area */}
        <div
          className="h-[100px] flex items-center justify-center px-6"
          style={{ borderBottom: '1px solid var(--tsc-border)' }}
        >
          <Image
            src="/TSC.png"
            alt="The Singular Choice"
            width={150}
            height={50}
            className="object-contain"
            priority
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {/* Core */}
          <div>
            <ul className="space-y-0.5">
              {coreItems.map(renderNavItem)}
            </ul>
          </div>

          {/* Luxury */}
          <div>
            <p className="section-label px-3 mb-2">Luxury</p>
            <ul className="space-y-0.5">
              {luxuryItems.map(renderNavItem)}
            </ul>
          </div>

          {/* Operations */}
          <div>
            <p className="section-label px-3 mb-2">Operaciones</p>
            <ul className="space-y-0.5">
              {opsItems.map(renderNavItem)}
            </ul>
          </div>
        </nav>

        {/* AI Concierge badge */}
        <div className="px-4 pb-4">
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: 'var(--tsc-gold-muted)', border: '1px solid rgba(201,169,110,0.2)' }}
          >
            <div
              className="absolute inset-0 rounded-2xl opacity-20"
              style={{
                backgroundImage: 'radial-gradient(ellipse at top right, var(--tsc-gold), transparent 70%)',
              }}
            />
            <p className="section-label flex items-center gap-1.5 mb-1.5 relative z-10">
              <Sparkles size={10} style={{ color: 'var(--tsc-gold)' }} />
              Groq AI Activo
            </p>
            <p className="text-[10px] leading-relaxed relative z-10" style={{ color: 'var(--tsc-text-secondary)' }}>
              Genera narrativas luxury, analiza preferencias y redacta propuestas a medida.
            </p>
          </div>
        </div>

        {/* User footer */}
        <div
          className="p-4 space-y-2"
          style={{ borderTop: '1px solid var(--tsc-border)' }}
        >
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: 'var(--tsc-gold-muted)', color: 'var(--tsc-gold-light)', border: '1px solid rgba(201,169,110,0.3)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <p className="font-bold truncate" style={{ color: 'var(--tsc-text-primary)' }}>{userName}</p>
              <p className="section-label text-[9px] tracking-[0.2em]">Concierge</p>
            </div>
          </div>
          <button
            id="btn-logout"
            onClick={onLogout}
            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl transition-colors text-xs font-semibold"
            style={{ color: 'var(--tsc-text-muted)' }}
            onMouseEnter={e => { (e.target as HTMLElement).closest('button')!.style.background = 'rgba(139,74,82,0.15)'; (e.target as HTMLElement).closest('button')!.style.color = '#E08090'; }}
            onMouseLeave={e => { (e.target as HTMLElement).closest('button')!.style.background = ''; (e.target as HTMLElement).closest('button')!.style.color = 'var(--tsc-text-muted)'; }}
          >
            <LogOut size={14} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-10 md:hidden"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}