"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Compass,
  FileText,
  History,
  LayoutDashboard,
  ScanSearch,
  Settings,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { ScopeMark } from "@/components/brand/scope-mark";
import { ModeBadge } from "@/components/system/mode-badge";
import { ThemeQuickToggle } from "@/components/theme/theme-toggle";
import { APP_NAME, navigation, systemNavigation } from "@/config/app";
import { cn } from "@/lib/utils";

const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  builder: SlidersHorizontal,
  analyzer: ScanSearch,
  comparison: BarChart3,
  history: History,
  settings: Settings,
  docs: BookOpen,
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  href,
  label,
  icon,
  active,
  compact = false,
}: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = icons[icon] ?? Compass;

  if (compact) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors duration-150",
          active ? "text-orange" : "text-ink-3 active:text-ink-2",
        )}
      >
        <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
        <span className="truncate">{label.split(" ").at(-1)}</span>
        {active ? (
          <span className="absolute inset-x-3 top-0 h-px bg-orange" aria-hidden="true" />
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-[6px] px-3 text-[13px] transition-colors duration-150",
        active ? "bg-surface text-ink" : "text-ink-2 hover:bg-surface/60 hover:text-ink",
      )}
    >
      <span
        className={cn(
          "absolute left-0 h-3 w-[2px] rounded-full bg-orange transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      />
      <Icon
        size={16}
        strokeWidth={active ? 1.8 : 1.5}
        className={cn(active ? "text-orange" : "text-ink-3 group-hover:text-ink-2")}
        aria-hidden="true"
      />
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Store the path the menu was opened on so navigation closes it without an effect.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const mobileOpen = menuPath === pathname;

  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line bg-bg lg:flex lg:flex-col">
        <div className="flex h-[76px] items-center gap-3 border-b border-line-soft px-6">
          <ScopeMark size={30} className="text-ink-2" />
          <div>
            <div className="font-display text-[13px] font-semibold uppercase tracking-[0.16em] text-ink">
              {APP_NAME}
            </div>
            <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3">
              Direction studio
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col px-4 pb-6 pt-7" aria-label="Primary">
          <div className="mb-2 px-3">
            <span className="mono-label">Workspace</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {navigation.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
            ))}
          </div>

          <div className="mt-8 mb-2 px-3">
            <span className="mono-label">System</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {systemNavigation.map((item) => (
              <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
            ))}
          </div>

          <div className="mt-auto border-t border-line-soft pt-4">
            <div className="flex items-center justify-between px-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
                Local workspace
              </span>
              <ModeBadge />
            </div>
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="px-2 font-mono text-[9px] text-ink-3">v1.0 / visual-uiux-v1</span>
              <ThemeQuickToggle />
            </div>
          </div>
        </nav>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/95 px-5 backdrop-blur-sm lg:hidden">
        <Link href="/" className="flex items-center gap-2.5" aria-label="PromptScope dashboard">
          <ScopeMark size={24} className="text-ink-2" />
          <span className="font-display text-[12px] font-semibold uppercase tracking-[0.16em]">
            {APP_NAME}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeQuickToggle />
          <Link
            href="/docs"
            aria-label="Documentation"
            className="flex h-9 w-9 items-center justify-center rounded-[6px] text-ink-2 active:bg-surface"
          >
            <FileText size={18} strokeWidth={1.6} aria-hidden="true" />
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-[6px] text-ink-2 active:bg-surface"
          >
            <Settings size={18} strokeWidth={1.6} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main id="main-content" className="min-h-[calc(100dvh-3.5rem)] pb-24 lg:min-h-dvh lg:pl-[248px] lg:pb-0">
        <div key={pathname} className="enter-fade">
          {children}
        </div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-line bg-bg/96 px-2 backdrop-blur-md lg:hidden"
        aria-label="Mobile navigation"
      >
        {navigation.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} compact />
        ))}
        <button
          type="button"
          onClick={() => setMenuPath(mobileOpen ? null : pathname)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-system-menu"
          className="flex w-12 shrink-0 flex-col items-center justify-center gap-1 text-[10px] text-ink-3"
        >
          <Settings size={19} strokeWidth={1.6} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {mobileOpen ? (
        <div
          id="mobile-system-menu"
          className="fixed bottom-16 right-2 z-40 w-48 rounded-[8px] border border-line bg-surface p-1.5 shadow-[0_12px_32px_var(--shadow-soft)] lg:hidden"
        >
          {systemNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-10 items-center gap-2.5 rounded-[5px] px-3 text-[13px] text-ink-2 active:bg-surface-2"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
