import { useParams, Link } from "wouter";
import { SidebarLayout } from "@/components/layout";
import { useGetWorkspace, useGetGitStatus, useGetGitLog, useCreateCommit, getGetGitStatusQueryKey, getGetGitLogQueryKey } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, GitCommit, GitMerge, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function GitPanel() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const id = parseInt(workspaceId);
  const { data: workspace, isLoading: wsLoading } = useGetWorkspace(id, { query: { enabled: !!id, queryKey: ['workspace', id] }});
  const { data: status, isLoading: statusLoading } = useGetGitStatus(id, { query: { enabled: !!id, queryKey: getGetGitStatusQueryKey(id) }});
  const { data: log, isLoading: logLoading } = useGetGitLog(id, { query: { enabled: !!id, queryKey: getGetGitLogQueryKey(id) }});
  
  const [message, setMessage] = useState("");
  const createCommit = useCreateCommit();
  const queryClient = useQueryClient();

  const handleCommit = () => {
    if (!message.trim()) return;
    createCommit.mutate({ workspaceId: id, data: { message } }, {
      onSuccess: () => {
        setMessage("");
        queryClient.invalidateQueries({ queryKey: getGetGitStatusQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetGitLogQueryKey(id) });
      }
    });
  };

  if (wsLoading) return <SidebarLayout><div className="p-8"><Skeleton className="h-10 w-64 mb-8" /></div></SidebarLayout>;

  return (
    <SidebarLayout>
      <div className="p-6 md:p-8 h-screen overflow-hidden flex flex-col w-full">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/workspace/${id}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              Source Control: {workspace?.name}
            </h1>
          </div>
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
            <Card className="bg-card/40 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Changes
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {status?.unstaged?.length || 0} modified
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-1 font-mono text-muted-foreground">
                  {status?.unstaged?.map(file => <div key={file} className="text-yellow-500">M {file}</div>)}
                  {status?.untracked?.map(file => <div key={file} className="text-green-500">U {file}</div>)}
                  {(!status?.unstaged?.length && !status?.untracked?.length) && 
                    <div className="text-center py-4 text-muted-foreground/50 italic">Working tree clean</div>
                  }
                </div>
                <div className="pt-4 border-t border-border/30">
                  <Textarea 
                    placeholder="Commit message..." 
                    className="mb-2 bg-background font-mono text-sm resize-none h-20"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <Button className="w-full" onClick={handleCommit} disabled={createCommit.isPending || (!status?.unstaged?.length && !status?.untracked?.length) || !message.trim()}>
                    Commit Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-2/3 border border-border/50 rounded-xl overflow-hidden bg-card/20 flex flex-col">
            <div className="border-b border-border/50 bg-card/50 p-3 flex items-center gap-2">
              <GitCommit className="w-4 h-4" />
              <span className="font-medium text-sm">Commit History</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {logLoading ? (
                [1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)
              ) : (
                log?.map((commit) => (
                  <div key={commit.sha} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/20" />
                      <div className="flex-1 w-px bg-border my-1 min-h-[40px]" />
                    </div>
                    <div className="pb-4">
                      <div className="font-mono text-xs text-primary mb-1">{commit.sha.slice(0,7)}</div>
                      <p className="text-sm font-medium">{commit.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{commit.author} • {new Date(commit.date).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
