'use client';

import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { syncAmwayCatalog } from '@/lib/actions/sync';
import { useRouter } from 'next/navigation';

export default function SyncButton() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSyncClick() {
    console.log('🔄 [SyncButton] Clicked! Initiating catalog synchronization...');
    setIsPending(true);

    try {
      const res = await syncAmwayCatalog();
      console.log('📡 [SyncButton] Received response from server:', res);

      if (res.success) {
        console.log(`✅ [SyncButton] Sync successful! Mapped & upserted ${res.count} products.`);
        router.refresh();
      } else {
        console.error('❌ [SyncButton] Sync action returned failure:', res.error);
        alert(`Sync Failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('💥 [SyncButton] Exception caught during sync execution:', err);
      alert(`Sync Exception: ${err.message || 'Server connection failed'}`);
    } finally {
      setIsPending(false);
      console.log('🏁 [SyncButton] Operation lifecycle finished.');
    }
  }

  return (
    <button
      onClick={handleSyncClick}
      disabled={isPending}
      className="h-10 px-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-all shadow-md group active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {isPending ? (
        <>
          <Loader2 className="w-4 h-4 text-rose-400 animate-spin" />
          Syncing Catalog...
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 text-rose-400 group-hover:rotate-180 transition-transform duration-500" />
          Sync Amway Catalog
        </>
      )}
    </button>
  );
}
