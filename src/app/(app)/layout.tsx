'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Home, LayoutDashboard, LogOut, Users, ShieldAlert, Settings, Dumbbell, Trophy, Menu, Compass, Goal, Layers, Sparkles, LifeBuoy } from 'lucide-react';
import Avvvatars from 'avvvatars-react';
import { getAuth } from 'firebase/auth';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/icons';
import { FirebaseClientProvider, useUser } from '@/firebase';

const navItems = [
  { href: '/home', icon: Home, label: 'Home' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/notes', icon: BookOpen, label: 'Notes' },
  { href: '/practice', icon: Dumbbell, label: 'Practice' },
  { href: '/flashcards', icon: Layers, label: 'Flashcards' },
  { href: '/goals', icon: Goal, label: 'Goals' },
  { href: '/mistake-vault', icon: ShieldAlert, label: 'Mistake Vault' },
  { href: '/support', icon: LifeBuoy, label: 'Support' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

const mobileNavItems = [
    { href: '/home', icon: Home, label: 'Home' },
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/practice', icon: Dumbbell, label: 'Practice' },
    { href: '/goals', icon: Goal, label: 'Goals' },
]

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  const handleLogout = async () => {
    await getAuth().signOut();
    router.push('/login');
  };

  const NavContent = () => (
    <nav className="grid items-start gap-2">
      <TooltipProvider>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    isActive && 'bg-accent text-primary'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Logo className="h-6 w-6 text-primary" />
            <span className="text-xl">Vaselearn</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4 px-4">
          <NavContent />
        </div>
      </aside>
      <div className="flex flex-col sm:pl-64">
        <div className="w-full max-w-7xl mx-auto flex flex-col flex-1 sm:gap-4 sm:py-4 px-4 sm:px-6">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background sm:static sm:h-auto sm:border-0 sm:bg-transparent">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="outline" className="sm:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="sm:max-w-xs p-0">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                      <Logo className="h-6 w-6 text-primary" />
                      <span className="text-xl font-semibold">Vaselearn</span>
                    </SheetTitle>
                    <SheetDescription className="sr-only">Main navigation links for the application.</SheetDescription>
                  </SheetHeader>
                <div className="p-4">
                  <NavContent />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex-1">
              <h1 className="text-lg font-semibold sm:text-2xl">Hello, {user?.displayName?.split(' ')[0] || 'Student'}!</h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                  {user ? <Avvvatars value={user.email || ''} style="character" /> : <div className="h-10 w-10 rounded-full bg-muted"></div>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/support">Support</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="grid flex-1 items-start gap-4 md:gap-8 pb-24 sm:pb-0">
            {children}
          </main>
        </div>
      </div>

       {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 h-16 border-t bg-background grid grid-cols-4 items-center justify-around">
        {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        'flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary',
                        isActive && 'text-primary'
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
