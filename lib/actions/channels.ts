'use server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to register a new social presence channel.
 */
export async function createChannel(
  name: string,
  platform: 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'other',
  handle?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!name.trim()) {
      return { success: false, error: 'Channel name is required' };
    }

    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from('channels')
      .insert({
        user_id: userId,
        name: name.trim(),
        platform,
        handle: handle?.trim() || null,
        active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('createChannel Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to toggle a channel's active state.
 * High-value for channels with history that cannot be deleted.
 */
export async function toggleChannelActive(
  id: string,
  active: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('channels')
      .update({ active })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('toggleChannelActive Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to update channel name/handle.
 */
export async function updateChannel(
  id: string,
  name: string,
  handle?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!name.trim()) {
      return { success: false, error: 'Channel name is required' };
    }

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('channels')
      .update({
        name: name.trim(),
        handle: handle?.trim() || null,
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('updateChannel Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to delete a channel from the settings registry.
 */
export async function deleteChannel(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();

    // Check if the channel is referenced by any schedule entries.
    // In Phase 2, schedule_entries table does not exist yet. We try to check.
    // Dynamic query handles safety once Phase 5 is deployed.
    const { count, error: checkError } = await supabase
      .from('schedule_entries' as any)
      .select('id', { count: 'exact', head: true })
      .eq('channel_id', id);

    // If schedule_entries table exists and has rows, block deletion and require deactivation instead.
    if (!checkError && count && count > 0) {
      return { 
        success: false, 
        error: 'This channel has active scheduling entries. Please toggle it to inactive instead of deleting.' 
      };
    }

    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('deleteChannel Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}
