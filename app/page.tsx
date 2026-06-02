import { createClerkSupabaseClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { 
  Columns, 
  Calendar, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  Inbox, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Play
} from 'lucide-react';

export const revalidate = 0; // Dynamic route

export default async function DashboardPage() {
  let activePillars: any[] = [];
  let staleDrafts: any[] = [];
  let upcomingPosts: any[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClerkSupabaseClient();

    // 1. Fetch active pillars
    const { data: pillars, error: pillarsError } = await supabase
      .from('content_pillars')
      .select('id, title, description, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (pillarsError) {
      console.error('Failed to load pillars:', pillarsError);
      errorMsg = pillarsError.message;
    } else {
      activePillars = pillars || [];
    }

    // 2. Fetch Stale Drafts (status = 'draft' and updated_at < 14 days ago)
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: drafts } = await supabase
      .from('content_pieces')
      .select('id, title, type, updated_at')
      .eq('status', 'draft')
      .lt('updated_at', fourteenDaysAgo.toISOString())
      .order('updated_at', { ascending: true });
    staleDrafts = drafts || [];

    // 3. Fetch Upcoming Schedule Entries for the next 7 days
    const nowStr = new Date().toISOString();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const { data: schedule } = await supabase
      .from('schedule_entries')
      .select('*, content_pieces(id, title, type), channels(id, name, platform)')
      .eq('status', 'planned')
      .gte('planned_at', nowStr)
      .lte('planned_at', sevenDaysFromNow.toISOString())
      .order('planned_at', { ascending: true });
    upcomingPosts = schedule || [];

  } catch (err: any) {
    console.error('Dashboard Auth Error:', err);
    errorMsg = err.message || 'Unauthorized connection';
  }

  // Format type helper
  function formatTypeName(type: string) {
    switch (type) {
      case 'script': return 'Script';
      case 'caption': return 'Caption';
      case 'short_form': return 'Short';
      case 'video': return 'Video';
      default: return type;
    }
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
            Here is your private social manager overview for Fortilicious.
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

          {/* Stale Drafts Section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-400" />
                Stale Drafts (Needs Attention)
              </h2>
              <Link 
                href="/content?status=draft" 
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
              >
                Open Drafts Catalog
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {staleDrafts.length === 0 ? (
              <div className="glass-panel border border-slate-900 rounded-2xl p-6 text-center text-slate-500 text-xs">
                <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                No stale drafts found! All your drafted scripts are fresh.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {staleDrafts.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/content/${item.id}`}
                    className="glass-panel border border-slate-900 hover:border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 transition-all group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-7 h-7 rounded bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-extrabold text-slate-200 group-hover:text-rose-400 transition-colors truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          Unedited since {new Date(item.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-slate-400 text-[9px] font-bold shrink-0">
                      {formatTypeName(item.type)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 1 Column: Upcoming posting week */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-rose-400" />
              Upcoming Week
            </h2>
            <Link 
              href="/calendar" 
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
            >
              Open Calendar
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {upcomingPosts.length === 0 ? (
            <div className="glass-panel border border-slate-900 rounded-3xl p-6 flex-1 flex flex-col items-center justify-center text-center text-slate-500 min-h-[220px]">
              <Calendar className="w-8 h-8 text-slate-800 mb-3" />
              <p className="text-xs text-slate-500 max-w-[200px]">
                No posts scheduled for the next 7 days. Plan your social layouts on the Calendar tab.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingPosts.slice(0, 5).map((post) => {
                const dateObj = new Date(post.planned_at);
                const dayStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={post.id}
                    className="glass-panel border border-slate-900 p-4 rounded-2xl flex flex-col gap-3 hover:border-slate-850 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col overflow-hidden">
                        <Link
                          href={`/content/${post.content_pieces.id}`}
                          className="text-xs font-extrabold text-slate-200 hover:text-rose-400 transition-colors truncate"
                        >
                          {post.content_pieces.title}
                        </Link>
                        <span className="text-[9px] text-slate-500 font-bold mt-0.5">
                          {post.channels.name} ({post.channels.platform})
                        </span>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-rose-400 font-extrabold">
                          {dayStr}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold">
                          {timeStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-950/60 pt-2 text-[9px] font-bold text-slate-500">
                      <span>{formatTypeName(post.content_pieces.type)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/5 text-rose-400 uppercase tracking-wider">
                        Planned
                      </span>
                    </div>
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
