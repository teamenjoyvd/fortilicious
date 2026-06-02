import type { Metadata } from 'next';
import { DM_Sans, DM_Serif_Display } from 'next/font/google';
import './globals.css';
import { ClerkProvider, SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import SearchAll from '@/components/SearchAll';
import Link from 'next/link';
import { LayoutDashboard, Inbox, Columns, Package, FileText, Calendar, Settings, Lock } from 'lucide-react';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  variable: '--font-dm-serif',
  weight: ['400'],
});

export const metadata: Metadata = {
  title: 'Fortilicious Social Manager',
  description: 'Private Social Presence and Catalog Manager for Fortilicious by Vera',
};

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Pillars', href: '/pillars', icon: Columns },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Content', href: '/content', icon: FileText },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en" className={`${dmSans.variable} ${dmSerif.variable} light`}>
        <body className="bg-gradient-radial-light min-h-screen flex flex-col font-sans text-[#1A1714]">
          
          {userId ? (
            /* Gated Application View (Server-Rendered Gating) */
            <>
              {/* Header Area */}
              <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/60 px-4 md:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-md shadow-rose-500/10">
                      <span className="font-black text-white text-base">F</span>
                    </div>
                    <span className="font-extrabold text-lg tracking-tight text-slate-900 hidden sm:block">
                      Fortilicious
                    </span>
                  </Link>
                </div>

                {/* Centered Search Bar */}
                <div className="flex-1 max-w-md mx-4 flex justify-center">
                  <SearchAll />
                </div>

                {/* User Identity widget */}
                <div className="flex items-center gap-4">
                  <UserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-9 h-9 rounded-xl ring-2 ring-rose-500/10"
                      }
                    }}
                  />
                </div>
              </header>

              {/* Layout Wrapper */}
              <div className="flex flex-1 relative pb-20 md:pb-0">
                
                {/* Desktop Left Sidebar */}
                <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-slate-200/60 p-6 gap-6 self-stretch">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Navigation
                  </div>
                  <nav className="flex flex-col gap-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-rose-500/5 transition-all group"
                      >
                        <item.icon className="w-4.5 h-4.5 text-slate-400 group-hover:text-rose-500 transition-colors" />
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                  {children}
                </main>
              </div>

              {/* Mobile Bottom Navigation Bar (Strict 390px Compliance) */}
              <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-panel border-t border-slate-200/60 flex items-center justify-around px-2 z-40">
                {navItems.slice(0, 5).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-center justify-center w-12 h-12 text-slate-500 hover:text-rose-500 transition-colors"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold mt-1">{item.name}</span>
                  </Link>
                ))}
                {/* Link for Settings on Mobile */}
                <Link
                  key="/settings"
                  href="/settings"
                  className="flex flex-col items-center justify-center w-12 h-12 text-slate-500 hover:text-rose-500 transition-colors"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-[10px] font-bold mt-1">Settings</span>
                </Link>
              </nav>
            </>
          ) : (
            /* Gated SignedOut Gateway Wall (Server-Rendered Gating) */
            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50">
              <div className="w-full max-w-md glass-panel border border-slate-200/80 rounded-3xl p-8 flex flex-col items-center shadow-xl animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 mb-6">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                
                <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2 text-center font-sans">
                  Fortilicious Social Manager
                </h1>
                <p className="text-sm text-slate-500 mb-8 text-center max-w-[280px]">
                  Private planning and tracking console for sole operator Vera.
                </p>

                <SignInButton mode="modal">
                  <button className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-semibold rounded-2xl shadow-md shadow-rose-500/10 hover:shadow-rose-500/15 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                    Authenticate to Portal
                  </button>
                </SignInButton>
              </div>
            </div>
          )}

        </body>
      </html>
    </ClerkProvider>
  );
}
