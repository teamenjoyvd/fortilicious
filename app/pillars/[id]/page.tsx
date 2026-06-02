import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { updatePillar, deletePillar } from '@/lib/actions/pillars';
import PillarProductsTab from './products/components/PillarProductsTab';
import PillarResearchTab from './research/components/PillarResearchTab';
import PillarContentTab from './content/components/PillarContentTab';
import Link from 'next/link';
import { ChevronLeft, Columns, Calendar, Edit3, Trash2, Check, X, ShieldAlert, Sparkles, Bookmark, FileText } from 'lucide-react';

export const revalidate = 0; // Dynamic route

interface PillarDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    edit?: string;
    tab?: string;
  }>;
}

export default async function PillarDetailPage({ params, searchParams }: PillarDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const id = resolvedParams.id;
  const isEditing = resolvedSearchParams.edit === 'true';
  const activeTab = resolvedSearchParams.tab || 'overview';

  let pillar: any = null;
  let connectedProducts: any[] = [];
  let allCatalogProducts: any[] = [];
  let researchEntries: any[] = [];
  let pillarContentPieces: any[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClerkSupabaseClient();
    
    // 1. Fetch content pillar details
    const { data: pillarData, error: pillarError } = await supabase
      .from('content_pillars')
      .select('*')
      .eq('id', id)
      .single();

    if (pillarError || !pillarData) {
      console.error('Pillar details error:', pillarError);
      notFound();
    }
    pillar = pillarData;

    // 2. Fetch connected products for this pillar
    const { data: conn } = await supabase
      .from('pillar_products')
      .select('notes, products(*)')
      .eq('pillar_id', id);
    connectedProducts = conn || [];

    // 3. Fetch all active catalog products to allow connecting
    const { data: allProds } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });
    allCatalogProducts = allProds || [];

    // 4. Fetch research entries for this pillar
    const { data: researchRes } = await supabase
      .from('research_entries')
      .select('*, assets(*)')
      .eq('pillar_id', id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    researchEntries = researchRes || [];

    // 5. Fetch associated content pieces for this pillar
    const { data: piecesRes } = await supabase
      .from('pillar_content')
      .select('is_primary, content_pieces(*)')
      .eq('pillar_id', id);
    pillarContentPieces = piecesRes || [];

  } catch (err: any) {
    console.error('Failed to load database nodes on detail hub:', err);
    errorMsg = err.message || 'Authentication error';
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

    redirect(`/pillars/${id}?tab=${activeTab}`);
  }

  // Server Action to update status dynamically
  async function handleUpdateStatus(formData: FormData) {
    'use server';
    const status = formData.get('status') as 'active' | 'live' | 'archived';
    await updatePillar(id, { status });
    redirect(`/pillars/${id}?tab=${activeTab}`);
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
                href={`/pillars/${id}?tab=${activeTab}`}
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
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white line-clamp-1">
                      {pillar.title}
                    </h1>
                    <Sparkles className="w-4 h-4 text-rose-400 shrink-0" />
                  </div>
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
                  href={`/pillars/${id}?edit=true&tab=${activeTab}`}
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

      {/* Tabs Control Section */}
      <section className="flex flex-col gap-6 w-full">
        
        {/* Server-Driven navigation tabs */}
        <div className="flex items-center gap-1 border-b border-slate-900 pb-px overflow-x-auto">
          {[
            { label: 'Overview Hub', filter: 'overview' },
            { label: `Connected Products (${connectedProducts.length})`, filter: 'products' },
            { label: `Research & Bookmarks (${researchEntries.length})`, filter: 'research' },
            { label: `Content Scripts (${pillarContentPieces.length})`, filter: 'content' },
          ].map((tab) => (
            <Link
              key={tab.filter}
              href={`/pillars/${id}?tab=${tab.filter}`}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.filter
                  ? 'border-rose-500 text-rose-400'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Tab content selection */}
        {activeTab === 'products' ? (
          /* FULLY ACTIVE PRODUCTS GRAPH TAB (Phase 2 Deliverable) */
          <PillarProductsTab
            pillarId={id}
            connectedProducts={connectedProducts}
            allCatalogProducts={allCatalogProducts}
          />
        ) : activeTab === 'research' ? (
          /* FULLY ACTIVE RESEARCH & BOOKMARKS TAB (Phase 3 Deliverable) */
          <PillarResearchTab
            pillarId={id}
            researchEntries={researchEntries}
          />
        ) : activeTab === 'content' ? (
          /* FULLY ACTIVE CONTENT PIECES TAB (Phase 4 Deliverable) */
          <PillarContentTab
            pillarId={id}
            contentPieces={pillarContentPieces}
          />
        ) : (
          /* OVERVIEW HUB INFO PANELS */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            
            {/* Connected Products panel card (direct tab checkout link!) */}
            <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col justify-between gap-6 group hover:border-slate-800 transition-all">
              <div className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <Columns className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-slate-100">Connected Products</h3>
                  <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    Phase 2 Active
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Graph mapping enabled! Link nutrition supplements, manually entered coaching audits, or seminar tickets to this topic cluster and review connected inventories.
                </p>
              </div>
              <Link
                href={`/pillars/${id}?tab=products`}
                className="h-9 w-full bg-slate-950 border border-slate-900 hover:border-slate-855 text-rose-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                Open Products Graph
              </Link>
            </div>

            {/* Connected Research & Bookmarks panel card */}
            <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col justify-between gap-6 group hover:border-slate-800 transition-all">
              <div className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-slate-100">Research & Bookmarks</h3>
                  <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    Phase 3 Active
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Evergreen research enabled! Log inspiring notes, add link bookmarks, and upload secure attachments (PDFs, images, videos) directly under this cluster.
                </p>
              </div>
              <Link
                href={`/pillars/${id}?tab=research`}
                className="h-9 w-full bg-slate-950 border border-slate-900 hover:border-slate-855 text-rose-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                Open Research Hub
              </Link>
            </div>

            {/* Connected Content Pieces panel card */}
            <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex flex-col justify-between gap-6 group hover:border-slate-800 transition-all">
              <div className="flex flex-col gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-bold text-slate-100">Content Pieces</h3>
                  <p className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    <Check className="w-3.5 h-3.5" />
                    Phase 4 Active
                  </p>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Workspace scripts enabled! Draft scripts, write social captions, track creation status, and bundle attachments (images/videos) directly inside this topic.
                </p>
              </div>
              <Link
                href={`/pillars/${id}?tab=content`}
                className="h-9 w-full bg-slate-950 border border-slate-900 hover:border-slate-850 text-rose-400 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              >
                Open Content Canvas
              </Link>
            </div>

          </div>
        )}

      </section>

    </div>
  );
}
