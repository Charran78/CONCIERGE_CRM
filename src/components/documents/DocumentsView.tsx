'use client';

import { useState, useRef } from 'react';
import type { Contact, Document } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import {
  Upload, FileText, Download, Trash2, Search,
  FolderOpen, Loader2, X, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentsViewProps {
  contacts: Contact[];
  userId: string;
}

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export default function DocumentsView({ contacts, userId }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents for selected contact
  const loadDocuments = async (contactId: string) => {
    setSelectedContactId(contactId);
    if (!contactId) { setDocuments([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setDocuments((data ?? []) as Document[]);
    setLoading(false);
  };

  // Upload file
  const uploadFile = async (file: File) => {
    if (!selectedContactId) {
      setUploadError('Selecciona un cliente primero');
      return;
    }
    setUploadStatus('uploading');
    setUploadError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('contact_id', selectedContactId);
    formData.append('user_id', userId);

    const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) {
      setUploadStatus('error');
      setUploadError(json.error || 'Error al subir el archivo');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    setDocuments(prev => [json.document, ...prev]);
    setUploadStatus('success');
    setTimeout(() => setUploadStatus('idle'), 2000);
  };

  // Download document
  const handleDownload = async (doc: Document) => {
    const res = await fetch(`/api/documents/download/${doc.id}`);
    const { url, error } = await res.json();
    if (error) { console.error(error); return; }
    window.open(url, '_blank');
  };

  // Delete document
  const handleDelete = async (doc: Document) => {
    if (!confirm(`¿Eliminar "${doc.name}"?`)) return;
    await supabase.storage.from('documents').remove([doc.file_path]);
    await supabase.from('documents').delete().eq('id', doc.id);
    setDocuments(prev => prev.filter(d => d.id !== doc.id));
  };

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedContact = contacts.find(c => c.id === selectedContactId);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getMimeLabel = (mime?: string) => {
    if (!mime) return '';
    const map: Record<string, string> = {
      'application/pdf': 'PDF',
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
    };
    return map[mime] || mime.split('/')[1]?.toUpperCase() || '';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl mb-1" style={{ color: 'var(--tsc-text-primary)' }}>
          Gestión de Documentos
        </h2>
        <p className="text-sm" style={{ color: 'var(--tsc-text-muted)' }}>
          Sube y gestiona los documentos de cada cliente. Serán accesibles desde su portal privado.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Client selector */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5"
            style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}>
            <p className="section-label mb-3">Seleccionar cliente</p>
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {contacts.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: 'var(--tsc-text-muted)' }}>
                  No hay clientes aún
                </p>
              )}
              {contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => loadDocuments(c.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                    selectedContactId === c.id ? 'nav-active' : 'hover:bg-white/[0.04]'
                  )}
                  style={selectedContactId !== c.id ? { color: 'var(--tsc-text-secondary)' } : {}}>
                  <p className="truncate">{c.name}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--tsc-text-muted)' }}>{c.email}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Upload zone */}
          {selectedContactId && (
            <div
              className={cn(
                'rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all',
                isDragging ? 'scale-[1.02]' : ''
              )}
              style={{
                border: `2px dashed ${isDragging ? 'var(--tsc-gold)' : 'var(--tsc-border)'}`,
                background: isDragging ? 'var(--tsc-gold-muted)' : 'var(--tsc-surface)',
                minHeight: 160,
              }}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) uploadFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file);
                  e.target.value = '';
                }}
              />
              {uploadStatus === 'uploading' ? (
                <Loader2 size={28} className="animate-spin" style={{ color: 'var(--tsc-gold)' }} />
              ) : uploadStatus === 'success' ? (
                <Check size={28} style={{ color: '#5CBFA4' }} />
              ) : uploadStatus === 'error' ? (
                <X size={28} style={{ color: '#E08090' }} />
              ) : (
                <Upload size={28} style={{ color: 'var(--tsc-gold-dark)' }} />
              )}
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--tsc-text-primary)' }}>
                  {uploadStatus === 'uploading' ? 'Subiendo…' :
                   uploadStatus === 'success' ? '¡Subido!' :
                   uploadStatus === 'error' ? 'Error' :
                   'Arrastra o haz clic'}
                </p>
                {uploadStatus === 'error' && (
                  <p className="text-xs mt-1" style={{ color: '#E08090' }}>{uploadError}</p>
                )}
                {uploadStatus === 'idle' && (
                  <p className="text-xs mt-1" style={{ color: 'var(--tsc-text-muted)' }}>
                    PDF, JPG, PNG, DOCX, XLSX · Max 50MB
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Documents list */}
        <div className="lg:col-span-2">
          {!selectedContactId ? (
            <div className="h-64 rounded-2xl flex flex-col items-center justify-center gap-3"
              style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}>
              <FolderOpen size={40} style={{ color: 'var(--tsc-text-muted)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--tsc-text-muted)' }}>
                Selecciona un cliente para ver sus documentos
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Client header */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: 'var(--tsc-gold-muted)', color: 'var(--tsc-gold-light)', border: '1px solid rgba(201,169,110,0.25)' }}>
                  {selectedContact?.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--tsc-text-primary)' }}>{selectedContact?.name}</p>
                  <p className="text-xs" style={{ color: 'var(--tsc-text-muted)' }}>
                    {filtered.length} documento{filtered.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tsc-text-muted)' }} />
                <input
                  className="input-luxury pl-9 text-sm"
                  placeholder="Buscar documento…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* List */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin" style={{ color: 'var(--tsc-gold)' }} />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl py-16 text-center"
                  style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}>
                  <FileText size={36} className="mx-auto mb-3" style={{ color: 'var(--tsc-text-muted)', opacity: 0.3 }} />
                  <p className="text-sm" style={{ color: 'var(--tsc-text-muted)' }}>
                    {search ? 'Sin resultados' : 'No hay documentos aún. Sube el primero.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(doc => (
                    <div key={doc.id}
                      className="flex items-center gap-4 p-4 rounded-xl transition-all group"
                      style={{ background: 'var(--tsc-surface)', border: '1px solid var(--tsc-border)' }}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--tsc-gold-muted)' }}>
                        <FileText size={18} style={{ color: 'var(--tsc-gold)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--tsc-text-primary)' }}>{doc.name}</p>
                        <p className="text-xs" style={{ color: 'var(--tsc-text-muted)' }}>
                          {getMimeLabel(doc.mime_type)}
                          {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ''}
                          {doc.created_at ? ` · ${new Date(doc.created_at).toLocaleDateString('es-ES')}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: 'var(--tsc-gold-muted)' }}
                          title="Descargar">
                          <Download size={14} style={{ color: 'var(--tsc-gold)' }} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: 'rgba(139,74,82,0.15)' }}
                          title="Eliminar">
                          <Trash2 size={14} style={{ color: '#E08090' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
