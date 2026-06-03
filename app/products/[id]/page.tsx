import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/proxy';
import { notFound } from 'next/navigation';
import ProductWorkspaceClient from './components/ProductWorkspaceClient';

export const revalidate = 0; // Dynamic route

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export default async function ProductWorkspacePage({ params, searchParams }: ProductPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const productId = resolvedParams.id;
  const initialTab = resolvedSearchParams.tab || 'brain';

  let userId: string;
  try {
    userId = await requireAuth();
  } catch (err) {
    notFound();
  }

  const supabase = await createClerkSupabaseClient();

  // 1. Fetch Product
  const { data: product, error: prodError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('user_id', userId)
    .single();

  if (prodError || !product) {
    notFound();
  }

  // 2. Fetch Facts
  const { data: facts } = await supabase
    .from('product_facts')
    .select('*')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // 3. Fetch Connected Content Pillars
  const { data: pillarProducts } = await supabase
    .from('pillar_products')
    .select('notes, content_pillars(*)')
    .eq('product_id', productId)
    .eq('user_id', userId);

  const pillars = (pillarProducts || [])
    .map((p: any) => {
      if (!p.content_pillars) return null;
      return {
        ...p.content_pillars,
        connection_notes: p.notes,
      };
    })
    .filter(Boolean);

  // 4. Fetch Connected Content Pieces (sequential query to avoid complex join query constraints)
  const pillarIds = pillars.map((p: any) => p.id);
  let contentPieces: any[] = [];

  if (pillarIds.length > 0) {
    const { data: pillarContent } = await supabase
      .from('pillar_content')
      .select('piece_id, pillar_id, content_pieces(*)')
      .in('pillar_id', pillarIds)
      .eq('user_id', userId);

    const seenPieceIds = new Set<string>();
    const piecesList: any[] = [];

    if (pillarContent) {
      for (const item of pillarContent) {
        if (item.content_pieces && !seenPieceIds.has(item.piece_id)) {
          seenPieceIds.add(item.piece_id);
          const assocPillar = pillars.find((p: any) => p.id === item.pillar_id);
          piecesList.push({
            ...item.content_pieces,
            pillar_title: assocPillar ? assocPillar.title : 'Associated Pillar',
          });
        }
      }
    }
    contentPieces = piecesList;
  }

  return (
    <ProductWorkspaceClient
      product={product}
      initialFacts={facts || []}
      pillars={pillars}
      contentPieces={contentPieces}
      initialTab={initialTab}
    />
  );
}
