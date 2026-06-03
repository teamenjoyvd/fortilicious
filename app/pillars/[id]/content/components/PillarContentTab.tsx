'use client';

import { useState } from 'react';
import { createContentPiece } from '@/lib/actions/content';
import { 
  FileText, 
  Plus, 
  ArrowRight, 
  Sparkles, 
  Loader2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContentPiece {
  id: string;
  title: string;
  type: 'caption' | 'script' | 'video' | 'short_form';
  body: string | null;
  status: 'draft' | 'ready' | 'live' | 'archived';
  created_at: string;
}

interface PillarContentJunction {
  is_primary: boolean;
  content_pieces: ContentPiece;
}

interface PillarContentTabProps {
  pillarId: string;
  contentPieces: PillarContentJunction[];
}

export default function PillarContentTab({ pillarId, contentPieces }: PillarContentTabProps) {
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'caption' | 'script' | 'video' | 'short_form'>('script');
  const [body, setBody] = useState('');

  // Async states
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle create
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Title is required');
      return;
    }

    setIsPending(true);
    setErrorMsg('');

    try {
      const res = await createContentPiece({
        title: title.trim(),
        type,
        body: body.trim(),
        primaryPillarId: pillarId,
        status: 'draft',
      });

      if (res.success && res.id) {
        setTitle('');
        setBody('');
        router.refresh();
        router.push(`/content/${res.id}`); // Direct checkout to editor!
      } else {
        setErrorMsg(res.error || 'Failed to create content piece');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  }

  // Format type helper
  function formatTypeName(type: string) {
    switch (type) {
      case 'script': return 'Script Outline';
      case 'caption': return 'Post Caption';
      case 'short_form': return 'Short Video';
      case 'video': return 'Long Video';
      default: return type;
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-300">
      
      {/* Creation Form Panel on Left */}
      <section className="bg-white border border-border-warm rounded-3xl p-6 relative warm-shadow">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text-primary">Draft Script Here</h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Script Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Balancing Insulin and Artistry Skincare"
              className="h-10 px-3.5 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/40 transition-all"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Content Format</label>
            <select
              value={type}
              onChange={(e: any) => setType(e.target.value)}
              className="h-10 px-2.5 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="script">Script Outline</option>
              <option value="caption">Post Caption</option>
              <option value="short_form">Short-form Video</option>
              <option value="video">Long-form Video</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-secondary">Initial Outline Draft</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Write raw thoughts, hooks, or notes to seed the editor..."
              className="p-3.5 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/40 transition-all resize-none"
            />
          </div>

          {errorMsg && (
            <div className="text-xs font-bold text-burgundy bg-burgundy/5 border border-burgundy/20 p-2.5 rounded-lg flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 bg-primary hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Drafting Piece...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Create & Edit
              </>
            )}
          </button>
        </form>
      </section>

      {/* Associated pieces list on Right */}
      <section className="lg:col-span-2 flex flex-col gap-6 w-full">
        {contentPieces.length === 0 ? (
          <div className="glass-panel border border-border-warm rounded-3xl p-12 text-center text-text-secondary flex flex-col items-center justify-center bg-white">
            <FileText className="w-12 h-12 text-text-secondary/40 mb-4" />
            <h3 className="text-sm font-semibold text-text-primary mb-1">No content associated</h3>
            <p className="text-xs text-text-secondary max-w-[280px]">
              Use the sidebar panel to draft your first content piece linked to this evergreen topic cluster.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contentPieces.map((junction) => {
              const item = junction.content_pieces;
              if (!item) return null;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-border-warm hover:border-primary/30 rounded-3xl p-5 flex flex-col justify-between gap-5 group transition-all warm-shadow"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          item.status === 'draft'
                            ? 'bg-surface-container border border-border-warm text-text-secondary'
                            : item.status === 'ready'
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : item.status === 'live'
                            ? 'bg-sage/10 text-sage border border-sage/20'
                            : 'bg-surface-container border border-border-warm text-text-secondary'
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-[10px] font-semibold text-text-secondary flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-text-secondary/60" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm md:text-base font-serif font-bold text-text-primary group-hover:text-primary transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-surface-container border border-border-warm text-text-secondary text-[9px] font-bold">
                        {formatTypeName(item.type)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5 border ${
                        junction.is_primary 
                          ? 'bg-primary/10 border-primary/20 text-primary' 
                          : 'bg-surface-container border border-border-warm text-text-secondary'
                      }`}>
                        {junction.is_primary && <Sparkles className="w-2.5 h-2.5 mr-0.5" />}
                        {junction.is_primary ? 'Primary Cluster' : 'Secondary Cluster'}
                      </span>
                    </div>

                    {item.body ? (
                      <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed mt-1">
                        {item.body}
                      </p>
                    ) : (
                      <p className="text-xs text-text-secondary/40 italic line-clamp-3 leading-relaxed mt-1">
                        This draft has no body text outline yet.
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/content/${item.id}`}
                    className="h-10 w-full bg-white border border-border-warm hover:bg-surface-container-low text-text-primary text-xs font-semibold rounded-xl flex items-center justify-center gap-2 group/btn transition-all"
                  >
                    Open Workspace Editor
                    <ArrowRight className="w-3.5 h-3.5 text-text-secondary group-hover/btn:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
