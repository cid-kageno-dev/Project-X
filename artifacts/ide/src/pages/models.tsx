import { SidebarLayout } from "@/components/layout";
import { useListAiModels, usePullAiModel, useDeleteAiModel } from "@workspace/api-client-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Trash2, Cpu, Loader2 } from "lucide-react";

export default function Models() {
  const { data: models, isLoading } = useListAiModels();
  const pullModel = usePullAiModel();
  const deleteModel = useDeleteAiModel();

  const handlePull = (name: string) => pullModel.mutate({ name });
  const handleDelete = (name: string) => deleteModel.mutate({ name });

  return (
    <SidebarLayout>
      <div className="p-6 md:p-8 overflow-y-auto w-full h-full space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Local Models</h1>
          <p className="text-muted-foreground mt-1">Manage installed AI models for offline usage.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)
          ) : (
            models?.map(model => (
              <Card key={model.name} className="bg-card/40 border-border/50 relative overflow-hidden group">
                {model.status === 'downloading' && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
                    <div className="h-full bg-primary animate-pulse w-1/2"></div>
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-primary" />
                      {model.displayName || model.name}
                    </CardTitle>
                    <Badge variant={model.status === 'available' ? 'default' : 'outline'} className={model.status === 'available' ? 'bg-green-500/20 text-green-500' : ''}>
                      {model.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 h-10">
                    {model.description || `Provider: ${model.provider}`}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground mb-6">
                    {model.sizeMb && <span>Size: {Math.round(model.sizeMb / 1024)}GB</span>}
                    <span>Context: {model.contextWindow}</span>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-border/30 pt-4">
                    {model.status === 'not_installed' ? (
                      <Button size="sm" onClick={() => handlePull(model.name)} disabled={pullModel.isPending}>
                        {pullModel.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />} Pull
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(model.name)} disabled={deleteModel.isPending}>
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
