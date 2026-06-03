import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { createCapture } from '@/lib/actions/captures';
import Link from 'next/link';
import { Inbox, Plus, Sparkles, FolderPlus } from 'lucide-react';
import { redirect } from 'next/navigation';
import InboxCard from '@/app/inbox/components/InboxCard';

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

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300 font-sans">
      
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-warm pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-display font-serif font-bold text-text-primary flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-primary" />
            Capture Inbox
          </h1>
          <p className="text-sm text-text-secondary font-sans leading-relaxed">
            Log ideas instantly on the go. Process, refine, or promote them to pillars and scripts later.
          </p>
        </div>
      </section>

      {/* Grid: Logging input on Left, Captured List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Zero-friction Log Card (Left Column) */}
        <section className="bg-surface border border-border-warm rounded-3xl p-6 relative warm-shadow">
          <div className="flex items-center gap-2 mb-4 border-b border-border-warm/50 pb-3">
            <FolderPlus className="w-5 h-5 text-primary" />
            <h2 className="text-base font-serif font-bold text-text-primary">Log An Idea</h2>
          </div>
          
          <form action={handleAdd} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <textarea
                name="body"
                rows={5}
                required
                placeholder="Paste links, type caption outlines, note inspirations, or dump drafts..."
                className="p-3.5 text-sm bg-white border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-text-secondary/45 transition-all resize-none font-sans leading-relaxed"
              />
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-primary text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              Capture to Inbox
            </button>
          </form>
        </section>

        {/* Ideas Workspace (Right 2 Columns) */}
        <section className="lg:col-span-2 flex flex-col gap-6 w-full">
          
          {/* Filtering Toggles */}
          <div className="flex items-center gap-1 border-b border-border-warm pb-px">
            {[
              { label: 'Unprocessed Items', view: 'unprocessed' },
              { label: 'Promoted Repository', view: 'promoted' },
            ].map((tab) => (
              <Link
                key={tab.view}
                href={`/inbox?view=${tab.view}`}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap font-ui-label ${
                  view === tab.view
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {/* Captured list */}
          {errorMsg ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-600">
              Database connection failed: {errorMsg}
            </div>
          ) : captures.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-border-warm rounded-3xl p-12 text-center text-text-secondary flex flex-col items-center justify-center warm-shadow">
              <div className="w-16 h-16 mb-4 bg-surface-mid rounded-full flex items-center justify-center text-primary/40 shrink-0">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-serif font-bold text-text-primary mb-1">
                {view === 'promoted' ? 'No promoted ideas' : 'Clear Skies'}
              </h3>
              <p className="text-xs text-text-secondary max-w-[280px] leading-relaxed">
                {view === 'promoted' 
                  ? 'Processed captures that have been promoted to content templates or topic clusters will catalog here.'
                  : 'Everything is where it belongs. Your digital workspace is calm and ready for new inspiration.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {captures.map((item) => (
                <InboxCard 
                  key={item.id} 
                  item={item} 
                  pillars={pillars} 
                />
              ))}
            </div>
          )}
        </section>

      </div>

    </div>
  );
}
