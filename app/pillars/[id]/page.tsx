import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { updatePillar, deletePillar } from '@/lib/actions/pillars';
import Link from 'next/link';
import { ChevronLeft, Columns, Calendar, Edit3, Trash2, Check, X, ShieldAlert } from 'lucide-react';

export const revalidate = 0; // Dynamic route

interface PillarDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    edit?: string;
  }>;
}

export default async function PillarDetailPage({ params, searchParams }: PillarDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const id = resolvedParams.id;
  const isEditing = resolvedSearchParams.edit === 'true';

  let pillar: any = null;

  try {
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from('content_pillars')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Pillar details error:', error);
      notFound();
    }
    pillar = data;
  } catch (err) {
    console.error('Auth check failed on pillar detail:', err);
    notFound();
  }

  // Server Action to handle inline detail save
  async function handleUpdateDetails(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!title || !title.trim()) return;

    await updatePillar(id, {
      title: title.trim(),
      description: description.trim() || null,
    });

    redirect(`/pillars/${id}`);
  }

  // Server Action to update status dynamically
  async function handleUpdateStatus(formData: FormData) {
    'use server';
    const status = formData.get('status') as 'active' | 'live' | 'archived';
    await updatePillar(id, { status });
    redirect(`/pillars/${id}`);
  }

  // Server Action to handle pillar deletion
  async function handleDelete() {
    'use server';
    await deletePillar(id);
    redirect('/pillars');
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Navigation Breadcrumb */}
      <nav className="flex items-center gap-2">
        <Link
          href="/pillars"
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Pillars
        </Link>
      </nav>

      {/* Main Glassmorphic Header Card */}
      <section className="glass-panel border border-slate-900 rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {isEditing ? (
          /* Inline Editing State */
          <form action={handleUpdateDetails} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-xs font-semibold text-slate-400">
                Pillar Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                defaultValue={pillar.title}
                required
                className="h-10 px-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-xs font-semibold text-slate-400">
                Description & Strategy
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={pillar.description || ''}
                className="p-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-all resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <Link
                href={`/pillars/${id}`}
                className="h-10 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </Link>
              <button
                type="submit"
                className="h-10 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-rose-500/10 transition-colors"
              >
                <Check className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          /* Default Display State */
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900/60 pb-5">
              
              {/* Pillar info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <Columns className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white line-clamp-1">
                    {pillar.title}
                  </h1>
                  <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Pillar created on {new Date(pillar.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2">
                <form action={handleUpdateStatus} className="flex items-center">
                  <select
                    name="status"
                    defaultValue={pillar.status}
                    onChange={(e) => e.target.form?.requestSubmit()}
                    className="h-9 px-3 text-xs bg-slate-950 border border-slate-900 text-slate-300 rounded-lg focus:outline-none cursor-pointer focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="active">Active</option>
                    <option value="live">Live</option>
                    <option value="archived">Archived</option>
                  </select>
                </form>

                <Link
                  href={`/pillars/${id}?edit=true`}
                  className="h-9 w-9 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-100 rounded-lg flex items-center justify-center transition-colors"
                  title="Edit details"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>

                <form action={handleDelete} className="inline-block">
                  <button
                    type="submit"
                    className="h-9 w-9 bg-rose-950/10 hover:bg-rose-950/40 border border-rose-950/30 hover:border-rose-950/50 text-rose-400 hover:text-rose-300 rounded-lg flex items-center justify-center transition-all"
                    title="Delete pillar"
                    onClick={(e) => {
                      if (!confirm('Are you absolutely sure you want to delete this evergreen pillar? This will remove all associated junctions and references.')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Pillar Strategy
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed max-w-4xl whitespace-pre-wrap">
                {pillar.description || 'No description or strategic guidelines have been added to this content pillar yet. Click the Edit button above to detail your strategy.'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Evergreen Pillar Tab Control Section */}
      <section className="flex flex-col gap-6">
        
        {/* Placeholder tabs */}
        <div className="flex items-center gap-1 border-b border-slate-900 pb-px overflow-x-auto">
          <span className="px-4 py-2.5 text-xs font-bold border-b-2 border-rose-500 text-rose-400">
            Hub Overview
          </span>
          {['Research & Bookmarks', 'Connected Catalog Products', 'Content Template Scripts'].map((tab) => (
            <span
              key={tab}
              className="px-4 py-2.5 text-xs font-bold border-b-2 border-transparent text-slate-500 cursor-not-allowed whitespace-nowrap"
            >
              {tab}
            </span>
          ))}
        </div>

        {/* Informative downstream alerts list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Phase 3 - Research Card */}
          <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <ShieldAlert className="w-5 h-5 text-rose-500/80" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-slate-100">Research & Bookmarks</h3>
              <p className="text-xs text-rose-500/80 font-bold uppercase tracking-wider">
                Phase 3 Integration
              </p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Vera will be able to save inspiring notes, add bookmarked links with automated file attachments, and pin core research items to the top of this hub in Phase 3.
            </p>
          </div>

          {/* Phase 2 - Products Card */}
          <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <ShieldAlert className="w-5 h-5 text-rose-500/80" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-slate-100">Connected Products</h3>
              <p className="text-xs text-rose-500/80 font-bold uppercase tracking-wider">
                Phase 2 Integration
              </p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Many-to-many product linkage. Vera will connect Amway synced products or custom products directly to topic pillars and preview them via a bottom-sheet panel in Phase 2.
            </p>
          </div>

          {/* Phase 4 - Content Pieces Card */}
          <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <ShieldAlert className="w-5 h-5 text-rose-500/80" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-slate-100">Content Pieces</h3>
              <p className="text-xs text-rose-500/80 font-bold uppercase tracking-wider">
                Phase 4 Integration
              </p>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Content generation engine. Draft descriptions, caption scripts, assets uploads, status flows, and multi-pillar associations will activate inside this tab in Phase 4.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
}
