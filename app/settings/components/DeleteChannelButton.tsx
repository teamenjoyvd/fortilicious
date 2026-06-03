'use client';

import { useTransition } from 'react';
import { deleteChannel } from '@/lib/actions/channels';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteChannelButtonProps {
  channelId: string;
  channelName: string;
}

export default function DeleteChannelButton({ channelId, channelName }: DeleteChannelButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete channel "${channelName}"?`)) {
      return;
    }
    startTransition(async () => {
      const res = await deleteChannel(channelId);
      if (!res.success) {
        alert(res.error || 'Failed to delete channel');
        router.push(`/settings?error=${encodeURIComponent(res.error || 'Delete failed')}`);
      } else {
        router.push('/settings');
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="p-1.5 bg-burgundy/10 hover:bg-burgundy/20 border border-burgundy/20 hover:border-burgundy/30 text-burgundy rounded-lg transition-colors disabled:opacity-50 active:scale-95"
      title="Delete channel"
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-burgundy" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
