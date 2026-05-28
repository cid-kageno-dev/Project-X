import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Ide from "@/pages/ide";
import Deployments from "@/pages/deployments";
import Containers from "@/pages/containers";
import Models from "@/pages/models";
import Metrics from "@/pages/metrics";
import GitPanel from "@/pages/git";
import Settings from "@/pages/settings";
import Deploy from "@/pages/deploy";
import ServicesPage from "@/pages/services";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/workspace/:id" component={Ide} />
      <Route path="/workspace/:id/deploy" component={Deploy} />
      <Route path="/deployments" component={Deployments} />
      <Route path="/containers" component={Containers} />
      <Route path="/models" component={Models} />
      <Route path="/metrics" component={Metrics} />
      <Route path="/git/:workspaceId" component={GitPanel} />
      <Route path="/services" component={ServicesPage} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
