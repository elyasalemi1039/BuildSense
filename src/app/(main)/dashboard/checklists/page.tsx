"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckSquare, ChevronRight, FolderKanban, Clock, CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Project {
  id: string;
  name: string;
  address: string | null;
  status: string;
  checklists: {
    id: string;
    name: string;
    status: string;
    steps_total: number;
    steps_completed: number;
  }[];
}

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "bg-slate-500/20 text-slate-400" },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-400" },
  completed: { label: "Completed", color: "bg-emerald-500/20 text-emerald-400" },
  blocked: { label: "Blocked", color: "bg-red-500/20 text-red-400" },
};

export default function ChecklistsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectsWithChecklists();
  }, []);

  async function fetchProjectsWithChecklists() {
    try {
      const res = await fetch("/api/projects?include_checklists=true");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }

  // Flatten all checklists from all projects
  const allChecklists = projects.flatMap((p) => 
    (p.checklists || []).map((c) => ({
      ...c,
      projectId: p.id,
      projectName: p.name,
      projectAddress: p.address,
    }))
  );

  const inProgressChecklists = allChecklists.filter((c) => c.status === "in_progress");
  const blockedChecklists = allChecklists.filter((c) => c.status === "blocked");

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CheckSquare className="h-8 w-8 text-amber-400" />
          Checklists
        </h1>
        <p className="text-slate-400 mt-1">
          Track your compliance checklists across all projects
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700 animate-pulse">
              <CardHeader>
                <div className="h-6 bg-slate-700 rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-slate-700 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : allChecklists.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckSquare className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No checklists yet</h3>
            <p className="text-slate-400 text-center max-w-sm mb-6">
              Add checklists to your projects to start tracking compliance.
            </p>
            <Link href="/dashboard/projects">
              <Badge className="bg-amber-500 hover:bg-amber-600 text-black cursor-pointer py-2 px-4">
                <FolderKanban className="h-4 w-4 mr-2" />
                Go to Projects
              </Badge>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* In Progress */}
          {inProgressChecklists.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                In Progress ({inProgressChecklists.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgressChecklists.map((checklist) => (
                  <ChecklistCard key={checklist.id} checklist={checklist} />
                ))}
              </div>
            </div>
          )}

          {/* Blocked */}
          {blockedChecklists.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-400" />
                Blocked ({blockedChecklists.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {blockedChecklists.map((checklist) => (
                  <ChecklistCard key={checklist.id} checklist={checklist} />
                ))}
              </div>
            </div>
          )}

          {/* All Checklists by Project */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">All Checklists by Project</h2>
            {projects.map((project) => (
              <div key={project.id} className="mb-6">
                <Link href={`/dashboard/projects/${project.id}`}>
                  <div className="flex items-center gap-2 mb-3 text-slate-300 hover:text-white transition-colors">
                    <FolderKanban className="h-4 w-4" />
                    <span className="font-medium">{project.name}</span>
                    {project.address && (
                      <span className="text-slate-500 text-sm">• {project.address}</span>
                    )}
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </div>
                </Link>
                {project.checklists && project.checklists.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pl-6">
                    {project.checklists.map((checklist) => (
                      <ChecklistCard 
                        key={checklist.id} 
                        checklist={{ ...checklist, projectId: project.id, projectName: project.name }} 
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm pl-6">No checklists added</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistCard({ checklist }: { checklist: any }) {
  const config = STATUS_CONFIG[checklist.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started;
  const progress = checklist.steps_total > 0 
    ? (checklist.steps_completed / checklist.steps_total) * 100 
    : 0;

  return (
    <Link href={`/dashboard/projects/${checklist.projectId}`}>
      <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-all cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-white group-hover:text-amber-400 transition-colors text-base line-clamp-1">
              {checklist.name}
            </CardTitle>
            <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-amber-400 transition-colors flex-shrink-0" />
          </div>
          <CardDescription className="text-slate-500 text-sm line-clamp-1">
            {checklist.projectName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <Badge className={config.color}>
              {config.label}
            </Badge>
            <span className="text-xs text-slate-400">
              {checklist.steps_completed}/{checklist.steps_total} steps
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </CardContent>
      </Card>
    </Link>
  );
}

