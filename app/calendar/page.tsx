import { createClerkSupabaseClient } from '@/lib/supabase/server';
import CalendarWorkspace from './components/CalendarWorkspace';
import { Calendar } from 'lucide-react';

export const revalidate = 0; // Dynamic route

export default async function CalendarPage() {
  let entries: any[] = [];
  let channels: any[] = [];
  let pieces: any[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClerkSupabaseClient();

    // 1. Fetch scheduled posts
    const { data: entriesRes, error: entriesError } = await supabase
      .from('schedule_entries')
      .select('*, content_pieces(id, title, type, status), channels(id, name, platform, handle)')
      .order('planned_at', { ascending: true });

    if (entriesError) {
      console.error('Fetch schedule entries error:', entriesError);
      errorMsg = entriesError.message;
    } else {
      entries = entriesRes || [];
    }

    // 2. Fetch user's active channels for the dropdown
    const { data: channelsRes } = await supabase
      .from('channels')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });
    channels = channelsRes || [];

    // 3. Fetch user's drafts/ready content pieces for scheduling
    const { data: piecesRes } = await supabase
      .from('content_pieces')
      .select('id, title, type, status')
      .in('status', ['draft', 'ready'])
      .order('title', { ascending: true });
    pieces = piecesRes || [];

  } catch (err: any) {
    errorMsg = err.message || 'Authentication error';
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-primary" />
            Publication Calendar
          </h1>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed max-w-2xl font-sans">
            Map out publication dates, reschedule slots, and mark completed posts live across social channels.
          </p>
        </div>
      </section>

      {/* Main workspace */}
      {errorMsg ? (
        <div className="bg-burgundy/5 border border-burgundy/20 rounded-2xl p-6 text-sm text-burgundy font-bold flex items-center gap-2">
          Database connection failed: {errorMsg}
        </div>
      ) : (
        <CalendarWorkspace
          entries={entries}
          channels={channels}
          pieces={pieces}
        />
      )}

    </div>
  );
}
