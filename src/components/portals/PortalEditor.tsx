import { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  GripVertical, 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon,
  Link as LinkIcon,
  Save,
  Loader2,
  FileText,
  Activity,
  User,
  ExternalLink,
  Check,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClientPortal, PortalTask, PortalResource, PortalActivity } from '@/lib/types';
import { usePortals } from '@/hooks/usePortals';

interface PortalEditorProps {
  portal: ClientPortal;
  contactName: string;
  onClose: () => void;
  onUpdate: (portal: ClientPortal) => void;
}

export default function PortalEditor({ portal, contactName, onClose, onUpdate }: PortalEditorProps) {
  const { saveTask, deleteTask, saveResource, deleteResource, getActivity } = usePortals();
  const [activeTab, setActiveTab] = useState<'tasks' | 'resources' | 'activity'>('tasks');
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<PortalActivity[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');

  // Cargar actividad cuando se cambia a la pestaña
  useEffect(() => {
    if (activeTab === 'activity') {
      const loadActivity = async () => {
        const data = await getActivity(portal.id);
        setActivities(data);
      };
      loadActivity();
    }
  }, [activeTab, portal.id, getActivity]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setLoading(true);
    const task = await saveTask({
      portal_id: portal.id,
      title: newTaskTitle,
      task_order: (portal.tasks?.length || 0) + 1,
      is_completed: false
    });
    if (task) {
      onUpdate({
        ...portal,
        tasks: [...(portal.tasks || []), task]
      });
      setNewTaskTitle('');
    }
    setLoading(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    const success = await deleteTask(id);
    if (success) {
      onUpdate({
        ...portal,
        tasks: (portal.tasks || []).filter(t => t.id !== id)
      });
    }
  };

  const handleToggleTask = async (task: PortalTask) => {
    const updated = await saveTask({
      ...task,
      is_completed: !task.is_completed,
      completed_at: !task.is_completed ? new Date().toISOString() : undefined
    });
    if (updated) {
      onUpdate({
        ...portal,
        tasks: (portal.tasks || []).map(t => t.id === task.id ? updated : t)
      });
    }
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResourceTitle.trim() || !newResourceUrl.trim()) return;
    setLoading(true);
    const res = await saveResource({
      portal_id: portal.id,
      title: newResourceTitle,
      url: newResourceUrl
    });
    if (res) {
      onUpdate({
        ...portal,
        resources: [...(portal.resources || []), res]
      });
      setNewResourceTitle('');
      setNewResourceUrl('');
    }
    setLoading(false);
  };

  const handleDeleteResource = async (id: string) => {
    const success = await deleteResource(id);
    if (success) {
      onUpdate({
        ...portal,
        resources: (portal.resources || []).filter(r => r.id !== id)
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[80] p-4 lg:p-12 animate-fade-in overflow-hidden">
      <div className="bg-white rounded-[3.5rem] w-full max-w-5xl h-full flex flex-col shadow-2xl border border-white/20 relative overflow-hidden">
        {/* Header */}
        <header className="px-4 py-4 md:px-10 md:py-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Settings2 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Gestionar Portal: {contactName}</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Editor de Sprint y Recursos</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:rotate-90 transition-transform duration-300"
          >
            <X size={24} />
          </button>
        </header>

        {/* Sub-navigation */}
        <div className="flex px-4 pt-4 md:px-10 gap-8 border-b border-slate-100 shrink-0 bg-white overflow-x-auto">
           {[
             { id: 'tasks', label: 'Checklist de Sprint', icon: CheckCircle2 },
             { id: 'resources', label: 'Recursos y Links', icon: LinkIcon },
             { id: 'activity', label: 'Actividad Reciente', icon: Activity },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={cn(
                 "pb-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 whitespace-nowrap",
                 activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
               )}
             >
               <tab.icon size={14} /> {tab.label}
             </button>
           ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-50/30">
          {activeTab === 'tasks' && (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Add Task Form */}
              <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-4">
                <input 
                  placeholder="Nueva tarea del sprint..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 p-5 bg-white border border-slate-200 rounded-3xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm"
                />
                <button 
                  disabled={loading}
                  className="px-8 py-5 md:py-0 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Añadir
                </button>
              </form>

              <div className="space-y-3">
                {portal.tasks?.map((task, i) => (
                  <div 
                    key={task.id} 
                    className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 md:p-5 bg-white border border-slate-100 rounded-3xl group shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="text-slate-200 cursor-grab active:cursor-grabbing shrink-0">
                      <GripVertical size={20} />
                    </div>
                    <button 
                      onClick={() => handleToggleTask(task)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                        task.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-slate-200 hover:border-emerald-300"
                      )}
                    >
                      {task.is_completed && <Check size={14} />}
                    </button>
                    <span className={cn(
                      "flex-1 text-sm font-bold transition-all",
                      task.is_completed ? "text-slate-400 line-through" : "text-slate-700"
                    )}>
                      {task.title}
                    </span>
                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
                
                {(!portal.tasks || portal.tasks.length === 0) && (
                  <div className="text-center py-20 text-slate-300">
                    <CheckCircle2 size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold">Define las tareas clave para tu cliente.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
             <div className="max-w-3xl mx-auto space-y-6">
                <form onSubmit={handleAddResource} className="bg-white p-4 md:p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nuevo Recurso</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input 
                        placeholder="Título (Ej: Carpeta de Diseño)"
                        value={newResourceTitle}
                        onChange={(e) => setNewResourceTitle(e.target.value)}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                      <input 
                        placeholder="URL (Google Drive, Dropbox, Loom...)"
                        value={newResourceUrl}
                        onChange={(e) => setNewResourceUrl(e.target.value)}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                   </div>
                   <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-700">
                     <Plus size={16} /> Añadir Recurso
                   </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {portal.resources?.map(res => (
                     <div key={res.id} className="flex items-center justify-between p-4 md:p-5 bg-white border border-slate-100 rounded-3xl shadow-sm group">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                           <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                             <LinkIcon size={16} />
                           </div>
                           <span className="text-sm font-bold text-slate-700 truncate">{res.title}</span>
                        </div>
                        <button 
                          onClick={() => handleDeleteResource(res.id)}
                          className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab === 'activity' && (
             <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between mb-2">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Línea de Tiempo del Cliente</h4>
                   <span className="text-[9px] font-bold text-slate-300 italic">Actualizado justo ahora</span>
                </div>
                
                <div className="space-y-4 relative">
                   <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-100" />
                   
                   {activities.map((act, i) => (
                     <div key={act.id} className="flex gap-4 relative animate-fade-in">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center z-10 shrink-0 shadow-sm border border-white",
                          act.activity_type === 'portal_accessed' ? "bg-blue-50 text-blue-500" :
                          act.activity_type === 'task_completed' ? "bg-emerald-50 text-emerald-500" :
                          "bg-amber-50 text-amber-500"
                        )}>
                           {act.activity_type === 'portal_accessed' ? <User size={16} /> :
                            act.activity_type === 'task_completed' ? <CheckCircle2 size={16} /> :
                            <ExternalLink size={16} />}
                        </div>
                        <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                           <div className="flex justify-between items-start mb-1">
                              <p className="text-sm font-bold text-slate-700">{act.description}</p>
                              <span className="text-[10px] font-mono text-slate-300">
                                {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                           </div>
                           <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                             {act.activity_type.replace('_', ' ')}
                           </p>
                        </div>
                     </div>
                   ))}

                   {activities.length === 0 && (
                     <div className="text-center py-20 text-slate-300">
                        <Activity size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="text-sm font-bold">Sin actividad registrada aún.</p>
                     </div>
                   )}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}