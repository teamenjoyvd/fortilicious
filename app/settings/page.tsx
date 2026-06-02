import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { createChannel, updateChannel, toggleChannelActive, deleteChannel } from '@/lib/actions/channels';
import { Settings, Plus, Radio, Edit3, Trash2, Check, X, ShieldAlert, Heart } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 0; // Dynamic route

interface SettingsPageProps {
  searchParams: Promise<{
    editId?: string;
  }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = await searchParams;
  const editId = resolvedSearchParams.editId;

  let channels: any[] = [];
  let errorMsg = '';

  try {
    const supabase = await createClerkSupabaseClient();
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('platform', { ascending: true });

    if (error) {
      console.error('Settings Channels Error:', error);
      errorMsg = error.message;
    } else {
      channels = data || [];
    }
  } catch (err: any) {
    errorMsg = err.message || 'Authentication error';
  }

  // Server Action to add channel
  async function handleAddChannel(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const platform = formData.get('platform') as 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'other';
    const handle = formData.get('handle') as string;

    if (!name || !name.trim()) return;

    await createChannel(name, platform, handle);
    redirect('/settings');
  }

  // Server Action to toggle active state
  async function handleToggleActive(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const isActive = formData.get('active') === 'true';
    await toggleChannelActive(id, !isActive);
    redirect('/settings');
  }

  // Server Action to save inline edit updates
  async function handleSaveEdit(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const handle = formData.get('handle') as string;

    if (!name || !name.trim()) return;

    await updateChannel(id, name, handle);
    redirect('/settings');
  }

  // Server Action to delete channel
  async function handleDelete(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;
    const res = await deleteChannel(id);
    if (!res.success) {
      // Pass back error via query params
      redirect(`/settings?error=${encodeURIComponent(res.error || 'Delete failed')}`);
    }
    redirect('/settings');
  }

  const resolvedParams = await searchParams;
  const deleteError = (resolvedParams as any).error || '';

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-rose-500" />
          Registry Settings
        </h1>
        <p className="text-sm text-slate-400">
          Manage your publishing channel destinations, custom parameters, and account settings.
        </p>
      </section>

      {/* Grid: Creation card on Left, List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Channel creation panel (Left Column) */}
        <section className="glass-panel border border-slate-900 rounded-3xl p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-5 h-5 text-rose-500" />
            <h2 className="text-base font-bold text-white">Register Channel</h2>
          </div>

          <form action={handleAddChannel} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-slate-400">
                Channel Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="e.g. Fortilicious TikTok"
                required
                className="h-10 px-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-650 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              
              {/* Platform Selector */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="platform" className="text-xs font-semibold text-slate-400">
                  Platform Type
                </label>
                <select
                  id="platform"
                  name="platform"
                  className="h-10 px-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all cursor-pointer"
                >
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="youtube">YouTube</option>
                  <option value="other">Other / Custom</option>
                </select>
              </div>

              {/* Handle Field */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="handle" className="text-xs font-semibold text-slate-400">
                  Channel Handle
                </label>
                <input
                  type="text"
                  id="handle"
                  name="handle"
                  placeholder="e.g. @fortilicious_vera"
                  className="h-10 px-3.5 text-sm bg-slate-950 border border-slate-900 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 placeholder:text-slate-650 transition-all"
                />
              </div>

            </div>

            <button
              type="submit"
              className="w-full h-11 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Social Channel
            </button>
          </form>
        </section>

        {/* Existing channels lists (Right 2 Columns) */}
        <section className="lg:col-span-2 flex flex-col gap-6 w-full">
          
          {/* Section title */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-900">
            <Radio className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-bold text-white">Registered Channels ({channels.length})</h2>
          </div>

          {/* Delete validation error badge */}
          {deleteError && (
            <div className="glass-panel border border-rose-950/40 bg-rose-950/10 rounded-2xl p-4 text-xs text-rose-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-normal">{deleteError}</p>
            </div>
          )}

          {errorMsg ? (
            <div className="glass-panel border border-rose-950/20 bg-rose-950/5 rounded-2xl p-6 text-sm text-rose-300">
              Database connection failed: {errorMsg}
            </div>
          ) : channels.length === 0 ? (
            <div className="glass-panel border border-slate-900 rounded-3xl p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Radio className="w-12 h-12 text-slate-800 mb-4" />
              <h3 className="text-sm font-semibold text-slate-400 mb-1">No channels registered</h3>
              <p className="text-xs text-slate-500 max-w-[280px]">
                Create a social media channel profile on the side panel to begin plotting your calendars.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {channels.map((chan) => (
                <div
                  key={chan.id}
                  className={`glass-panel border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all ${
                    !chan.active
                      ? 'border-rose-950/20 opacity-60 bg-rose-950/5'
                      : 'border-slate-900 hover:border-slate-800'
                  }`}
                >
                  
                  {editId === chan.id ? (
                    /* INLINE EDIT MODE FORM */
                    <form action={handleSaveEdit} className="flex-1 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <input type="hidden" name="id" value={chan.id} />
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                        <input
                          type="text"
                          name="name"
                          defaultValue={chan.name}
                          required
                          className="h-9 px-3 text-xs bg-slate-950 border border-slate-900 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                        <input
                          type="text"
                          name="handle"
                          defaultValue={chan.handle || ''}
                          placeholder="@handle"
                          className="h-9 px-3 text-xs bg-slate-950 border border-slate-900 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div className="flex gap-1.5 self-end sm:self-center">
                        <Link
                          href="/settings"
                          className="h-9 px-3 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </Link>
                        <button
                          type="submit"
                          className="h-9 px-3 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* DEFAULT DISPLAY CARD */
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-center text-slate-400 font-bold uppercase tracking-wider text-xs">
                          {chan.platform.slice(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-100">{chan.name}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/5 px-1.5 py-0.5 rounded">
                              {chan.platform}
                            </span>
                          </div>
                          {chan.handle && (
                            <span className="text-xs text-slate-500 font-semibold mt-0.5">
                              {chan.handle}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Controls Area */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-900/40 sm:border-t-0 pt-3 sm:pt-0">
                        {/* Active Toggle switch */}
                        <form action={handleToggleActive} className="flex items-center">
                          <input type="hidden" name="id" value={chan.id} />
                          <input type="hidden" name="active" value={chan.active ? 'true' : 'false'} />
                          <button
                            type="submit"
                            className={`h-8 px-3 text-[10px] font-bold rounded-lg transition-all ${
                              chan.active
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                : 'bg-slate-950 border border-slate-900 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            {chan.active ? 'Active Destination' : 'Deactivated'}
                          </button>
                        </form>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/settings?editId=${chan.id}`}
                            className="p-1.5 bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors"
                            title="Edit details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>

                          <form action={handleDelete}>
                            <input type="hidden" name="id" value={chan.id} />
                            <button
                              type="submit"
                              className="p-1.5 bg-rose-950/10 hover:bg-rose-950/40 border border-rose-950/20 hover:border-rose-950/50 text-rose-400 hover:text-rose-300 rounded-lg transition-colors"
                              title="Delete channel"
                              onClick={(e) => {
                                if (!confirm(`Are you sure you want to delete channel "${chan.name}"?`)) {
                                  e.preventDefault();
                                }
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </div>
                      </div>
                    </>
                  )}

                </div>
              ))}
            </div>
          )}

        </section>

      </div>

    </div>
  );
}
