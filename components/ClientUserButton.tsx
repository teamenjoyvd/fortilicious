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
      <div className="w-9 h-9 rounded-xl bg-surface-mid animate-pulse border border-border-warm" />
    );
  }

  return <UserButton appearance={appearance} />;
}
