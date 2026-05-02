'use client';

import { supabase } from '@/lib/supabase';
import type { ClientPortal, PortalTask, PortalResource, PortalActivity } from '@/lib/types';

export function usePortals() {
  
  const getPortalByContactId = async (contactId: string) => {
    const { data, error } = await supabase
      .from('client_portals')
      .select('*, tasks:portal_tasks(*), resources:portal_resources(*)')
      .eq('contact_id', contactId)
      .single();
    
    if (error && error.code !== 'PGRST116') console.error('Error fetching portal:', error);
    return data as (ClientPortal & { tasks: PortalTask[], resources: PortalResource[] }) | null;
  };

  const getPortalByToken = async (token: string) => {
    const { data, error } = await supabase
      .from('client_portals')
      .select('*, tasks:portal_tasks(*), resources:portal_resources(*), contact:contacts(name, quotes(*))')
      .eq('share_token', token)
      .single();
    
    if (error) {
      console.error('Error fetching portal by token:', error);
      return null;
    }
    return data as any;
  };

  const activatePortal = async (contactId: string) => {
    const { data, error } = await supabase
      .from('client_portals')
      .upsert({ contact_id: contactId, active: true }, { onConflict: 'contact_id' })
      .select()
      .single();
    
    if (error) console.error('Error activating portal:', error);
    return data as ClientPortal;
  };

  const togglePortalStatus = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from('client_portals')
      .update({ active })
      .eq('id', id);
    return !error;
  };

  // TASKS
  const getTasks = async (portalId: string) => {
    const { data, error } = await supabase
      .from('portal_tasks')
      .select('*')
      .eq('portal_id', portalId)
      .order('task_order', { ascending: true });
    return data as PortalTask[];
  };

  const saveTask = async (task: Partial<PortalTask> & { portal_id: string }) => {
    if (task.id) {
      const { data, error } = await supabase
        .from('portal_tasks')
        .update(task)
        .eq('id', task.id)
        .select()
        .single();
      return data as PortalTask;
    } else {
      const { data, error } = await supabase
        .from('portal_tasks')
        .insert(task)
        .select()
        .single();
      return data as PortalTask;
    }
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('portal_tasks').delete().eq('id', id);
    return !error;
  };

  // RESOURCES
  const saveResource = async (resource: Partial<PortalResource> & { portal_id: string }) => {
    const { data, error } = await supabase
      .from('portal_resources')
      .insert(resource)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving resource:', error);
      return null;
    }
    return data as PortalResource;
  };

  const deleteResource = async (id: string) => {
    const { error } = await supabase.from('portal_resources').delete().eq('id', id);
    return !error;
  };

  // ACTIVITY
  const getActivity = async (portalId: string) => {
    const { data, error } = await supabase
      .from('portal_activity')
      .select('*')
      .eq('portal_id', portalId)
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching activity:', error);
    return (data || []) as PortalActivity[];
  };

  const logActivity = async (portalId: string, type: PortalActivity['activity_type'], description: string) => {
    const { error } = await supabase
      .from('portal_activity')
      .insert({ portal_id: portalId, activity_type: type, description });
    return !error;
  };

  return {
    getPortalByContactId,
    getPortalByToken,
    activatePortal,
    togglePortalStatus,
    getTasks,
    saveTask,
    deleteTask,
    saveResource,
    deleteResource,
    logActivity,
    getActivity
  };
}
