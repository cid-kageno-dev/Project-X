import { useParams, Link, useLocation } from "wouter";
import { SidebarLayout } from "@/components/layout";
import { useGetWorkspace, useCreateDeployment } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Rocket } from "lucide-react";

export default function Deploy() {
  const { id } = useParams<{ id: string }>();
  const wsId = parseInt(id);
  const { data: workspace } = useGetWorkspace(wsId, { query: { enabled: !!wsId, queryKey: ['workspace', wsId] }});
  const createDeployment = useCreateDeployment();
  const [, setLocation] = useLocation();

  const handleDeploy = () => {
    createDeployment.mutate({
      data: {
        workspaceId: wsId,
        environment: "production",
        commitMessage: "Manual deployment"
      }
    }, {
      onSuccess: () => {
        setLocation("/deployments");
      }
    });
  };

  return (
    <SidebarLayout>
      <div className="p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/workspace/${wsId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Deploy {workspace?.name}</h1>
        </div>

        <div className="max-w-2xl">
          <Card className="bg-card/40 border-border/50">
            <CardHeader>
              <CardTitle>Launch to Production</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-sm">
                Deploying will package your container and push it to the global edge network.
                This process takes about 2-3 minutes.
              </p>
              
              <div className="bg-background border border-border/50 p-4 rounded-md font-mono text-sm space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Source:</span> <span>{workspace?.name} / main</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Target:</span> <span>Production Edge</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Language:</span> <span>{workspace?.language}</span></div>
              </div>

              <Button onClick={handleDeploy} disabled={createDeployment.isPending} className="w-full gap-2">
                <Rocket className="w-4 h-4" />
                Deploy Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}
