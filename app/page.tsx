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
  Package,
  Mic,
  Plus
} from 'lucide-react';

export const revalidate = 0; // Dynamic route

// Stationery Brand Pillar Color Accents
const PILLAR_COLORS = [
  { border: 'bg-sage', hover: 'hover:text-[#5F8C6A]', text: 'text-[#5F8C6A]' },
  { border: 'bg-burgundy', hover: 'hover:text-[#8C3A3A]', text: 'text-[#8C3A3A]' },
  { border: 'bg-terracotta', hover: 'hover:text-[#A85040]', text: 'text-[#A85040]' },
  { border: 'bg-olive', hover: 'hover:text-[#7A8A3A]', text: 'text-[#7A8A3A]' },
  { border: 'bg-teal', hover: 'hover:text-[#2D6E7E]', text: 'text-[#2D6E7E]' },
  { border: 'bg-primary', hover: 'hover:text-[#964500]', text: 'text-[#964500]' },
];

export default async function DashboardPage() {
  let activePillars: any[] = [];
  let staleDrafts: any[] = [];
  let upcomingPosts: any[] = [];
  let capturedToday = 0;
  let productsSynced = 0;
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

    // 4. Fetch Captured Today count
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const { count: capturedCount } = await supabase
      .from('quick_captures')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());
    capturedToday = capturedCount || 0;

    // 5. Fetch Products Synced count
    const { count: prodCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    productsSynced = prodCount || 0;

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
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 font-sans">
      
      {/* Welcome Header Card */}
      <section className="bg-surface border border-border-warm rounded-3xl p-6 md:p-8 relative overflow-hidden warm-shadow">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 z-10 relative">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-display font-serif font-bold text-text-primary flex items-center gap-2">
              Welcome back, Master
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed font-sans">
              The command center is synchronized. Your wellness empire is at your fingertips.
            </p>
          </div>

          <Link
            href="/inbox"
            className="self-start sm:self-center h-11 px-5 bg-white border border-border-warm hover:border-primary/20 text-text-primary hover:text-primary text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 duration-200"
          >
            <Inbox className="w-4 h-4 text-primary" />
            Quick Capture Inbox
          </Link>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-2">
        {/* Card 1: Active Pillars */}
        <div className="bg-surface-mid border border-border-warm rounded-xl p-6 warm-shadow flex items-center justify-between">
          <div>
            <p className="font-ui-label text-xs text-text-secondary uppercase tracking-wider">Active Pillars</p>
            <p className="font-serif text-h1 text-primary mt-1">{activePillars.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Columns className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Captured Today */}
        <div className="bg-surface-mid border border-border-warm rounded-xl p-6 warm-shadow flex items-center justify-between">
          <div>
            <p className="font-ui-label text-xs text-text-secondary uppercase tracking-wider">Captured Today</p>
            <p className="font-serif text-h1 text-primary mt-1">{capturedToday}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-primary">
            <Inbox className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Products Synced */}
        <div className="bg-surface-mid border border-border-warm rounded-xl p-6 warm-shadow flex items-center justify-between">
          <div>
            <p className="font-ui-label text-xs text-text-secondary uppercase tracking-wider">Products Synced</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-serif text-h1 text-primary">{productsSynced}</p>
              <span className="flex items-center gap-1 font-data-mono text-[10px] text-[#3D7A4A] bg-accent-green-light border border-[#b4e3be] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3D7A4A]"></span>
                Synced
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-teal/10 flex items-center justify-center text-teal">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Active Pillars */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Active Pillars Cluster */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 font-serif font-bold text-text-primary flex items-center gap-2">
                <Columns className="w-5 h-5 text-primary" />
                Master Pillars
              </h2>
              <Link 
                href="/pillars" 
                className="text-xs font-bold text-primary hover:underline transition-colors flex items-center gap-1 font-ui-label"
              >
                View All
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {errorMsg ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-600">
                Failed to connect to database: {errorMsg}.
              </div>
            ) : activePillars.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-border-warm rounded-3xl p-8 text-center text-text-secondary warm-shadow">
                <Columns className="w-8 h-8 text-text-secondary/40 mx-auto mb-3" />
                <p className="text-sm mb-4 leading-relaxed">You have no active content pillars created yet.</p>
                <Link
                  href="/pillars"
                  className="inline-flex h-11 px-5 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all duration-200 items-center"
                >
                  Create Your First Pillar
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {activePillars.slice(0, 4).map((p, idx) => {
                  const style = PILLAR_COLORS[idx % PILLAR_COLORS.length];
                  return (
                    <div
                      key={p.id}
                      className="group relative bg-white border border-border-warm rounded-2xl warm-shadow overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 active:scale-[0.98]"
                    >
                      {/* Left color bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-2 ${style.border}`}></div>
                      
                      <div className="p-6 pl-8 flex flex-col justify-between h-44 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <h3 className={`font-serif font-bold text-text-primary text-base transition-colors leading-snug line-clamp-1 ${style.hover}`}>
                            {p.title}
                          </h3>
                          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed font-sans">
                            {p.description || 'No strategy or details added yet.'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-text-secondary border-t border-border-warm/50 pt-3 font-ui-label">
                          <span>Evergreen Cluster</span>
                          <Link 
                            href={`/pillars/${p.id}`}
                            className={`flex items-center gap-0.5 transition-transform group-hover:translate-x-0.5 font-bold uppercase tracking-wider ${style.text}`}
                          >
                            Open Hub <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Stale Drafts Section */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-h2 font-serif font-bold text-text-primary flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Stale Drafts (Needs Attention)
              </h2>
              <Link 
                href="/content?status=draft" 
                className="text-xs font-bold text-primary hover:underline transition-colors flex items-center gap-1 font-ui-label"
              >
                Open Drafts Catalog
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {staleDrafts.length === 0 ? (
              <div className="bg-white border border-border-warm rounded-2xl p-6 text-center text-text-secondary text-xs warm-shadow">
                <CheckCircle className="w-6 h-6 text-[#3D7A4A] mx-auto mb-2" />
                No stale drafts found! All your drafted scripts are fresh.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {staleDrafts.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href={`/content/${item.id}`}
                    className="bg-white border border-border-warm hover:border-primary/20 p-4 rounded-xl flex items-center justify-between gap-4 transition-all duration-200 active:scale-[0.99] warm-shadow group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-surface border border-border-warm text-stale-amber flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-text-secondary font-semibold mt-0.5">
                          Unedited since {new Date(item.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-surface border border-border-warm text-text-secondary text-[9px] font-bold font-data-mono shrink-0 uppercase tracking-wider">
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
            <h2 className="text-h2 font-serif font-bold text-text-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming Week
            </h2>
            <Link 
              href="/calendar" 
              className="text-xs font-bold text-primary hover:underline transition-colors flex items-center gap-1 font-ui-label"
            >
              Open Calendar
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {upcomingPosts.length === 0 ? (
            <div className="bg-white border border-border-warm rounded-3xl p-6 flex-grow flex flex-col items-center justify-center text-center text-text-secondary min-h-[220px] warm-shadow">
              <Calendar className="w-8 h-8 text-text-secondary/40 mb-3" />
              <p className="text-xs text-text-secondary max-w-[200px] leading-relaxed">
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
                    className="bg-white border border-border-warm p-4 rounded-2xl flex flex-col gap-3 hover:border-primary/20 transition-all duration-200 active:scale-[0.99] warm-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col overflow-hidden">
                        <Link
                          href={`/content/${post.content_pieces.id}`}
                          className="text-xs font-bold text-text-primary hover:text-primary transition-colors truncate"
                        >
                          {post.content_pieces.title}
                        </Link>
                        <span className="text-[9px] text-text-secondary font-bold mt-0.5">
                          {post.channels.name} ({post.channels.platform})
                        </span>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-primary font-bold font-ui-label">
                          {dayStr}
                        </span>
                        <span className="text-[9px] text-text-secondary font-semibold font-data-mono">
                          {timeStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-border-warm/50 pt-2 text-[9px] font-bold text-text-secondary font-ui-label">
                      <span className="uppercase tracking-wider">{formatTypeName(post.content_pieces.type)}</span>
                      <span className="px-1.5 py-0.5 rounded bg-surface border border-border-warm text-[#3D7A4A] bg-accent-green-light uppercase tracking-wider font-extrabold text-[8px]">
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
