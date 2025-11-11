
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, LayoutDashboard, Dumbbell, Goal, LogOut, Settings, LifeBuoy, Menu, ShieldAlert, BookOpen } from 'lucide-react';
import Avvvatars from 'avvvatars-react';
import { getAuth } from 'firebase/auth';

import LanguageSelector from '@/components/LanguageSelector';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/icons';
import { FirebaseClientProvider, useUser } from '@/firebase';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/practice', icon: Dumbbell, label: 'Practice' },
  { href: '/flashcards', icon: BookOpen, label: 'Flashcards' },
  { href: '/goals', icon: Goal, label: 'Goals' },
];

const secondaryNavItems = [
  { href: '/support', icon: LifeBuoy, label: 'Support' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  const handleLogout = async () => {
    await getAuth().signOut();
    router.push('/login');
  };

  const NavLink = ({ item, isMobile }: { item: typeof navItems[0], isMobile?: boolean }) => {
    const isActive = pathname ? pathname.startsWith(item.href) : false;
    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white',
          isActive && 'bg-gray-700 text-white'
        )}
      >
        <item.icon className="h-5 w-5" />
        <span>{item.label}</span>
      </Link>
    );

    if (isMobile) return linkContent;

    return (
       <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const NavContent = ({ isMobile = false }) => (
    <nav className="grid items-start gap-2">
      {navItems.map((item) => <NavLink key={item.href} item={item} isMobile={isMobile} />)}
      <div className="my-4 border-t border-gray-700 -mx-4"></div>
      {secondaryNavItems.map((item) => <NavLink key={item.href} item={item} isMobile={isMobile} />)}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-900 text-white">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-gray-800 bg-gray-900 sm:flex">
        <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Logo className="text-purple-400" />
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4 px-4">
          <NavContent />
        </div>
      </aside>
      <div className="flex flex-col sm:pl-64">
         <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-gray-800 bg-gray-900 px-4 sm:px-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden bg-gray-800 border-gray-700">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs p-0 bg-gray-900 border-gray-800 text-white">
                <div className="flex h-16 items-center gap-2 border-b border-gray-800 px-6">
                    <Logo className="text-purple-400" />
                </div>
                <div className="p-4">
                  <NavContent isMobile />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex-1">
              <h1 className="text-xl font-semibold sm:text-2xl">vasic</h1>
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
                    <Link href="/settings" className="flex items-center cursor-pointer"><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                    <Link href="/support" className="flex items-center cursor-pointer"><LifeBuoy className="mr-2 h-4 w-4" /><span>Support</span></Link>
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
          <main className="flex-1 p-4 sm:p-6">
            {children}
          </main>
        </div>
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
