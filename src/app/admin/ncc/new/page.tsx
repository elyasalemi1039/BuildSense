"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEdition } from "@/lib/actions/ncc";
import {
  EDITION_KINDS,
  JURISDICTIONS,
  LEGAL_STATUSES,
  EDITION_STATUSES,
} from "@/lib/constants/ncc-options";

type EditionFormData = {
  name: string;
  description: string;
  edition_kind: string;
  jurisdiction: string;
  legal_status: string;
  edition_status: string;
  year: number;
  version: string;
  effective_date: string;
  parent_edition_id?: string;
};

export default function NewNccEditionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditionFormData>({
    name: "",
    description: "",
    edition_kind: "BASE",
    jurisdiction: "NSW",
    legal_status: "adopted",
    edition_status: "draft",
    year: new Date().getFullYear(),
    version: "1.0",
    effective_date: "",
  });

  const updateField = (field: keyof EditionFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: "2025" | "2019") => {
    if (preset === "2025") {
      setFormData({
        name: "National Construction Code 2025",
        description: "The 2025 edition of the National Construction Code",
        edition_kind: "BASE",
        jurisdiction: "NSW",
        legal_status: "adopted",
        edition_status: "draft",
        year: 2025,
        version: "1.0",
        effective_date: "2025-05-01",
      });
    } else if (preset === "2019") {
      setFormData({
        name: "National Construction Code 2019",
        description: "The 2019 edition of the National Construction Code",
        edition_kind: "BASE",
        jurisdiction: "NSW",
        legal_status: "adopted",
        edition_status: "draft",
        year: 2019,
        version: "1.0",
        effective_date: "2019-05-01",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createEdition({
        name: formData.name,
        kind: formData.edition_kind,
        effective_date: formData.effective_date,
        jurisdiction: formData.jurisdiction,
      });
      
      if (result.edition) {
        router.push(`/admin/ncc/${result.edition.id}`);
      } else {
        setError(result.error || "Failed to create edition");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

        return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Create New NCC Edition</h1>
        <p className="text-muted-foreground">
          Set up a new edition of the National Construction Code
        </p>
      </div>

      <div className="mb-6 flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => applyPreset("2025")}
        >
          NCC 2025 Preset
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => applyPreset("2019")}
        >
          NCC 2019 Preset
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                <Label htmlFor="name">Edition Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g., National Construction Code 2025"
                    required
                />
              </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Brief description of this edition"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) =>
                        updateField("year", parseInt(e.target.value))
                      }
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => updateField("version", e.target.value)}
                      placeholder="e.g., 1.0"
                    />
                  </div>
              </div>

                <div>
                  <Label htmlFor="effective_date">Effective Date</Label>
                  <Input
                    id="effective_date"
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) =>
                      updateField("effective_date", e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edition_kind">Edition Kind</Label>
                  <Select
                    value={formData.edition_kind}
                    onValueChange={(value) => updateField("edition_kind", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDITION_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    BASE = original NCC, OVERLAY = jurisdiction-specific
                    modifications
                  </p>
                </div>

                <div>
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Select
                    value={formData.jurisdiction}
                    onValueChange={(value) => updateField("jurisdiction", value)}
                >
                  <SelectTrigger>
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      {JURISDICTIONS.map((jurisdiction) => (
                        <SelectItem
                          key={jurisdiction.value}
                          value={jurisdiction.value}
                        >
                          {jurisdiction.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                <div>
                  <Label htmlFor="legal_status">Legal Status</Label>
                  <Select
                    value={formData.legal_status}
                    onValueChange={(value) => updateField("legal_status", value)}
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

                      <div>
                  <Label htmlFor="edition_status">Edition Status</Label>
                  <Select
                    value={formData.edition_status}
                    onValueChange={(value) =>
                      updateField("edition_status", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EDITION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Edition"}
          </Button>
            <Button
            type="button"
              variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
              </Button>
          </div>
      </form>
    </div>
  );
}
