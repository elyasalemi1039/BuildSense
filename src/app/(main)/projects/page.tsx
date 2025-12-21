import Link from "next/link";

import { Building2, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Mock data - will come from Supabase later
const projects = [
  {
    id: "proj_001",
    name: "Residential Development - Parramatta",
    address: "45 George St, Parramatta NSW",
    buildingClass: "Class 1a",
    stage: "Framing",
    status: "active",
  },
  {
    id: "proj_002",
    name: "Commercial Office Fitout",
    address: "120 Collins St, Melbourne VIC",
    buildingClass: "Class 5",
    stage: "Waterproofing",
    status: "active",
  },
  {
    id: "proj_003",
    name: "Apartment Building - Sydney",
    address: "88 King St, Sydney NSW",
    buildingClass: "Class 2",
    stage: "Design",
    status: "planning",
  },
];

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-primary">Projects</h1>
          <p className="text-muted-foreground">
            Select a project to view details and compliance information
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search projects..." className="pl-9" />
      </div>

      {/* Projects Grid */}
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
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}
                  >
                    {project.status}
                  </span>
                </div>
                <CardTitle className="mt-4 text-lg">{project.name}</CardTitle>
                <CardDescription>{project.address}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Class:</span>
                  <span className="font-medium">{project.buildingClass}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stage:</span>
                  <span className="font-medium">{project.stage}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

