"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEdition } from "@/lib/actions/ncc";
import { EDITION_KINDS, JURISDICTIONS } from "@/lib/constants/ncc-options";

export default function NewEditionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    kind: "BASE",
    effective_date: "",
    jurisdiction: "",
    applies_to_base_edition_id: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
                placeholder="e.g., NCC 2022, NCC 2022 Amendment 1"
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
                  onValueChange={(value) => setFormData({ ...formData, kind: value })}
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
                  BASE = main NCC edition, OVERLAY = amendment or state variation
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

            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction (Optional)</Label>
              <Select
                value={formData.jurisdiction}
                onValueChange={(value) => setFormData({ ...formData, jurisdiction: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select jurisdiction (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">National (All jurisdictions)</SelectItem>
                  {JURISDICTIONS.map((j) => (
                    <SelectItem key={j.value} value={j.value}>
                      {j.label} ({j.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave empty for national editions, select for state-specific variations
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading}>
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


