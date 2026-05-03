import NavRail from "@/components/nav-rail";
import AgentStatusHUD from "@/components/agent-status-hud";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <NavRail />
      <main className="flex-1 ml-16">
        {/* Persistent Agent Status HUD */}
        <div className="fixed top-0 right-0 left-16 z-30 bg-obsidian/80 backdrop-blur-sm border-b border-border/50">
          <div className="flex items-center justify-end px-4 py-2">
            <AgentStatusHUD />
          </div>
        </div>
        <div className="pt-12">{children}</div>
      </main>
    </div>
  );
}