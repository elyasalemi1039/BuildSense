"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Plus, CheckCircle2, Circle, XCircle, Lock, 
  Upload, Camera, FileText, Mail, ChevronDown, ChevronRight,
  Clock, AlertTriangle, MoreVertical, Trash2, User, Building2
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChecklistStep {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  ncc_clause: string | null;
  status: "pending" | "in_progress" | "passed" | "failed" | "skipped" | "blocked";
  is_blocked: boolean;
  blocked_reason: string | null;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  failure_reason: string | null;
  sort_order: number;
  attachments: {
    id: string;
    attachment_type: string;
    filename: string;
    file_url: string;
  }[];
}

interface Checklist {
  id: string;
  name: string;
  description: string | null;
  status: "not_started" | "in_progress" | "completed" | "blocked";
  template_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  steps: ChecklistStep[];
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  project_type: string | null;
  building_class: string | null;
  status: string;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

const STATUS_CONFIG = {
  pending: { icon: Circle, color: "text-slate-400", bg: "bg-slate-500/20" },
  in_progress: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/20" },
  passed: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" },
  skipped: { icon: Circle, color: "text-slate-500", bg: "bg-slate-500/20" },
  blocked: { icon: Lock, color: "text-orange-400", bg: "bg-orange-500/20" },
};

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const [isAddChecklistOpen, setIsAddChecklistOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [activeStep, setActiveStep] = useState<{ checklistId: string; step: ChecklistStep } | null>(null);
  const [stepNotes, setStepNotes] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [tradieEmail, setTradieEmail] = useState("");

  useEffect(() => {
    fetchProjectData();
    fetchTemplates();
  }, [projectId]);

  async function fetchProjectData() {
    try {
      // Fetch project details
      const projectRes = await fetch(`/api/projects/${projectId}`);
      if (projectRes.ok) {
        const data = await projectRes.json();
        setProject(data.project);
        setChecklists(data.checklists || []);
        // Auto-expand first checklist
        if (data.checklists?.length > 0) {
          setExpandedChecklists(new Set([data.checklists[0].id]));
        }
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const res = await fetch("/api/checklist-templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    }
  }

  async function addChecklist() {
    if (!selectedTemplate) return;
    
    try {
      const res = await fetch(`/api/projects/${projectId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: selectedTemplate }),
      });
      
      if (res.ok) {
        await fetchProjectData();
        setIsAddChecklistOpen(false);
        setSelectedTemplate("");
      }
    } catch (error) {
      console.error("Failed to add checklist:", error);
    }
  }

  async function updateStepStatus(checklistId: string, stepId: string, status: string, notes?: string, failureData?: { reason: string; email?: string }) {
    try {
      const res = await fetch(`/api/projects/${projectId}/checklists/${checklistId}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes, ...failureData }),
      });
      
      if (res.ok) {
        await fetchProjectData();
        setActiveStep(null);
        setStepNotes("");
        setFailureReason("");
        setTradieEmail("");
      }
    } catch (error) {
      console.error("Failed to update step:", error);
    }
  }

  function toggleChecklist(id: string) {
    const newExpanded = new Set(expandedChecklists);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedChecklists(newExpanded);
  }

  function getChecklistProgress(checklist: Checklist) {
    const total = checklist.steps.length;
    const completed = checklist.steps.filter(s => s.status === "passed" || s.status === "skipped").length;
    return { total, completed, percentage: total > 0 ? (completed / total) * 100 : 0 };
  }

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-64 mb-4" />
        <div className="h-4 bg-slate-700 rounded w-96" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard/projects" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-slate-400">
              {project.address && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {project.address}
                </span>
              )}
              {project.building_class && (
                <Badge variant="outline" className="border-slate-700 text-slate-300">
                  {project.building_class}
                </Badge>
              )}
            </div>
          </div>
          
