import { createClerkSupabaseClient, createServiceRoleSupabaseClient } from '@/lib/supabase/server';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import JSZip from 'jszip';

export const revalidate = 0; // Dynamic route

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * API Route Handler to stream a zipped archive of all assets associated with a content piece.
 * Checks size limits (< 200MB) to protect server memory, reads secure streams, and bundles.
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    const supabase = await createClerkSupabaseClient();
    const serviceSupabase = createServiceRoleSupabaseClient();

    // 1. Fetch content piece details to verify ownership
    const { data: piece, error: pieceError } = await supabase
      .from('content_pieces')
      .select('title')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (pieceError || !piece) {
      return new NextResponse('Content piece not found or unauthorized', { status: 404 });
    }

    // 2. Fetch associated assets
    const { data: assets, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .eq('content_piece_id', id)
      .eq('user_id', userId);

    if (assetsError) {
      console.error('Fetch assets error:', assetsError);
      return new NextResponse('Failed to retrieve associated assets', { status: 500 });
    }

    if (!assets || assets.length === 0) {
      return new NextResponse('No assets found to bundle', { status: 400 });
    }

    // 3. Size Validation (< 200MB)
    const totalSizeBytes = assets.reduce((acc, a) => acc + (a.file_size_bytes || 0), 0);
    const LIMIT_200MB = 200 * 1024 * 1024; // 200MB
    if (totalSizeBytes > LIMIT_200MB) {
      return new NextResponse('Bundle size exceeds 200MB server memory limit', { status: 413 });
    }

    // 4. Create zip archive
    const zip = new JSZip();
    const addedFiles = new Set<string>();

    for (const asset of assets) {
      if (!asset.storage_path) continue;

      // Handle duplicate file names in zip by appending a counter
      let fileName = asset.file_name || `file_${asset.id}`;
      if (addedFiles.has(fileName)) {
        const parts = fileName.split('.');
        const ext = parts.pop();
        const base = parts.join('.');
        fileName = `${base}_${crypto.randomUUID().slice(0, 4)}.${ext}`;
      }
      addedFiles.add(fileName);

      // Download raw content from private Supabase Storage
      const { data: fileData, error: downloadError } = await serviceSupabase.storage
        .from('assets')
        .download(asset.storage_path);

      if (downloadError || !fileData) {
        console.error(`Failed to download asset ${asset.file_name} from storage:`, downloadError);
        continue; // skip this file but build bundle for others
      }

      const fileBuffer = Buffer.from(await fileData.arrayBuffer());
      zip.file(fileName, fileBuffer);
    }

    // 5. Generate zip uint8array
    const zipBuffer = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // 6. Return response stream
    const safeTitle = piece.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const zipFileName = `bundle_${safeTitle}_${id.slice(0, 8)}.zip`;

    return new Response(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Content-Length': zipBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('ZIP Bundle Exception:', err);
    return new NextResponse(err.message || 'Internal server error', { status: 500 });
  }
}
