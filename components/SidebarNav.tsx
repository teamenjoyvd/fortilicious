'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Inbox, 
  Columns, 
  Package, 
  FileText, 
  Calendar, 
  Settings, 
  LogOut, 
  HelpCircle 
} from 'lucide-react';
import { SignOutButton } from '@clerk/nextjs';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Pillars', href: '/pillars', icon: Columns },
  { name: 'Catalog', href: '/products', icon: Package },
  { name: 'Content', href: '/content', icon: FileText },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-surface-container-low border-r border-border-warm p-4 gap-6 self-stretch shadow-[2px_0_12px_rgba(196,92,0,0.08)]">
      <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary px-2 mt-2">
        Command Center
      </div>
      <nav className="flex flex-col gap-1.5 flex-grow">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 active:scale-[0.98] ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container shadow-sm border border-border-warm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-container transition-all'
              }`}
            >
              <item.icon className={`w-4.5 h-4.5 transition-colors ${
                isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'
              }`} />
              <span className="font-ui-label text-ui-label">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="pt-4 border-t border-border-warm flex flex-col gap-1.5">
        <a href="#" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-container transition-all duration-200">
          <HelpCircle className="w-4.5 h-4.5 text-text-secondary" />
          <span className="font-ui-label text-ui-label">Support</span>
        </a>
        <SignOutButton>
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-burgundy hover:bg-red-50/50 transition-all duration-200 text-left w-full active:scale-[0.98]">
            <LogOut className="w-4.5 h-4.5 text-burgundy" />
            <span className="font-ui-label text-ui-label">Logout</span>
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
