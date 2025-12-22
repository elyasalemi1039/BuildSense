"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, ArrowRight, Info, Check, AlertTriangle } from "lucide-react";
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

const WIZARD_STEPS = [
  { id: 1, title: "Identity", description: "Edition name & authority" },
  { id: 2, title: "Scope", description: "Volumes & structure" },
  { id: 3, title: "Compatibility", description: "XML & schema" },
  { id: 4, title: "Transition", description: "Projects & migration" },
  { id: 5, title: "Settings", description: "App behaviour & legal" },
];

export default function NewEditionPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [baseEditions, setBaseEditions] = useState<BaseEdition[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(true);
  
  const [formData, setFormData] = useState({
    // Step 1: Identity & Authority
    name: "",
    kind: "BASE",
    legal_status: "draft",
    effective_date: "",
    authority: "Australian Building Codes Board",
    jurisdiction: "",
    applies_to_base_edition_id: "",
    replaces_edition_id: "",
    transition_end_date: "",
    
    // Step 2: Structural Scope
    volumes_included: ["volume_one", "volume_two", "volume_three", "housing_provisions"],
    has_structural_changes: false,
    structural_change_notes: "",
    building_class_changes: "",
    performance_requirements_changed: false,
    
    // Step 3: Machine-Readable Data
    has_xml_data: true,
    xml_schema_compatibility: "fully_compatible",
    new_data_fields: "",
    deprecated_fields: "",
    license: "CC BY 4.0",
    
    // Step 4: Transition & Compatibility
    allows_project_lock: true,
    allows_auto_migration: false,
    requires_reassessment: false,
    validity_cutoff_date: "",
    mixing_editions_warning: true,
    
    // Step 5: App Behaviour & Legal
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

  const handleSubmit = async () => {
    // Validation for OVERLAY
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

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.effective_date && 
          (formData.kind === "BASE" || formData.applies_to_base_edition_id);
      case 2:
        return formData.volumes_included.length > 0;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>About NCC Editions</AlertTitle>
              <AlertDescription className="mt-2">
                <strong>BASE editions</strong> contain the full NCC for a year. 
                <strong> OVERLAY editions</strong> are amendments or state variations.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Edition Name *</Label>
                <Input
                  id="name"
                  placeholder={formData.kind === "BASE" ? "e.g., NCC 2025" : "e.g., NCC 2025 Amendment 1"}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="kind">Edition Type *</Label>
                  <Select
                    value={formData.kind}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      kind: value,
                      applies_to_base_edition_id: value === "BASE" ? "" : formData.applies_to_base_edition_id 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDITION_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kind === "BASE" ? "Base Edition" : "Overlay (Amendment/Variation)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="legal_status">Legal Status</Label>
                  <Select
                    value={formData.legal_status}
                    onValueChange={(value) => setFormData({ ...formData, legal_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="effective_date">Effective Date *</Label>
                  <Input
                    id="effective_date"
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authority">Publishing Authority</Label>
                  <Input
                    id="authority"
                    value={formData.authority}
                    onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                  />
                </div>
              </div>

              {formData.kind === "OVERLAY" && (
                <div className="space-y-2">
                  <Label htmlFor="base_edition">Applies to Base Edition *</Label>
                  <Select
                    value={formData.applies_to_base_edition_id || "NONE"}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      applies_to_base_edition_id: value === "NONE" ? "" : value 
                    })}
                    disabled={loadingEditions}
                  >
                    <SelectTrigger>
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
                    <p className="text-xs text-destructive">
                      No base editions found. Create a BASE edition first.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction (Optional)</Label>
                <Select
                  value={formData.jurisdiction || "NATIONAL"}
                  onValueChange={(value) => setFormData({ ...formData, jurisdiction: value === "NATIONAL" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NATIONAL">National (All jurisdictions)</SelectItem>
                    {JURISDICTIONS.map((j) => (
                      <SelectItem key={j.value} value={j.value}>
                        {j.label} ({j.value})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="replaces_edition">Replaces Edition (Optional)</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Date after which the previous edition cannot be used
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Volumes Included *</Label>
                <p className="text-sm text-muted-foreground">
                  Select which NCC volumes are included in this edition
                </p>
                <div className="grid gap-3 md:grid-cols-2">
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

              <div className="space-y-4">
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
                  <div className="ml-7 space-y-2">
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Machine-Readable Data</AlertTitle>
              <AlertDescription>
                These settings control how the XML data is processed and indexed.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="new_data_fields">New Data Fields (comma-separated)</Label>
                <Input
                  id="new_data_fields"
                  placeholder="e.g., climate_zone_v2, material_type, fire_rating_extended"
                  value={formData.new_data_fields}
                  onChange={(e) => setFormData({ ...formData, new_data_fields: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deprecated_fields">Deprecated Fields (comma-separated)</Label>
                <Input
                  id="deprecated_fields"
                  placeholder="e.g., old_climate_zone, legacy_ref"
                  value={formData.deprecated_fields}
                  onChange={(e) => setFormData({ ...formData, deprecated_fields: e.target.value })}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Transition & Compatibility</AlertTitle>
              <AlertDescription>
                These settings affect how existing projects interact with this edition.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
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
                  <p className="text-sm text-muted-foreground">
                    Projects can be locked to this specific edition
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Projects can be automatically migrated to this edition
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="requires_reassessment"
                  checked={formData.requires_reassessment}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, requires_reassessment: checked === true })
                  }
                />
                <div>
                  <Label htmlFor="requires_reassessment">Requires Re-assessment</Label>
                  <p className="text-sm text-muted-foreground">
                    In-progress approvals must be re-assessed under this edition
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Show warning if user mixes editions across projects
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validity_cutoff_date">Validity Cutoff Date</Label>
                <Input
                  id="validity_cutoff_date"
                  type="date"
                  value={formData.validity_cutoff_date}
                  onChange={(e) => setFormData({ ...formData, validity_cutoff_date: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Date after which older editions become invalid
                </p>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold">App Behaviour</h3>
              
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
                  <p className="text-sm text-muted-foreground">
                    New projects will use this edition by default
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="hide_older_editions"
                  checked={formData.hide_older_editions}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, hide_older_editions: checked === true })
                  }
                />
                <div>
                  <Label htmlFor="hide_older_editions">Hide Older Editions</Label>
                  <p className="text-sm text-muted-foreground">
                    Archive older editions when this is published
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    AI can answer questions using this edition
                  </p>
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
                  <p className="text-sm text-muted-foreground">
                    Mark this edition as guidance only during early adoption
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Legal & Risk</h3>
              
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

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Notes</h3>
              
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
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/ncc">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editions
          </Button>
        </Link>
        <h1 className="font-bold text-2xl">Create NCC Edition</h1>
        <p className="text-muted-foreground">
          Configure a new NCC edition for the compliance system
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {WIZARD_STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => currentStep > step.id && setCurrentStep(step.id)}
              disabled={currentStep < step.id}
              className={`flex flex-col items-center gap-1 ${
                currentStep < step.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  currentStep === step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span className="text-xs hidden sm:block">{step.title}</span>
            </button>
            {index < WIZARD_STEPS.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-12 mx-2 ${
                currentStep > step.id ? "bg-green-500" : "bg-muted"
              }`} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{WIZARD_STEPS[currentStep - 1].title}</CardTitle>
          <CardDescription>{WIZARD_STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}

          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>

            {currentStep < WIZARD_STEPS.length ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !canProceed()}
              >
                {isLoading ? "Creating..." : "Create Edition"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
