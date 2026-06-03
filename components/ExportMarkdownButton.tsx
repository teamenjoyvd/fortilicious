'use client';

import { useState } from 'react';
import { Download, Loader2, Check, AlertCircle } from 'lucide-react';

interface ExportMarkdownButtonProps {
  type: 'pillar' | 'product' | 'pillar-research';
  id: string;
  label?: string;
  className?: string;
}

export default function ExportMarkdownButton({
  type,
  id,
  label,
  className = '',
}: ExportMarkdownButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Default labels if not provided
  const getDefaultLabel = () => {
    switch (type) {
      case 'pillar':
        return 'Export Full Pillar';
      case 'product':
        return 'Export Product Sheet';
      case 'pillar-research':
        return 'Export Research Notes';
      default:
        return 'Export Markdown';
    }
  };

  const buttonLabel = label || getDefaultLabel();

  const handleExport = async () => {
    if (status === 'loading') return;
    setStatus('loading');

    try {
      const response = await fetch(`/api/export/md?type=${type}&id=${id}`, {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to download markdown file.');
      }

      // Try to parse filename from Content-Disposition header
      const disposition = response.headers.get('content-disposition');
      let filename = `${type}_export_${id.slice(0, 8)}.md`;
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err: any) {
      console.error('Export error:', err);
      setStatus('error');
      alert(`Export failed: ${err.message || 'Unknown error'}`);
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const hasHeight = className.includes('h-');
  const hasRounded = className.includes('rounded-');
  const baseClasses = `px-3.5 bg-white border border-border-warm text-text-secondary hover:text-text-primary hover:border-primary/45 flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${hasHeight ? '' : 'h-9'} ${hasRounded ? '' : 'rounded-lg'}`;

  return (
    <button
      onClick={handleExport}
      disabled={status === 'loading'}
      className={`${baseClasses} ${className}`}
      title={buttonLabel}
    >
      {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
      {status === 'success' && <Check className="w-4 h-4 text-sage shrink-0" />}
      {status === 'error' && <AlertCircle className="w-4 h-4 text-burgundy shrink-0" />}
      {status === 'idle' && <Download className="w-4 h-4 text-text-secondary group-hover:text-text-primary shrink-0" />}
      
      <span className="text-xs font-bold font-ui-label">{buttonLabel}</span>
    </button>
  );
}
