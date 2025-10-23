
"use client";

import { use, useEffect, useState } from 'react';
import { useAuth } from '@/firebase/provider';
import { useRouter, usePathname } from 'next/navigation';
import { Toaster } from "@/components/ui/toaster"
import {
  Bell,
  Home,
  LineChart,
  Package,
  Package2,
  ShoppingCart,
  Users,
  Globe,
} from "lucide-react"

import Link from "next/link"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

import { signOut } from 'firebase/auth';
import { auth } from '@/firebase';

import { MobileNav } from '@/components/MobileNav';
import { useMobile } from '@/hooks/use-mobile';
import { NonBlockingLogin } from '@/firebase/non-blocking-login';
import { NonBlockingUpdates } from '@/firebase/non-blocking-updates';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Icons } from '@/components/icons';


const navLinks = [
  { href: "/home",       icon: <Home className="h-5 w-5" />,        label: "Home" },
  { href: "/dashboard",  icon: <LineChart className="h-5 w-5" />,   label: "Dashboard" },
  { href: "/practice",   icon: <Icons.brain className="h-5 w-5" />, label: "Practice", badge: "Pro" },
  { href: "/goals",      icon: <Icons.goal className="h-5 w-5" />,  label: "Goals", badge: "Pro" },
  { href: "/notes",      icon: <Icons.notebook className="h-5 w-5" />,  label: "Notes", badge: "Pro" },
  // { href: "/flashcards",      icon: <Icons.flashcards className="h-5 w-5" />,  label: "Flashcards", badge: "Pro" },
  // { href: "/tutor",      icon: <Icons.bot className="h-5 w-5" />,  label: "AI Tutor", badge: "Pro" },
  // { href: "/mistake-vault",      icon: <Icons.vault className="h-5 w-5" />,  label: "Mistake Vault", badge: "Pro" },
  // { href: "/support",    icon: <Users className="h-5 w-5" />,      label: "Support" },
];


export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, onLogout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useMobile();

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        onLogout();
        router.push('/login');
      })
      .catch((error) => {
        console.error('Logout Error:', error);
      });
  };

  const handleLanguageChange = (locale: string) => {
    const newPath = `/${locale}${pathname.substring(3)}`;
    router.push(newPath);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user && !loading) {
    router.push('/login');
    return null;
  }

  if(isMobile) {
    return <MobileNav onLogout={handleLogout} user={user}>{children}</MobileNav>;
  }


  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
       <NonBlockingLogin />
       <NonBlockingUpdates />
       <FirebaseErrorListener />
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Icons.logo className="h-6 w-6" />
              <span className="text-xl">vaselearn</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navLinks.map(({ href, icon, label, badge }) => (
                <Link
                  key={label}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${pathname.endsWith(href) ? 'bg-muted text-primary' : ''
                    }`}
                >
                  {icon}
                  {label}
                  {badge && <Badge className="ml-auto flex h-6 w-11 shrink-0 items-center justify-center rounded-full text-xs">
                    {badge}
                  </Badge>}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <Icons.menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  href="#"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <Icons.logo className="h-6 w-6" />
                  <span className="text-xl font-semibold">vaselearn</span>
                </Link>
                {navLinks.map(({ href, icon, label, badge }) => (
                  <Link
                    key={label}
                    href={href}
                    className="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    {icon}
                    {label}
                    {badge && <Badge className="ml-auto flex h-6 w-11 shrink-0 items-center justify-center rounded-full text-xs">
                    {badge}
                  </Badge>}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleLanguageChange('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLanguageChange('et')}>Eesti</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLanguageChange('lv')}>Latviešu</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLanguageChange('lt')}>Lietuvių</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={user?.photoURL} />
                  <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
        <Toaster />
      </div>
    </div>
  )
}
