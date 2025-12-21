import Link from "next/link";

import { ArrowLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChecklistPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${params.projectId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-2xl text-primary">Checklists</h1>
            <p className="text-muted-foreground">
              Stage-specific compliance checklists for this project
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Checklist
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This feature is under development. You'll be able to create and manage compliance checklists here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Features will include:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Stage-specific checklists (framing, waterproofing, etc.)</li>
            <li>Links to relevant NCC clauses</li>
            <li>Photo evidence capture</li>
            <li>Compliance status tracking</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

