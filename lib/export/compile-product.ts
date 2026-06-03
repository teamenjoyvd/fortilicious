/**
 * lib/export/compile-product.ts — Compile Single Product details to Markdown
 */

import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { formatDate, escapeMarkdown } from './utils';

export async function compileProductToMarkdown(
  productId: string,
  userId: string
): Promise<{ filename: string; markdown: string }> {
  const supabase = await createClerkSupabaseClient();

  // 1. Fetch Product metadata
  const { data: product, error: prodError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .eq('user_id', userId)
    .single();

  if (prodError || !product) {
    throw new Error('Product not found or unauthorized');
  }

  // 2. Fetch Facts (both approved and suggested/unapproved)
  const { data: facts, error: factsError } = await supabase
    .from('product_facts')
    .select('*')
    .eq('product_id', productId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (factsError) {
    console.error('Fetch product facts error:', factsError);
  }

  // 3. Fetch Connected Content Pillars (reverse lookup)
  const { data: pillarProducts, error: pillarError } = await supabase
    .from('pillar_products')
    .select('notes, content_pillars(*)')
    .eq('product_id', productId)
    .eq('user_id', userId);

  if (pillarError) {
    console.error('Fetch reverse pillar products error:', pillarError);
  }

  // START MARKDOWN COMPILATION
  let md = `# Product Factsheet: ${product.name}\n\n`;
  md += `**Brand:** ${product.brand ? escapeMarkdown(product.brand) : 'N/A'}\n`;
  md += `**Category:** ${product.category ? escapeMarkdown(product.category) : 'N/A'}\n`;
  if (product.numeric_sku) md += `**SKU:** ${product.numeric_sku}\n`;
  md += `**Exported On:** ${formatDate(new Date().toISOString())}\n\n`;

  // Specs & Pricing
  md += `## Specifications & Pricing\n`;
  if (product.price !== null) md += `* **Retail Price:** $${product.price}\n`;
  if (product.wholesale_price !== null) md += `* **Wholesale Price:** $${product.wholesale_price}\n`;
  if (product.pv !== null) md += `* **Point Value (PV):** ${product.pv}\n`;
  md += `* **Source Catalog:** ${product.source ? escapeMarkdown(product.source) : 'N/A'}\n`;
  md += `* **Sync Locked:** ${product.sync_locked ? 'Yes' : 'No'}\n`;
  md += `* **Status:** ${product.active ? 'Active Listing' : 'Discontinued'}\n\n`;

  md += `## Product Description\n`;
  md += `${product.description || '_No description registered._'}\n\n`;
  md += `---\n\n`;

  // Curation / Fact Sheet
  md += `## Fact Curation\n\n`;
  const allFacts = facts || [];
  if (allFacts.length === 0) {
    md += `_No fact cards curated for this product yet._\n\n`;
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
      const catFacts = allFacts.filter(f => f.category === cat);
      if (catFacts.length > 0) {
        md += `### ${catLabels[cat]}\n`;
        for (const fact of catFacts) {
          const approvalMark = fact.approved ? '' : ' ⚠️ [SUGGESTED]';
          md += `* **${fact.title}**${approvalMark}: ${fact.body}`;
          if (fact.source_url) {
            md += ` ([Source](${fact.source_url}))`;
          }
          md += `\n`;
        }
        md += `\n`;
      }
    }
  }

  md += `---\n\n`;

  // Reverse mapping to Pillars
  md += `## Connected Content Pillars\n\n`;
  const connections = pillarProducts || [];
  if (connections.length === 0) {
    md += `_This product is not linked to any content pillars._\n\n`;
  } else {
    for (const item of connections) {
      const pillar = item.content_pillars;
      if (!pillar) continue;

      md += `### Pillar: ${pillar.title}\n`;
      md += `* **Status:** ${pillar.status.toUpperCase()}\n`;
      if (item.notes) {
        md += `* **Connection Notes:** ${item.notes}\n`;
      }
      md += `\n`;
    }
  }

  // Safe filename
  const safeName = product.name.toLowerCase().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
  const filename = `product_${safeName}_${productId.slice(0, 8)}.md`;

  return { filename, markdown: md };
}
