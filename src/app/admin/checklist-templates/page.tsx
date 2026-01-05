"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, CheckSquare, Trash2, Edit2, Eye, 
  ChevronRight, ArrowLeft, MoreVertical, Copy
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_published: boolean;
  steps_count: number;
  created_at: string;
}

const CATEGORIES = [
  { value: "pre_construction", label: "Pre-Construction" },
  { value: "foundation", label: "Foundation" },
  { value: "framing", label: "Framing" },
  { value: "roofing", label: "Roofing" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "insulation", label: "Insulation" },
  { value: "drywall", label: "Drywall" },
  { value: "finishing", label: "Finishing" },
  { value: "final_inspection", label: "Final Inspection" },
  { value: "custom", label: "Custom" },
];

export default function ChecklistTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "custom",
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/admin/checklist-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setLoading(false);
    }
  }

  async function createTemplate() {
    if (!newTemplate.name.trim()) return;
    
    setCreating(true);
    try {
      const res = await fetch("/api/admin/checklist-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTemplate),
      });
      
      if (res.ok) {
        const data = await res.json();
        setTemplates([data.template, ...templates]);
        setIsCreateOpen(false);
        setNewTemplate({ name: "", description: "", category: "custom" });
      }
    } catch (error) {
      console.error("Failed to create template:", error);
    } finally {
      setCreating(false);
    }
  }

  async function togglePublish(id: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/admin/checklist-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !currentStatus }),
      });
      
      if (res.ok) {
        setTemplates(templates.map(t => 
          t.id === id ? { ...t, is_published: !currentStatus } : t
        ));
      }
    } catch (error) {
      console.error("Failed to toggle publish:", error);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Are you sure you want to delete this template?")) return;
    
    try {
      const res = await fetch(`/api/admin/checklist-templates/${id}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/ncc" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Admin Panel
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <CheckSquare className="h-8 w-8 text-amber-400" />
              Checklist Templates
            </h1>
            <p className="text-slate-400 mt-1">
              Create and manage checklist templates for construction projects
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Create Checklist Template</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Create a new template that users can apply to their projects.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Foundation Inspection Checklist"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value} className="text-white hover:bg-slate-700">
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of what this checklist covers..."
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
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
                  onClick={createTemplate}
                  disabled={!newTemplate.name.trim() || creating}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {creating ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Templates Grid */}
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
      ) : templates.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckSquare className="h-16 w-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No templates yet</h3>
            <p className="text-slate-400 text-center max-w-sm mb-6">
              Create your first checklist template. Templates can be reused across multiple projects.
            </p>
            <Button 
              onClick={() => setIsCreateOpen(true)}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-white line-clamp-1">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                        {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                      </Badge>
                      <Badge className={template.is_published 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : "bg-slate-500/20 text-slate-400"
                      }>
                        {template.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                      <DropdownMenuItem 
                        className="text-slate-300 focus:text-white focus:bg-slate-700"
                        onClick={() => togglePublish(template.id, template.is_published)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {template.is_published ? "Unpublish" : "Publish"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700">
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem 
                        className="text-red-400 focus:text-red-300 focus:bg-slate-700"
                        onClick={() => deleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {template.description && (
                  <CardDescription className="text-slate-400 mt-2 line-clamp-2">
                    {template.description}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">
                    {template.steps_count} steps
                  </span>
                  
                  <Link href={`/admin/checklist-templates/${template.id}`}>
                    <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/20">
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit Steps
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

