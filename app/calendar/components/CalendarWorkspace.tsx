'use client';

import { useState } from 'react';
import { scheduleContentPiece, cancelScheduledPost, reschedulePost, markPostLive, skipPost } from '@/lib/actions/schedule';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Trash2, 
  Check, 
  X, 
  Plus, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContentPiece {
  id: string;
  title: string;
  type: string;
  status: string;
}

interface Channel {
  id: string;
  name: string;
  platform: string;
  handle: string | null;
}

interface ScheduleEntry {
  id: string;
  planned_at: string;
  published_at: string | null;
  status: 'planned' | 'live' | 'skipped';
  content_pieces: ContentPiece;
  channels: Channel;
}

interface CalendarWorkspaceProps {
  entries: ScheduleEntry[];
  channels: Channel[];
  pieces: ContentPiece[];
}

export default function CalendarWorkspace({ entries, channels, pieces }: CalendarWorkspaceProps) {
  const router = useRouter();

  // New scheduling form states
  const [selectedPieceId, setSelectedPieceId] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [plannedTime, setPlannedTime] = useState('12:00');

  // Operational states
  const [isPending, setIsPending] = useState(false);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('12:00');
  const [errorMsg, setErrorMsg] = useState('');

  // Handle scheduling
  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPieceId) {
      setErrorMsg('Please select a Content Piece');
      return;
    }
    if (!selectedChannelId) {
      setErrorMsg('Please select a Channel');
      return;
    }
    if (!plannedDate) {
      setErrorMsg('Please select a Planned Date');
      return;
    }

    setIsPending(true);
    setErrorMsg('');

    try {
      const plannedAtStr = `${plannedDate}T${plannedTime}:00`;
      const res = await scheduleContentPiece({
        contentPieceId: selectedPieceId,
        channelId: selectedChannelId,
        plannedAt: plannedAtStr,
      });

      if (res.success) {
        setSelectedPieceId('');
        setSelectedChannelId('');
        setPlannedDate('');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to schedule post');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during scheduling');
    } finally {
      setIsPending(false);
    }
  }

  // Handle Rescheduling
  async function handleRescheduleSubmit(entryId: string) {
    if (!rescheduleDate) return;
    setReschedulingId(null);

    try {
      const rescheduledAtStr = `${rescheduleDate}T${rescheduleTime}:00`;
      const res = await reschedulePost(entryId, rescheduledAtStr);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Rescheduling failed');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred during reschedule');
    }
  }

  // Handle Action Triggers
  async function handleMarkLive(id: string) {
    try {
      const res = await markPostLive(id);
      if (res.success) router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSkip(id: string) {
    try {
      const res = await skipPost(id);
      if (res.success) router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Are you sure you want to cancel and remove this scheduled post?')) return;
    try {
      const res = await cancelScheduledPost(id);
      if (res.success) router.refresh();
    } catch (err) {
      console.error(err);
    }
  }

  // Format type name helper
  function formatTypeName(type: string) {
    switch (type) {
      case 'script': return 'Script';
      case 'caption': return 'Caption';
      case 'short_form': return 'Short';
      case 'video': return 'Video';
      default: return type;
    }
  }

  // Group entries by day
  const groupedEntries: { [key: string]: ScheduleEntry[] } = {};
  entries.forEach((entry) => {
    const dateStr = new Date(entry.planned_at).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!groupedEntries[dateStr]) {
      groupedEntries[dateStr] = [];
    }
    groupedEntries[dateStr].push(entry);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-300">
      
      {/* Scheduling Side Panel (Left) */}
      <section className="bg-white border border-border-warm rounded-3xl p-6 relative warm-shadow">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-text-primary">Schedule Content</h2>
        </div>

        {pieces.length === 0 ? (
          <div className="flex flex-col gap-4 text-center py-4">
            <p className="text-xs text-text-secondary leading-relaxed">
              No drafts available. Draft some content in the Workspace first.
            </p>
            <Link
              href="/content"
              className="h-10 bg-primary hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center justify-center transition-all shadow-sm"
            >
              Go to Workspace
            </Link>
          </div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col gap-4 text-center py-4">
            <p className="text-xs text-text-secondary leading-relaxed">
              No active channels connected. Connect your social handles in Settings first.
            </p>
            <Link
              href="/settings"
              className="h-10 bg-primary hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center justify-center transition-all shadow-sm"
            >
              Go to Settings
            </Link>
          </div>
        ) : (
          <form onSubmit={handleScheduleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Content Piece</label>
              <select
                value={selectedPieceId}
                onChange={(e) => setSelectedPieceId(e.target.value)}
                className="h-10 px-2.5 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-semibold"
                required
              >
                <option value="">Select draft...</option>
                {pieces.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{formatTypeName(p.type)}] {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text-secondary">Target Channel</label>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="h-10 px-2.5 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-semibold"
                required
              >
                <option value="">Select channel...</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.platform})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Date</label>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="h-10 px-3.5 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-semibold"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Time</label>
                <input
                  type="time"
                  value={plannedTime}
                  onChange={(e) => setPlannedTime(e.target.value)}
                  className="h-10 px-3.5 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-semibold"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs font-bold text-burgundy bg-burgundy/5 border border-burgundy/20 p-2.5 rounded-lg flex items-center gap-1.5 animate-in shake duration-150">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-primary hover:opacity-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-white" />
                  Schedule Post
                </>
              )}
            </button>
          </form>
        )}
      </section>

      {/* Calendar Planned List Grid (Right 2 Columns) */}
      <section className="lg:col-span-2 flex flex-col gap-6 w-full">
        {entries.length === 0 ? (
          <div className="bg-white border border-border-warm rounded-3xl p-12 text-center text-text-secondary flex flex-col items-center justify-center min-h-[320px] warm-shadow">
            <CalendarIcon className="w-12 h-12 text-text-secondary/35 mb-4" />
            <h3 className="text-sm font-semibold text-text-primary mb-1">Calendar is empty</h3>
            <p className="text-xs text-text-secondary max-w-[280px]">
              No posts have been scheduled yet. Plan a social draft on the side panel to map out publication goals.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {Object.keys(groupedEntries).map((dayKey) => (
              <div key={dayKey} className="flex flex-col gap-3">
                
                {/* Day Header */}
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest pl-1">
                  {dayKey}
                </h3>

                {/* Day Entries List */}
                <div className="flex flex-col gap-3">
                  {groupedEntries[dayKey].map((entry) => {
                    const timeStr = new Date(entry.planned_at).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={entry.id}
                        className={`bg-white border rounded-3xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all warm-shadow ${
                          entry.status === 'live'
                            ? 'border-sage/30 bg-sage/[0.01]'
                            : entry.status === 'skipped'
                            ? 'border-border-warm/65 bg-surface-dim/30'
                            : 'border-border-warm hover:border-primary/25'
                        }`}
                      >
                        {/* Info details */}
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            entry.status === 'live'
                              ? 'bg-sage/10 text-sage'
                              : entry.status === 'skipped'
                              ? 'bg-surface-dim text-text-secondary'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            <CalendarIcon className="w-4 h-4" />
                          </div>

                          <div className="flex flex-col">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Link
                                href={`/content/${entry.content_pieces.id}`}
                                className="text-sm font-serif font-bold text-text-primary hover:text-primary transition-colors line-clamp-1"
                              >
                                {entry.content_pieces.title}
                              </Link>
                              
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                                entry.status === 'live'
                                  ? 'bg-sage/5 text-sage border-sage/20'
                                  : entry.status === 'skipped'
                                  ? 'bg-surface-dim text-text-secondary border-border-warm'
                                  : 'bg-primary/5 text-primary border-primary/20'
                              }`}>
                                {entry.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-text-secondary font-bold flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-text-secondary/60" />
                                {timeStr}
                              </span>
                              <span className="text-border-warm text-[10px]">•</span>
                              <span className="text-[10px] text-text-secondary font-bold">
                                {entry.channels.name} ({entry.channels.platform})
                              </span>
                              <span className="text-border-warm text-[10px]">•</span>
                              <span className="px-1.5 py-0.5 rounded bg-surface-container border border-border-warm text-text-secondary text-[9px] font-bold">
                                {formatTypeName(entry.content_pieces.type)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Inline Rescheduling forms or control actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t border-border-warm sm:border-0 pt-3 sm:pt-0">
                          {entry.status === 'planned' && (
                            <>
                              {reschedulingId === entry.id ? (
                                <div className="flex items-center gap-2 bg-surface-container border border-border-warm p-1.5 rounded-xl animate-in zoom-in-95 duration-150">
                                  <input
                                    type="date"
                                    defaultValue={new Date(entry.planned_at).toISOString().split('T')[0]}
                                    onChange={(e) => setRescheduleDate(e.target.value)}
                                    className="h-8 px-2 bg-white text-text-primary text-[10px] border border-border-warm rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                                  />
                                  <input
                                    type="time"
                                    defaultValue={timeStr}
                                    onChange={(e) => setRescheduleTime(e.target.value)}
                                    className="h-8 px-2 bg-white text-text-primary text-[10px] border border-border-warm rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
                                  />
                                  <button
                                    onClick={() => handleRescheduleSubmit(entry.id)}
                                    className="h-8 w-8 bg-sage hover:opacity-95 text-white rounded-lg flex items-center justify-center transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5 text-white" />
                                  </button>
                                  <button
                                    onClick={() => setReschedulingId(null)}
                                    className="h-8 w-8 bg-white border border-border-warm text-text-secondary rounded-lg flex items-center justify-center transition-colors hover:bg-surface-container"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleMarkLive(entry.id)}
                                    className="h-8 px-3 bg-sage hover:opacity-95 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-sm transition-all active:scale-[0.98]"
                                    title="Mark post as Live"
                                  >
                                    <Check className="w-3 h-3 text-white" />
                                    Mark Live
                                  </button>
                                  <button
                                    onClick={() => handleSkip(entry.id)}
                                    className="h-8 px-2.5 bg-white hover:bg-surface-container border border-border-warm text-text-secondary hover:text-text-primary text-[10px] font-bold rounded-lg transition-colors active:scale-[0.98]"
                                    title="Skip publication"
                                  >
                                    Skip
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReschedulingId(entry.id);
                                      setRescheduleDate(new Date(entry.planned_at).toISOString().split('T')[0]);
                                      setRescheduleTime(timeStr);
                                    }}
                                    className="h-8 px-2.5 bg-white hover:bg-surface-container border border-border-warm text-text-secondary hover:text-text-primary text-[10px] font-bold rounded-lg transition-colors active:scale-[0.98]"
                                    title="Reschedule planned date/time"
                                  >
                                    Reschedule
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => handleCancel(entry.id)}
                            className="p-2 bg-white border border-border-warm text-text-secondary hover:text-burgundy hover:border-burgundy/40 rounded-lg transition-colors active:scale-[0.98]"
                            title="Cancel scheduled post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
