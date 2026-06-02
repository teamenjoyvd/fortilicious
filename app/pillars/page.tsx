import { createClerkSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { createPillar } from '@/lib/actions/pillars';
import { Columns, Plus, ArrowRight, FolderPlus, Clock } from 'lucide-react';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Dynamic route

interface PillarsPageProps {
  searchParams: Promise<{
    status?: string;
  }>;
}

export default async function PillarsPage({ searchParams }: PillarsPageProps) {
  const resolvedParams = await searchParams;
  const currentFilter = resolvedParams.status || 'active_live';

  let pillars: any[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClerkSupabaseClient();
    let query = supabase.from('content_pillars').select('*');

    if (currentFilter === 'active_live') {
      query = query.in('status', ['active', 'live']);
    } else if (currentFilter === 'active') {
      query = query.eq('status', 'active');
    } else if (currentFilter === 'live') {
      query = query.eq('status', 'live');
    } else if (currentFilter === 'archived') {
      query = query.eq('status', 'archived');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Pillars Fetch Error:', error);
      errorMsg = error.message;
    } else {
      pillars = data || [];
    }
  } catch (err: any) {
    errorMsg = err.message || 'Authentication error';
  }

  // Server Action to handle inline create inside the form
  async function handleCreate(formData: FormData) {
    'use server';
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!title || !title.trim()) return;

    await createPillar(title, description);
    redirect('/pillars');
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Columns className="w-6 h-6 text-rose-500" />
            Content Pillars
          </h1>
          <p className="text-sm text-slate-400">
            Evergreen topic clusters to organize and inspire your brand presence.
          </p>
        </div>
      </section>

      {/* Grid Layout: Create on Left, Pillars List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Creation Card */}
        <section className="glass-panel border border-slate-900 rounded-3xl p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <FolderPlus className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">Create New Pillar</h2>
          </div>
          
          <form action={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-xs font-semibold text-slate-400">
                Pillar Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                placeholder="e.g. Balancing Insulin Without Spikes"
                required
                className="h-10 px-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600 transition-all"
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
                placeholder="Detail the evergreen topics, target audiences, and core value proposition."
                className="p-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Pillar Cluster
            </button>
          </form>
        </section>

        {/* Pillars List Area */}
        <section className="lg:col-span-2 flex flex-col gap-6 w-full">
          
          {/* Filtering tabs */}
          <div className="flex items-center gap-1 border-b border-slate-900 pb-px overflow-x-auto">
            {[
              { label: 'Active & Live', filter: 'active_live' },
              { label: 'Active', filter: 'active' },
              { label: 'Live', filter: 'live' },
              { label: 'Archived', filter: 'archived' },
            ].map((tab) => (
              <Link
                key={tab.filter}
                href={`/pillars?status=${tab.filter}`}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  currentFilter === tab.filter
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Pillars List */}
          {errorMsg ? (
            <div className="glass-panel border border-rose-950/20 bg-rose-950/5 rounded-2xl p-6 text-sm text-rose-300">
              Database connection failed: {errorMsg}
            </div>
          ) : pillars.length === 0 ? (
            <div className="glass-panel border border-slate-900 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Columns className="w-12 h-12 text-slate-800 mb-4" />
              <h3 className="text-sm font-semibold text-slate-400 mb-1">No pillars found</h3>
              <p className="text-xs text-slate-500 max-w-[280px]">
                Create a new content pillar using the sidebar panel to begin mapping out your brand presence.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pillars.map((p) => (
                <div
                  key={p.id}
                  className="glass-panel border border-slate-900 hover:border-slate-800 rounded-3xl p-6 flex flex-col justify-between gap-6 group transition-all"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : p.status === 'live'
                            ? 'bg-rose-500/10 text-rose-400'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {p.status}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-100 group-hover:text-rose-400 transition-colors line-clamp-1">
                      {p.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {p.description || 'No description or strategic guidelines have been added to this pillar.'}
                    </p>
                  </div>

                  <Link
                    href={`/pillars/${p.id}`}
                    className="h-10 w-full bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-300 hover:text-slate-100 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 group/btn transition-colors"
                  >
                    Open Pillar Hub
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
