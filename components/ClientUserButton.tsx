'use client';

import { UserButton } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

interface ClientUserButtonProps {
  appearance?: any;
}

export default function ClientUserButton({ appearance }: ClientUserButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Match the size (w-9 h-9 rounded-xl) and border of the avatarBox style
    return (
      <div className="w-9 h-9 rounded-xl bg-slate-200 animate-pulse border border-slate-300/40" />
    );
  }

  return <UserButton appearance={appearance} />;
}
