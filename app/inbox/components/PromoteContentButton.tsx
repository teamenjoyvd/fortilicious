'use client';

import { useState } from 'react';
import { promoteToContentPiece } from '@/lib/actions/content';
import { FileText, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PillarOption {
  id: string;
  title: string;
}

interface PromoteContentButtonProps {
  captureId: string;
  captureBody: string;
  pillars: PillarOption[];
}

export default function PromoteContentButton({
  captureId,
  captureBody,
  pillars,
}: PromoteContentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'caption' | 'script' | 'video' | 'short_form'>('script');
  const [primaryPillarId, setPrimaryPillarId] = useState(pillars[0]?.id || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Title is required');
      return;
    }
    if (!primaryPillarId) {
      setErrorMsg('Please select a primary Content Pillar');
      return;
    }

    setIsPending(true);
    setErrorMsg('');

    try {
      const res = await promoteToContentPiece(
        captureId,
        title.trim(),
        type,
        captureBody,
        primaryPillarId
      );

      if (res.success) {
        setIsOpen(false);
        setTitle('');
        router.refresh();
        router.push(`/content/${res.id}`); // direct check-out to workspace editor!
      } else {
        setErrorMsg(res.error || 'Failed to promote capture to content piece');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setErrorMsg('');
          if (pillars.length > 0 && !primaryPillarId) {
            setPrimaryPillarId(pillars[0].id);
          }
        }}
        className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 h-16 rounded-xl bg-white border border-border-warm text-primary hover:bg-primary-fixed transition-all duration-200 active:scale-95"
        title="Promote to Workspace Content"
      >
        <FileText className="w-5 h-5 text-primary" />
        <span className="text-[11px] font-bold font-ui-label">Process Draft</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-border-warm rounded-3xl p-6 relative flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-surface border border-border-warm text-text-secondary hover:text-text-primary rounded-lg transition-colors active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-1 border-b border-border-warm/50 pb-3">
              <h3 className="text-lg font-serif font-bold text-text-primary">Promote to Content Piece</h3>
              <p className="text-xs text-text-secondary font-sans">
                Seed a new post draft or caption script using this capture.
              </p>
            </div>

            {pillars.length === 0 ? (
              <div className="flex flex-col gap-4 text-center py-4">
                <p className="text-xs text-text-secondary leading-relaxed font-sans">
                  You must create at least one evergreen Content Pillar before creating content pieces.
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/pillars');
                  }}
                  className="h-11 bg-primary text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-primary/10"
                >
                  Create Content Pillar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary font-ui-label">Script Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 3 Hydration Hacks for Artistry Glow"
                    className="h-11 px-3.5 text-sm bg-surface border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-text-secondary/40 transition-all font-sans"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text-secondary font-ui-label">Content Type</label>
                    <select
                      value={type}
                      onChange={(e: any) => setType(e.target.value)}
                      className="h-11 px-2.5 text-xs bg-surface border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer font-sans"
                    >
                      <option value="script">Script Outline</option>
                      <option value="caption">Post Caption</option>
                      <option value="short_form">Short-form Video</option>
                      <option value="video">Long-form Video</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-text-secondary font-ui-label">Primary Pillar</label>
                    <select
                      value={primaryPillarId}
                      onChange={(e) => setPrimaryPillarId(e.target.value)}
                      className="h-11 px-2.5 text-xs bg-surface border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer font-sans"
                    >
                      {pillars.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-text-secondary font-ui-label">Draft Content (Source Capture)</label>
                  <div className="p-3 text-xs bg-surface-container-low border border-border-warm text-text-secondary rounded-xl max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed custom-scrollbar">
                    {captureBody}
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg animate-in shake duration-200">
                    {errorMsg}
                  </p>
                )}

                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 h-11 border border-border-warm text-text-secondary hover:text-text-primary hover:bg-surface-container-low text-xs font-bold rounded-xl transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 h-11 bg-primary disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 transition-all active:scale-95"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Confirm Promotion'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
