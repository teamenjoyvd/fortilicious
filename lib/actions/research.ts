'use server';

import { createClerkSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to create a new research entry (note or link bookmark).
 */
export async function createResearchEntry(
  pillarId: string,
  type: 'note' | 'link',
  title: string,
  body?: string,
  url?: string,
  pinned = false
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!title.trim()) {
      return { success: false, error: 'Title is required' };
    }

    if (type === 'link' && !url?.trim()) {
      return { success: false, error: 'URL is required for links' };
    }

    const supabase = await createClerkSupabaseClient();

    // Verify pillar ownership
    const { data: pillar, error: pillarError } = await supabase
      .from('content_pillars')
      .select('id')
      .eq('id', pillarId)
      .eq('user_id', userId)
      .single();

    if (pillarError || !pillar) {
      return { success: false, error: 'Invalid pillar or unauthorized access' };
    }

    const { data, error } = await supabase
      .from('research_entries')
      .insert({
        user_id: userId,
        pillar_id: pillarId,
        type,
        title: title.trim(),
        body: body?.trim() || null,
        url: type === 'link' ? url?.trim() || null : null,
        pinned,
      })
      .select('id')
      .single();

    if (error) {
      console.error('createResearchEntry Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/pillars/${pillarId}`);
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to update an existing research entry.
 */
export async function updateResearchEntry(
  id: string,
  updates: { title?: string; body?: string; url?: string; pinned?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();

    // Fetch existing entry to get pillar_id for revalidation
    const { data: entry, error: fetchError } = await supabase
      .from('research_entries')
      .select('pillar_id, type')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Research entry not found or unauthorized' };
    }

    // Prepare fields to update
    const cleanedUpdates: any = { ...updates };
    if (updates.title !== undefined) cleanedUpdates.title = updates.title.trim();
    if (updates.body !== undefined) cleanedUpdates.body = updates.body.trim() || null;
    if (updates.url !== undefined) {
      cleanedUpdates.url = entry.type === 'link' ? updates.url.trim() || null : null;
    }

    const { error } = await supabase
      .from('research_entries')
      .update(cleanedUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('updateResearchEntry Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/pillars/${entry.pillar_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to delete a research entry.
 * Cleans up any associated files in Supabase Storage.
 */
export async function deleteResearchEntry(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const serviceSupabase = createServiceRoleSupabaseClient();

    // 1. Fetch entry to verify ownership and get pillar_id for revalidation
    const { data: entry, error: fetchError } = await supabase
      .from('research_entries')
      .select('pillar_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Research entry not found or unauthorized' };
    }

    // 2. Fetch and remove all associated files from Storage
    const { data: assets } = await supabase
      .from('assets')
      .select('storage_path')
      .eq('research_entry_id', id)
      .eq('user_id', userId);

    if (assets && assets.length > 0) {
      const paths = assets.map((a) => a.storage_path).filter(Boolean) as string[];
      if (paths.length > 0) {
        const { error: storageError } = await serviceSupabase.storage
          .from('assets')
          .remove(paths);
        if (storageError) {
          console.error('Failed to clean up research assets from storage:', storageError);
        }
      }
    }

    // 3. Delete research entry from DB (cascades asset DB rows automatically)
    const { error: dbError } = await supabase
      .from('research_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (dbError) {
      console.error('deleteResearchEntry DB Error:', dbError);
      return { success: false, error: dbError.message };
    }

    revalidatePath(`/pillars/${entry.pillar_id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to toggle the pinned status of a research entry.
 */
export async function toggleResearchEntryPin(
  id: string,
  pinned: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateResearchEntry(id, { pinned });
}
