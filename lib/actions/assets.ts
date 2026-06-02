'use server';

import { createClerkSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { revalidatePath } from 'next/cache';

/**
 * Validates file type and returns standard asset enum mapping.
 */
function getAssetFileType(mimeType: string): 'image' | 'pdf' | 'video' | null {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return null;
}

interface ParentId {
  research_entry_id?: string;
  content_piece_id?: string;
}

/**
 * Server Action to upload an asset to the private Supabase storage bucket 'assets'
 * and insert the record into the 'assets' table.
 * Gated by a 50MB size limit and only allows images, PDFs, and videos.
 */
export async function uploadAsset(
  formData: FormData,
  parentId: ParentId
): Promise<{ success: boolean; asset?: any; error?: string }> {
  try {
    const userId = await requireAuth();

    // 1. Verify parent constraints
    if (!parentId.research_entry_id && !parentId.content_piece_id) {
      return { success: false, error: 'Asset must be attached to a parent' };
    }
    if (parentId.research_entry_id && parentId.content_piece_id) {
      return { success: false, error: 'Asset cannot be attached to multiple parents' };
    }

    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    // 2. Validate Size (< 50MB)
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      return { success: false, error: 'File size exceeds the 50MB limit' };
    }

    // 3. Validate MIME Type
    const mappedFileType = getAssetFileType(file.type);
    if (!mappedFileType) {
      return {
        success: false,
        error: 'Unsupported file format. Only images, PDFs, and videos are allowed.',
      };
    }

    // 4. Read file content to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = await createClerkSupabaseClient();
    const serviceSupabase = createServiceRoleSupabaseClient();

    // 5. Build unique storage path
    const fileExtension = file.name.split('.').pop() || '';
    const parentFolder = parentId.research_entry_id || parentId.content_piece_id;
    const storagePath = `${userId}/${parentFolder}/${crypto.randomUUID()}.${fileExtension}`;

    // 6. Upload to private Supabase Storage using service role
    const { error: storageError } = await serviceSupabase.storage
      .from('assets')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (storageError) {
      console.error('Storage Upload Error:', storageError);
      return { success: false, error: 'Failed to upload file to storage' };
    }

    // 7. Generate a 1-year Signed URL
    const { data: urlData, error: urlError } = await serviceSupabase.storage
      .from('assets')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry

    if (urlError || !urlData?.signedUrl) {
      console.error('Signed URL Error:', urlError);
      // Clean up uploaded file if URL generation fails
      await serviceSupabase.storage.from('assets').remove([storagePath]);
      return { success: false, error: 'Failed to generate access URL' };
    }

    // 8. Insert asset metadata into DB via authenticated client
    const { data: assetData, error: dbError } = await supabase
      .from('assets')
      .insert({
        user_id: userId,
        research_entry_id: parentId.research_entry_id || null,
        content_piece_id: parentId.content_piece_id || null,
        file_type: mappedFileType,
        storage_path: storagePath,
        url: urlData.signedUrl,
        file_name: file.name,
        file_size_bytes: file.size,
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB Asset Insert Error:', dbError);
      // Clean up uploaded file if DB insert fails
      await serviceSupabase.storage.from('assets').remove([storagePath]);
      return { success: false, error: dbError.message };
    }

    // 9. Revalidate cache if research entry
    if (parentId.research_entry_id) {
      // Find the pillar ID to revalidate
      const { data: entry } = await supabase
        .from('research_entries')
        .select('pillar_id')
        .eq('id', parentId.research_entry_id)
        .single();
      if (entry?.pillar_id) {
        revalidatePath(`/pillars/${entry.pillar_id}`);
      }
    }

    return { success: true, asset: assetData };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}

/**
 * Server Action to delete an asset, removing its storage file and DB row.
 */
export async function deleteAsset(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAuth();

    const supabase = await createClerkSupabaseClient();
    const serviceSupabase = createServiceRoleSupabaseClient();

    // 1. Fetch asset details to check ownership and storage path
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchError || !asset) {
      return { success: false, error: 'Asset not found or unauthorized' };
    }

    // 2. Remove from Storage if storage_path exists
    if (asset.storage_path) {
      const { error: removeError } = await serviceSupabase.storage
        .from('assets')
        .remove([asset.storage_path]);

      if (removeError) {
        console.error('Storage Removal Error:', removeError);
        // We will continue with DB deletion anyway, or return error?
        // Let's log it, but proceed so DB doesn't refer to dead files.
      }
    }

    // 3. Delete from DB
    const { error: dbDeleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (dbDeleteError) {
      console.error('DB Asset Delete Error:', dbDeleteError);
      return { success: false, error: dbDeleteError.message };
    }

    // 4. Revalidate cache
    if (asset.research_entry_id) {
      const { data: entry } = await supabase
        .from('research_entries')
        .select('pillar_id')
        .eq('id', asset.research_entry_id)
        .single();
      if (entry?.pillar_id) {
        revalidatePath(`/pillars/${entry.pillar_id}`);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unauthorized' };
  }
}
