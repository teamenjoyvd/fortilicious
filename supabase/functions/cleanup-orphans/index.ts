// supabase/functions/cleanup-orphans/index.ts
// Supabase Edge Function to prune orphaned storage files in the private 'assets' bucket.
// Scans the storage files and deletes any file that does not have a corresponding row in the 'assets' table.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Fetch all active storage paths from the database
    const { data: dbAssets, error: dbError } = await supabase
      .from('assets')
      .select('storage_path');

    if (dbError) {
      throw new Error(`Database error fetching assets: ${dbError.message}`);
    }

    const activeDbPaths = new Set(dbAssets.map((a) => a.storage_path).filter(Boolean));

    // 2. Scan Storage for all files in 'assets' bucket
    // Note: Since users upload files into folders like: user_id/parent_id/filename,
    // we need to traverse directories recursively or list recursively.
    const bucketName = 'assets';
    const orphanedPaths: string[] = [];

    // Helper function to recursively list files in storage bucket
    async function listAllFiles(folderPath = ''): Promise<string[]> {
      const files: string[] = [];
      const { data: listData, error: listError } = await supabase.storage
        .from(bucketName)
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' },
        });

      if (listError) {
        console.error(`Error listing folder [${folderPath}]:`, listError);
        return [];
      }

      for (const item of listData) {
        const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;
        
        // Metadata has id, meaning it is a folder or file depending on metadata or lack of metadata
        // In Supabase storage, folders have metadata: null or are virtual.
        // We check if it is a directory by checking if it does not have metadata or size is 0
        if (!item.id || item.metadata === null) {
          // It's a folder, traverse it
          const subFiles = await listAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          // It's a file
          files.push(fullPath);
        }
      }

      return files;
    }

    const allStorageFiles = await listAllFiles();

    // 3. Find orphaned files (in storage but not in database)
    for (const filePath of allStorageFiles) {
      if (!activeDbPaths.has(filePath)) {
        orphanedPaths.push(filePath);
      }
    }

    // 4. Delete orphaned files from Storage
    let deletedCount = 0;
    if (orphanedPaths.length > 0) {
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from(bucketName)
        .remove(orphanedPaths);

      if (deleteError) {
        console.error('Error deleting orphaned files:', deleteError);
      } else {
        deletedCount = deleteData?.length || orphanedPaths.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned_files_count: allStorageFiles.size ?? allStorageFiles.length,
        active_db_files_count: activeDbPaths.size,
        orphaned_files_found: orphanedPaths.length,
        orphaned_files_deleted: deletedCount,
        deleted_paths: orphanedPaths,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Unknown error occurred during orphan cleanup',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
