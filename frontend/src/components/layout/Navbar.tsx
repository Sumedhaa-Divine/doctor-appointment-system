"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, X, User, LogOut, Calendar, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/doctors", label: "Find Doctors" },
  { href: "/appointments", label: "Appointments" },
  { href: "/consultation", label: "Video Consult" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <Heart className="h-6 w-6 fill-primary" />
          <span>MediConnect</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname.startsWith(link.href) ? "text-primary" : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Calendar className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="bg-primary text-white text-xs">
                    {user.firstName[0]}{user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user.firstName}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-white px-4 py-4 flex flex-col gap-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium py-2 text-muted-foreground hover:text-primary"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t pt-3 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" className="w-full gap-2">
                    <User className="h-4 w-4" /> Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full gap-2" onClick={logout}>
                  <LogOut className="h-4 w-4" /> Log Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login" onClick={() => setMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Log In</Button>
                </Link>
                <Link href="/auth/register" onClick={() => setMenuOpen(false)}>
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
