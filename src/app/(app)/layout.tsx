
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, LayoutDashboard, Dumbbell, Goal, LogOut, Settings, LifeBuoy } from 'lucide-react';
import Avvvatars from 'avvvatars-react';
import { getAuth } from 'firebase/auth';

import LanguageSelector from '@/components/LanguageSelector';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FirebaseClientProvider, useUser } from '@/firebase';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/practice', icon: Dumbbell, label: 'Practice' },
  { href: '/goals', icon: Goal, label: 'Goals' },
];

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  const handleLogout = async () => {
    await getAuth().signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-900 text-white">

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between px-4 sm:px-6 bg-gray-900">
        <div>
          <h1 className="text-xl font-semibold">
            Hello, {user?.displayName?.split(' ')[0] || 'Student'}!
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <LanguageSelector />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="overflow-hidden rounded-full h-10 w-10 focus-visible:ring-0 focus-visible:ring-offset-0">
                  {user ? <Avvvatars value={user.email || ''} style="character" /> : <div className="h-10 w-10 rounded-full bg-gray-800"></div>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-gray-800 text-white border-gray-700">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                 <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                   <Link href="/support" className="flex items-center cursor-pointer">
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    <span>Support</span>
                   </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 pb-24">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 border-t border-gray-700 bg-gray-800 grid grid-cols-4 items-center">
        {navItems.map((item) => {
            const isActive = pathname ? pathname === item.href : false;
            // Special check for practice to highlight its icon
            const isPracticeActive = isActive || (item.href === '/practice' && pathname?.startsWith('/practice'));
            return (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        'flex flex-col items-center gap-1 text-xs transition-colors',
                        isPracticeActive ? 'text-purple-400' : 'text-gray-400 hover:text-white'
                    )}
                >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                </Link>
            )
        })}
      </nav>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseClientProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </FirebaseClientProvider>
  )
}
