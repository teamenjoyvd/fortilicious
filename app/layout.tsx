import type { Metadata } from 'next';
import { Playfair_Display, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ClerkProvider, SignInButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import SearchAll from '@/components/SearchAll';
import ClientUserButton from '@/components/ClientUserButton';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import MobileNav from '@/components/MobileNav';
import SidebarNav from '@/components/SidebarNav';
import FloatingQuickCapture from '@/components/FloatingQuickCapture';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['500'],
});

export const metadata: Metadata = {
  title: 'Fortilicious Command Center',
  description: 'Private Social Presence and Catalog Manager for Fortilicious by Vera',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#964500',
          colorBackground: '#fff8f0',
          colorText: '#1C1208',
          borderRadius: '0.75rem',
          fontFamily: 'var(--font-inter)',
        },
        elements: {
          card: 'border border-border-warm shadow-md bg-white',
          formButtonPrimary: 'bg-primary text-white hover:opacity-90 transition-all font-bold h-11 rounded-xl',
          headerTitle: 'font-serif text-xl text-text-primary',
          headerSubtitle: 'text-xs text-text-secondary',
          footerActionLink: 'text-primary hover:underline',
          input: 'bg-surface border border-border-warm text-text-primary rounded-xl focus:ring-1 focus:ring-primary',
        }
      }}
    >
      <html lang="en" className={`${playfair.variable} ${inter.variable} ${jetbrains.variable} light`}>
        <body className="bg-gradient-radial-light min-h-screen flex flex-col font-sans text-text-primary custom-scrollbar">
          
          {userId ? (
            /* Gated Application View (Server-Rendered Gating) */
            <>
              {/* Header Area */}
              <header className="sticky top-0 z-40 w-full bg-surface border-b border-border-warm px-4 md:px-8 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/10 group-hover:scale-105 transition-transform">
                      <span className="font-serif text-white text-base font-bold">F</span>
                    </div>
                    <span className="font-serif text-lg font-bold tracking-tight text-primary hidden sm:block">
                      Fortilicious
                    </span>
                  </Link>
                </div>

                {/* Centered Search Bar */}
                <div className="flex-grow max-w-md mx-4 flex justify-center">
                  <SearchAll />
                </div>

                {/* User Identity widget */}
                <div className="flex items-center gap-4">
                  <ClientUserButton 
                    appearance={{
                      elements: {
                        avatarBox: "w-9 h-9 rounded-xl ring-2 ring-primary/20 border border-border-warm"
                      }
                    }}
                  />
                </div>
              </header>

              {/* Layout Wrapper */}
              <div className="flex flex-1 relative pb-20 md:pb-0">
                
                {/* Desktop Left Sidebar (Client-side highlighting) */}
                <SidebarNav />

                {/* Main Content Area */}
                <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full transition-all duration-300">
                  {children}
                </main>
              </div>

              {/* Floating Quick Capture Bar inside scoped pages */}
              <FloatingQuickCapture />

              {/* Mobile Bottom Navigation Bar (Active Link highlighting, strict 390px viewport safety) */}
              <MobileNav />
            </>
          ) : (
            /* Gated SignedOut Gateway Wall (Server-Rendered Gating in premium cream brand styles) */
            <div className="flex-grow flex flex-col items-center justify-center p-4 bg-background">
              <div className="w-full max-w-md bg-white border border-border-warm rounded-3xl p-8 flex flex-col items-center shadow-xl animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/10 mb-6">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                
                <h1 className="text-2xl font-serif font-bold tracking-tight text-text-primary mb-2 text-center flex items-center gap-1.5 justify-center">
                  Fortilicious Social Manager
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </h1>
                <p className="text-sm text-text-secondary mb-8 text-center max-w-[280px] font-sans">
                  Private planning and tracking console for sole operator Vera.
                </p>

                <SignInButton mode="modal">
                  <button className="w-full py-3.5 bg-primary text-white text-xs font-bold rounded-2xl shadow-md shadow-primary/10 hover:opacity-90 active:scale-95 transition-all">
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
