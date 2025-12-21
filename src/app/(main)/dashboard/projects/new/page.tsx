"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createProject } from "@/lib/actions/projects";
import {
  PROJECT_TYPES,
  BUILDING_CLASSES,
  NCC_CONTEXTS,
  NCC_VERSIONS,
} from "@/lib/constants/project-options";

import { AddressAutocomplete } from "./_components/address-autocomplete";
import { ConstructionScopeSelector } from "./_components/construction-scope-selector";
import { CurrencyInput } from "./_components/currency-input";

const steps = [
  { id: 1, name: "Project Details" },
  { id: 2, name: "Location" },
  { id: 3, name: "Scope" },
];

interface FormData {
  // Step 1
  name: string;
  project_type: string;
  building_class: string;
  number_of_storeys: string;
  construction_value: string;
  ncc_context: string;
  ncc_version: string;
  // Step 2
  address: string;
  state: string;
  latitude: number | null;
  longitude: number | null;
  // Step 3
  construction_scopes: string[];
}

export default function NewProjectPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    project_type: "",
    building_class: "",
    number_of_storeys: "",
    construction_value: "",
    ncc_context: "",
    ncc_version: "",
    address: "",
    state: "",
    latitude: null,
    longitude: null,
    construction_scopes: [],
  });

  const updateField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return formData.name && formData.project_type && formData.building_class;
    }
    if (currentStep === 2) {
      return formData.address && formData.state;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const result = await createProject({
        name: formData.name,
        project_type: formData.project_type || undefined,
        building_class: formData.building_class || undefined,
        number_of_storeys: formData.number_of_storeys ? parseInt(formData.number_of_storeys, 10) : undefined,
        construction_value: formData.construction_value ? parseInt(formData.construction_value, 10) : undefined,
        ncc_context: formData.ncc_context || undefined,
        ncc_version: formData.ncc_version || undefined,
        address: formData.address || undefined,
        state: formData.state || undefined,
        latitude: formData.latitude ?? undefined,
        longitude: formData.longitude ?? undefined,
        construction_scopes: formData.construction_scopes.length > 0 ? formData.construction_scopes : undefined,
      });

      if (result?.error) {
        toast.error("Failed to create project", {
          description: result.error,
        });
        setIsLoading(false);
      } else {
        toast.success("Project created!", {
          description: "Your project has been created successfully.",
        });
        router.push("/dashboard/projects");
      }
    } catch (error) {
      console.error("Create project error:", error);
      toast.error("Something went wrong", {
        description: "Please try again later.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <h1 className="font-semibold text-2xl text-primary">Create New Project</h1>
        <p className="text-muted-foreground">Set up a new building project for compliance tracking</p>
      </div>

      {/* Progress Steps */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-between">
          {steps.map((step, stepIdx) => (
            <li key={step.name} className="relative flex-1">
              <div className="flex items-center">
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium",
                    currentStep > step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.id
                        ? "border-primary bg-background text-primary"
                        : "border-muted bg-background text-muted-foreground"
                  )}
                >
                  {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                </div>
                {stepIdx !== steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-4",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
              <span className="mt-2 block text-xs text-center">{step.name}</span>
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && "Project Details"}
            {currentStep === 2 && "Project Location"}
            {currentStep === 3 && "Construction Scope"}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && "Enter the basic information about your building project"}
            {currentStep === 2 && "Specify the project address and location"}
            {currentStep === 3 && "Select the construction scope areas for compliance tracking"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Project Details */}
          {currentStep === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Residential Development - Parramatta"
                  value={formData.name}
                  onChange={(e) => updateField("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_type">Project Type *</Label>
                <Select
                  value={formData.project_type}
                  onValueChange={(value) => updateField("project_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="building_class">Building Classification *</Label>
                <Select
                  value={formData.building_class}
                  onValueChange={(value) => updateField("building_class", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select building class" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUILDING_CLASSES.map((cls) => (
                      <SelectItem key={cls.value} value={cls.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{cls.label}</span>
                          <span className="text-xs text-muted-foreground">{cls.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Building classification determines which NCC requirements apply
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeys">Number of Storeys</Label>
                  <Input
                    id="storeys"
                    type="number"
                    min="1"
                    placeholder="e.g., 2"
                    value={formData.number_of_storeys}
                    onChange={(e) => updateField("number_of_storeys", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value">Estimated Construction Value</Label>
                  <CurrencyInput
                    value={formData.construction_value}
                    onChange={(value) => updateField("construction_value", value)}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ncc_context">NCC Context</Label>
                  <Select
                    value={formData.ncc_context}
                    onValueChange={(value) => updateField("ncc_context", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select NCC context" />
                    </SelectTrigger>
                    <SelectContent>
                      {NCC_CONTEXTS.map((ctx) => (
                        <SelectItem key={ctx.value} value={ctx.value}>
                          <div className="flex flex-col">
                            <span>{ctx.label}</span>
                            <span className="text-xs text-muted-foreground">{ctx.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ncc_version">NCC Version</Label>
                  <Select
                    value={formData.ncc_version}
                    onValueChange={(value) => updateField("ncc_version", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select NCC version" />
                    </SelectTrigger>
                    <SelectContent>
                      {NCC_VERSIONS.map((ver) => (
                        <SelectItem key={ver.value} value={ver.value}>
                          {ver.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="address">Project Address *</Label>
                <AddressAutocomplete
                  value={formData.address}
                  onChange={(address, state, lat, lng) => {
                    updateField("address", address);
                    updateField("state", state);
                    updateField("latitude", lat);
                    updateField("longitude", lng);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Start typing to search for an Australian address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Territory</Label>
                <Input
                  id="state"
                  value={formData.state}
                  disabled
                  placeholder="Auto-filled from address"
                  className="bg-muted"
                />
              </div>
            </>
          )}

          {/* Step 3: Construction Scope */}
          {currentStep === 3 && (
            <ConstructionScopeSelector
              selected={formData.construction_scopes}
              onChange={(scopes) => updateField("construction_scopes", scopes)}
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isLoading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep < 3 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Project"}
          </Button>
        )}
      </div>
    </div>
  );
}
