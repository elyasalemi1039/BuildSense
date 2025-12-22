"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEdition, getEditions } from "@/lib/actions/ncc";
import { EDITION_KINDS, JURISDICTIONS } from "@/lib/constants/ncc-options";

interface BaseEdition {
  id: string;
  name: string;
  effective_date: string;
}

export default function NewEditionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [baseEditions, setBaseEditions] = useState<BaseEdition[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    kind: "BASE",
    effective_date: "",
    jurisdiction: "",
    applies_to_base_edition_id: "",
  });

  // Fetch base editions for overlay selection
  useEffect(() => {
    async function fetchBaseEditions() {
      try {
        const result = await getEditions();
        if (result.editions) {
          // Filter to only BASE editions
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        toast.error("Failed to create edition", {
          description: result.error,
        });
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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href="/admin/ncc">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editions
          </Button>
        </Link>
        <h1 className="font-bold text-2xl">Create NCC Edition</h1>
        <p className="text-muted-foreground">
          Add a new NCC edition or overlay amendment
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>About NCC Editions</AlertTitle>
        <AlertDescription className="mt-2 space-y-2">
          <p>
            <strong>BASE editions</strong> contain the full NCC for a year (e.g., NCC 2022, NCC 2025).
            Upload a single ZIP containing all volumes:
          </p>
          <ul className="list-disc list-inside ml-2 text-sm">
            <li>Volume One (Class 2-9 buildings)</li>
            <li>Volume Two (Class 1 and 10 buildings)</li>
            <li>Volume Three (Plumbing and Drainage)</li>
            <li>Housing Provisions</li>
          </ul>
          <p className="mt-2">
            <strong>OVERLAY editions</strong> are amendments or state-specific variations 
            that modify a base edition (e.g., &quot;NCC 2025 Amendment 1&quot; or &quot;VIC Variations 2025&quot;).
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Edition Details</CardTitle>
          <CardDescription>
            Enter the metadata for this NCC edition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Edition Name *</Label>
              <Input
                id="name"
                placeholder={formData.kind === "BASE" ? "e.g., NCC 2025" : "e.g., NCC 2025 Amendment 1, VIC Variations 2025"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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
                    // Clear base edition if switching to BASE
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
                <p className="text-xs text-muted-foreground">
                  {formData.kind === "BASE" 
                    ? "Full NCC edition with all volumes" 
                    : "Amendment or state variation that modifies a base edition"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="effective_date">Effective Date *</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Show base edition selector only for OVERLAY */}
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
                    No base editions found. Create a BASE edition first before creating overlays.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  This overlay will modify or extend the selected base edition
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction (Optional)</Label>
              <Select
                value={formData.jurisdiction || "NATIONAL"}
                onValueChange={(value) => setFormData({ ...formData, jurisdiction: value === "NATIONAL" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction (optional)" />
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
              <p className="text-xs text-muted-foreground">
                {formData.kind === "BASE" 
                  ? "Base editions are typically National"
                  : "Select a state for state-specific variations (e.g., VIC, NSW)"}
              </p>
            </div>

            <div className="flex gap-4">
              <Button 
                type="submit" 
                disabled={isLoading || (formData.kind === "OVERLAY" && baseEditions.length === 0)}
              >
                {isLoading ? "Creating..." : "Create Edition"}
              </Button>
              <Link href="/admin/ncc">
                <Button type="button" variant="outline" disabled={isLoading}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


