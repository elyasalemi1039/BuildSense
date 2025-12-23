"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Sparkles,
  BookOpen,
  Settings2,
  Calendar,
  Building2
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { createEdition, getEditions } from "@/lib/actions/ncc";
import { 
  EDITION_KINDS, 
  JURISDICTIONS, 
  LEGAL_STATUSES, 
  NCC_VOLUMES,
  SCHEMA_COMPATIBILITIES,
  HIGH_LIABILITY_AREAS 
} from "@/lib/constants/ncc-options";

interface BaseEdition {
  id: string;
  name: string;
  effective_date: string;
}

// Common NCC presets for quick creation
const NCC_PRESETS = [
  {
    id: "ncc-2025",
    name: "NCC 2025",
    description: "Latest edition - effective 1 May 2025",
    values: {
      name: "NCC 2025",
      kind: "BASE",
      effective_date: "2025-05-01",
      authority: "Australian Building Codes Board",
      volumes_included: ["volume_one", "volume_two", "volume_three", "housing_provisions"],
    }
  },
  {
    id: "ncc-2019",
    name: "NCC 2019",
    description: "Previous edition - effective 1 May 2019",
    values: {
      name: "NCC 2019",
      kind: "BASE",
      effective_date: "2019-05-01",
      authority: "Australian Building Codes Board",
      volumes_included: ["volume_one", "volume_two", "volume_three", "housing_provisions"],
    }
  },
];

