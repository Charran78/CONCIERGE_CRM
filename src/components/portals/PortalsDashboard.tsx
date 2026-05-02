'use client';

import { useState } from 'react';
import { 
  Plus, 
  ExternalLink, 
  Settings2, 
  CheckCircle2, 
  Circle, 
  Search, 
  ArrowUpRight, 
  Power, 
  PowerOff,
  Files,
  Layout
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Contact, ClientPortal } from '@/lib/types';
import { usePortals } from '@/hooks/usePortals';
import PortalEditor from './PortalEditor';

interface PortalsDashboardProps {
  contacts: Contact[];
  onUpdateContact: (contact: Contact) => void;
}

export default function PortalsDashboard({ contacts, onUpdateContact }: PortalsDashboardProps) {
  const { activatePortal, togglePortalStatus } = usePortals();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPortalContactId, setEditingPortalContactId] = useState<string | null>(null);

  const activeClients = contacts.filter(c => c.status === 'Cliente Activo' || !!c.portal);
  
  const filteredClients = activeClients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleActivate = async (contact: Contact) => {
    const portal = await activatePortal(contact.id);
    if (portal) {
      onUpdateContact({ ...contact, portal });
    }
  };

  const handleToggle = async (contact: Contact) => {
    if (!contact.portal) return;
    const success = await togglePortalStatus(contact.portal.id, !contact.portal.active);
    if (success) {
      onUpdateContact({ 
        ...contact, 
        portal: { ...contact.portal, active: !contact.portal.active } 
      });
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(url);
    alert('Enlace del portal copiado al portapapeles');
  };

  const editingContact = contacts.find(c => c.id === editingPortalContactId);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative px-4 py-4 md:px-8 md:py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ecosistema de Entrega</h2>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Gestiona portales activos y clientes con portal creado</p>
        </div>
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 transition-all w-full md:w-80 shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(contact => {
          const portal = contact.portal;
          const completedTasks = portal?.tasks?.filter(t => t.is_completed).length || 0;
          const totalTasks = portal?.tasks?.length || 0;
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

          return (
            <div 
              key={contact.id} 
              className={cn(
                "bg-white rounded-[2.5rem] border px-4 py-4 md:p-8 shadow-sm transition-all hover:shadow-xl hover:scale-[1.01] flex flex-col relative overflow-hidden",
                portal ? "border-slate-100" : "border-slate-200 border-dashed bg-slate-50/50"
              )}
            >
              {/* Status Indicator */}
              {portal && (
                <div className={cn(
                  "absolute top-0 right-0 px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-bl-3xl",
                  portal.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                )}>
                  {portal.active ? 'Activo' : 'Pausado'}
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-100">
                  {contact.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-lg leading-tight">{contact.name}</h4>
                  <p className="text-xs text-slate-400 font-bold truncate max-w-[150px]">{contact.email}</p>
                </div>
              </div>

              {!portal ? (
                <div className="flex-1 flex flex-col justify-center items-center py-6 text-center space-y-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 border-dashed text-slate-300">
                    <Layout size={32} />
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Portal no creado</p>
                  <button 
                    onClick={() => handleActivate(contact)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    <Plus size={16} /> Activar Portal Now
                  </button>
                </div>
              ) : (
                <div className="flex-1 space-y-6">
                  {/* Progress Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progreso del Sprint</span>
                      <span className="text-lg font-black text-indigo-600">{progress}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                      <span>{completedTasks} Tareas Completadas</span>
                      <span>Total: {totalTasks}</span>
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center">
                      <Files size={14} className="text-slate-400 mb-1" />
                      <span className="text-[10px] font-black">{portal.resources?.length || 0} Recursos</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center">
                      <CheckCircle2 size={14} className="text-emerald-500 mb-1" />
                      <span className="text-[10px] font-black">Entrega OK</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button 
                      onClick={() => setEditingPortalContactId(contact.id)}
                      className="py-3 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
                    >
                      <Settings2 size={14} /> Gestionar
                    </button>
                    <button 
                      onClick={() => handleCopyLink(portal.share_token)}
                      className="py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
                    >
                      <ArrowUpRight size={14} /> Link Portal
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => handleToggle(contact)}
                    className={cn(
                      "w-full py-2 text-[8px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all opacity-40 hover:opacity-100",
                      portal.active ? "text-slate-400" : "text-emerald-500"
                    )}
                  >
                    {portal.active ? (
                      <> <PowerOff size={10} /> Pausar Acceso Cliente </>
                    ) : (
                      <> <Power size={10} /> Re-activar Acceso </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {activeClients.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
             <Layout size={48} className="mx-auto mb-4 text-slate-200" />
             <h4 className="text-lg font-black text-slate-400">No hay portales para mostrar</h4>
             <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">Activa un portal desde CRM o marca un cliente como activo.</p>
          </div>
        )}
      </div>

      {editingContact && editingContact.portal && (
        <PortalEditor 
          portal={editingContact.portal}
          contactName={editingContact.name}
          onClose={() => setEditingPortalContactId(null)}
          onUpdate={(updatedPortal: ClientPortal) => {
            onUpdateContact({ ...editingContact, portal: updatedPortal });
          }}
        />
      )}
    </div>
  );
}