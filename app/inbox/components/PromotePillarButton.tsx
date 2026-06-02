'use client';

import { useState } from 'react';
import { promoteToPillar } from '@/lib/actions/captures';
import { Plus, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PromotePillarButtonProps {
  captureId: string;
  captureBody: string;
}

export default function PromotePillarButton({ captureId, captureBody }: PromotePillarButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Pillar title is required');
      return;
    }

    setIsPending(true);
    setErrorMsg('');

    try {
      const res = await promoteToPillar(captureId, title.trim(), captureBody);
      if (res.success) {
        setIsOpen(false);
        setTitle('');
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to promote capture to pillar');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setErrorMsg('');
        }}
        className="h-8 px-3 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100 text-[10px] font-bold rounded-lg flex items-center gap-1.5 transition-all"
        title="Promote to Evergreen Pillar"
      >
        <Plus className="w-3.5 h-3.5" />
        Promote to Pillar
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 relative flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-950/50 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold text-white">Promote to Content Pillar</h3>
              <p className="text-xs text-slate-400">
                Create a new EVERGREEN topic cluster using this capture.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Pillar Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Balances Insulin without Spikes"
                  className="h-10 px-3 text-sm bg-slate-950 border border-slate-800 text-slate-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder:text-slate-600 transition-all"
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400">Description (Source Capture)</label>
                <div className="p-3 text-xs bg-slate-950 border border-slate-850 text-slate-400 rounded-xl max-h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {captureBody}
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs font-semibold text-red-400 bg-red-950/20 border border-red-900/50 p-2.5 rounded-lg animate-in shake duration-200">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 h-10 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 h-10 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 transition-all"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Confirm Promotion'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
