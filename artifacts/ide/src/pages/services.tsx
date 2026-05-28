import { SidebarLayout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, XCircle, Clock, Layers } from "lucide-react";

interface ServiceInfo {
  id: string;
  name: string;
  language: string;
  runtime: string;
  port: number;
  paths: string[];
  responsibilities: string[];
  color: string;
  icon: string;
  status: string;
}

interface ServiceHealth {
  id: string;
  healthy: boolean;
  latencyMs: number;
  details: Record<string, unknown>;
}

const BASE = import.meta.env.BASE_URL;

function useServices() {
  return useQuery<ServiceInfo[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/services`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
  });
}

function useServiceHealth(id: string) {
  return useQuery<ServiceHealth>({
    queryKey: ["service-health", id],
    queryFn: async () => {
      const r = await fetch(`${BASE}api/services/${id}/health`);
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    refetchInterval: 15000,
  });
}

function LanguageBadge({ lang, color }: { lang: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono tracking-wider uppercase"
      style={{ background: color + "22", color }}
    >
      {lang}
    </span>
  );
}

function ServiceCard({ svc }: { svc: ServiceInfo }) {
  const { data: health, isLoading } = useServiceHealth(svc.id);

  return (
    <Card className="bg-card/40 border-border/50 overflow-hidden">
      <div className="h-1 w-full" style={{ background: svc.color }} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="font-mono text-sm font-bold px-1.5 py-0.5 rounded" style={{ background: svc.color + "22", color: svc.color }}>
                .{svc.icon}
              </span>
              {svc.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{svc.runtime}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <LanguageBadge lang={svc.language} color={svc.color} />
            <span className="text-xs text-muted-foreground font-mono">:{svc.port}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Routes</p>
          <div className="flex flex-wrap gap-1">
            {svc.paths.map(p => (
              <code key={p} className="text-[11px] bg-muted/60 border border-border/50 px-1.5 py-0.5 rounded font-mono text-foreground/70">
                {p}
              </code>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Handles</p>
          <ul className="space-y-1">
            {svc.responsibilities.map(r => (
              <li key={r} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: svc.color }} />
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2 border-t border-border/30 flex items-center justify-between">
          {isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : health ? (
            <>
              <div className="flex items-center gap-1.5">
                {health.healthy ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={`text-xs font-medium ${health.healthy ? "text-green-500" : "text-red-500"}`}>
                  {health.healthy ? "Healthy" : "Down"}
                </span>
              </div>
              {health.healthy && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {health.latencyMs}ms
                </div>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Unknown</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

const ARCH_ROWS = [
  {
    label: "Browser",
    items: ["React + Monaco IDE"],
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    text: "text-violet-400",
  },
  {
    label: "Gateway",
    items: ["TypeScript API :8080"],
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-400",
  },
  {
    label: "Polyglot Services",
    items: ["Go :8008", "Python :8082", "Rust :8083", "Node.js :8084"],
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
  },
  {
    label: "Data",
    items: ["PostgreSQL (Drizzle ORM)"],
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
  },
];

export default function ServicesPage() {
  const { data: services, isLoading } = useServices();

  return (
    <SidebarLayout>
      <div className="p-6 md:p-8 overflow-y-auto w-full h-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Polyglot Services</h1>
          <p className="text-muted-foreground mt-1">
            NovaDev's microservice architecture — each language chosen for its strengths.
          </p>
        </div>

        {/* Architecture overview */}
        <Card className="bg-card/40 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Architecture Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {ARCH_ROWS.map((row, i) => (
                <div key={row.label}>
                  <div className={`rounded-lg border ${row.border} ${row.bg} px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2`}>
                    <span className="text-xs font-medium text-muted-foreground w-32 flex-shrink-0">{row.label}</span>
                    <div className="flex flex-wrap gap-2">
                      {row.items.map(item => (
                        <span key={item} className={`text-xs font-mono font-semibold ${row.text}`}>{item}</span>
                      ))}
                    </div>
                  </div>
                  {i < ARCH_ROWS.length - 1 && (
                    <div className="flex justify-center my-1">
                      <div className="w-px h-4 bg-border/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service cards */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold">Running Services</h2>
            <Badge variant="outline" className="ml-auto text-xs">
              {services?.length ?? "—"} services
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading
              ? [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-72 w-full" />)
              : services?.map(svc => <ServiceCard key={svc.id} svc={svc} />)}
          </div>
        </div>

        {/* Data flow */}
        <Card className="bg-card/40 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Why Polyglot?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { lang: "Go", color: "#00acd7", why: "Goroutines make concurrent infra operations trivially parallel. Zero-cost channel-based concurrency for container orchestration." },
                { lang: "Python", color: "#3776ab", why: "Best-in-class AI/ML ecosystem. FastAPI's async support and Pydantic validation make LLM routing clean and type-safe." },
                { lang: "Rust", color: "#ce4a23", why: "Memory safety without GC pauses. Axum's zero-copy WebSocket handling delivers sub-millisecond terminal latency." },
                { lang: "Node.js", color: "#68a063", why: "npm ecosystem dominates Git tooling. simple-git wraps the Git CLI with battle-tested reliability." },
              ].map(item => (
                <div key={item.lang} className="rounded-lg border border-border/40 bg-muted/20 p-4">
                  <div className="font-bold font-mono mb-2" style={{ color: item.color }}>{item.lang}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.why}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
