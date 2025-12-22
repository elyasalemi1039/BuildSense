"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BookOpen, Camera, ClipboardCheck, FileText, LayoutDashboard } from "lucide-react";

import { cn } from "@/lib/utils";

interface ProjectNavProps {
  projectId: string;
}

const navItems = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Checklist", href: "/checklist", icon: ClipboardCheck },
  { label: "Evidence", href: "/evidence", icon: Camera },
  { label: "Rules & Clauses", href: "/rules", icon: BookOpen },
  { label: "Reports", href: "/reports", icon: FileText },
];

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();
  const basePath = `/dashboard/projects/${projectId}`;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b pb-2">
      {navItems.map((item) => {
        const href = `${basePath}${item.href}`;
        const isActive = pathname === href || (item.href === "" && pathname === basePath);

        return (
          <Link
            key={item.label}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}


