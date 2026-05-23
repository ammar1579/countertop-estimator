import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  FileText,
  Home,
  Layers,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Users,
  X,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Home, label: "Dashboard" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/quotes", icon: FileText, label: "Quotes" },
  { href: "/orders", icon: ShoppingCart, label: "Orders" },
  { href: "/inventory", icon: Package, label: "Inventory" },
  { href: "/price-lists", icon: Layers, label: "Price Lists" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
];

const adminNavItems = [
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  onClick?: () => void;
}

function NavItem({ href, icon: Icon, label, badge, onClick }: NavItemProps) {
  const [location] = useLocation();
  const isActive = href === "/" ? location === "/" : location.startsWith(href);

  return (
    <Link href={href} onClick={onClick}>
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-primary/70")} />
        <span className="flex-1 truncate">{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge variant="destructive" className="text-xs h-5 min-w-5 px-1.5 rounded-full">
            {badge}
          </Badge>
        )}
        {isActive && <ChevronRight className="w-3 h-3 text-primary shrink-0" />}
      </div>
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const { data: lowStock } = trpc.inventory.lowStock.useQuery();
  const lowStockCount = lowStock?.length ?? 0;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "QQ";

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground font-bold text-sm font-display">QQ</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sidebar-foreground font-display text-sm leading-tight">Quick Quartz</p>
          <p className="text-xs text-sidebar-foreground/50 truncate">Countertops Management</p>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" className="text-sidebar-foreground/50 hover:text-sidebar-foreground -mr-1" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            badge={item.href === "/inventory" ? lowStockCount : undefined}
            onClick={onClose}
          />
        ))}

        {user?.role === "admin" && (
          <>
            <Separator className="my-3 bg-sidebar-border" />
            <p className="px-3 text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-1">Admin</p>
            {adminNavItems.map((item) => (
              <NavItem key={item.href} {...item} onClick={onClose} />
            ))}
          </>
        )}
      </nav>

      {/* Low stock warning */}
      {lowStockCount > 0 && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300 font-medium">{lowStockCount} item{lowStockCount > 1 ? "s" : ""} low on stock</p>
          </div>
        </div>
      )}

      {/* User profile */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name ?? "User"}</p>
            <p className="text-xs text-sidebar-foreground/50 capitalize">{user?.role ?? "user"}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/40 hover:text-sidebar-foreground shrink-0"
            onClick={() => logout()}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold font-display">QQ</span>
          </div>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col shadow-2xl">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xs font-display">QQ</span>
            </div>
            <span className="font-bold font-display text-sm">Quick Quartz</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
