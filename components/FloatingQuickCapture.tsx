'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PlusCircle, Mic, Loader2, Check } from 'lucide-react';
import { createCapture } from '@/lib/actions/captures';

export default function FloatingQuickCapture() {
  const pathname = usePathname();
  const router = useRouter();
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  // Scoped paths where the quick capture should float
  const isHome = pathname === '/';
  const isInbox = pathname === '/inbox';
  const isPillarDetail = pathname.startsWith('/pillars/') && pathname !== '/pillars';

  const shouldRender = isHome || isInbox || isPillarDetail;

  if (!shouldRender) return null;

  async function handleCapture() {
    if (!body.trim() || isPending) return;

    startTransition(async () => {
      try {
        const res = await createCapture(body.trim());
        if (res.success) {
          setBody('');
          setSuccess(true);
          router.refresh();
          setTimeout(() => setSuccess(false), 2000);
        } else {
          alert(`Capture failed: ${res.error}`);
        }
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleCapture();
    }
  }

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-xl z-50 animate-in slide-in-from-bottom-5 duration-300 font-sans">
      <div className="bg-white border border-border-warm rounded-2xl h-[56px] warm-shadow flex items-center px-4 gap-3 hover:border-primary/20 transition-all duration-200">
        
        {success ? (
          <Check className="w-5 h-5 text-[#3D7A4A] animate-bounce shrink-0" />
        ) : isPending ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
        ) : (
          <PlusCircle className="w-5 h-5 text-primary shrink-0 cursor-pointer" onClick={handleCapture} />
        )}

        <input 
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          placeholder="Quick Capture: type product, amount, or pillar..."
          className="flex-grow bg-transparent border-none focus:ring-0 text-sm text-text-primary placeholder:text-text-secondary/50 outline-none h-full font-sans"
        />

        <div className="flex items-center gap-2 border-l border-border-warm pl-3 shrink-0">
          <button 
            type="button"
            className="p-1 hover:text-primary text-text-secondary/60 transition-colors"
            title="Voice Memo (Mock)"
          >
            <Mic className="w-4 h-4" />
          </button>
          
          <button
            type="button"
            onClick={handleCapture}
            disabled={!body.trim() || isPending}
            className="bg-primary text-white px-4 py-1.5 rounded-lg font-ui-label text-xs hover:opacity-90 disabled:opacity-40 transition-all duration-200 active:scale-95 shrink-0"
          >
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}
