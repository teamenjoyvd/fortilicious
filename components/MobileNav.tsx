'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Inbox, 
  Columns, 
  Package, 
  Settings, 
  FileText 
} from 'lucide-react';

const mobileItems = [
  { name: 'Home', href: '/', icon: LayoutDashboard },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Pillars', href: '/pillars', icon: Columns },
  { name: 'Catalog', href: '/products', icon: Package },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border-warm flex items-center justify-around px-2 z-40 shadow-[0_-2px_12px_rgba(196,92,0,0.08)]">
      {mobileItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 ${
              isActive
                ? 'bg-secondary-container text-on-secondary-container scale-95 border border-border-warm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold mt-1 font-ui-label">{item.name}</span>
          </Link>
        );
      })}
      {/* Settings tab on Mobile */}
      <Link
        href="/settings"
        className={`flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 ${
          pathname.startsWith('/settings')
            ? 'bg-secondary-container text-on-secondary-container scale-95 border border-border-warm'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px] font-bold mt-1 font-ui-label">Settings</span>
      </Link>
    </nav>
  );
}
