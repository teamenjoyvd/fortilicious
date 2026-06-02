'use server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to create a new Evergreen Content Pillar.
 */
export async function createPillar(
  title: string,
  description: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!title.trim()) {
      return { success: false, error: 'Pillar title is required' };
    }

    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from('content_pillars')
      .insert({
        user_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      console.error('createPillar Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/pillars');
    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to update an existing Content Pillar.
 */
export async function updatePillar(
  id: string,
  updates: { title?: string; description?: string | null; status?: 'active' | 'live' | 'archived' }
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('content_pillars')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId); // Additional security guard

    if (error) {
      console.error('updatePillar Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/pillars');
    revalidatePath(`/pillars/${id}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to delete a Content Pillar (cascades automatically to research/junctions).
 */
export async function deletePillar(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('content_pillars')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('deletePillar Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/pillars');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}
