'use client';

import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';

interface PillarStatusSelectProps {
  initialStatus: 'active' | 'live' | 'archived';
  onUpdateStatus: (status: 'active' | 'live' | 'archived') => Promise<void>;
}

export default function PillarStatusSelect({
  initialStatus,
  onUpdateStatus,
}: PillarStatusSelectProps) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'active' | 'live' | 'archived';
    startTransition(async () => {
      await onUpdateStatus(val);
    });
  };

  return (
    <div className="relative flex items-center">
      <select
        name="status"
        defaultValue={initialStatus}
        onChange={handleChange}
        disabled={isPending}
        className="h-9 pl-3 pr-8 text-xs bg-surface-container-low border border-border-warm text-text-primary rounded-lg focus:outline-none cursor-pointer focus:ring-1 focus:ring-primary disabled:opacity-60 transition-all appearance-none"
      >
        <option value="active">Active</option>
        <option value="live">Live</option>
        <option value="archived">Archived</option>
      </select>
      <div className="absolute right-2.5 pointer-events-none flex items-center text-text-secondary">
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
    </div>
  );
}
