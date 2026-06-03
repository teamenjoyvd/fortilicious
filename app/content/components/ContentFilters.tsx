'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';

interface Pillar {
  id: string;
  title: string;
}

interface ContentFiltersProps {
  statusFilter: string;
  typeFilter: string;
  pillarFilter: string;
  pillars: Pillar[];
}

export default function ContentFilters({
  statusFilter,
  typeFilter,
  pillarFilter,
  pillars,
}: ContentFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateSearchParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/content?${params.toString()}`);
  }

  return (
    <div className="bg-white border border-border-warm rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs shadow-sm">
      <span className="font-bold text-text-secondary flex items-center gap-1.5">
        <Filter className="w-4 h-4 text-primary" />
        Filter Workspace:
      </span>

      {/* Status Selector */}
      <div className="flex items-center gap-1 bg-surface-container border border-border-warm rounded-xl px-2.5 h-9 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
        <span className="text-text-secondary font-semibold uppercase tracking-wider text-[9px] mr-1">Status</span>
        <select
          value={statusFilter}
          onChange={(e) => updateSearchParam('status', e.target.value)}
          className="bg-transparent text-text-primary font-bold focus:outline-none cursor-pointer text-xs"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Drafts</option>
          <option value="ready">Ready to Post</option>
          <option value="live">Live / Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Type Selector */}
      <div className="flex items-center gap-1 bg-surface-container border border-border-warm rounded-xl px-2.5 h-9 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
        <span className="text-text-secondary font-semibold uppercase tracking-wider text-[9px] mr-1">Format</span>
        <select
          value={typeFilter}
          onChange={(e) => updateSearchParam('type', e.target.value)}
          className="bg-transparent text-text-primary font-bold focus:outline-none cursor-pointer text-xs"
        >
          <option value="all">All Formats</option>
          <option value="script">Script Outline</option>
          <option value="caption">Post Caption</option>
          <option value="short_form">Short-form Video</option>
          <option value="video">Long-form Video</option>
        </select>
      </div>

      {/* Pillar Selector */}
      <div className="flex items-center gap-1 bg-surface-container border border-border-warm rounded-xl px-2.5 h-9 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all max-w-xs">
        <span className="text-text-secondary font-semibold uppercase tracking-wider text-[9px] mr-1">Topic Hub</span>
        <select
          value={pillarFilter}
          onChange={(e) => updateSearchParam('pillarId', e.target.value)}
          className="bg-transparent text-text-primary font-bold focus:outline-none cursor-pointer text-xs truncate max-w-[120px]"
        >
          <option value="all">All Pillars</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
