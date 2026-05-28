import { SidebarLayout } from "@/components/layout";
import { useListContainers, useStopContainer, useGetContainerLogs, getGetContainerLogsQueryKey } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Square, Activity, MemoryStick, Terminal as TerminalIcon } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function Containers() {
  const { data: containers, isLoading } = useListContainers();
  const stopContainer = useStopContainer();
  const [selectedContainer, setSelectedContainer] = useState<number | null>(null);

  return (
    <SidebarLayout>
      <div className="p-6 md:p-8 flex flex-col w-full h-full gap-6 h-screen overflow-hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Containers</h1>
          <p className="text-muted-foreground mt-1">Manage running docker instances and resource usage.</p>
        </div>

        <div className="flex gap-6 flex-1 min-h-0">
          <div className="w-1/2 overflow-y-auto space-y-4 pr-2">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : (
              containers?.map(c => (
                <Card 
                  key={c.id} 
                  className={`bg-card/40 border-border/50 cursor-pointer transition-colors ${selectedContainer === c.id ? 'border-primary shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'hover:border-primary/50'}`}
                  onClick={() => setSelectedContainer(c.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BoxIcon />
                        {c.name}
                      </CardTitle>
                      <Badge variant={c.status === 'running' ? 'default' : 'secondary'} className={c.status === 'running' ? "bg-green-500/20 text-green-500" : ""}>
                        {c.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between text-sm text-muted-foreground mb-4">
                      <span>Image: {c.image}</span>
                      {c.port && <span>Port: {c.port}</span>}
                    </div>
                    <div className="flex gap-6 mb-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary" />
                        <span className="font-mono text-sm">{c.cpuPercent || 0}% CPU</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MemoryStick className="w-4 h-4 text-primary" />
                        <span className="font-mono text-sm">{c.memoryMb || 0} MB</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      {c.status === 'running' && (
                        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); stopContainer.mutate({ id: c.id }) }}>
                          <Square className="w-4 h-4 mr-1" /> Stop
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          
          <div className="w-1/2 flex flex-col border border-border/50 rounded-xl overflow-hidden bg-background">
            <div className="border-b border-border/50 bg-card/50 p-3 flex items-center gap-2">
              <TerminalIcon className="w-4 h-4" />
              <span className="font-medium text-sm">Container Logs</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs bg-black text-gray-300">
              {selectedContainer ? (
                <LogViewer containerId={selectedContainer} />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/50">
                  Select a container to view logs
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

function LogViewer({ containerId }: { containerId: number }) {
  const { data: logs, isLoading } = useGetContainerLogs(containerId, { query: { enabled: !!containerId, queryKey: getGetContainerLogsQueryKey(containerId) }});

  if (isLoading) return <div>Loading logs...</div>;
  if (!logs?.lines?.length) return <div>No logs available.</div>;

  return (
    <div className="space-y-1">
      {logs.lines.map((l, i) => (
        <div key={i} className={l.stream === 'stderr' ? 'text-red-400' : 'text-gray-300'}>
          <span className="opacity-50 mr-4">{new Date(l.timestamp).toLocaleTimeString()}</span>
          {l.message}
        </div>
      ))}
    </div>
  );
}

function BoxIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
}
