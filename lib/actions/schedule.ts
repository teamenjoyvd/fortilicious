'use server';

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { revalidatePath } from 'next/cache';

interface SchedulePostData {
  contentPieceId: string;
  channelId: string;
  plannedAt: string;
}

/**
 * Server Action to schedule a content piece on a specific channel.
 */
export async function scheduleContentPiece(
  data: SchedulePostData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!data.contentPieceId) {
      return { success: false, error: 'Content Piece is required' };
    }
    if (!data.channelId) {
      return { success: false, error: 'Channel is required' };
    }
    if (!data.plannedAt) {
      return { success: false, error: 'Planned date/time is required' };
    }

    const supabase = await createClerkSupabaseClient();

    // 1. Insert schedule entry
    const { data: entry, error: insertError } = await supabase
      .from('schedule_entries')
      .insert({
        user_id: userId,
        content_piece_id: data.contentPieceId,
        channel_id: data.channelId,
        planned_at: new Date(data.plannedAt).toISOString(),
        status: 'planned',
      })
      .select('id')
      .single();

    if (insertError || !entry) {
      console.error('scheduleContentPiece Error:', insertError);
      return { success: false, error: insertError?.message || 'Failed to schedule post' };
    }

    // 2. Set the content piece status to 'scheduled' if it's currently draft or ready
    const { data: piece } = await supabase
      .from('content_pieces')
      .select('status')
      .eq('id', data.contentPieceId)
      .single();

    if (piece && (piece.status === 'draft' || piece.status === 'ready')) {
      await supabase
        .from('content_pieces')
        .update({ status: 'scheduled' as any })
        .eq('id', data.contentPieceId);
    }

    revalidatePath('/calendar');
    revalidatePath('/content');
    revalidatePath(`/content/${data.contentPieceId}`);
    revalidatePath('/');
    return { success: true, id: entry.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to cancel / delete a scheduled post.
 */
export async function cancelScheduledPost(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();

    // Fetch the entry first to find its content_piece_id
    const { data: entry, error: fetchError } = await supabase
      .from('schedule_entries')
      .select('content_piece_id')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !entry) {
      return { success: false, error: 'Scheduled entry not found or unauthorized' };
    }

    // Delete schedule entry
    const { error: deleteError } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('cancelScheduledPost Error:', deleteError);
      return { success: false, error: deleteError.message };
    }

    // Check if there are other scheduled posts remaining for this piece.
    // If none, we can revert its status to 'ready' or 'draft'.
    const { data: remaining } = await supabase
      .from('schedule_entries')
      .select('id')
      .eq('content_piece_id', entry.content_piece_id);

    if (!remaining || remaining.length === 0) {
      await supabase
        .from('content_pieces')
        .update({ status: 'ready' })
        .eq('id', entry.content_piece_id)
        .eq('status', 'scheduled' as any);
    }

    revalidatePath('/calendar');
    revalidatePath('/content');
    revalidatePath(`/content/${entry.content_piece_id}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to reschedule a planned post.
 */
export async function reschedulePost(
  entryId: string,
  plannedAt: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('schedule_entries')
      .update({ planned_at: new Date(plannedAt).toISOString() })
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      console.error('reschedulePost Error:', error);
      return { success: false, error: error.message };
    }

    // Fetch the entry's content_piece_id to revalidate
    const { data: entry } = await supabase
      .from('schedule_entries')
      .select('content_piece_id')
      .eq('id', entryId)
      .single();

    revalidatePath('/calendar');
    if (entry) {
      revalidatePath(`/content/${entry.content_piece_id}`);
    }
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to mark a scheduled post as live.
 * This triggers status updates to 'live' inside Supabase.
 */
export async function markPostLive(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('schedule_entries')
      .update({
        status: 'live',
        published_at: new Date().toISOString(),
      })
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      console.error('markPostLive Error:', error);
      return { success: false, error: error.message };
    }

    // Fetch details to revalidate
    const { data: entry } = await supabase
      .from('schedule_entries')
      .select('content_piece_id')
      .eq('id', entryId)
      .single();

    revalidatePath('/calendar');
    if (entry) {
      revalidatePath(`/content/${entry.content_piece_id}`);
    }
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to skip / skip post schedule.
 */
export async function skipPost(
  entryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const { error } = await supabase
      .from('schedule_entries')
      .update({ status: 'skipped' })
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      console.error('skipPost Error:', error);
      return { success: false, error: error.message };
    }

    // Fetch details to revalidate
    const { data: entry } = await supabase
      .from('schedule_entries')
      .select('content_piece_id')
      .eq('id', entryId)
      .single();

    revalidatePath('/calendar');
    if (entry) {
      revalidatePath(`/content/${entry.content_piece_id}`);
    }
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}
