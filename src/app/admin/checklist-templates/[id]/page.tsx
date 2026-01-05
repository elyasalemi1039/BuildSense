"use client";

import { useState, useEffect, use, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Plus, Trash2, GripVertical, Save, Lock, Unlock,
  ChevronDown, ChevronUp, AlertTriangle, Link2, Unlink, Eye,
  CheckCircle2, Camera, FileText, Signature
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

interface Step {
  id: string;
  name: string;
  description: string;
  instructions: string;
  ncc_clause: string;
  requires_photo: boolean;
  requires_document: boolean;
  requires_signature: boolean;
  estimated_duration_minutes: number | null;
  failure_action: "block" | "warn" | "notify";
  failure_email_template: string;
  sort_order: number;
  dependencies: string[]; // IDs of steps this step depends on
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  is_published: boolean;
}

const FAILURE_ACTIONS = [
  { value: "block", label: "Block Progress", description: "Prevent proceeding until resolved" },
  { value: "warn", label: "Warning Only", description: "Show warning but allow proceeding" },
  { value: "notify", label: "Notify Only", description: "Just send notification" },
];

export default function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: templateId } = use(params);
  const [template, setTemplate] = useState<Template | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Dependency linking mode
  const [linkingMode, setLinkingMode] = useState<{ stepId: string } | null>(null);
  
  // Expanded steps for editing
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  async function fetchTemplate() {
    try {
      const res = await fetch(`/api/admin/checklist-templates/${templateId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data.template);
        setSteps(data.steps || []);
      }
    } catch (error) {
      console.error("Failed to fetch template:", error);
    } finally {
      setLoading(false);
    }
  }

  function addStep() {
    const newStep: Step = {
      id: `new-${Date.now()}`,
      name: "",
      description: "",
      instructions: "",
      ncc_clause: "",
      requires_photo: false,
      requires_document: false,
      requires_signature: false,
      estimated_duration_minutes: null,
      failure_action: "block",
      failure_email_template: "",
      sort_order: steps.length,
      dependencies: [],
    };
    setSteps([...steps, newStep]);
    setExpandedSteps(new Set([...expandedSteps, newStep.id]));
    setHasChanges(true);
  }

  function updateStep(id: string, updates: Partial<Step>) {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
    setHasChanges(true);
  }

  function removeStep(id: string) {
    // Also remove this step from any dependencies
    setSteps(steps
      .filter(s => s.id !== id)
      .map(s => ({
        ...s,
        dependencies: s.dependencies.filter(d => d !== id)
      }))
    );
    setHasChanges(true);
  }

  function moveStep(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;
    
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    newSteps.forEach((s, i) => s.sort_order = i);
    setSteps(newSteps);
    setHasChanges(true);
  }

  function toggleDependency(stepId: string, dependsOnId: string) {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;
    
    const hasDep = step.dependencies.includes(dependsOnId);
    updateStep(stepId, {
      dependencies: hasDep 
        ? step.dependencies.filter(d => d !== dependsOnId)
        : [...step.dependencies, dependsOnId]
    });
    setLinkingMode(null);
  }

  function toggleExpanded(id: string) {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSteps(newExpanded);
  }

  async function saveTemplate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/checklist-templates/${templateId}/steps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSteps(data.steps);
        setHasChanges(false);
        toast.success("Template saved successfully");
      } else {
        toast.error("Failed to save template");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  // Get steps that depend on a given step
  function getDependentSteps(stepId: string): Step[] {
    return steps.filter(s => s.dependencies.includes(stepId));
  }

  // Check if adding a dependency would create a cycle
  function wouldCreateCycle(stepId: string, dependsOnId: string): boolean {
    const visited = new Set<string>();
    const queue = [dependsOnId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === stepId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      
      const step = steps.find(s => s.id === current);
      if (step) {
        queue.push(...step.dependencies);
      }
    }
    
    return false;
  }

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="h-8 bg-slate-700 rounded w-64 mb-4" />
        <div className="h-4 bg-slate-700 rounded w-96" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Template not found</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/checklist-templates" className="inline-flex items-center text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{template.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="border-slate-600 text-slate-300">
                  {template.category}
                </Badge>
                <Badge className={template.is_published 
                  ? "bg-emerald-500/20 text-emerald-400" 
                  : "bg-slate-500/20 text-slate-400"
                }>
                  {template.is_published ? "Published" : "Draft"}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {hasChanges && (
                <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                  Unsaved changes
                </Badge>
              )}
              <Button
                onClick={saveTemplate}
                disabled={saving || !hasChanges}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </div>
        </div>

        {/* Dependency Flow Visualization */}
        <Card className="bg-slate-800/50 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Link2 className="h-5 w-5 text-amber-400" />
              Step Dependencies (Workflow Path)
            </CardTitle>
            <CardDescription className="text-slate-400">
              Visual representation of step dependencies. Steps with red badges must pass before subsequent steps can begin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Flow diagram */}
              <div className="flex flex-wrap gap-4 items-start">
                {steps.map((step, index) => {
                  const dependents = getDependentSteps(step.id);
                  const hasDependencies = step.dependencies.length > 0;
                  const blocksOthers = dependents.length > 0;
                  
                  return (
                    <div key={step.id} className="relative">
                      <div 
                        className={`
                          relative p-4 rounded-lg border-2 min-w-[180px] transition-all cursor-pointer
                          ${linkingMode?.stepId === step.id 
                            ? "border-amber-500 bg-amber-500/10" 
                            : linkingMode && step.id !== linkingMode.stepId
                              ? wouldCreateCycle(linkingMode.stepId, step.id)
                                ? "border-red-500/50 bg-red-500/5 cursor-not-allowed"
                                : step.dependencies.includes(linkingMode.stepId)
                                  ? "border-emerald-500 bg-emerald-500/10"
                                  : "border-slate-600 hover:border-amber-500/50 bg-slate-800"
                              : blocksOthers
                                ? "border-orange-500/50 bg-slate-800"
                                : "border-slate-700 bg-slate-800"
                          }
                        `}
                        onClick={() => {
                          if (linkingMode && step.id !== linkingMode.stepId) {
                            if (!wouldCreateCycle(linkingMode.stepId, step.id)) {
                              toggleDependency(linkingMode.stepId, step.id);
                            }
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-700 text-xs text-white font-medium">
                            {index + 1}
                          </span>
                          <span className="text-white font-medium text-sm truncate flex-1">
                            {step.name || "Untitled Step"}
                          </span>
                        </div>
                        
                        {/* Dependency indicators */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {hasDependencies && (
                            <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Requires {step.dependencies.length}
                            </Badge>
                          )}
                          {blocksOthers && (
                            <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                              Blocks {dependents.length}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Linking button */}
                        <div className="absolute -top-2 -right-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-6 w-6 p-0 rounded-full ${
                                  linkingMode?.stepId === step.id 
                                    ? "bg-amber-500 text-black" 
                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkingMode(linkingMode?.stepId === step.id ? null : { stepId: step.id });
                                }}
                              >
                                {linkingMode?.stepId === step.id ? <Unlink className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {linkingMode?.stepId === step.id 
                                ? "Cancel linking" 
                                : "Link dependencies (click steps this one requires)"
                              }
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      
                      {/* Arrow to next */}
                      {index < steps.length - 1 && (
                        <div className="absolute top-1/2 -right-4 text-slate-600">
                          →
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {linkingMode && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-amber-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <strong>Linking Mode:</strong> Click on steps that "{steps.find(s => s.id === linkingMode.stepId)?.name}" depends on. 
                    These steps must pass before this step can begin.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Steps List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Steps ({steps.length})</h2>
            <Button onClick={addStep} variant="outline" className="border-slate-700 text-slate-300 hover:text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </div>
          
          {steps.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-slate-600 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No steps yet</h3>
                <p className="text-slate-400 text-center max-w-sm mb-4">
                  Add steps to your checklist template. You can define dependencies between steps.
                </p>
                <Button onClick={addStep} className="bg-amber-500 hover:bg-amber-600 text-black">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Step
                </Button>
              </CardContent>
            </Card>
          ) : (
            steps.map((step, index) => {
              const isExpanded = expandedSteps.has(step.id);
              const dependencyNames = step.dependencies
                .map(d => steps.find(s => s.id === d)?.name)
                .filter(Boolean);
              
              return (
                <Card key={step.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader 
                    className="cursor-pointer hover:bg-slate-800/50 transition-colors"
                    onClick={() => toggleExpanded(step.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); moveStep(index, "up"); }}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => { e.stopPropagation(); moveStep(index, "down"); }}
                          disabled={index === steps.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <span className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 font-semibold">
                        {index + 1}
                      </span>
                      
                      <div className="flex-1">
                        <Input
                          value={step.name}
                          onChange={(e) => updateStep(step.id, { name: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Step name..."
                          className="bg-transparent border-none text-white text-lg font-medium p-0 h-auto focus-visible:ring-0"
                        />
                        
                        <div className="flex items-center gap-2 mt-1">
                          {step.requires_photo && (
                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                              <Camera className="h-3 w-3 mr-1" /> Photo
                            </Badge>
                          )}
                          {step.requires_document && (
                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                              <FileText className="h-3 w-3 mr-1" /> Document
                            </Badge>
                          )}
                          {step.requires_signature && (
                            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                              <Signature className="h-3 w-3 mr-1" /> Signature
                            </Badge>
                          )}
                          {dependencyNames.length > 0 && (
                            <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                              <Lock className="h-3 w-3 mr-1" />
                              Requires: {dependencyNames.join(", ")}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={(e) => { e.stopPropagation(); removeStep(step.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="border-t border-slate-700 pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Textarea
                            value={step.description}
                            onChange={(e) => updateStep(step.id, { description: e.target.value })}
                            placeholder="Brief description..."
                            className="bg-slate-800 border-slate-700 text-white"
                            rows={2}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Instructions</Label>
                          <Textarea
                            value={step.instructions}
                            onChange={(e) => updateStep(step.id, { instructions: e.target.value })}
                            placeholder="Detailed instructions for completing this step..."
                            className="bg-slate-800 border-slate-700 text-white"
                            rows={2}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>NCC Clause (optional)</Label>
                          <Input
                            value={step.ncc_clause}
                            onChange={(e) => updateStep(step.id, { ncc_clause: e.target.value })}
                            placeholder="e.g., H1P1"
                            className="bg-slate-800 border-slate-700 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Estimated Duration (minutes)</Label>
                          <Input
                            type="number"
                            value={step.estimated_duration_minutes || ""}
                            onChange={(e) => updateStep(step.id, { 
                              estimated_duration_minutes: e.target.value ? parseInt(e.target.value) : null 
                            })}
                            placeholder="30"
                            className="bg-slate-800 border-slate-700 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>On Failure</Label>
                          <Select
                            value={step.failure_action}
                            onValueChange={(value: "block" | "warn" | "notify") => 
                              updateStep(step.id, { failure_action: value })
                            }
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {FAILURE_ACTIONS.map((action) => (
                                <SelectItem key={action.value} value={action.value} className="text-white hover:bg-slate-700">
                                  <div>
                                    <div className="font-medium">{action.label}</div>
                                    <div className="text-xs text-slate-400">{action.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8 pt-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={step.requires_photo}
                            onCheckedChange={(checked) => updateStep(step.id, { requires_photo: checked })}
                          />
                          <Label className="flex items-center gap-1 text-slate-300">
                            <Camera className="h-4 w-4" /> Requires Photo
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={step.requires_document}
                            onCheckedChange={(checked) => updateStep(step.id, { requires_document: checked })}
                          />
                          <Label className="flex items-center gap-1 text-slate-300">
                            <FileText className="h-4 w-4" /> Requires Document
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={step.requires_signature}
                            onCheckedChange={(checked) => updateStep(step.id, { requires_signature: checked })}
                          />
                          <Label className="flex items-center gap-1 text-slate-300">
                            <Signature className="h-4 w-4" /> Requires Signature
                          </Label>
                        </div>
                      </div>
                      
                      {step.failure_action !== "notify" && (
                        <div className="space-y-2 pt-2 border-t border-slate-700">
                          <Label>Failure Email Template (sent to tradie)</Label>
                          <Textarea
                            value={step.failure_email_template}
                            onChange={(e) => updateStep(step.id, { failure_email_template: e.target.value })}
                            placeholder="Hi {{tradie_name}},&#10;&#10;The step '{{step_name}}' on project '{{project_name}}' has failed inspection.&#10;&#10;Reason: {{failure_reason}}&#10;&#10;Please address this issue and notify us when complete."
                            className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                            rows={4}
                          />
                          <p className="text-xs text-slate-500">
                            Available variables: {"{{tradie_name}}"}, {"{{step_name}}"}, {"{{project_name}}"}, {"{{failure_reason}}"}, {"{{project_address}}"}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Floating Save Button */}
        {hasChanges && (
          <div className="fixed bottom-8 right-8">
            <Button
              onClick={saveTemplate}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-lg shadow-amber-500/20"
              size="lg"
            >
              <Save className="h-5 w-5 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