export default function NewEditionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [baseEditions, setBaseEditions] = useState<BaseEdition[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Basic (Required)
    name: "",
    kind: "BASE",
    effective_date: "",
    jurisdiction: "",
    applies_to_base_edition_id: "",
    
    // Advanced Options
    legal_status: "draft",
    authority: "Australian Building Codes Board",
    replaces_edition_id: "",
    transition_end_date: "",
    volumes_included: ["volume_one", "volume_two", "volume_three", "housing_provisions"],
    has_structural_changes: false,
    structural_change_notes: "",
    building_class_changes: "",
    performance_requirements_changed: false,
    has_xml_data: true,
    xml_schema_compatibility: "fully_compatible",
    new_data_fields: "",
    deprecated_fields: "",
    license: "CC BY 4.0",
    allows_project_lock: true,
    allows_auto_migration: false,
    requires_reassessment: false,
    validity_cutoff_date: "",
    mixing_editions_warning: true,
    is_default_for_new_projects: false,
    hide_older_editions: false,
    ai_enabled: false,
    ai_validation_required: true,
    guidance_only: false,
    high_liability_areas: [] as string[],
    admin_notes: "",
    change_summary: "",
  });

  // Fetch base editions for overlay selection
  useEffect(() => {
    async function fetchBaseEditions() {
      try {
        const result = await getEditions();
        if (result.editions) {
          const bases = result.editions
            .filter((e: any) => e.kind === "BASE")
            .map((e: any) => ({
              id: e.id,
              name: e.name,
              effective_date: e.effective_date,
            }));
          setBaseEditions(bases);
        }
      } catch (error) {
        console.error("Failed to fetch editions:", error);
      } finally {
        setLoadingEditions(false);
      }
    }
    fetchBaseEditions();
  }, []);

  const applyPreset = (presetId: string) => {
    const preset = NCC_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setFormData(prev => ({
        ...prev,
        ...preset.values,
      }));
      setSelectedPreset(presetId);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast.error("Please enter an edition name");
      return;
    }
    if (!formData.effective_date) {
      toast.error("Please select an effective date");
      return;
    }
    if (formData.kind === "OVERLAY" && !formData.applies_to_base_edition_id) {
      toast.error("Please select a base edition for this overlay");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createEdition({
        name: formData.name,
        kind: formData.kind,
        effective_date: formData.effective_date,
        jurisdiction: formData.jurisdiction || undefined,
        applies_to_base_edition_id: formData.applies_to_base_edition_id || undefined,
      });

      if (result.error) {
        toast.error("Failed to create edition", { description: result.error });
      } else {
        toast.success("Edition created!", {
          description: "You can now upload the NCC XML files.",
        });
        router.push(`/admin/ncc/${result.edition?.id}`);
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVolume = (volume: string) => {
    setFormData((prev) => ({
      ...prev,
      volumes_included: prev.volumes_included.includes(volume)
        ? prev.volumes_included.filter((v) => v !== volume)
        : [...prev.volumes_included, volume],
    }));
  };

  const toggleLiabilityArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      high_liability_areas: prev.high_liability_areas.includes(area)
        ? prev.high_liability_areas.filter((a) => a !== area)
        : [...prev.high_liability_areas, area],
    }));
  };

  const canSubmit = formData.name && formData.effective_date && 
    (formData.kind === "BASE" || formData.applies_to_base_edition_id);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-5xl py-6">
          <Link href="/admin/ncc">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Editions
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-3xl tracking-tight">Create NCC Edition</h1>
              <p className="text-muted-foreground">
                Add a new National Construction Code edition to the compliance system
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-5xl py-8 space-y-8">
        {/* Quick Presets */}
        <Card className="border-2 border-dashed">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Quick Start</CardTitle>
            </div>
            <CardDescription>
              Select a preset to auto-fill common NCC edition values
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {NCC_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  className={`flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                    selectedPreset === preset.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  <span className="font-semibold text-lg">{preset.name}</span>
                  <span className="text-sm text-muted-foreground">{preset.description}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Form */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Edition Details</CardTitle>
            </div>
            <CardDescription>
              Configure the essential settings for this NCC edition
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Edition Type Info */}
            <Alert className="bg-blue-500/5 border-blue-500/20">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700 dark:text-blue-300">About NCC Editions</AlertTitle>
              <AlertDescription className="text-blue-600/80 dark:text-blue-300/80">
                <strong>BASE editions</strong> contain the complete NCC for a year (e.g., NCC 2022). 
                <strong> OVERLAY editions</strong> are amendments or state/territory variations that apply on top of a base edition.
              </AlertDescription>
            </Alert>

            {/* Required Fields */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold">
                  Edition Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder={formData.kind === "BASE" ? "e.g., NCC 2022" : "e.g., NCC 2022 - NSW Variation"}
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setSelectedPreset(null);
                  }}
                  className="h-12 text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Official name as published by ABCB
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kind" className="text-base font-semibold">
                  Edition Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.kind}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    kind: value,
                    applies_to_base_edition_id: value === "BASE" ? "" : formData.applies_to_base_edition_id 
                  })}
                >
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDITION_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {kind === "BASE" ? "🏛️ Base Edition" : "📋 Overlay (Amendment/Variation)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="effective_date" className="text-base font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Effective Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => {
                    setFormData({ ...formData, effective_date: e.target.value });
                    setSelectedPreset(null);
                  }}
                  className="h-12 text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Legal commencement date for this edition
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jurisdiction" className="text-base font-semibold">
                  Jurisdiction
                </Label>
                <Select
                  value={formData.jurisdiction || "NATIONAL"}
                  onValueChange={(value) => setFormData({ ...formData, jurisdiction: value === "NATIONAL" ? "" : value })}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATIONAL">🇦🇺 National (All jurisdictions)</SelectItem>
                    {JURISDICTIONS.map((j) => (
                      <SelectItem key={j.value} value={j.value}>
                        {j.label} ({j.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Leave as National for base editions
                </p>
              </div>
            </div>

            {/* Overlay Base Edition Selection */}
            {formData.kind === "OVERLAY" && (
              <div className="space-y-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Label htmlFor="base_edition" className="text-base font-semibold">
                  Applies to Base Edition <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.applies_to_base_edition_id || "NONE"}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    applies_to_base_edition_id: value === "NONE" ? "" : value 
                  })}
                  disabled={loadingEditions}
                >
                  <SelectTrigger className="h-12 bg-background">
                    <SelectValue placeholder={loadingEditions ? "Loading..." : "Select base edition"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" disabled>Select a base edition...</SelectItem>
                    {baseEditions.map((edition) => (
                      <SelectItem key={edition.id} value={edition.id}>
                        {edition.name} ({new Date(edition.effective_date).getFullYear()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {baseEditions.length === 0 && !loadingEditions && (
                  <p className="text-sm text-destructive">
                    No base editions found. Create a BASE edition first before adding overlays.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">Advanced Settings</CardTitle>
                      <CardDescription>
                        Optional configurations for volumes, compatibility, and behaviour
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {showAdvanced ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-8 pt-0">
                {/* Authority & Legal */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">1</span>
                    Authority & Legal Status
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 pl-8">
                    <div className="space-y-2">
                      <Label htmlFor="authority">Publishing Authority</Label>
                      <Input
                        id="authority"
                        value={formData.authority}
                        onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="legal_status">Legal Status</Label>
                      <Select
                        value={formData.legal_status}
                        onValueChange={(value) => setFormData({ ...formData, legal_status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEGAL_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="replaces_edition">Replaces Edition</Label>
                      <Select
                        value={formData.replaces_edition_id || "NONE"}
                        onValueChange={(value) => setFormData({ 
                          ...formData, 
                          replaces_edition_id: value === "NONE" ? "" : value 
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select edition to replace" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          {baseEditions.map((edition) => (
                            <SelectItem key={edition.id} value={edition.id}>
                              {edition.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transition_end_date">Transition End Date</Label>
                      <Input
                        id="transition_end_date"
                        type="date"
                        value={formData.transition_end_date}
                        onChange={(e) => setFormData({ ...formData, transition_end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Volumes */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">2</span>
                    Volumes Included
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 pl-8">
                    {NCC_VOLUMES.map((volume) => (
                      <div
                        key={volume.value}
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                          formData.volumes_included.includes(volume.value)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => toggleVolume(volume.value)}
                      >
                        <Checkbox
                          checked={formData.volumes_included.includes(volume.value)}
                          onCheckedChange={() => toggleVolume(volume.value)}
                        />
                        <div>
                          <p className="font-medium">{volume.label}</p>
                          <p className="text-sm text-muted-foreground">{volume.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Structural Changes */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">3</span>
                    Structural Changes
                  </h3>
                  <div className="space-y-4 pl-8">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="has_structural_changes"
                        checked={formData.has_structural_changes}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, has_structural_changes: checked === true })
                        }
                      />
                      <Label htmlFor="has_structural_changes">
                        This edition has structural reorganisation (clause renumbering, merged sections)
                      </Label>
                    </div>

                    {formData.has_structural_changes && (
                      <div className="space-y-2 ml-7">
                        <Label htmlFor="structural_change_notes">Structural Change Notes</Label>
                        <Textarea
                          id="structural_change_notes"
                          placeholder="Describe the structural changes..."
                          value={formData.structural_change_notes}
                          onChange={(e) => setFormData({ ...formData, structural_change_notes: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="building_class_changes">Building Class Changes</Label>
                      <Textarea
                        id="building_class_changes"
                        placeholder="Any building classes added, removed, or redefined..."
                        value={formData.building_class_changes}
                        onChange={(e) => setFormData({ ...formData, building_class_changes: e.target.value })}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="performance_requirements_changed"
                        checked={formData.performance_requirements_changed}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, performance_requirements_changed: checked === true })
                        }
                      />
                      <Label htmlFor="performance_requirements_changed">
                        Performance Requirements have been restructured or reworded
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Machine-Readable Data */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">4</span>
                    Machine-Readable Data
                  </h3>
                  <div className="space-y-4 pl-8">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="has_xml_data"
                        checked={formData.has_xml_data}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, has_xml_data: checked === true })
                        }
                      />
                      <Label htmlFor="has_xml_data">
                        Official XML data is available for this edition
                      </Label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="xml_schema_compatibility">XML Schema Compatibility</Label>
                        <Select
                          value={formData.xml_schema_compatibility}
                          onValueChange={(value) => setFormData({ ...formData, xml_schema_compatibility: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHEMA_COMPATIBILITIES.map((compat) => (
                              <SelectItem key={compat} value={compat}>
                                {compat.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="license">License</Label>
                        <Input
                          id="license"
                          value={formData.license}
                          onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Transition & Compatibility */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">5</span>
                    Transition & Project Compatibility
                  </h3>
                  <div className="space-y-3 pl-8">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="allows_project_lock"
                        checked={formData.allows_project_lock}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, allows_project_lock: checked === true })
                        }
                      />
                      <div>
                        <Label htmlFor="allows_project_lock">Allow Project Lock</Label>
                        <p className="text-sm text-muted-foreground">Projects can be locked to this specific edition</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="allows_auto_migration"
                        checked={formData.allows_auto_migration}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, allows_auto_migration: checked === true })
                        }
                      />
                      <div>
                        <Label htmlFor="allows_auto_migration">Allow Auto Migration</Label>
                        <p className="text-sm text-muted-foreground">Projects can be automatically migrated to this edition</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="mixing_editions_warning"
                        checked={formData.mixing_editions_warning}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, mixing_editions_warning: checked === true })
                        }
                      />
                      <div>
                        <Label htmlFor="mixing_editions_warning">Warn When Mixing Editions</Label>
                        <p className="text-sm text-muted-foreground">Show warning if user mixes editions across projects</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* App Behaviour */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">6</span>
                    App Behaviour
                  </h3>
                  <div className="space-y-3 pl-8">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="is_default_for_new_projects"
                        checked={formData.is_default_for_new_projects}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, is_default_for_new_projects: checked === true })
                        }
                      />
                      <div>
                        <Label htmlFor="is_default_for_new_projects">Default for New Projects</Label>
                        <p className="text-sm text-muted-foreground">New projects will use this edition by default</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="ai_enabled"
                        checked={formData.ai_enabled}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, ai_enabled: checked === true })
                        }
                      />
                      <div>
                        <Label htmlFor="ai_enabled">Enable AI Assistant</Label>
                        <p className="text-sm text-muted-foreground">AI can answer questions using this edition</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Checkbox
                        id="guidance_only"
                        checked={formData.guidance_only}
                        onCheckedChange={(checked) => 
                          setFormData({ ...formData, guidance_only: checked === true })
                        }
                      />
                      <div>
                        <Label htmlFor="guidance_only">Guidance Only</Label>
                        <p className="text-sm text-muted-foreground">Mark as guidance only during early adoption</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* High Liability Areas */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">7</span>
                    Legal & Risk Flags
                  </h3>
                  <div className="space-y-3 pl-8">
                    <div className="space-y-2">
                      <Label>High Liability Areas</Label>
                      <p className="text-sm text-muted-foreground">
                        Select areas with increased liability risk in this edition
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {HIGH_LIABILITY_AREAS.map((area) => (
                          <Badge
                            key={area.value}
                            variant={formData.high_liability_areas.includes(area.value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleLiabilityArea(area.value)}
                          >
                            {area.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs">8</span>
                    Notes & Summary
                  </h3>
                  <div className="space-y-4 pl-8">
                    <div className="space-y-2">
                      <Label htmlFor="change_summary">Change Summary</Label>
                      <Textarea
                        id="change_summary"
                        placeholder="Brief summary of key changes in this edition..."
                        value={formData.change_summary}
                        onChange={(e) => setFormData({ ...formData, change_summary: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="admin_notes">Admin Notes (Internal)</Label>
                      <Textarea
                        id="admin_notes"
                        placeholder="Internal notes for administrators..."
                        value={formData.admin_notes}
                        onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Submit Button */}
        <div className="flex items-center justify-between p-6 rounded-xl bg-muted/50 border">
          <div className="space-y-1">
            <p className="font-medium">Ready to create?</p>
            <p className="text-sm text-muted-foreground">
              You can upload NCC XML files after creating the edition
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isLoading || !canSubmit}
            className="min-w-[160px]"
          >
            {isLoading ? "Creating..." : "Create Edition"}
          </Button>
        </div>
      </div>
    </div>
  );
}
