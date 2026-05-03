import Link from "next/link";
import {
  Activity,
  FileText,
  FolderKanban,
  MemoryStick,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", icon: Activity, label: "Tasks" },
  { href: "/projects", icon: FolderKanban, label: "Projects" },
  { href: "/memory", icon: MemoryStick, label: "Memory" },
  { href: "/docs", icon: FileText, label: "Docs" },
  { href: "/zen", icon: Sparkles, label: "Zen Office" },
];

export default function NavRail() {
  return (
    <nav className="fixed left-0 top-0 h-full w-16 bg-obsidian-light border-r border-border flex flex-col items-center py-4 z-50">
      {/* Logo */}
      <div className="mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-moss to-violet flex items-center justify-center">
          <span className="text-obsidian font-bold text-lg">K</span>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex flex-col items-center gap-2 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative w-12 h-12 rounded-xl flex items-center justify-center text-text-secondary hover:text-moss transition-all duration-200 hover:bg-obsidian-light"
          >
            <item.icon className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 bg-obsidian-light border border-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Bottom - GitHub */}
      <div className="mt-auto">
        <Link
          href="https://github.com/mathew/katzen"
          target="_blank"
          className="w-12 h-12 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        >
          <GitBranch className="w-5 h-5" />
        </Link>
      </div>
    </nav>
  );
}