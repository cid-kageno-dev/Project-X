import { SidebarLayout } from "@/components/layout";

export default function Settings() {
  return (
    <SidebarLayout>
      <div className="p-6 md:p-8 overflow-y-auto w-full h-full max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your environment, themes, and AI providers.</p>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-xl font-semibold border-b border-border/50 pb-2">AI Providers</h2>
            <div className="grid gap-4">
              <div className="bg-card/40 border border-border/50 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Ollama (Local)</h3>
                  <p className="text-sm text-muted-foreground">Default local provider</p>
                </div>
                <div className="text-green-500 text-sm font-medium">Connected</div>
              </div>
              <div className="bg-card/40 border border-border/50 p-4 rounded-xl flex items-center justify-between opacity-50">
                <div>
                  <h3 className="font-medium">OpenAI</h3>
                  <p className="text-sm text-muted-foreground">Requires API Key</p>
                </div>
                <div className="text-muted-foreground text-sm">Not Configured</div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold border-b border-border/50 pb-2">Editor Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-2">
                <div>
                  <h3 className="font-medium">Theme</h3>
                  <p className="text-sm text-muted-foreground">IDE color scheme</p>
                </div>
                <select className="bg-input border border-border rounded-md px-3 py-1 text-sm outline-none">
                  <option>Nova Dark</option>
                  <option>System</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-2">
                <div>
                  <h3 className="font-medium">Font Size</h3>
                  <p className="text-sm text-muted-foreground">Editor text size</p>
                </div>
                <select className="bg-input border border-border rounded-md px-3 py-1 text-sm outline-none">
                  <option>14px</option>
                  <option>16px</option>
                  <option>12px</option>
                </select>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SidebarLayout>
  );
}
