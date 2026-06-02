import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/proxy';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/server';

/**
 * API route to securely test/execute file uploads to the private Supabase Storage bucket.
 * Accessible only by authenticated Clerk users.
 * Bypasses client-side Supabase uploads to maintain service role key confidentiality.
 */
export async function POST(request: Request) {
  try {
    // 1. Verify user session via Clerk
    const userId = await requireAuth();

    // 2. Parse request Form Data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // 3. Server-side validations (MIME and size check)
    // Validate file size limit: 50 MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 50 MB limit' },
        { status: 413 }
      );
    }

    // Validate MIME types: images, PDFs, and videos
    const allowedTypes = ['image/', 'application/pdf', 'video/'];
    const isAllowed = allowedTypes.some((type) => file.type.startsWith(type));

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Unsupported file type. Only images, PDFs, and videos are allowed.' },
        { status: 400 }
      );
    }

    // 4. Stream upload to Supabase Storage using service role client
    const supabase = createServiceRoleSupabaseClient();
    
    // Construct a secure, unique folder path for the user
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${crypto.randomUUID()}.${fileExtension}`;
    const storagePath = `${userId}/${uniqueFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('assets')
      .upload(storagePath, buffer, {
        contentType: file.type,
        duplex: 'half',
      });

    if (error) {
      console.error('Storage Upload Error:', error);
      return NextResponse.json(
        { error: `Upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      storagePath: data.path,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Upload Route Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
