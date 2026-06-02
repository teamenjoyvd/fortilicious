import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { createCapture, deleteCapture } from '@/lib/actions/captures';
import Link from 'next/link';
import { Inbox, Plus, Trash2, ArrowUpRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { redirect } from 'next/navigation';
import PromotePillarButton from '@/app/inbox/components/PromotePillarButton';
import PromoteContentButton from '@/app/inbox/components/PromoteContentButton';

export const revalidate = 0; // Dynamic route

interface InboxPageProps {
  searchParams: Promise<{
    view?: string;
  }>;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const resolvedParams = await searchParams;
  const view = resolvedParams.view || 'unprocessed';

  let captures: any[] = [];
  let pillars: { id: string; title: string }[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClerkSupabaseClient();
    
    // Fetch captures
    let query = supabase.from('quick_captures').select('*');

    if (view === 'promoted') {
      query = query.not('promoted_to', 'is', null);
    } else {
      query = query.is('promoted_to', null);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Quick Captures Error:', error);
      errorMsg = error.message;
    } else {
      captures = data || [];
    }

    // Fetch user's content pillars for promotion
    const { data: pillarsData } = await supabase
      .from('content_pillars')
      .select('id, title')
      .in('status', ['active', 'live'])
      .order('title', { ascending: true });
    pillars = pillarsData || [];

  } catch (err: any) {
    errorMsg = err.message || 'Authentication error';
  }

  // Server Action to add capture inside form submission
  async function handleAdd(formData: FormData) {
    'use server';
    const body = formData.get('body') as string;

    if (!body || !body.trim()) return;

    await createCapture(body);
    redirect('/inbox');
  }

  // Server Action to delete capture inside form submission
  async function handleDelete(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    await deleteCapture(id);
    redirect('/inbox');
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-rose-500" />
            Quick Capture Inbox
          </h1>
          <p className="text-sm text-slate-400">
            Log ideas instantly on the go. Process, refine, or promote them to pillars and scripts later.
          </p>
        </div>
      </section>

      {/* Grid: Logging input on Left, Captured List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Zero-friction Log Card (Left Column) */}
        <section className="glass-panel border border-slate-900 rounded-3xl p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <Inbox className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">Log An Idea</h2>
          </div>
          
          <form action={handleAdd} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <textarea
                name="body"
                rows={5}
                required
                placeholder="Paste links, type caption outlines, note inspirations, or dump drafts..."
                className="p-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-600 transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Capture to Inbox
            </button>
          </form>
        </section>

        {/* Ideas Workspace (Right 2 Columns) */}
        <section className="lg:col-span-2 flex flex-col gap-6 w-full">
          
          {/* Filtering Toggles */}
          <div className="flex items-center gap-1 border-b border-slate-900 pb-px">
            {[
              { label: 'Unprocessed Items', view: 'unprocessed' },
              { label: 'Promoted Repository', view: 'promoted' },
            ].map((tab) => (
              <Link
                key={tab.view}
                href={`/inbox?view=${tab.view}`}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  view === tab.view
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Captured list */}
          {errorMsg ? (
            <div className="glass-panel border border-rose-950/20 bg-rose-950/5 rounded-2xl p-6 text-sm text-rose-300">
              Database connection failed: {errorMsg}
            </div>
          ) : captures.length === 0 ? (
            <div className="glass-panel border border-slate-900 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Inbox className="w-12 h-12 text-slate-800 mb-4" />
              <h3 className="text-sm font-semibold text-slate-400 mb-1">
                {view === 'promoted' ? 'No promoted ideas' : 'Your inbox is clear'}
              </h3>
              <p className="text-xs text-slate-500 max-w-[280px]">
                {view === 'promoted' 
                  ? 'Processed captures that have been promoted to content templates or topic clusters will catalog here.'
                  : 'Great job! Log a raw thought on the side panel to preserve inspirations before they are lost.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {captures.map((item) => (
                <div
                  key={item.id}
                  className="glass-panel border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 group transition-all"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Logged on {new Date(item.created_at).toLocaleDateString()}
                    </span>

                    {/* Promotion badge */}
                    {item.promoted_to && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Promoted to {item.promoted_to.replace('_', ' ')}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {item.body}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-900/60 pt-3 mt-1">
                    {/* Action buttons (Placeholders for promotions) */}
                    <div className="flex items-center gap-2">
                      {!item.promoted_to ? (
                        <>
                          <PromotePillarButton captureId={item.id} captureBody={item.body} />
                          <PromoteContentButton captureId={item.id} captureBody={item.body} pillars={pillars} />
                        </>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          Target reference ID: {item.promoted_id?.slice(0, 8)}...
                        </span>
                      )}
                    </div>

                    {/* Delete Trigger */}
                    <form action={handleDelete} className="inline-block">
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        type="submit"
                        className="p-2 bg-rose-950/10 hover:bg-rose-950/40 border border-rose-950/20 hover:border-rose-950/50 text-rose-400 hover:text-rose-300 rounded-lg transition-colors"
                        title="Delete capture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>

                </div>
              ))}
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
