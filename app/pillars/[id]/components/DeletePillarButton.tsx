'use client';

import { useTransition } from 'react';
import { deletePillar } from '@/lib/actions/pillars';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

export default function DeletePillarButton({ pillarId }: { pillarId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleDelete() {
    if (!confirm('Are you absolutely sure you want to delete this evergreen pillar? This will remove all associated junctions and references.')) {
      return;
    }
    startTransition(async () => {
      const res = await deletePillar(pillarId);
      if (res.success) {
        router.push('/pillars');
      } else {
        alert(res.error || 'Failed to delete pillar');
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="h-9 w-9 bg-burgundy/10 hover:bg-burgundy/20 border border-burgundy/20 text-burgundy rounded-lg flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
      title="Delete pillar"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin text-burgundy" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </button>
  );
}
