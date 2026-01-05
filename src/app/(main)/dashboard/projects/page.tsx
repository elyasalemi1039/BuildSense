"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, FolderKanban, MapPin, Calendar, ChevronRight, Building2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Project {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  project_type: string | null;
  building_class: string | null;
  status: string;
  created_at: string;
  checklists_count?: number;
  completed_checklists?: number;
}

const PROJECT_TYPES = [
  { value: "new_build", label: "New Build" },
  { value: "renovation", label: "Renovation" },
  { value: "extension", label: "Extension" },
];

const PROJECT_STATUS = {
  draft: { label: "Draft", color: "bg-slate-500" },
  active: { label: "Active", color: "bg-emerald-500" },
  on_hold: { label: "On Hold", color: "bg-amber-500" },
  completed: { label: "Completed", color: "bg-blue-500" },
  archived: { label: "Archived", color: "bg-slate-700" },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // New project form
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    address: "",
    project_type: "",
    building_class: "",
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
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

  async function createProject() {
    if (!newProject.name.trim()) return;
    
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      
      if (res.ok) {
        const data = await res.json();
        setProjects([data.project, ...projects]);
        setIsCreateOpen(false);
        setNewProject({ name: "", description: "", address: "", project_type: "", building_class: "" });
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    } finally {
      setCreating(false);
    }
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FolderKanban className="h-8 w-8 text-amber-400" />
              Projects
            </h1>
            <p className="text-slate-400 mt-1">
              Manage your building projects and track compliance checklists
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Add a new building project to track compliance and checklists.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., 123 Main Street Renovation"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="e.g., 123 Main Street, Sydney NSW 2000"
                    value={newProject.address}
                    onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Type</Label>
                    <Select
                      value={newProject.project_type}
                      onValueChange={(value) => setNewProject({ ...newProject, project_type: value })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {PROJECT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} className="text-white hover:bg-slate-700">
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="building_class">Building Class</Label>
                    <Input
                      id="building_class"
                      placeholder="e.g., Class 1a"
                      value={newProject.building_class}
                      onChange={(e) => setNewProject({ ...newProject, building_class: e.target.value })}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the project..."
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    rows={3}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button 
                  onClick={createProject} 
                  disabled={!newProject.name.trim() || creating}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {creating ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Search */}
        <div className="mt-6 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700 animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-slate-700 rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
                <div className="h-4 bg-slate-700 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
            <p className="text-slate-400 text-center max-w-sm mb-6">
              Create your first project to start tracking compliance checklists and inspections.
            </p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const statusInfo = PROJECT_STATUS[project.status as keyof typeof PROJECT_STATUS] || PROJECT_STATUS.draft;
            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                        {project.name}
                      </CardTitle>
                      <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <Badge className={`${statusInfo.color} text-white w-fit`}>
                      {statusInfo.label}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.address && (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{project.address}</span>
                      </div>
                    )}
                    {project.building_class && (
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span>{project.building_class}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {/* Checklist Progress */}
                    <div className="pt-2 border-t border-slate-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Checklists</span>
                        <span className="text-white font-medium">
                          {project.completed_checklists || 0} / {project.checklists_count || 0}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 transition-all"
                          style={{ 
                            width: `${project.checklists_count ? (project.completed_checklists || 0) / project.checklists_count * 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

