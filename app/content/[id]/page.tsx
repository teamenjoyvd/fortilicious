import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import WorkspaceEditor from './components/WorkspaceEditor';

export const revalidate = 0; // Dynamic route

interface ContentPieceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ContentPieceDetailPage({ params }: ContentPieceDetailPageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  let piece: any = null;
  let allPillars: any[] = [];

  try {
    const supabase = await createClerkSupabaseClient();

    // 1. Fetch content piece details, joined junctions, and assets
    const { data: pieceData, error: pieceError } = await supabase
      .from('content_pieces')
      .select('*, assets(*), pillar_content(*, content_pillars(id, title))')
      .eq('id', id)
      .single();

    if (pieceError || !pieceData) {
      console.error('Fetch Content Piece Error:', pieceError);
      notFound();
    }
    piece = pieceData;

    // 2. Fetch all user's active content pillars for dropdown configurations
    const { data: pillarsData } = await supabase
      .from('content_pillars')
      .select('id, title')
      .in('status', ['active', 'live'])
      .order('title', { ascending: true });
    allPillars = pillarsData || [];

  } catch (err) {
    console.error('Failed to load database nodes on workspace canvas:', err);
    notFound();
  }

  return (
    <WorkspaceEditor
      piece={piece}
      allPillars={allPillars}
    />
  );
}
