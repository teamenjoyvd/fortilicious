'use server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { revalidatePath } from 'next/cache';

/**
 * Server Action to capture a zero-friction idea.
 */
export async function createCapture(
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!body || !body.trim()) {
      return { success: false, error: 'Idea capture body cannot be empty' };
    }

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('quick_captures')
      .insert({
        user_id: userId,
        body: body.trim(),
        promoted_to: null,
        promoted_id: null,
      });

    if (error) {
      console.error('createCapture Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/inbox');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to delete a capture.
 */
export async function deleteCapture(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('quick_captures')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('deleteCapture Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/inbox');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to mark an idea as promoted to a pillar or content piece.
 */
export async function promoteCapture(
  id: string,
  targetType: 'pillar' | 'content_piece',
  targetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('quick_captures')
      .update({
        promoted_to: targetType,
        promoted_id: targetId,
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('promoteCapture Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    revalidatePath('/inbox');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}
