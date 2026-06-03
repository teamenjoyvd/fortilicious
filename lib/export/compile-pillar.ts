/**
 * lib/export/compile-pillar.ts — Compile Full Content Pillar graph to Markdown
 */

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { formatDate, escapeMarkdown } from './utils';

export async function compilePillarToMarkdown(
  pillarId: string,
  userId: string
): Promise<{ filename: string; markdown: string }> {
  const supabase = await createClerkSupabaseClient();

  // 1. Fetch Pillar details
  const { data: pillar, error: pillarError } = await supabase
    .from('content_pillars')
    .select('*')
    .eq('id', pillarId)
    .eq('user_id', userId)
    .single();

  if (pillarError || !pillar) {
    throw new Error('Content pillar not found or unauthorized');
  }

  // 2. Fetch Connected Products
  const { data: pillarProducts, error: prodError } = await supabase
    .from('pillar_products')
    .select('notes, products(*)')
    .eq('pillar_id', pillarId)
    .eq('user_id', userId);

  if (prodError) {
    console.error('Fetch pillar products error:', prodError);
  }

  // 3. Fetch Research Entries & Bookmarks (with nested assets)
  const { data: researchEntries, error: researchError } = await supabase
    .from('research_entries')
    .select('*, assets(*)')
    .eq('pillar_id', pillarId)
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (researchError) {
    console.error('Fetch research entries error:', researchError);
  }

  // 4. Fetch Connected Content Pieces (with nested assets)
  const { data: pillarContent, error: contentError } = await supabase
    .from('pillar_content')
    .select('is_primary, content_pieces(*)')
    .eq('pillar_id', pillarId)
    .eq('user_id', userId);

  if (contentError) {
    console.error('Fetch content pieces error:', contentError);
  }

  // Pre-generate signed URLs for all assets to avoid slow sequential calls
  const assetMap = new Map<string, string>();
  const allAssets: any[] = [];

  if (researchEntries) {
    researchEntries.forEach((entry: any) => {
      if (entry.assets) {
        allAssets.push(...entry.assets);
      }
    });
  }

  if (pillarContent) {
    // We'll need to fetch assets for content pieces since they aren't auto-nested
    const pieceIds = pillarContent
      .map((pc: any) => pc.content_pieces?.id)
      .filter(Boolean);

    if (pieceIds.length > 0) {
      const { data: pieceAssets } = await supabase
        .from('assets')
        .select('*')
        .in('content_piece_id', pieceIds)
        .eq('user_id', userId);
      
      if (pieceAssets) {
        allAssets.push(...pieceAssets);
      }
    }
  }

  // Fetch signed URLs for storage paths in bulk to avoid N+1 queries
  const assetsToSign = allAssets.filter(asset => asset.storage_path && !assetMap.has(asset.id));
  if (assetsToSign.length > 0) {
    try {
      const paths = assetsToSign.map(asset => asset.storage_path);
      const { data: signedData, error: signError } = await supabase.storage
        .from('assets')
        .createSignedUrls(paths, 60 * 60 * 24 * 7); // 7-day expiry

      if (signError) {
        console.error('Error bulk signing URLs:', signError);
      }

      assetsToSign.forEach((asset, index) => {
        const signedUrl = signedData?.[index]?.signedUrl;
        if (signedUrl) {
          assetMap.set(asset.id, signedUrl);
        } else if (asset.url) {
          assetMap.set(asset.id, asset.url);
        }
      });
    } catch (err) {
      console.error('Error bulk signing URLs:', err);
      assetsToSign.forEach(asset => {
        if (asset.url) assetMap.set(asset.id, asset.url);
      });
    }
  }

  for (const asset of allAssets) {
    if (!asset.storage_path && asset.url) {
      assetMap.set(asset.id, asset.url);
    }
  }

  // START MARKDOWN COMPILATION
  let md = `# ${pillar.title}\n\n`;
  md += `**Status:** ${pillar.status.toUpperCase()}\n`;
  md += `**Exported On:** ${formatDate(new Date().toISOString())}\n\n`;

  md += `## Strategy & Description\n`;
  md += `${pillar.description || '_No strategy description logged yet._'}\n\n`;
  md += `---\n\n`;

  // PRODUCTS SECTION
  md += `## Connected Products\n\n`;
  const productsList = pillarProducts || [];
  if (productsList.length === 0) {
    md += `_No products linked to this content pillar._\n\n`;
  } else {
    for (const item of productsList) {
      const prod = item.products;
      if (!prod) continue;

      md += `### Product: ${prod.name}\n`;
      md += `* **Brand:** ${prod.brand ? escapeMarkdown(prod.brand) : 'N/A'}\n`;
      md += `* **Category:** ${prod.category ? escapeMarkdown(prod.category) : 'N/A'}\n`;
      if (prod.price !== null) md += `* **Price:** $${prod.price}\n`;
      if (prod.wholesale_price !== null) md += `* **Wholesale Price:** $${prod.wholesale_price}\n`;
      if (prod.pv !== null) md += `* **PV:** ${prod.pv}\n`;
      if (prod.numeric_sku) md += `* **SKU:** ${prod.numeric_sku}\n`;
      md += `\n`;

      if (item.notes) {
        md += `#### Connection Notes\n`;
        md += `${item.notes}\n\n`;
      }

      // Fetch Product Facts (grouped by category)
      const { data: facts } = await supabase
        .from('product_facts')
        .select('*')
        .eq('product_id', prod.id)
        .eq('user_id', userId);

      md += `#### Fact Curation\n`;
      const approvedFacts = (facts || []).filter(f => f.approved);
      if (approvedFacts.length === 0) {
        md += `_No approved facts curated for this product yet._\n\n`;
      } else {
        const categories = ['benefit', 'science', 'usage', 'fun_fact', 'general'];
        const catLabels: Record<string, string> = {
          benefit: 'Health Benefits',
          science: 'Scientific Details',
          usage: 'Usage & Application',
          fun_fact: 'Fun Facts & Stories',
          general: 'General Insights',
        };

        for (const cat of categories) {
          const catFacts = approvedFacts.filter(f => f.category === cat);
          if (catFacts.length > 0) {
            md += `##### ${catLabels[cat]}\n`;
            for (const fact of catFacts) {
              md += `* **${fact.title}**: ${fact.body}`;
              if (fact.source_url) {
                md += ` ([Source](${fact.source_url}))`;
              }
              md += `\n`;
            }
            md += `\n`;
          }
        }
      }
    }
  }

  md += `---\n\n`;

  // RESEARCH & BOOKMARKS SECTION
  md += `## Research & Bookmarks\n\n`;
  const researchList = researchEntries || [];
  if (researchList.length === 0) {
    md += `_No research notes or bookmarks logged under this pillar._\n\n`;
  } else {
    for (const entry of researchList) {
      const pinIndicator = entry.pinned ? '⭐ ' : '';
      md += `### ${pinIndicator}${entry.title}\n`;
      md += `* **Type:** ${entry.type === 'link' ? 'Bookmark Link' : 'Research Note'}\n`;
      md += `* **Created:** ${formatDate(entry.created_at)}\n`;
      if (entry.url) {
        md += `* **URL:** [${entry.url}](${entry.url})\n`;
      }
      md += `\n`;

      if (entry.body) {
        md += `${entry.body}\n\n`;
      }

      // Attachments for this entry
      const entryAssets = entry.assets || [];
      if (entryAssets.length > 0) {
        md += `#### Attachments\n`;
        for (const asset of entryAssets) {
          const signedUrl = assetMap.get(asset.id) || asset.url || '#';
          md += `* [${asset.file_name || 'Attachment'}](${signedUrl}) (${asset.file_type || 'unknown'})\n`;
        }
        md += `\n`;
      }
    }
  }

  md += `---\n\n`;

  // CONTENT PIECES SECTION
  md += `## Content Scripts & Pieces\n\n`;
  const contentList = pillarContent || [];
  if (contentList.length === 0) {
    md += `_No content pieces mapped to this pillar._\n\n`;
  } else {
    for (const item of contentList) {
      const piece = item.content_pieces;
      if (!piece) continue;

      const primaryLabel = item.is_primary ? ' [Primary]' : '';
      md += `### ${piece.title}${primaryLabel}\n`;
      md += `* **Type:** ${piece.type.toUpperCase().replace('_', ' ')}\n`;
      md += `* **Status:** ${piece.status.toUpperCase()}\n`;
      md += `\n`;

      if (piece.body) {
        md += `#### Script Body\n`;
        md += `\`\`\`markdown\n`;
        md += `${piece.body}\n`;
        md += `\`\`\`\n\n`;
      }

      // Attachments for content piece
      const pieceAssets = allAssets.filter(a => a.content_piece_id === piece.id);
      if (pieceAssets.length > 0) {
        md += `#### Assets\n`;
        for (const asset of pieceAssets) {
          const signedUrl = assetMap.get(asset.id) || asset.url || '#';
          md += `* [${asset.file_name || 'Asset'}](${signedUrl}) (${asset.file_type || 'unknown'})\n`;
        }
        md += `\n`;
      }
    }
  }

  // Safe filename
  const safeTitle = pillar.title.toLowerCase().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  const filename = `pillar_${safeTitle}_${pillarId.slice(0, 8)}.md`;

  return { filename, markdown: md };
}
