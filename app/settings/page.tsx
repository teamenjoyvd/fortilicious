import { createClerkSupabaseClient } from '@/lib/supabase/server';
import { createChannel, updateChannel, toggleChannelActive } from '@/lib/actions/channels';
import { Settings, Plus, Radio, Edit3, Check, X, ShieldAlert } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import DeleteChannelButton from './components/DeleteChannelButton';

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



  const resolvedParams = await searchParams;
  const deleteError = (resolvedParams as any).error || '';

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-text-primary flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-primary" />
          Registry Settings
        </h1>
        <p className="text-sm text-text-secondary font-sans">
          Manage your publishing channel destinations, custom parameters, and account settings.
        </p>
      </section>

      {/* Grid: Creation card on Left, List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Channel creation panel (Left Column) */}
        <section className="bg-white border border-border-warm rounded-3xl p-6 relative warm-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-text-primary">Register Channel</h2>
          </div>

          <form action={handleAddChannel} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-xs font-semibold text-text-secondary">
                Channel Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="e.g. Fortilicious TikTok"
                required
                className="h-10 px-3.5 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/40 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              
              {/* Platform Selector */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="platform" className="text-xs font-semibold text-text-secondary">
                  Platform Type
                </label>
                <select
                  id="platform"
                  name="platform"
                  className="h-10 px-3.5 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary transition-all cursor-pointer"
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
                <label htmlFor="handle" className="text-xs font-semibold text-text-secondary">
                  Channel Handle
                </label>
                <input
                  type="text"
                  id="handle"
                  name="handle"
                  placeholder="e.g. @fortilicious_vera"
                  className="h-10 px-3.5 text-sm bg-surface-container-low border border-border-warm text-text-primary rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-text-secondary/40 transition-all"
                />
              </div>

            </div>

            <button
              type="submit"
              className="w-full h-11 bg-primary hover:opacity-95 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Social Channel
            </button>
          </form>
        </section>

        {/* Existing channels lists (Right 2 Columns) */}
        <section className="lg:col-span-2 flex flex-col gap-6 w-full">
          
          {/* Section title */}
          <div className="flex items-center gap-2.5 pb-2 border-b border-border-warm">
            <Radio className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-text-primary">Registered Channels ({channels.length})</h2>
          </div>

          {/* Delete validation error badge */}
          {deleteError && (
            <div className="border border-burgundy/20 bg-burgundy/5 rounded-2xl p-4 text-xs text-burgundy flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-burgundy shrink-0 mt-0.5" />
              <p className="leading-normal">{deleteError}</p>
            </div>
          )}

          {errorMsg ? (
            <div className="border border-burgundy/20 bg-burgundy/5 rounded-2xl p-6 text-sm text-burgundy">
              Database connection failed: {errorMsg}
            </div>
          ) : channels.length === 0 ? (
            <div className="glass-panel border border-border-warm rounded-3xl p-12 text-center text-text-secondary flex flex-col items-center justify-center bg-white">
              <Radio className="w-12 h-12 text-text-secondary/40 mb-4" />
              <h3 className="text-sm font-semibold text-text-primary mb-1">No channels registered</h3>
              <p className="text-xs text-text-secondary max-w-[280px]">
                Create a social media channel profile on the side panel to begin plotting your calendars.
              </p>
            </div>
          ) : (
            /* Single card grouping destinations */
            <div className="bg-white border border-border-warm rounded-3xl overflow-hidden warm-shadow flex flex-col">
              {channels.map((chan, index) => (
                <div
                  key={chan.id}
                  className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all ${
                    index !== channels.length - 1 ? 'border-b border-border-warm' : ''
                  } ${
                    !chan.active
                      ? 'opacity-65 bg-surface-container-low'
                      : 'hover:bg-surface-container-low/20'
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
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          name="handle"
                          defaultValue={chan.handle || ''}
                          placeholder="@handle"
                          className="h-9 px-3 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="flex gap-1.5 self-end sm:self-center">
                        <Link
                          href="/settings"
                          className="h-9 px-3 bg-white border border-border-warm text-text-secondary hover:text-text-primary hover:bg-surface-container-low text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </Link>
                        <button
                          type="submit"
                          className="h-9 px-3 bg-primary text-white text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors hover:opacity-95"
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
                        <div className="w-10 h-10 rounded-xl bg-surface-container border border-border-warm flex items-center justify-center text-text-secondary font-bold uppercase tracking-wider text-xs">
                          {chan.platform.slice(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-text-primary">{chan.name}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                              {chan.platform}
                            </span>
                          </div>
                          {chan.handle && (
                            <span className="text-xs text-text-secondary font-semibold mt-0.5">
                              {chan.handle}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Controls Area */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-border-warm/40 sm:border-t-0 pt-3 sm:pt-0">
                        {/* Active Toggle switch */}
                        <form action={handleToggleActive} className="flex items-center">
                          <input type="hidden" name="id" value={chan.id} />
                          <input type="hidden" name="active" value={chan.active ? 'true' : 'false'} />
                          <button
                            type="submit"
                            className={`h-8 px-3 text-[10px] font-bold rounded-lg transition-all ${
                              chan.active
                                ? 'bg-sage/10 border border-sage/20 text-sage'
                                : 'bg-white border border-border-warm text-text-secondary hover:text-text-primary hover:bg-surface-container-low'
                            }`}
                          >
                            {chan.active ? 'Active Destination' : 'Deactivated'}
                          </button>
                        </form>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/settings?editId=${chan.id}`}
                            className="p-1.5 bg-white border border-border-warm text-text-secondary hover:text-text-primary hover:border-primary/45 rounded-lg transition-colors"
                            title="Edit details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>

                          <DeleteChannelButton channelId={chan.id} channelName={chan.name} />
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
