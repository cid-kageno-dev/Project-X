import { Link, useLocation } from "wouter";
import { LayoutDashboard, Box, Database, Activity, Settings, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/", label: "Workspaces", icon: LayoutDashboard },
  { href: "/deployments", label: "Deployments", icon: RocketIcon },
  { href: "/containers", label: "Containers", icon: Box },
  { href: "/models", label: "Local Models", icon: Database },
  { href: "/metrics", label: "Metrics", icon: Activity },
  { href: "/services", label: "Services", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
];

function RocketIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

export function SidebarLayout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row w-full text-foreground selection:bg-primary/30">
      <aside className="w-full md:w-64 border-r border-border/50 bg-card/30 flex-shrink-0 flex flex-col backdrop-blur-xl">
        <div className="h-14 flex items-center px-4 border-b border-border/50">
          <div className="flex items-center gap-2 font-mono font-bold text-lg tracking-tight">
            <div className="w-5 h-5 bg-primary rounded-sm flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <div className="w-2 h-2 bg-background rounded-[1px]" />
            </div>
            NovaDev
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all cursor-pointer group",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-primary drop-shadow-[0_0_8px_rgba(37,99,235,0.5)]" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
            Daemon Active
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
