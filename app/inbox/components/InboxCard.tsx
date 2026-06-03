'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, ChevronDown, Trash2, Lightbulb } from 'lucide-react';
import PromotePillarButton from './PromotePillarButton';
import PromoteContentButton from './PromoteContentButton';
import { deleteCapture } from '@/lib/actions/captures';

interface PillarOption {
  id: string;
  title: string;
}

interface InboxCardProps {
  item: {
    id: string;
    body: string;
    promoted_to: string | null;
    promoted_id: string | null;
    created_at: string;
  };
  pillars: PillarOption[];
}

export default function InboxCard({ item, pillars }: InboxCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  async function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation(); // Prevent toggling expand state
    if (!confirm('Are you sure you want to dismiss/delete this capture?')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await deleteCapture(item.id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to delete capture');
        setIsDeleting(false);
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
      setIsDeleting(false);
    }
  }

  // Get a snippet of the body for the collapsed view header
  const bodySnippet = item.body.trim().split('\n')[0] || '';
  const displayTitle = bodySnippet.length > 50 ? `${bodySnippet.slice(0, 50)}...` : bodySnippet;

  return (
    <div 
      className={`bg-surface-mid border border-border-warm rounded-2xl warm-shadow overflow-hidden transition-all duration-300 font-sans ${
        isDeleting ? 'opacity-40 pointer-events-none scale-95' : 'hover:border-primary/20'
      }`}
    >
      {/* Header (Tap area) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-4 cursor-pointer select-none"
      >
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-white border border-border-warm flex items-center justify-center text-primary shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="font-ui-label text-sm font-semibold text-text-primary truncate">
              {displayTitle || 'Unstructured Idea'}
            </h3>
            <p className="text-caption text-xs text-text-secondary mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-text-secondary/60" />
              Logged {new Date(item.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {item.promoted_to && (
            <span className="px-2 py-0.5 rounded bg-accent-green-light border border-[#b4e3be] text-[#2b683a] text-[10px] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Promoted
            </span>
          )}
          <ChevronDown 
            className={`w-5 h-5 text-text-secondary transition-transform duration-300 ${
              isExpanded ? 'rotate-180 text-primary' : ''
            }`} 
          />
        </div>
      </div>

      {/* Expanded Content Drawer */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border-warm/40 bg-white/40 animate-in slide-in-from-top-2 duration-200">
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap py-4 border-b border-border-warm/50 mb-4">
            {item.body}
          </p>

          <div className="flex items-center gap-3">
            {!item.promoted_to ? (
              <>
                <PromotePillarButton captureId={item.id} captureBody={item.body} />
                <PromoteContentButton captureId={item.id} captureBody={item.body} pillars={pillars} />
              </>
            ) : (
              <div className="flex-grow py-3 px-4 bg-surface-container-low rounded-xl text-xs font-semibold text-text-secondary">
                Target reference ID: {item.promoted_id?.slice(0, 8)}... (Promoted to {item.promoted_to.replace('_', ' ')})
              </div>
            )}

            {/* Dismiss (Delete) Button with 48px hit area styling */}
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 h-16 rounded-xl bg-white border border-border-warm text-burgundy hover:bg-red-50 transition-all duration-200 active:scale-95 text-xs font-bold font-ui-label"
              title="Dismiss Capture"
            >
              <Trash2 className="w-5 h-5 text-burgundy" />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
