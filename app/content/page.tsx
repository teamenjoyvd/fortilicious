import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { createContentPiece } from '@/lib/actions/content';
import Link from 'next/link';
import { 
  FileText, 
  Plus, 
  ArrowRight, 
  FolderPlus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Archive, 
  Filter,
  Sparkles
} from 'lucide-react';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Dynamic route

interface ContentIndexPageProps {
  searchParams: Promise<{
    status?: string;
    type?: string;
    pillarId?: string;
  }>;
}

export default async function ContentIndexPage({ searchParams }: ContentIndexPageProps) {
  const resolvedParams = await searchParams;
  const statusFilter = resolvedParams.status || 'all';
  const typeFilter = resolvedParams.type || 'all';
  const pillarFilter = resolvedParams.pillarId || 'all';

  let pieces: any[] = [];
  let pillars: any[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClerkSupabaseClient();

    // 1. Fetch user's evergreen pillars for creation and filter dropdowns
    const { data: pillarsData } = await supabase
      .from('content_pillars')
      .select('id, title')
      .in('status', ['active', 'live'])
      .order('title', { ascending: true });
    pillars = pillarsData || [];

    // 2. Fetch content pieces (with their joined junctions to pillars)
    let query = supabase
      .from('content_pieces')
      .select('*, pillar_content(is_primary, content_pillars(id, title))');

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as any);
    }
    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter as any);
    }

    const { data: piecesData, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Content Pieces Error:', error);
      errorMsg = error.message;
    } else {
      pieces = piecesData || [];

      // Filter by associated pillar on the server side (as nested postgrest filters can't easily restrict root rows in many-to-many without filters)
      if (pillarFilter !== 'all') {
        pieces = pieces.filter((p) => 
          p.pillar_content?.some((junction: any) => junction.content_pillars?.id === pillarFilter)
        );
      }
    }
  } catch (err: any) {
    errorMsg = err.message || 'Authentication error';
  }

  // Server Action to handle inline create inside the form
  async function handleCreate(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    const type = formData.get('type') as any;
    const primaryPillarId = formData.get('primaryPillarId') as string;
    const body = formData.get('body') as string;

    if (!title || !title.trim() || !primaryPillarId) return;

    const res = await createContentPiece({
      title: title.trim(),
      type,
      primaryPillarId,
      body: body?.trim() || '',
      status: 'draft',
    });

    if (res.success && res.id) {
      redirect(`/content/${res.id}`); // directly check-out to workspace editor!
    } else {
      redirect('/content');
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
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-rose-500" />
            Content Workspace
          </h1>
          <p className="text-sm text-slate-400">
            Write posts, craft scripts, compile captions, and manage media bundles in your private catalog.
          </p>
        </div>
      </section>

      {/* Grid Layout: Create on Left, Pieces List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Creation Card */}
        <section className="glass-panel border border-slate-900 rounded-3xl p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <FolderPlus className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">Create New Draft</h2>
          </div>

          {pillars.length === 0 ? (
            <div className="flex flex-col gap-4 text-center py-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                You must create at least one evergreen Content Pillar before drafting content pieces.
              </p>
              <Link
                href="/pillars"
                className="h-10 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center justify-center transition-all"
              >
                Go to Pillars
              </Link>
            </div>
          ) : (
            <form action={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="title" className="text-xs font-semibold text-slate-400">
                  Script Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  placeholder="e.g. PubMed Hydration Clinical Study"
                  required
                  className="h-10 px-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="type" className="text-xs font-semibold text-slate-400">
                    Content Type
                  </label>
                  <select
                    id="type"
                    name="type"
                    className="h-10 px-2.5 text-xs bg-slate-950 border border-slate-900 text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                  >
                    <option value="script">Script Outline</option>
                    <option value="caption">Post Caption</option>
                    <option value="short_form">Short-form Video</option>
                    <option value="video">Long-form Video</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="primaryPillarId" className="text-xs font-semibold text-slate-400">
                    Primary Content Pillar
                  </label>
                  <select
                    id="primaryPillarId"
                    name="primaryPillarId"
                    className="h-10 px-2.5 text-xs bg-slate-950 border border-slate-900 text-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
                    required
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
                <label htmlFor="body" className="text-xs font-semibold text-slate-400">
                  Body Draft
                </label>
                <textarea
                  id="body"
                  name="body"
                  rows={4}
                  placeholder="Paste outlines, log caption details, or write scripts..."
                  className="p-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Draft Content Script
              </button>
            </form>
          )}
        </section>

        {/* Content list & filters (Right 2 columns) */}
        <section className="lg:col-span-2 flex flex-col gap-6 w-full">
          
          {/* Filters Bar panel */}
          <div className="glass-panel border border-slate-900 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-slate-400 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-rose-500" />
              Filter Workspace:
            </span>

            {/* Status Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-900 rounded-xl px-2 h-9">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9px] mr-1">Status</span>
              <select
                defaultValue={statusFilter}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('status', e.target.value);
                  window.location.href = url.pathname + url.search;
                }}
                className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Drafts</option>
                <option value="ready">Ready to Post</option>
                <option value="live">Live / Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Type Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-900 rounded-xl px-2 h-9">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9px] mr-1">Format</span>
              <select
                defaultValue={typeFilter}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('type', e.target.value);
                  window.location.href = url.pathname + url.search;
                }}
                className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer"
              >
                <option value="all">All Formats</option>
                <option value="script">Script Outline</option>
                <option value="caption">Post Caption</option>
                <option value="short_form">Short-form Video</option>
                <option value="video">Long-form Video</option>
              </select>
            </div>

            {/* Pillar Selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-900 rounded-xl px-2 h-9 max-w-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9px] mr-1">Topic Hub</span>
              <select
                defaultValue={pillarFilter}
                onChange={(e) => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('pillarId', e.target.value);
                  window.location.href = url.pathname + url.search;
                }}
                className="bg-transparent text-slate-200 font-bold focus:outline-none cursor-pointer truncate max-w-[120px]"
              >
                <option value="all">All Pillars</option>
                {pillars.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Catalog grid */}
          {errorMsg ? (
            <div className="glass-panel border border-rose-950/20 bg-rose-950/5 rounded-2xl p-6 text-sm text-rose-300">
              Database connection failed: {errorMsg}
            </div>
          ) : pieces.length === 0 ? (
            <div className="glass-panel border border-slate-900 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <FileText className="w-12 h-12 text-slate-800 mb-4" />
              <h3 className="text-sm font-semibold text-slate-400 mb-1">No content pieces found</h3>
              <p className="text-xs text-slate-500 max-w-[280px]">
                Create a draft script using the sidebar panel or clear your filters to display matching workspace documents.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pieces.map((p) => {
                const primaryPillar = p.pillar_content?.find((j: any) => j.is_primary)?.content_pillars;
                
                return (
                  <div
                    key={p.id}
                    className="glass-panel border border-slate-900 hover:border-slate-800 rounded-3xl p-5 flex flex-col justify-between gap-5 group transition-all"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'draft'
                              ? 'bg-slate-850 text-slate-400'
                              : p.status === 'ready'
                              ? 'bg-amber-500/10 text-amber-400'
                              : p.status === 'live'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {p.status}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-sm md:text-base font-extrabold text-slate-100 group-hover:text-rose-400 transition-colors line-clamp-1">
                        {p.title}
                      </h3>

                      <div className="flex flex-wrap gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-slate-400 text-[9px] font-bold">
                          {formatTypeName(p.type)}
                        </span>
                        {primaryPillar && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/5 border border-rose-500/10 text-rose-400 text-[9px] font-bold flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            {primaryPillar.title}
                          </span>
                        )}
                      </div>

                      {p.body ? (
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mt-1">
                          {p.body}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-600 italic line-clamp-3 leading-relaxed mt-1">
                          This draft has no body text or outline contents yet.
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/content/${p.id}`}
                      className="h-10 w-full bg-slate-950 border border-slate-900 hover:border-slate-850 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 group/btn transition-colors"
                    >
                      Open Workspace Editor
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
