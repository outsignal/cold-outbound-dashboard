"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  ChevronRight,
  Linkedin,
  Building2,
  ListChecks,
  Briefcase,
  Target,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  Webhook,
  ListOrdered,
  Megaphone,
  Package,
  ChevronsUpDown,
  Check,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OutsignalLogo } from "@/components/brand/outsignal-logo";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkspaceItem {
  slug: string;
  name: string;
  vertical?: string;
  status: string;
  hasApiToken: boolean;
}

export interface SidebarProps {
  workspaces: WorkspaceItem[];
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  key: string;
  label: string;
  collapsible: boolean;
  defaultCollapsed?: boolean;
  /** "primary" = larger/bolder, "secondary" = normal, "system" = dimmer/smaller */
  tier: "primary" | "secondary" | "system";
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_STORAGE_KEY = "sidebar-collapsed";
const GROUPS_STORAGE_KEY = "sidebar-collapsed-groups";

const NAV_GROUPS: NavGroup[] = [
  {
    key: "main",
    label: "Main",
    collapsible: false,
    tier: "primary",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/clients", label: "Clients", icon: Briefcase },
      { href: "/pipeline", label: "Pipeline", icon: Target },
    ],
  },
  {
    key: "data",
    label: "Data",
    collapsible: true,
    tier: "secondary",
    items: [
      { href: "/people", label: "People", icon: Users },
      { href: "/companies", label: "Companies", icon: Building2 },
      { href: "/lists", label: "Lists", icon: ListChecks },
    ],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    collapsible: true,
    tier: "secondary",
    items: [
      { href: "/senders", label: "Senders", icon: Linkedin },
      { href: "/linkedin-queue", label: "LinkedIn Queue", icon: ListOrdered },
    ],
  },
  {
    key: "system",
    label: "System",
    collapsible: true,
    defaultCollapsed: true,
    tier: "system",
    items: [
      { href: "/agent-runs", label: "Agent Runs", icon: Activity },
      { href: "/webhook-log", label: "Webhook Log", icon: Webhook },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/packages", label: "Packages", icon: Package },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

// ---------------------------------------------------------------------------
// Workspace Switcher
// ---------------------------------------------------------------------------

function WorkspaceSwitcher({
  workspaces,
  isCollapsed,
}: {
  workspaces: WorkspaceItem[];
  isCollapsed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Determine the currently-active workspace from the URL
  const activeWs = workspaces.find((ws) =>
    pathname.startsWith(`/workspace/${ws.slug}`),
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(!open)}
            className="relative flex w-full items-center justify-center rounded-lg px-2 py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <Mail className="h-4 w-4 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {activeWs ? activeWs.name : "Select workspace"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
          "text-sidebar-foreground hover:bg-sidebar-accent/50",
          "border border-sidebar-border/60",
        )}
      >
        <Mail className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
        <span className="flex-1 truncate text-left">
          {activeWs ? activeWs.name : "Select workspace"}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/40" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-sidebar-border bg-sidebar shadow-xl">
          <div className="p-1">
            {workspaces.map((ws) => {
              const isActive = activeWs?.slug === ws.slug;
              const isPending = !ws.hasApiToken;
              return (
                <button
                  key={ws.slug}
                  onClick={() => {
                    router.push(`/workspace/${ws.slug}`);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    isPending && "opacity-70",
                  )}
                >
                  <span className="flex-1 truncate text-left">{ws.name}</span>
                  {isPending && (
                    <span className="text-[10px] font-medium bg-yellow-500/20 text-yellow-300 rounded px-1.5 py-0.5">
                      Setup
                    </span>
                  )}
                  {isActive && !isPending && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-brand" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Nav Group
// ---------------------------------------------------------------------------

function CollapsibleGroup({
  group,
  isGroupOpen,
  onToggle,
  isSidebarCollapsed,
  renderItem,
}: {
  group: NavGroup;
  isGroupOpen: boolean;
  onToggle: () => void;
  isSidebarCollapsed: boolean;
  renderItem: (item: NavItem, tier: NavGroup["tier"]) => React.ReactNode;
}) {
  // When sidebar is collapsed, never show group headers -- just show icons
  if (isSidebarCollapsed) {
    return (
      <div className="space-y-0.5">
        {group.items.map((item) => renderItem(item, group.tier))}
      </div>
    );
  }

  // Non-collapsible groups (Main): just show items, no header
  if (!group.collapsible) {
    return (
      <div className="space-y-0.5">
        {group.items.map((item) => renderItem(item, group.tier))}
      </div>
    );
  }

  return (
    <div>
      {/* Group header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 group"
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 text-sidebar-foreground/30 transition-transform duration-200",
            isGroupOpen && "rotate-90",
          )}
        />
        <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 font-medium">
          {group.label}
        </span>
      </button>

      {/* Collapsible items with smooth height animation */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          isGroupOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="space-y-0.5">
          {group.items.map((item) => renderItem(item, group.tier))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Sidebar
// ---------------------------------------------------------------------------

export function Sidebar({ workspaces }: SidebarProps) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Hydrate collapsed states from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {}

    // Hydrate group collapsed states
    try {
      const storedGroups = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (storedGroups) {
        setCollapsedGroups(JSON.parse(storedGroups));
      } else {
        // Set defaults: collapse groups marked defaultCollapsed
        const defaults: Record<string, boolean> = {};
        for (const g of NAV_GROUPS) {
          if (g.defaultCollapsed) defaults[g.key] = true;
        }
        setCollapsedGroups(defaults);
      }
    } catch {}

    setMounted(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Fetch unread notification count
  useEffect(() => {
    let active = true;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notifications?page=1");
        const json = await res.json();
        if (active) {
          setUnreadCount(
            json.notifications?.filter((n: { read: boolean }) => !n.read).length ?? 0,
          );
        }
      } catch {}
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Prevent layout shift: render expanded width until client hydration completes
  const isCollapsed = mounted ? collapsed : false;

  // -----------------------------------------------------------------------
  // Render a single nav item
  // -----------------------------------------------------------------------
  function renderNavItem(item: NavItem, tier: NavGroup["tier"]) {
    const isActive =
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(item.href + "/");

    const isNotification = item.href === "/notifications";

    // Tier-based text classes
    const tierText =
      tier === "primary"
        ? "text-[13px] font-medium"
        : tier === "system"
          ? "text-xs text-sidebar-foreground/50"
          : "text-sm";

    const tierIcon =
      tier === "primary"
        ? "h-[18px] w-[18px]"
        : tier === "system"
          ? "h-3.5 w-3.5"
          : "h-4 w-4";

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center rounded-lg transition-colors duration-150",
          isCollapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
          tierText,
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-3 border-brand"
            : cn(
                "border-l-3 border-transparent",
                tier === "system"
                  ? "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/70"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
              ),
        )}
      >
        <item.icon className={cn("shrink-0", tierIcon)} />
        {!isCollapsed && <span>{item.label}</span>}
        {isNotification && unreadCount > 0 && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white",
              isCollapsed ? "absolute -top-1 -right-1" : "ml-auto",
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <div className="relative">{linkContent}</div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
            {isNotification && unreadCount > 0 && (
              <span className="ml-1.5 text-red-400">({unreadCount})</span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo header */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border/50 text-white",
          isCollapsed ? "justify-center px-2" : "px-6",
        )}
      >
        {isCollapsed ? (
          <OutsignalLogo variant="mark" className="h-7 w-7" />
        ) : (
          <OutsignalLogo className="h-7 w-auto" />
        )}
      </div>

      {/* Workspace switcher */}
      <div
        className={cn(
          "border-b border-sidebar-border/50",
          isCollapsed ? "px-1.5 py-2" : "px-3 py-3",
        )}
      >
        <WorkspaceSwitcher workspaces={workspaces} isCollapsed={isCollapsed} />
      </div>

      {/* Scrollable nav */}
      <ScrollArea className={cn("flex-1 py-3", isCollapsed ? "px-1.5" : "px-3")}>
        <nav className="space-y-3">
          {NAV_GROUPS.map((group) => {
            const isGroupOpen = !collapsedGroups[group.key];
            return (
              <CollapsibleGroup
                key={group.key}
                group={group}
                isGroupOpen={isGroupOpen}
                onToggle={() => toggleGroup(group.key)}
                isSidebarCollapsed={isCollapsed}
                renderItem={renderNavItem}
              />
            );
          })}
        </nav>
      </ScrollArea>

      {/* Collapse/expand toggle footer */}
      <div className="border-t border-sidebar-border/50 p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleCollapsed}
              className={cn(
                "flex w-full items-center rounded-lg py-2 text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors duration-150",
                isCollapsed ? "justify-center px-2" : "gap-3 px-3",
              )}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4 shrink-0" />
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 shrink-0" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" sideOffset={8}>
              Expand sidebar
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}
