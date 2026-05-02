'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { Contact, ContactNote, ContactStatus, EmailRecord, CalendarEvent } from '@/lib/types';

import AuthView from '@/components/auth/AuthView';
import Sidebar, { type Tab } from '@/components/layout/Sidebar';
import DashboardView from '@/components/dashboard/DashboardView';
import CRMView from '@/components/crm/CRMView';
import EmailHubView from '@/components/emails/EmailHubView';
import CalendarView from '@/components/calendar/CalendarView';
import PortalsDashboard from '@/components/portals/PortalsDashboard';
import PricingView from '@/components/pricing/PricingView';
import DocumentsView from '@/components/documents/DocumentsView';
import ExperiencesView from '@/components/experiences/ExperiencesView';
import { Gem } from 'lucide-react';

const TAB_LABELS: Record<Tab, string> = {
  dashboard:   'Dashboard',
  crm:         'Clientes & Leads',
  emails:      'Email Concierge',
  calendar:    'Agenda',
  portals:     'Portales VIP',
  pricing:     'Propuestas',
  documents:   'Documentos',
  experiences: 'Experiencias Luxury',
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [metrics, setMetrics] = useState<any>(undefined);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [crmOpenContactId, setCrmOpenContactId] = useState<string | null>(null);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    if (!session) return;
    setContactsLoading(true);

    const { data: contactsData, error: cError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (cError) { console.error(cError); setContactsLoading(false); return; }

    const { data: eventsData, error: eError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', session.user.id)
      .order('start_time', { ascending: true });

    if (eError) console.error(eError);
    setEvents((eventsData ?? []) as CalendarEvent[]);

    const { data: metricsData, error: mError } = await supabase
      .rpc('get_seller_metrics', { v_user_id: session.user.id });

    if (mError) {
      console.error('Error fetching metrics:', mError.message);
    } else {
      setMetrics(metricsData);
    }

    let hydratedContacts = (contactsData ?? []) as Contact[];
    if (hydratedContacts.length > 0) {
      const contactIds = hydratedContacts.map((c) => c.id);
      const { data: portalsData, error: pError } = await supabase
        .from('client_portals')
        .select('*, tasks:portal_tasks(*), resources:portal_resources(*)')
        .in('contact_id', contactIds);

      if (pError) {
        console.error('Error fetching portals:', pError);
      } else {
        const portalByContactId = new Map((portalsData ?? []).map((p: any) => [p.contact_id, p]));
        hydratedContacts = hydratedContacts.map((c) => ({
          ...c,
          portal: portalByContactId.get(c.id) ?? c.portal,
        })) as Contact[];
      }
    }

    setContacts(hydratedContacts);
    setContactsLoading(false);
  }, [session]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateContactStatus = (id: string, status: ContactStatus) =>
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));

  const addContactNote = (id: string, note: ContactNote) =>
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, notes: [note, ...(c.notes ?? [])] } : c)));

  const addEmailToHistory = (contactId: string, email: EmailRecord) =>
    setContacts((prev) => prev.map((c) =>
      c.id === contactId ? { ...c, emailHistory: [email, ...(c.emailHistory ?? [])] } : c
    ));

  const addNewContact = (contact: Contact | Contact[]) =>
    setContacts((prev) => Array.isArray(contact) ? [...contact, ...prev] : [contact, ...prev]);

  const removeContacts = (ids: string[]) =>
    setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));

  const updateContact = (updatedContact: Contact) =>
    setContacts((prev) => prev.map((c) => (c.id === updatedContact.id ? updatedContact : c)));

  const addCalendarEvent = (event: CalendarEvent) => {
    setEvents(prev => [...prev, event].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    if (event.contact_id) setContacts(prev => prev.map(c => c.id === event.contact_id ? { ...c, events: [...(c.events || []), event] } : c));
  };

  const updateCalendarEvent = (updatedEvent: CalendarEvent) => {
    setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
    if (updatedEvent.contact_id) setContacts(prev => prev.map(c => c.id === updatedEvent.contact_id
      ? { ...c, events: (c.events || []).map(e => e.id === updatedEvent.id ? updatedEvent : e) } : c));
  };

  const deleteCalendarEvent = (id: string, contactId?: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    if (contactId) setContacts(prev => prev.map(c => c.id === contactId
      ? { ...c, events: (c.events || []).filter(e => e.id !== id) } : c));
  };

  const handleLogout = async () => {
    if (confirm('¿Cerrar sesión?')) await supabase.auth.signOut();
  };

  // ─── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--tsc-black)' }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center animate-float"
            style={{ background: 'var(--tsc-gold-muted)', border: '1px solid rgba(201,169,110,0.3)' }}>
            <Gem size={28} style={{ color: 'var(--tsc-gold)' }} />
          </div>
          <p className="section-label animate-gold-pulse">The Singular Choice</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthView />;

  const userName = session.user.email?.split('@')[0] ?? 'Concierge';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--tsc-black)' }}>
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userName={userName} onLogout={handleLogout} />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 shrink-0"
          style={{ background: 'var(--tsc-deep)', borderBottom: '1px solid var(--tsc-border)' }}>
          <h1 className="text-sm font-black tracking-widest uppercase" style={{ color: 'var(--tsc-text-secondary)' }}>
            {TAB_LABELS[activeTab]}
          </h1>
          <div className="flex items-center gap-3">
            {contactsLoading && (
              <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--tsc-text-muted)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--tsc-gold)' }} />
                Sincronizando...
              </span>
            )}
            <div className="badge-gold flex items-center gap-1.5">
              <Gem size={10} /> Groq AI Activo
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-8">
            {activeTab === 'dashboard'   && <DashboardView contacts={contacts} events={events} metrics={metrics} onOpenContact={(id) => { setCrmOpenContactId(id); setActiveTab('crm'); }} />}
            {activeTab === 'crm'         && <CRMView contacts={contacts} userId={session.user.id} updateContactStatus={updateContactStatus} updateContact={updateContact} addContactNote={addContactNote} addNewContact={addNewContact} removeContacts={removeContacts} openContactId={crmOpenContactId} onOpenContactHandled={() => setCrmOpenContactId(null)} />}
            {activeTab === 'emails'      && <EmailHubView contacts={contacts} addEmailToHistory={addEmailToHistory} />}
            {activeTab === 'calendar'    && <CalendarView events={events} contacts={contacts} onAdd={addCalendarEvent} onUpdate={updateCalendarEvent} onDelete={deleteCalendarEvent} />}
            {activeTab === 'portals'     && <PortalsDashboard contacts={contacts} onUpdateContact={updateContact} />}
            {activeTab === 'pricing'     && <PricingView userId={session.user.id} />}
            {activeTab === 'documents'   && <DocumentsView contacts={contacts} userId={session.user.id} />}
            {activeTab === 'experiences' && <ExperiencesView contacts={contacts} userId={session.user.id} />}
          </div>
        </div>
      </main>
    </div>
  );
}