import { SidebarLayout } from "@/components/layout";
import { useGetMetricsOverview } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer, Cell } from "recharts";
import { Activity, Server, Box, Rocket } from "lucide-react";

export default function Metrics() {
  const { data: metrics, isLoading } = useGetMetricsOverview();

  const cpuData = [{ name: 'CPU', value: metrics?.cpuPercent || 0, fill: 'var(--color-primary)' }];
  const memData = [{ name: 'Memory', value: metrics ? (metrics.memoryMb / metrics.memoryTotalMb) * 100 : 0, fill: 'var(--color-chart-2)' }];

  return (
    <SidebarLayout>
      <div className="p-6 md:p-8 overflow-y-auto w-full h-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Metrics</h1>
          <p className="text-muted-foreground mt-1">Real-time resource utilization and system health.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard title="Active Workspaces" value={metrics?.activeWorkspaces} icon={Server} isLoading={isLoading} />
          <MetricCard title="Running Containers" value={metrics?.activeContainers} icon={Box} isLoading={isLoading} />
          <MetricCard title="Total Deployments" value={metrics?.totalDeployments} icon={Rocket} isLoading={isLoading} />
          <MetricCard title="Success Rate" value={`${metrics?.deploymentSuccessRate || 0}%`} icon={Activity} isLoading={isLoading} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card/40 border-border/50">
            <CardHeader>
              <CardTitle>System Resources</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-around items-center h-64">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <>
                  <div className="flex flex-col items-center relative w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="70%" outerRadius="100%" data={cpuData} startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-mono">{metrics?.cpuPercent}%</span>
                      <span className="text-sm text-muted-foreground">CPU Usage</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center relative w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart innerRadius="70%" outerRadius="100%" data={memData} startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                        <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-mono">{Math.round((metrics?.memoryMb || 0) / 1024)}GB</span>
                      <span className="text-sm text-muted-foreground">Memory Usage</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/40 border-border/50">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics?.recentActivity.map((activity, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-primary" />
                      <div>
                        <p className="text-sm font-medium">{activity.event}</p>
                        <p className="text-xs text-muted-foreground">{activity.workspace} • {new Date(activity.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                  {(!metrics?.recentActivity || metrics.recentActivity.length === 0) && (
                    <div className="text-center text-muted-foreground py-8">No recent activity</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarLayout>
  );
}

function MetricCard({ title, value, icon: Icon, isLoading }: { title: string, value: any, icon: any, isLoading: boolean }) {
  return (
    <Card className="bg-card/40 border-border/50">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-16 mt-2" />
          ) : (
            <p className="text-3xl font-bold mt-1">{value}</p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );
}
