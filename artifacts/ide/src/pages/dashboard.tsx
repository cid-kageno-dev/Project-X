import { SidebarLayout } from "@/components/layout";
import { useListWorkspaces, useGetWorkspaceStats, useCreateWorkspace } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Plus, Github, FolderGit2, Terminal, Play, Square, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useListWorkspaces();
  const { data: stats, isLoading: isLoadingStats } = useGetWorkspaceStats();
  
  const createWorkspace = useCreateWorkspace();

  const handleCreate = () => {
    createWorkspace.mutate({
      data: {
        name: `workspace-${Math.floor(Math.random() * 1000)}`,
        language: "typescript",
        description: "New auto-generated workspace",
      }
    });
  };

  return (
    <SidebarLayout>
      <div className="p-6 md:p-8 overflow-y-auto w-full h-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
            <p className="text-muted-foreground mt-1">Manage your local development environments.</p>
          </div>
          <Button onClick={handleCreate} disabled={createWorkspace.isPending} className="gap-2 bg-primary text-primary-foreground shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] transition-all">
            {createWorkspace.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New Workspace
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total" value={stats?.total} loading={isLoadingStats} />
          <StatCard title="Running" value={stats?.running} loading={isLoadingStats} valueClass="text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <StatCard title="Building" value={stats?.building} loading={isLoadingStats} valueClass="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
          <StatCard title="Error" value={stats?.error} loading={isLoadingStats} valueClass="text-destructive drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]" />
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Recent Environments</h2>
          
          {isLoadingWorkspaces ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
            </div>
          ) : !workspaces?.length ? (
            <div className="border border-dashed border-border/50 rounded-xl p-12 text-center flex flex-col items-center justify-center text-muted-foreground bg-card/20">
              <FolderGit2 className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground">No workspaces found</p>
              <p className="max-w-sm mt-2 mb-6 text-sm">Create your first local workspace to start developing with AI assistance.</p>
              <Button onClick={handleCreate} variant="outline">Initialize Workspace</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((ws) => (
                <Card key={ws.id} className="bg-card/40 border-border/50 hover:bg-card/60 transition-colors group">
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Link href={`/workspace/${ws.id}`}>
                          <span className="hover:text-primary transition-colors cursor-pointer">{ws.name}</span>
                        </Link>
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="font-mono text-xs text-muted-foreground">{ws.language}</Badge>
                        <StatusBadge status={ws.status} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                      {ws.description || "No description provided."}
                    </p>
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/30">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Terminal className="w-3 h-3" />
                        {ws.lastActiveAt ? formatDistanceToNow(new Date(ws.lastActiveAt), { addSuffix: true }) : "Never"}
                      </div>
                      <div className="flex gap-2">
                        {ws.githubUrl && (
                          <Button size="icon" variant="ghost" className="w-8 h-8 rounded-md bg-background/50 hover:bg-background">
                            <Github className="w-4 h-4" />
                          </Button>
                        )}
                        <Link href={`/workspace/${ws.id}`}>
                          <Button size="sm" className="h-8 text-xs font-medium gap-1 bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/30 shadow-[0_0_10px_rgba(37,99,235,0.1)]">
                            Enter IDE
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

function StatCard({ title, value, loading, valueClass = "" }: { title: string, value?: number, loading: boolean, valueClass?: string }) {
  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        {loading ? (
          <Skeleton className="h-10 w-16 mt-2" />
        ) : (
          <p className={`text-4xl font-light tracking-tighter mt-1 font-mono ${valueClass}`}>{value || 0}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'running':
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.2)]">Running</Badge>;
    case 'building':
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20 shadow-[0_0_8px_rgba(234,179,8,0.2)]">Building</Badge>;
    case 'error':
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 shadow-[0_0_8px_rgba(220,38,38,0.2)]">Error</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground">Idle</Badge>;
  }
}
