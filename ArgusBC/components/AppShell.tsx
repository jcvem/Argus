"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ArgusLogo } from "@/components/ArgusLogo";
import {
  Home,
  Users,
  ShieldCheck,
  FileText,
  Search,
  ChevronDown,
  LogOut,
  Menu,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Sliders,
  Terminal,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  activeRoleFilter?: string | null;
  onRoleFilterChange?: (role: string | null) => void;
}

export function AppShell({
  children,
  searchQuery = "",
  onSearchChange,
  activeRoleFilter = null,
  onRoleFilterChange,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authConfigured, isDemoSession, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  // Main menu navigation items matching UI_concept.png
  const MENU_ITEMS = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: Home,
      badge: null,
      exact: true,
    },
    {
      href: "/sandbox",
      label: "Users & Agents",
      icon: Users,
      badge: "13",
      exact: false,
    },
    {
      href: "/policies",
      label: "Policies",
      icon: ShieldCheck,
      badge: null,
      exact: false,
    },
    {
      href: "/documents",
      label: "Files",
      icon: FileText,
      badge: null,
      exact: false,
    },
  ];

  // Roles items matching UI_concept.png
  const ROLE_ITEMS = [
    {
      id: "Developer",
      label: "Developer",
      color: "bg-[#10b981]", // Green
      count: "2",
    },
    {
      id: "Designer",
      label: "Designer",
      color: "bg-[#f59e0b]", // Amber / Yellow
      count: "9",
    },
    {
      id: "Partner",
      label: "Partner",
      color: "bg-[#ec4899]", // Pink / Rose
      count: "3",
    },
    {
      id: "Marketing",
      label: "Marketing",
      color: "bg-[#3b82f6]", // Blue
      count: "1",
    },
  ];

  const handleRoleClick = (roleId: string) => {
    if (onRoleFilterChange) {
      if (activeRoleFilter === roleId) {
        onRoleFilterChange(null);
      } else {
        onRoleFilterChange(roleId);
      }
    } else {
      router.push("/dashboard");
    }
  };

  // User display name & email
  const displayName = user?.displayName || "Melia Iasus";
  const userEmail = user?.email || "melia@argus.com";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-gray-900 flex font-sans selection:bg-[#f5f3ff] selection:text-[#7c3aed]">
      {/* 1. Desktop Fixed White Left Sidebar (approx 250px) */}
      <aside className="hidden lg:flex flex-col w-[252px] flex-shrink-0 bg-white border-r border-gray-200/80 h-screen sticky top-0 z-30 select-none">
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-100 relative">
          <div
            onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
            className="flex items-center justify-between cursor-pointer group p-1 -m-1 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ArgusLogo size="md" />
              <div>
                <div className="font-bold text-gray-900 text-sm tracking-tight leading-tight">
                  ARGUS
                </div>
                <div className="text-xs text-gray-500 font-normal leading-tight flex items-center gap-1">
                  <span>Team</span>
                </div>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>

          {/* Team Dropdown Menu */}
          {teamDropdownOpen && (
            <div className="absolute top-16 left-3 right-3 bg-white border border-gray-200 rounded-lg shadow-elevated p-2 z-50 text-xs">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-gray-400">
                Switch Workspace
              </div>
              <button
                type="button"
                onClick={() => setTeamDropdownOpen(false)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 flex items-center justify-between text-gray-800 font-medium"
              >
                <span>Argus Core Operations</span>
                <span className="text-[10px] text-emerald-600 font-mono">ACTIVE</span>
              </button>
              <button
                type="button"
                onClick={() => setTeamDropdownOpen(false)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-gray-600"
              >
                <span>RedactCore Daemon Local</span>
              </button>
              <div className="border-t border-gray-100 my-1" />
              <Link
                href="/views/new"
                onClick={() => setTeamDropdownOpen(false)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-argus-brand font-medium flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>New Verified View</span>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar Search Bar */}
        <div className="px-3 pt-3">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed] transition-all"
            />
            <div className="absolute right-2 text-[10px] font-mono text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.2 rounded select-none pointer-events-none">
              /
            </div>
          </div>
        </div>

        {/* Scrollable Nav Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {/* Section 1: Menu */}
          <div>
            <div className="px-3 pb-1.5 text-[11px] font-medium text-gray-400 tracking-wider">
              Menu
            </div>
            <nav className="space-y-0.5">
              {MENU_ITEMS.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? "bg-[#f5f3ff] text-[#7c3aed]"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-[#7c3aed]" : "text-gray-400"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-600 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Section 2: Roles */}
          <div>
            <div className="flex items-center justify-between px-3 pb-1.5">
              <span className="text-[11px] font-medium text-gray-400 tracking-wider">
                Roles
              </span>
              {activeRoleFilter && (
                <button
                  type="button"
                  onClick={() => onRoleFilterChange?.(null)}
                  className="text-[10px] text-argus-brand hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {ROLE_ITEMS.map((role) => {
                const isSelected = activeRoleFilter === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleClick(role.id)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors text-left ${
                      isSelected
                        ? "bg-[#f5f3ff] text-[#7c3aed] font-semibold"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-normal"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${role.color}`} />
                      <span>{role.label}</span>
                    </div>

                    <span className="w-5 h-5 flex items-center justify-center text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
                      {role.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar Footer: User Profile */}
        <div className="p-3 border-t border-gray-100 relative">
          <div
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Circular Avatar */}
              <div className="w-8 h-8 rounded-full bg-argus-brand text-white flex items-center justify-center font-semibold text-xs flex-shrink-0 shadow-xs">
                {userInitials}
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-900 leading-tight truncate">
                  {displayName}
                </div>
                <div className="text-[11px] text-gray-400 truncate leading-tight mt-0.5">
                  {userEmail}
                </div>
              </div>
            </div>

            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors flex-shrink-0" />
          </div>

          {/* User Menu Popup */}
          {userMenuOpen && (
            <div className="absolute bottom-16 left-3 right-3 bg-white border border-gray-200 rounded-lg shadow-elevated p-2 z-50 text-xs">
              <div className="px-2 py-1 border-b border-gray-100 mb-1">
                <div className="font-semibold text-gray-900">{displayName}</div>
                <div className="text-[10px] text-gray-500 font-mono truncate">{userEmail}</div>
                <div className="text-[10px] text-emerald-600 font-mono mt-0.5">
                  {authConfigured ? "FIREBASE AUTHENTICATED" : isDemoSession ? "DEMO SESSION" : "UNAUTHENTICATED"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  signOut();
                }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-red-50 text-red-600 font-medium flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 2. Mobile Header Bar (< lg) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 text-gray-600 hover:text-gray-900 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2">
            <ArgusLogo size="sm" />
            <span className="font-bold text-gray-900 text-sm tracking-tight">ARGUS</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {authConfigured ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>Auth</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
              <AlertCircle className="w-2.5 h-2.5" />
              <span>Demo</span>
            </span>
          )}

          <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-[10px]">
            {userInitials}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[49px] z-50 lg:hidden flex">
          <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col justify-between shadow-elevated">
            <div className="space-y-4">
              {/* Search input in mobile */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <div className="px-2 pb-1 text-[11px] font-medium text-gray-400 tracking-wider">
                  Menu
                </div>
                <nav className="space-y-1">
                  {MENU_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                          isActive
                            ? "bg-[#f5f3ff] text-[#7c3aed]"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-[11px] bg-gray-100 rounded-full">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div>
                <div className="px-2 pb-1 text-[11px] font-medium text-gray-400 tracking-wider">
                  Roles
                </div>
                <div className="space-y-1">
                  {ROLE_ITEMS.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => {
                        handleRoleClick(role.id);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${role.color}`} />
                        <span>{role.label}</span>
                      </div>
                      <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 rounded-full">
                        {role.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-mono text-[10px]">ARGUS V0.1.0</span>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-red-600 text-xs font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
          <div
            className="flex-1 bg-black/20 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* 3. Main Content Workspace */}
      <main className="flex-1 overflow-y-auto min-h-screen pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
