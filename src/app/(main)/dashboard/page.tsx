import { Building2, CheckSquare, ClipboardCheck, FileText, Map, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data - will come from Supabase later
const recentProjects = [
  {
    id: "1",
    name: "Residential Development - Parramatta",
    address: "45 George St, Parramatta NSW",
    buildingClass: "Class 1a",
    stage: "Framing",
    status: "active",
    progress: 45,
  },
  {
    id: "2",
    name: "Commercial Office Fitout",
    address: "120 Collins St, Melbourne VIC",
    buildingClass: "Class 5",
    stage: "Waterproofing",
    status: "active",
    progress: 72,
  },
];

const stats = [
  { label: "Active Projects", value: "2", icon: Building2, color: "text-blue-500" },
  { label: "Pending Checklists", value: "5", icon: CheckSquare, color: "text-orange-500" },
  { label: "Completed Inspections", value: "12", icon: ClipboardCheck, color: "text-green-500" },
  { label: "NCC Searches", value: "24", icon: FileText, color: "text-purple-500" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-semibold text-2xl text-primary">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your projects and compliance activities
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
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
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {recentProjects.map((project) => (
            <Card key={project.id} className="hover:border-primary/50 cursor-pointer transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <CardDescription className="mt-1">{project.address}</CardDescription>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                    {project.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Building Class:</span>
                  <span className="font-medium">{project.buildingClass}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Stage:</span>
                  <span className="font-medium">{project.stage}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
