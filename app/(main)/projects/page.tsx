import { getWorkspaceProjects } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Folder, FileText, PlusCircle, GitBranch } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await getWorkspaceProjects();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold text-text-primary">Projects</h1>
          <Badge variant="outline" className="border-violet text-violet font-mono text-xs">
            {projects.length} FOUND
          </Badge>
        </div>
        <p className="text-text-secondary text-sm">
          Workspace directories and tracked repositories
        </p>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <ZenEmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card
              key={project.name}
              className="bg-obsidian-light border-border p-5 rounded-xl glow-violet hover:border-violet/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet/10 flex items-center justify-center flex-shrink-0">
                  {project.isDirectory ? (
                    <Folder className="w-5 h-5 text-violet" />
                  ) : (
                    <FileText className="w-5 h-5 text-violet" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-text-primary font-medium mb-1 truncate">
                    {project.name}
                  </h3>
                  <p className="text-text-muted text-xs font-mono">
                    {project.isDirectory ? "Directory" : "File"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* GitHub Integration Card */}
      <div className="mt-8">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider mb-4">
          GitHub Repos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://github.com/mathew/katzen"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="bg-obsidian-light border-border p-4 rounded-xl hover:border-moss/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-moss/10 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-moss" />
                </div>
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-medium group-hover:text-moss transition-colors">
                    mathew/katzen
                  </p>
                  <p className="text-text-muted text-xs font-mono">
                    Mission Control Dashboard
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-obsidian text-text-muted font-mono text-xs"
                >
                  Primary
                </Badge>
              </div>
            </Card>
          </a>

          <a
            href="https://github.com/mathew/personal"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <Card className="bg-obsidian-light border-border p-4 rounded-xl hover:border-moss/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-violet/10 flex items-center justify-center">
                  <GitBranch className="w-4 h-4 text-violet" />
                </div>
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-medium group-hover:text-moss transition-colors">
                    mathew/personal
                  </p>
                  <p className="text-text-muted text-xs font-mono">
                    Personal workspace
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-obsidian text-text-muted font-mono text-xs"
                >
                  Support
                </Badge>
              </div>
            </Card>
          </a>
        </div>
      </div>
    </div>
  );
}

function ZenEmptyState() {
  return (
    <Card className="bg-obsidian-light border-border/50 p-16 rounded-xl mist-overlay">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-violet/5 flex items-center justify-center">
            <Folder className="w-8 h-8 text-violet/30" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-obsidian border border-violet/20 flex items-center justify-center">
            <PlusCircle className="w-3 h-3 text-violet/50" />
          </div>
        </div>
        <h3 className="text-text-secondary font-medium mb-2">
          No Projects Yet
        </h3>
        <p className="text-text-muted text-sm font-mono max-w-xs">
          Creating project directories in the workspace will make them appear here...
        </p>
        <p className="text-text-muted/50 text-xs font-mono mt-4">
          Zen gardens start as empty soil
        </p>
      </div>
    </Card>
  );
}