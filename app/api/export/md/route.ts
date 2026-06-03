import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { compilePillarToMarkdown } from '@/lib/export/compile-pillar';
import { compileProductToMarkdown } from '@/lib/export/compile-product';
import { compileResearchToMarkdown } from '@/lib/export/compile-research';

export const revalidate = 0; // Dynamic route

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return new NextResponse('Missing required parameters: type and id', { status: 400 });
    }

    let result: { filename: string; markdown: string };

    switch (type) {
      case 'pillar':
        result = await compilePillarToMarkdown(id, userId);
        break;
      case 'product':
        result = await compileProductToMarkdown(id, userId);
        break;
      case 'pillar-research':
        result = await compileResearchToMarkdown(id, userId);
        break;
      default:
        return new NextResponse(`Invalid export type: ${type}`, { status: 400 });
    }

    const encoder = new TextEncoder();
    const markdownBytes = encoder.encode(result.markdown);

    return new Response(markdownBytes, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': markdownBytes.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Markdown Export API Error:', err);
    const status = err.message?.includes('not found') ? 404 : 500;
    return new NextResponse(err.message || 'Internal Server Error', { status });
  }
}
