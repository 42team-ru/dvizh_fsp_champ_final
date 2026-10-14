import React from "react";
import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Database,
  BarChart3,
  Settings2,
  PanelLeft,
  Sparkles,
  LogOut,
  ChevronsUpDown,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import type { UserRead } from "@/shared/api/generated/core/hackathonTemplateAPI.schemas";
import useAuthStore from "@/entity/auth/model/auth-store";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Обзор", end: true },
  { href: "/dashboard/queries", icon: Database, label: "Запросы", end: false },
  { href: "/dashboard/reports", icon: BarChart3, label: "Отчёты", end: false },
  {
    href: "/dashboard/settings",
    icon: Settings2,
    label: "Настройки",
    end: false,
  },
] as const;

const STORAGE_KEY = "sidebar:collapsed";
const DRAG_THRESHOLD = 40;

interface AppSidebarProps {
  user: UserRead;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartX = React.useRef(0);
  const collapsedAtDragStart = React.useRef(false);

  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {}
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    collapsedAtDragStart.current = collapsed;
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  React.useEffect(() => {
    if (!isDragging) return;

    const triggered = { current: false };

    const stop = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (triggered.current) return;
      const delta = e.clientX - dragStartX.current;
      if (!collapsedAtDragStart.current && delta < -DRAG_THRESHOLD) {
        triggered.current = true;
        setCollapsed(true);
        try {
          localStorage.setItem(STORAGE_KEY, "true");
        } catch {}
        stop();
      } else if (collapsedAtDragStart.current && delta > DRAG_THRESHOLD) {
        triggered.current = true;
        setCollapsed(false);
        try {
          localStorage.setItem(STORAGE_KEY, "false");
        } catch {}
        stop();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stop);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  const handleLogout = () => {
    logout();
    void navigate("/auth/login", { replace: true });
  };

  const initials = [
    user.first_name?.[0] ?? user.username?.[0] ?? "?",
    user.last_name?.[0] ?? "",
  ]
    .join("")
    .toUpperCase();
  const fullName =
    `${user.first_name} ${user.last_name}`.trim() || user.username;
  const roleLabel = user.roles.length ? user.roles.join(", ") : "USER";

  return (
    <aside
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "overflow-hidden transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[4.75rem]" : "w-64",
      )}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleDragStart}
        className={cn(
          "absolute inset-y-0 right-0 z-20 w-1.5 cursor-col-resize transition-colors",
          "hover:bg-sidebar-primary/25",
          isDragging && "bg-sidebar-primary/40",
        )}
      />

      {/* Logo & toggle */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border px-3",
          collapsed ? "justify-center" : "gap-2",
        )}
      >
        {collapsed ? (
          <button
            onClick={toggle}
            aria-label="Развернуть сайдбар"
            className="group relative flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm transition-colors hover:bg-sidebar-primary/90 focus-visible:ring-2 focus-visible:ring-sidebar-ring/40 focus-visible:outline-none"
          >
            <Sparkles className="absolute size-5 transition-[opacity,transform] duration-150 group-hover:scale-75 group-hover:opacity-0 group-focus-visible:scale-75 group-focus-visible:opacity-0" />
            <PanelLeft className="absolute size-4 rotate-180 opacity-0 transition-[opacity,transform] duration-150 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100" />
          </button>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <Sparkles className="size-4" />
              </div>
              <span className="truncate text-sm font-semibold tracking-tight">
                NaturalQL
              </span>
            </div>
            <button
              onClick={toggle}
              aria-label="Свернуть сайдбар"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <PanelLeft className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3",
          collapsed && "items-center",
        )}
      >
        {NAV_ITEMS.map(({ href, icon: Icon, label, end }) => (
          <NavLink
            to={href}
            end={end}
            className={({ isActive }) =>
              cn(
                "group relative flex h-11 items-center rounded-xl text-sm font-medium outline-none transition-[background-color,color,width,padding,gap] duration-200 focus-visible:ring-2 focus-visible:ring-sidebar-ring/40",
                collapsed
                  ? "w-11 justify-center px-0"
                  : "w-full justify-start gap-3 px-3",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
              )
            }
          >
            <Icon className="size-5 shrink-0" />
            <span
              className={cn(
                "min-w-0 truncate transition-[width,opacity,transform] duration-200",
                collapsed
                  ? "w-0 translate-x-1 opacity-0"
                  : "w-full translate-x-0 opacity-100",
              )}
            >
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="shrink-0 border-t border-sidebar-border p-2">
        <Dialog>
          <DialogTrigger asChild>
            <button
              className={cn(
                "group flex h-14 w-full items-center rounded-xl transition-[background-color,padding,gap] duration-200 hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring/40 focus-visible:outline-none",
                collapsed ? "justify-center px-0" : "gap-3 px-2",
              )}
            >
              <Avatar size={collapsed ? "default" : "sm"} className="shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  "min-w-0 flex-1 text-left transition-[width,opacity] duration-200",
                  collapsed ? "w-0 opacity-0" : "w-full opacity-100",
                )}
              >
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {fullName}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/50">
                  @{user.username}
                </p>
              </div>
              <ChevronsUpDown
                className={cn(
                  "size-4 shrink-0 text-sidebar-foreground/40 transition-[color,width,opacity] duration-200 group-hover:text-sidebar-foreground/60",
                  collapsed && "w-0 opacity-0",
                )}
              />
            </button>
          </DialogTrigger>

          <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[420px]">
            <DialogHeader className="items-center border-b border-border/60 px-6 pt-6 pb-5 text-center">
              <Avatar size="lg" className="size-14">
                <AvatarFallback className="bg-primary text-base font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <DialogTitle className="text-lg">{fullName}</DialogTitle>
                <DialogDescription>@{user.username}</DialogDescription>
              </div>
            </DialogHeader>

            <div className="px-6 py-5">
              <div className="grid gap-1 rounded-2xl border border-border/70 bg-muted/25 p-2">
                <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                  <UserRound className="size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Профиль</p>
                    <p className="truncate text-sm font-medium">{fullName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Почта</p>
                    <p className="truncate text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl px-3 py-2">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Роль</p>
                    <p className="truncate text-sm font-medium">{roleLabel}</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border/60 px-6 py-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleLogout}
              >
                <LogOut className="size-4" />
                Выйти
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </aside>
  );
}
