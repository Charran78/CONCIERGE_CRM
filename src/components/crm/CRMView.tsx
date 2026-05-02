'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Clock, Sparkles, Trash2, FileUp } from 'lucide-react';
import { StatusDropdown } from '@/components/ui/StatusComponents';
import AIModal from './AIModal';
import NewContactModal from './NewContactModal';
import ContactDetailModal from './ContactDetailModal';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Contact, ContactNote, ContactStatus } from '@/lib/types';

interface CRMViewProps {
  contacts: Contact[];
  userId: string;
  updateContactStatus: (id: string, status: ContactStatus) => void;
  updateContact: (contact: Contact) => void;
  addContactNote: (id: string, note: ContactNote) => void;
  addNewContact: (contact: Contact) => void;
  removeContacts: (ids: string[]) => void;
  openContactId?: string | null;
  onOpenContactHandled?: () => void;
}

export default function CRMView({
  contacts,
  userId,
  updateContactStatus,
  updateContact,
  addContactNote,
  addNewContact,
  removeContacts,
  openContactId,
  onOpenContactHandled,
}: CRMViewProps) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [newContactModalOpen, setNewContactModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const filtered = contacts.filter((c) => {
    const matchStatus = filterStatus === 'Todos' || c.status === filterStatus;
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const handleStatusChange = async (id: string, newStatus: ContactStatus) => {
    updateContactStatus(id, newStatus);
    await supabase.from('contacts').update({ status: newStatus }).eq('id', id);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(c => c.id));
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar ${selectedIds.length} contactos?`)) return;
    setIsBulkDeleting(true);
    try {
      const { error } = await supabase.from('contacts').delete().in('id', selectedIds);
      if (error) {
        console.error("Supabase bulk delete error:", error);
        alert(`Error al eliminar en base de datos: ${error.message}. (Asegúrate de que no tenga tareas guardadas o activa CASCADE en Supabase)`);
      } else {
        removeContacts(selectedIds);
        setSelectedIds([]);
      }
    } catch (e: any) {
      console.error("Exception in bulk delete:", e);
      alert("Error local al eliminar leads.");
    }
    setIsBulkDeleting(false);
  };

  const FILTER_OPTIONS = ['Todos', 'Lead Frío', 'Llamada Agendada', 'Cliente Potencial', 'Cliente Activo'];

  useEffect(() => {
    if (!openContactId) return;
    setSelectedContactId(openContactId);
    setDetailModalOpen(true);
    onOpenContactHandled?.();
  }, [openContactId, onOpenContactHandled]);

  return (
    <>
      <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-fade-in pb-10 px-4 py-4 md:px-8 md:py-8">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Filtrar:
            </span>
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt}
                id={`filter-${opt.toLowerCase().replace(/ /g, '-')}`}
                onClick={() => setFilterStatus(opt)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${
                  filterStatus === opt
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt}
              </button>
            ))}
            {selectedIds.length > 0 && (
              <button
                id="btn-bulk-delete"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 flex items-center gap-2 transition-all"
              >
                <Trash2 size={14} /> Eliminar {selectedIds.length}
              </button>
            )}
          </div>

          <div className="flex gap-3 items-center flex-wrap">
            <label className="cursor-pointer px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all flex items-center gap-2" title="Cargar archivos en formato CSV delimitado por comas y sin cabecera. Col1: nombre, Col2: mail, Col3: tlf">
              <FileUp size={16} /> Importar CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    import('papaparse').then((Papa) => {
                      Papa.parse(file, {
                        header: false,
                        skipEmptyLines: true,
                        dynamicTyping: true,
                        encoding: "ISO-8859-1",
                        complete: async (results) => {
                          const data = results.data as any[][];
                          
                          // CORRECCIÓN: Resetear el valor para permitir subir el mismo archivo o nuevos seguidos
                          e.target.value = '';

                          if (data.length === 0) return;

                          const rows = data; 
                          const existingEmails = new Set(contacts.map(c => c.email?.toLowerCase().trim()));
                          const newEmailsInBatch = new Set<string>();

                          const newContacts = rows.map((row) => {
                            const nameStr = row[0] ? String(row[0]).trim() : 'Sin nombre';
                            const emailStr = row[1] ? String(row[1]).trim() : 'sin@email.com';
                            const phoneStr = row[2] ? String(row[2]).trim() : '';

                            return {
                              user_id: userId,
                              name: nameStr,
                              email: emailStr,
                              phone: phoneStr,
                              status: 'Lead Frío',
                              last_interaction: new Date().toISOString(), 
                            };
                          }).filter(c => {
                            if (c.name === 'Sin nombre' && (c.email === 'sin@email.com' || !c.email)) return false;
                            const cleanEmail = c.email.toLowerCase();
                            if (cleanEmail !== 'sin@email.com' && cleanEmail !== '') {
                              if (existingEmails.has(cleanEmail) || newEmailsInBatch.has(cleanEmail)) return false;
                              newEmailsInBatch.add(cleanEmail);
                            }
                            return true;
                          });

                          if (newContacts.length === 0) {
                            alert("No hay contactos nuevos o válidos para importar.");
                            return;
                          }

                          const { data: insertedData, error } = await supabase
                            .from('contacts')
                            .insert(newContacts)
                            .select();

                          if (error) {
                            console.error("Error detallado de Supabase:", error);
                            alert(`Error de base de datos: ${error.message}`);
                          } else if (insertedData) {
                            insertedData.forEach((d: any) => addNewContact(d));
                            alert(`¡CSV Importado con éxito! Se añadieron ${insertedData.length} contactos.`);
                          }
                        },
                        error: (error) => {
                          e.target.value = '';
                          console.error("Error al procesar CSV:", error);
                          alert("Error al leer el archivo CSV.");
                        }
                      });
                    });
                  }
                }}
              />
            </label>
            <input
              type="text"
              placeholder="Buscar contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all w-52"
            />
            <button
              id="btn-new-contact"
              onClick={() => setNewContactModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
            >
              <UserPlus size={16} /> Nuevo Lead
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="min-w-full w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 text-[10px] uppercase font-black tracking-[0.15em] border-b border-slate-200">
                  <th className="px-8 py-5 w-10">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-8 py-5 text-center w-10">
                    <span className="sr-only">Avatar</span>
                  </th>
                  <th className="px-8 py-5">Contacto</th>
                  <th className="px-8 py-5">Etapa</th>
                  <th className="px-8 py-5">Última Vez</th>
                  <th className="px-8 py-5 text-right w-10">Acción</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-16 text-center text-slate-400 text-sm">
                      No se encontraron contactos.
                    </td>
                  </tr>
                ) : (
                  filtered.map((contact) => (
                    <tr
                      key={contact.id}
                      className={cn(
                        'hover:bg-indigo-50/30 transition-colors group cursor-pointer',
                        selectedIds.includes(contact.id) && 'bg-indigo-50/50'
                      )}
                      onClick={() => {
                        setSelectedContactId(contact.id);
                        setDetailModalOpen(true);
                      }}
                    >
                      <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedIds.includes(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                        />
                      </td>

                      <td className="px-1 py-5 text-center">
                        <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-700 flex items-center justify-center font-black text-sm border-2 border-white shadow-sm shrink-0">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      </td>

                      <td className="px-8 py-5">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 text-sm leading-none">
                              {contact.name}
                            </p>
                            {(contact.notes?.length ?? 0) > 0 && (
                              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px] mt-1">{contact.email}</p>
                        </div>
                      </td>

                      <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown
                          currentStatus={contact.status}
                          onChange={(s) => handleStatusChange(contact.id, s)}
                        />
                      </td>

                      <td className="px-8 py-5">
                        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-lg w-fit">
                          <Clock size={11} /> {contact.last_interaction}
                        </span>
                      </td>

                      <td className="px-8 py-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          id={`btn-analyze-${contact.id}`}
                          onClick={() => {
                            setSelectedContactId(contact.id);
                            setAiModalOpen(true);
                          }}
                          className="p-2 text-indigo-600 hover:bg-white rounded-lg transition-all"
                          title="Analizar con IA"
                        >
                          <Sparkles size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-8 py-3 border-t border-slate-100 bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {filtered.length} contacto{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Modales fuera del contenedor animado */}
      {aiModalOpen && selectedContactId && (
        <AIModal
          contact={contacts.find(c => c.id === selectedContactId)!}
          onClose={() => setAiModalOpen(false)}
          updateContactStatus={updateContactStatus}
          addContactNote={addContactNote}
        />
      )}
      {detailModalOpen && selectedContactId && (
        <ContactDetailModal
          contactId={selectedContactId}
          onClose={() => setDetailModalOpen(false)}
          onUpdate={updateContact}
        />
      )}
      {newContactModalOpen && (
        <NewContactModal
          onClose={() => setNewContactModalOpen(false)}
          onAdd={addNewContact}
          userId={userId}
        />
      )}
    </>
  );
}