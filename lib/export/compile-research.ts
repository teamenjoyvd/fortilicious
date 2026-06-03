/**
 * lib/export/compile-research.ts — Compile Pillar Research & Bookmarks to Markdown
 */

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { formatDate } from './utils';

export async function compileResearchToMarkdown(
  pillarId: string,
  userId: string
): Promise<{ filename: string; markdown: string }> {
  const supabase = await createClerkSupabaseClient();

  // 1. Fetch Pillar details to verify ownership & get title
  const { data: pillar, error: pillarError } = await supabase
    .from('content_pillars')
    .select('title')
    .eq('id', pillarId)
    .eq('user_id', userId)
    .single();

  if (pillarError || !pillar) {
    throw new Error('Content pillar not found or unauthorized');
  }

  // 2. Fetch Research Entries
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

  // Pre-generate signed URLs for all assets
  const assetMap = new Map<string, string>();
  const allAssets: any[] = [];

  if (researchEntries) {
    researchEntries.forEach((entry: any) => {
      if (entry.assets) {
        allAssets.push(...entry.assets);
      }
    });
  }

  for (const asset of allAssets) {
    if (asset.storage_path && !assetMap.has(asset.id)) {
      try {
        const { data: signedData } = await supabase.storage
          .from('assets')
          .createSignedUrl(asset.storage_path, 60 * 60 * 24 * 7); // 7-day expiry
        
        if (signedData?.signedUrl) {
          assetMap.set(asset.id, signedData.signedUrl);
        } else if (asset.url) {
          assetMap.set(asset.id, asset.url);
        }
      } catch (err) {
        console.error(`Error signing URL for asset ${asset.id}:`, err);
        if (asset.url) assetMap.set(asset.id, asset.url);
      }
    } else if (asset.url) {
      assetMap.set(asset.id, asset.url);
    }
  }

  // START MARKDOWN COMPILATION
  let md = `# Research & Bookmarks: ${pillar.title}\n\n`;
  md += `**Exported On:** ${formatDate(new Date().toISOString())}\n\n`;
  md += `This document contains all research notes and bookmarks collected under the **${pillar.title}** content pillar.\n\n`;
  md += `---\n\n`;

  const researchList = researchEntries || [];
  if (researchList.length === 0) {
    md += `_No research notes or bookmarks have been added to this pillar yet._\n\n`;
  } else {
    for (const entry of researchList) {
      const pinIndicator = entry.pinned ? '⭐ ' : '';
      md += `## ${pinIndicator}${entry.title}\n`;
      md += `* **Type:** ${entry.type === 'link' ? 'Bookmark Link' : 'Research Note'}\n`;
      md += `* **Logged:** ${formatDate(entry.created_at)}\n`;
      if (entry.url) {
        md += `* **Source URL:** [${entry.url}](${entry.url})\n`;
      }
      md += `\n`;

      if (entry.body) {
        md += `${entry.body}\n\n`;
      }

      // Attachments for this entry
      const entryAssets = entry.assets || [];
      if (entryAssets.length > 0) {
        md += `### Attachments\n`;
        for (const asset of entryAssets) {
          const signedUrl = assetMap.get(asset.id) || asset.url || '#';
          md += `* [${asset.file_name || 'Attachment'}](${signedUrl}) (${asset.file_type || 'unknown'})\n`;
        }
        md += `\n`;
      }

      md += `---\n\n`;
    }
  }

  // Safe filename
  const safeTitle = pillar.title.toLowerCase().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  const filename = `research_${safeTitle}_${pillarId.slice(0, 8)}.md`;

  return { filename, markdown: md };
}
