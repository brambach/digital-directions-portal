"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
}

interface TopNavProps {
  navItems: NavItem[];
  isAdmin: boolean;
}

export function TopNav({ navItems, isAdmin }: TopNavProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/dashboard/admin" || href === "/dashboard/client") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="relative z-20 flex items-center justify-between px-6 lg:px-8 py-4 border-b border-slate-200/60 bg-white/60 sticky top-0 backdrop-blur-sm">
      {/* Brand */}
      <Link href={isAdmin ? "/dashboard/admin" : "/dashboard/client"} className="flex items-center gap-2.5">
        <Image
          src="/images/dd-logo.png"
          alt="Digital Directions"
          width={32}
          height={32}
          className="w-8 h-8 flex-shrink-0"
        />
        <span className="font-semibold text-slate-900 tracking-tight text-base leading-none translate-y-[1px]">
          Digital Directions
        </span>
      </Link>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-4 py-1.5 text-sm font-medium transition-colors rounded-full ${
                active
                  ? "text-slate-900 bg-slate-100"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Profile */}
      <div className="flex items-center gap-4">
        <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
        <div className="hidden md:block">
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9 rounded-full bg-slate-100 border border-slate-200",
              },
            }}
          />
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-slate-200/60 shadow-lg md:hidden">
          <div className="flex flex-col p-4 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    active
                      ? "text-slate-900 bg-slate-100"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="h-px bg-slate-200 my-2 mx-4"></div>
            <div className="px-4 py-2 flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
