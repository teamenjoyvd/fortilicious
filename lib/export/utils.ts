/**
 * lib/export/utils.ts — Export System Shared Helpers
 */

/**
 * Escapes markdown control characters to avoid breaking the markdown structure.
 */
export function escapeMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
}

/**
 * Sanitizes a title string to be safe for filenames.
 */
export function sanitizeForFilename(title: string | null | undefined): string {
  if (!title) return 'export';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Formats ISO date string into a standard, clean display format.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}
