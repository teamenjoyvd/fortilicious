'use server';

import { createClerkSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { revalidatePath } from 'next/cache';
import { promoteCapture } from './captures';

interface CreateContentPieceData {
  title: string;
  type: 'caption' | 'script' | 'video' | 'short_form';
  body?: string;
  status?: 'draft' | 'ready' | 'live' | 'archived';
  primaryPillarId: string;
}

/**
 * Server Action to create a new content piece with its primary content pillar.
 */
export async function createContentPiece(
  data: CreateContentPieceData
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!data.title.trim()) {
      return { success: false, error: 'Title is required' };
    }

    if (!data.primaryPillarId) {
      return { success: false, error: 'Primary Content Pillar is required' };
    }

    const supabase = await createClerkSupabaseClient();

    // 1. Insert content piece row
    const { data: piece, error: pieceError } = await supabase
      .from('content_pieces')
      .insert({
        user_id: userId,
        title: data.title.trim(),
        type: data.type,
        body: data.body?.trim() || null,
        status: data.status || 'draft',
      })
      .select('id')
      .single();

    if (pieceError || !piece) {
      console.error('createContentPiece Error:', pieceError);
      return { success: false, error: pieceError?.message || 'Failed to create content piece' };
    }

    // 2. Insert primary content pillar link in junction table
    const { error: junctionError } = await supabase
      .from('pillar_content')
      .insert({
        user_id: userId,
        pillar_id: data.primaryPillarId,
        piece_id: piece.id,
        is_primary: true,
      });

    if (junctionError) {
      console.error('createContentPiece Junction Error:', junctionError);
      // Clean up orphaned content piece row
      await supabase.from('content_pieces').delete().eq('id', piece.id);
      return { success: false, error: junctionError.message };
    }

    revalidatePath('/content');
    revalidatePath(`/pillars/${data.primaryPillarId}`);
    revalidatePath('/');
    return { success: true, id: piece.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

interface UpdateContentPieceData {
  title?: string;
  type?: 'caption' | 'script' | 'video' | 'short_form';
  body?: string;
  status?: 'draft' | 'ready' | 'live' | 'archived';
  primaryPillarId?: string;
}

/**
 * Server Action to update a content piece and its primary content pillar.
 */
export async function updateContentPiece(
  id: string,
  updates: UpdateContentPieceData
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();

    // 1. Update basic fields if provided
    const basicUpdates: any = {};
    if (updates.title !== undefined) basicUpdates.title = updates.title.trim();
    if (updates.type !== undefined) basicUpdates.type = updates.type;
    if (updates.body !== undefined) basicUpdates.body = updates.body.trim() || null;
    if (updates.status !== undefined) {
      basicUpdates.status = updates.status;
      if (updates.status === 'live') {
        basicUpdates.published_at = new Date().toISOString();
      }
    }

    if (Object.keys(basicUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('content_pieces')
        .update(basicUpdates)
        .eq('id', id)
        .eq('user_id', userId);

      if (updateError) {
        console.error('updateContentPiece Error:', updateError);
        return { success: false, error: updateError.message };
      }
    }

    // 2. Update primary pillar if changed
    if (updates.primaryPillarId) {
      // Find if there is an existing primary junction row
      const { data: existingPrimary } = await supabase
        .from('pillar_content')
        .select('*')
        .eq('piece_id', id)
        .eq('is_primary', true)
        .single();

      if (existingPrimary) {
        if (existingPrimary.pillar_id !== updates.primaryPillarId) {
          // Check if the new primary is currently associated as a secondary. If so, delete it first to avoid duplicate keys.
          await supabase
            .from('pillar_content')
            .delete()
            .eq('piece_id', id)
            .eq('pillar_id', updates.primaryPillarId);

          // Update the primary row
          const { error: primaryUpdateError } = await supabase
            .from('pillar_content')
            .update({ pillar_id: updates.primaryPillarId })
            .eq('piece_id', id)
            .eq('is_primary', true);

          if (primaryUpdateError) {
            console.error('Update Primary Pillar Error:', primaryUpdateError);
            return { success: false, error: primaryUpdateError.message };
          }
          
          revalidatePath(`/pillars/${existingPrimary.pillar_id}`);
        }
      } else {
        // Create primary link if none existed
        const { error: primaryInsertError } = await supabase
          .from('pillar_content')
          .insert({
            user_id: userId,
            piece_id: id,
            pillar_id: updates.primaryPillarId,
            is_primary: true,
          });

        if (primaryInsertError) {
          console.error('Insert Primary Pillar Error:', primaryInsertError);
          return { success: false, error: primaryInsertError.message };
        }
      }
      revalidatePath(`/pillars/${updates.primaryPillarId}`);
    }

    revalidatePath('/content');
    revalidatePath(`/content/${id}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to delete a content piece.
 * Cleans up any associated files in Supabase Storage.
 */
export async function deleteContentPiece(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const serviceSupabase = createServiceRoleSupabaseClient();

    // 1. Fetch junctions for revalidation paths
    const { data: junctions } = await supabase
      .from('pillar_content')
      .select('pillar_id')
      .eq('piece_id', id);

    // 2. Fetch and remove all associated files from Storage
    const { data: assets } = await supabase
      .from('assets')
      .select('storage_path')
      .eq('content_piece_id', id)
      .eq('user_id', userId);

    if (assets && assets.length > 0) {
      const paths = assets.map((a) => a.storage_path).filter(Boolean) as string[];
      if (paths.length > 0) {
        const { error: storageError } = await serviceSupabase.storage
          .from('assets')
          .remove(paths);
        if (storageError) {
          console.error('Failed to clean up content piece assets from storage:', storageError);
        }
      }
    }

    // 3. Delete content piece from DB (cascades RLS and junction prunings)
    const { error: dbError } = await supabase
      .from('content_pieces')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (dbError) {
      console.error('deleteContentPiece DB Error:', dbError);
      return { success: false, error: dbError.message };
    }

    // 4. Revalidate paths
    revalidatePath('/content');
    if (junctions) {
      junctions.forEach((j) => {
        revalidatePath(`/pillars/${j.pillar_id}`);
      });
    }
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to associate a secondary Content Pillar to a content piece.
 */
export async function associateSecondaryPillar(
  pieceId: string,
  pillarId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    
    // Check if the link already exists
    const { data: existing } = await supabase
      .from('pillar_content')
      .select('*')
      .eq('piece_id', pieceId)
      .eq('pillar_id', pillarId)
      .single();

    if (existing) {
      return { success: true }; // already linked
    }

    const { error } = await supabase
      .from('pillar_content')
      .insert({
        user_id: userId,
        piece_id: pieceId,
        pillar_id: pillarId,
        is_primary: false,
      });

    if (error) {
      console.error('associateSecondaryPillar Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/content/${pieceId}`);
    revalidatePath(`/pillars/${pillarId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to dissociate a secondary Content Pillar from a content piece.
 */
export async function dissociateSecondaryPillar(
  pieceId: string,
  pillarId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    
    const { error } = await supabase
      .from('pillar_content')
      .delete()
      .eq('piece_id', pieceId)
      .eq('pillar_id', pillarId)
      .eq('is_primary', false)
      .eq('user_id', userId);

    if (error) {
      console.error('dissociateSecondaryPillar Error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/content/${pieceId}`);
    revalidatePath(`/pillars/${pillarId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to promote a quick capture to a new Content Piece.
 */
export async function promoteToContentPiece(
  captureId: string,
  title: string,
  type: 'caption' | 'script' | 'video' | 'short_form',
  body: string,
  primaryPillarId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const userId = await requireAuth();

    if (!title.trim()) {
      return { success: false, error: 'Title is required' };
    }

    if (!primaryPillarId) {
      return { success: false, error: 'Primary Content Pillar is required' };
    }

    // 1. Create content piece
    const pieceRes = await createContentPiece({
      title: title.trim(),
      type,
      body,
      status: 'draft',
      primaryPillarId,
    });

    if (!pieceRes.success || !pieceRes.id) {
      return { success: false, error: pieceRes.error || 'Failed to create content piece' };
    }

    // 2. Promote the capture
    const promoteRes = await promoteCapture(captureId, 'content_piece', pieceRes.id);
    if (!promoteRes.success) {
      return { success: false, error: promoteRes.error || 'Failed to promote quick capture' };
    }

    revalidatePath('/');
    revalidatePath('/inbox');
    revalidatePath('/content');
    return { success: true, id: pieceRes.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}