          <Dialog open={isAddChecklistOpen} onOpenChange={setIsAddChecklistOpen}>
            <DialogTrigger asChild>
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                <Plus className="h-4 w-4 mr-2" />
                Add Checklist
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white">
              <DialogHeader>
                <DialogTitle>Add Checklist from Template</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Select a checklist template to add to this project.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <Label>Checklist Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="mt-2 bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {templates.length === 0 ? (
                      <div className="p-4 text-center text-slate-400">
                        No templates available. Ask an admin to create one.
                      </div>
                    ) : (
                      templates.map((template) => (
                        <SelectItem key={template.id} value={template.id} className="text-white hover:bg-slate-700">
                          <div>
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-slate-400">{template.description}</div>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddChecklistOpen(false)} className="border-slate-700 text-slate-300">
                  Cancel
                </Button>
                <Button 
                  onClick={addChecklist}
                  disabled={!selectedTemplate}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  Add Checklist
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Checklists */}
      <div className="space-y-4">
        {checklists.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <CheckCircle2 className="h-16 w-16 text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No checklists yet</h3>
              <p className="text-slate-400 text-center max-w-sm mb-6">
                Add a checklist from a template to start tracking compliance for this project.
              </p>
              <Button 
                onClick={() => setIsAddChecklistOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Checklist
              </Button>
            </CardContent>
          </Card>
        ) : (
          checklists.map((checklist) => {
            const progress = getChecklistProgress(checklist);
            const isExpanded = expandedChecklists.has(checklist.id);
            
            return (
              <Collapsible key={checklist.id} open={isExpanded} onOpenChange={() => toggleChecklist(checklist.id)}>
                <Card className="bg-slate-800/50 border-slate-700">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-400" />
                          )}
                          <div>
                            <CardTitle className="text-white">{checklist.name}</CardTitle>
                            {checklist.description && (
                              <CardDescription className="text-slate-400 mt-1">
                                {checklist.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-slate-400">
                              {progress.completed} of {progress.total} complete
                            </div>
                            <Progress value={progress.percentage} className="w-32 h-2 mt-1" />
                          </div>
                          <Badge className={
                            checklist.status === "completed" ? "bg-emerald-500/20 text-emerald-400" :
                            checklist.status === "in_progress" ? "bg-amber-500/20 text-amber-400" :
                            checklist.status === "blocked" ? "bg-red-500/20 text-red-400" :
                            "bg-slate-500/20 text-slate-400"
                          }>
                            {checklist.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="border-t border-slate-700 pt-4 space-y-2">
                        {checklist.steps.map((step, index) => {
                          const config = STATUS_CONFIG[step.status];
                          const StatusIcon = config.icon;
                          
                          return (
                            <div
                              key={step.id}
                              className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                                step.is_blocked 
                                  ? "border-orange-500/30 bg-orange-500/5" 
                                  : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/50"
                              }`}
                            >
                              {/* Status Icon */}
                              <div className={`flex-shrink-0 p-2 rounded-full ${config.bg}`}>
                                <StatusIcon className={`h-5 w-5 ${config.color}`} />
                              </div>
                              
                              {/* Step Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h4 className="font-medium text-white">
                                      {index + 1}. {step.name}
                                    </h4>
                                    {step.description && (
                                      <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                                    )}
                                    {step.ncc_clause && (
                                      <Badge variant="outline" className="mt-2 border-slate-600 text-slate-300 text-xs">
                                        NCC: {step.ncc_clause}
                                      </Badge>
                                    )}
                                    {step.is_blocked && step.blocked_reason && (
                                      <div className="flex items-center gap-2 mt-2 text-sm text-orange-400">
                                        <AlertTriangle className="h-4 w-4" />
                                        {step.blocked_reason}
                                      </div>
                                    )}
                                    {step.failure_reason && (
                                      <div className="flex items-center gap-2 mt-2 text-sm text-red-400">
                                        <XCircle className="h-4 w-4" />
                                        {step.failure_reason}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Actions */}
                                  {!step.is_blocked && step.status !== "passed" && step.status !== "skipped" && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
                                        onClick={() => updateStepStatus(checklist.id, step.id, "passed")}
                                      >
                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                        Pass
                                      </Button>
                                      
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                                            onClick={() => {
                                              setActiveStep({ checklistId: checklist.id, step });
                                            }}
                                          >
                                            <XCircle className="h-4 w-4 mr-1" />
                                            Fail
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-slate-900 border-slate-800 text-white">
                                          <DialogHeader>
                                            <DialogTitle>Mark Step as Failed</DialogTitle>
                                            <DialogDescription className="text-slate-400">
                                              Record the reason for failure and optionally notify a tradie.
                                            </DialogDescription>
                                          </DialogHeader>
                                          
                                          <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                              <Label>Failure Reason *</Label>
                                              <Textarea
                                                placeholder="Describe why this step failed..."
                                                value={failureReason}
                                                onChange={(e) => setFailureReason(e.target.value)}
                                                className="bg-slate-800 border-slate-700 text-white"
                                              />
                                            </div>
                                            
                                            <div className="space-y-2">
                                              <Label className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                Notify Tradie (optional)
                                              </Label>
                                              <Input
                                                type="email"
                                                placeholder="tradie@example.com"
                                                value={tradieEmail}
                                                onChange={(e) => setTradieEmail(e.target.value)}
                                                className="bg-slate-800 border-slate-700 text-white"
                                              />
                                              <p className="text-xs text-slate-500">
                                                An email will be sent notifying them of the required rework.
                                              </p>
                                            </div>
                                          </div>
                                          
                                          <DialogFooter>
                                            <Button 
                                              variant="outline" 
                                              className="border-slate-700 text-slate-300"
                                              onClick={() => {
                                                setActiveStep(null);
                                                setFailureReason("");
                                                setTradieEmail("");
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              className="bg-red-500 hover:bg-red-600 text-white"
                                              disabled={!failureReason.trim()}
                                              onClick={() => {
                                                if (activeStep) {
                                                  updateStepStatus(
                                                    activeStep.checklistId,
                                                    activeStep.step.id,
                                                    "failed",
                                                    undefined,
                                                    { reason: failureReason, email: tradieEmail || undefined }
                                                  );
                                                }
                                              }}
                                            >
                                              Mark as Failed
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                      
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-slate-800 border-slate-700">
                                          <DropdownMenuItem 
                                            className="text-slate-300 focus:text-white focus:bg-slate-700"
                                            onClick={() => updateStepStatus(checklist.id, step.id, "skipped")}
                                          >
                                            Skip this step
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700">
                                            <Camera className="h-4 w-4 mr-2" />
                                            Add Photo
                                          </DropdownMenuItem>
                                          <DropdownMenuItem className="text-slate-300 focus:text-white focus:bg-slate-700">
                                            <FileText className="h-4 w-4 mr-2" />
                                            Upload Document
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  )}
                                  
                                  {step.status === "passed" && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Passed
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Attachments */}
                                {step.attachments && step.attachments.length > 0 && (
                                  <div className="flex gap-2 mt-3 flex-wrap">
                                    {step.attachments.map((att) => (
                                      <Badge key={att.id} variant="outline" className="border-slate-600 text-slate-300">
                                        {att.attachment_type === "photo" ? (
                                          <Camera className="h-3 w-3 mr-1" />
                                        ) : (
                                          <FileText className="h-3 w-3 mr-1" />
                                        )}
                                        {att.filename}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}

