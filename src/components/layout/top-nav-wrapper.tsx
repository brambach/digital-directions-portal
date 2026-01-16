"use client";

import TopNav from "./top-nav";

interface NavItem {
  label: string;
  href: string;
}

interface TopNavWrapperProps {
  navItems: NavItem[];
  isAdmin: boolean;
}

export default function TopNavWrapper({ navItems, isAdmin }: TopNavWrapperProps) {
  return <TopNav navItems={navItems} isAdmin={isAdmin} />;
}
