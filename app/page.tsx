import { createClerkSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Columns, Calendar, FileText, ArrowRight, Sparkles, Inbox } from 'lucide-react';

export const revalidate = 0; // Dynamic route

export default async function DashboardPage() {
  let activePillars: any[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from('content_pillars')
      .select('id, title, description, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load pillars:', error);
      errorMsg = error.message;
    } else {
      activePillars = data || [];
    }
  } catch (err: any) {
    console.error('Dashboard Auth Error:', err);
    errorMsg = err.message || 'Unauthorized connection';
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Dynamic welcome header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel border border-slate-900 rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-1.5 z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Welcome back, <span className="text-rose-400">Vera</span>
            <Sparkles className="w-5 h-5 text-rose-400 animate-pulse" />
          </h1>
          <p className="text-sm text-slate-400">
            Here is your current social presence overview for Fortilicious.
          </p>
        </div>

        <Link
          href="/inbox"
          className="self-start sm:self-center px-5 py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-2xl flex items-center gap-2 transition-all"
        >
          <Inbox className="w-4 h-4 text-rose-400" />
          Quick Capture Idea
        </Link>
      </section>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Active Pillars & Stale Drafts */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Active Pillars Cluster */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Columns className="w-5 h-5 text-rose-400" />
                Active Pillars ({activePillars.length})
              </h2>
              <Link 
                href="/pillars" 
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
              >
                Manage all
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {errorMsg ? (
              <div className="glass-panel border border-rose-950/20 bg-rose-950/5 rounded-2xl p-6 text-sm text-rose-300">
                Failed to connect to database: {errorMsg}. Please verify your Clerk Supabase JWT Template and schema.
              </div>
            ) : activePillars.length === 0 ? (
              <div className="glass-panel border border-slate-900 rounded-2xl p-8 text-center text-slate-500">
                <Columns className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm mb-4">You have no active content pillars created yet.</p>
                <Link
                  href="/pillars"
                  className="inline-flex px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-500/10 transition-colors"
                >
                  Create Your First Pillar
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activePillars.slice(0, 4).map((p) => (
                  <Link
                    key={p.id}
                    href={`/pillars/${p.id}`}
                    className="glass-panel border border-slate-900 hover:border-slate-800 hover:bg-slate-900/10 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all group"
                  >
                    <div className="flex flex-col gap-1.5">
                      <h3 className="font-bold text-slate-100 group-hover:text-rose-400 transition-colors line-clamp-1">
                        {p.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {p.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 border-t border-slate-900/60 pt-3">
                      <span>Evergreen Cluster</span>
                      <span className="text-rose-500/80 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Open Hub <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Stale Drafts Block (Phase 4 integration placeholder) */}
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-rose-400" />
              Stale Drafts (Needs Attention)
            </h2>
            <div className="glass-panel border border-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-slate-500">
              <FileText className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-xs font-semibold uppercase text-rose-500/80 tracking-widest mb-1">
                Phase 4 Integration Pending
              </p>
              <p className="text-xs text-slate-400 max-w-[260px]">
                Content Piece CRUD and stale draft warnings will reside here once Phase 4 is deployed.
              </p>
            </div>
          </section>
        </div>

        {/* Right 1 Column: Upcoming posting week */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-rose-400" />
            Upcoming Week
          </h2>
          <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex-1 flex flex-col items-center justify-center text-center text-slate-500 min-h-[300px]">
            <Calendar className="w-8 h-8 text-slate-700 mb-2" />
            <p className="text-xs font-semibold uppercase text-rose-500/80 tracking-widest mb-1">
              Phase 5 Calendar Pending
            </p>
            <p className="text-xs text-slate-400 max-w-[220px]">
              Vera's weekly schedule entries, inline reschedules, and live triggers will display here.
            </p>
          </div>
        </section>

      </div>

    </div>
  );
}
