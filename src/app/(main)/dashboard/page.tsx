import Link from "next/link";

import { Building2, CheckSquare, ClipboardCheck, FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjects } from "@/lib/actions/projects";

const stats = [
  { label: "Active Projects", value: "0", icon: Building2, color: "text-blue-500" },
  { label: "Pending Checklists", value: "0", icon: CheckSquare, color: "text-orange-500" },
  { label: "Completed Inspections", value: "0", icon: ClipboardCheck, color: "text-green-500" },
  { label: "NCC Searches", value: "0", icon: FileText, color: "text-purple-500" },
];

export default async function DashboardPage() {
  const { projects } = await getProjects();
  const recentProjects = projects.slice(0, 4);
  const activeProjects = projects.filter((p) => p.status === "active");

  // Update stats with real data
  stats[0].value = activeProjects.length.toString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-primary">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your projects and compliance activities</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Recent Projects</h2>
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>
        {recentProjects.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="mt-4">No projects yet</CardTitle>
              <CardDescription>Get started by creating your first project</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Link href="/projects/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:border-primary/50 cursor-pointer transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{project.name}</CardTitle>
                        <CardDescription className="mt-1">{project.address || "No address"}</CardDescription>
                      </div>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                        {project.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.building_class && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Building Class:</span>
                        <span className="font-medium">{project.building_class}</span>
                      </div>
                    )}
                    {project.construction_stage && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Current Stage:</span>
                        <span className="font-medium">{project.construction_stage}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Updated:</span>
                      <span className="font-medium">{new Date(project.updated_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
