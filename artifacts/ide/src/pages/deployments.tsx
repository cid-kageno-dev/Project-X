import { useParams } from "wouter";
import { SidebarLayout } from "@/components/layout";
import { useListDeployments, useRollbackDeployment } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, RotateCcw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Deployments() {
  const { data: deployments, isLoading } = useListDeployments();
  const rollback = useRollbackDeployment();

  const handleRollback = (id: number) => {
    rollback.mutate({ id });
  };

  return (
    <SidebarLayout>
      <div className="p-6 md:p-8 overflow-y-auto w-full h-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deployments</h1>
          <p className="text-muted-foreground mt-1">Manage global deployments and rollbacks.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {deployments?.map((deploy) => (
              <Card key={deploy.id} className="bg-card/40 border-border/50 flex flex-row items-center justify-between p-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{deploy.workspaceName}</span>
                    <Badge variant="outline" className="font-mono text-xs">{deploy.commitSha?.slice(0,7) || 'latest'}</Badge>
                    <StatusIcon status={deploy.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{deploy.commitMessage || "No commit message"}</p>
                  <div className="text-xs text-muted-foreground flex gap-4 mt-2">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(deploy.createdAt), { addSuffix: true })}</span>
                    <span>Env: {deploy.environment}</span>
                    {deploy.buildDuration && <span>Duration: {deploy.buildDuration}s</span>}
                  </div>
                </div>
                <div>
                  {deploy.status === 'success' && (
                    <Button variant="outline" size="sm" onClick={() => handleRollback(deploy.id)} disabled={rollback.isPending}>
                      <RotateCcw className="w-4 h-4 mr-2" /> Rollback
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch(status) {
    case 'success':
      return <span className="flex items-center gap-1 text-green-500 text-sm"><CheckCircle2 className="w-4 h-4" /> Success</span>;
    case 'failed':
      return <span className="flex items-center gap-1 text-destructive text-sm"><XCircle className="w-4 h-4" /> Failed</span>;
    case 'building':
    case 'deploying':
    case 'pending':
      return <span className="flex items-center gap-1 text-yellow-500 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> In Progress</span>;
    case 'rolled_back':
      return <span className="flex items-center gap-1 text-muted-foreground text-sm"><RotateCcw className="w-4 h-4" /> Rolled Back</span>;
    default:
      return null;
  }
}
