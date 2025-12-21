import Link from "next/link";

import { Building2, FolderPlus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getProjects } from "@/lib/actions/projects";

export default async function ProjectsPage() {
  const { projects } = await getProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-primary">Projects</h1>
          <p className="text-muted-foreground">Select a project to view details and compliance information</p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search projects..." className="pl-9" />
      </div>

      {/* Projects Grid or Empty State */}
      {projects.length === 0 ? (
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
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:border-primary hover:shadow-lg cursor-pointer transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        project.status === "active"
                          ? "bg-green-500/10 text-green-500"
                          : project.status === "completed"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <CardTitle className="mt-4 text-lg">{project.name}</CardTitle>
                  <CardDescription>{project.address || "No address"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {project.building_class && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Class:</span>
                      <span className="font-medium">{project.building_class}</span>
                    </div>
                  )}
                  {project.stage && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stage:</span>
                      <span className="font-medium">{project.stage}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
