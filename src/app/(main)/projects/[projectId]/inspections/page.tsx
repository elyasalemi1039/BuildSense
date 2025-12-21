import Link from "next/link";

import { ArrowLeft, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InspectionsPage({ params }: { params: { projectId: string } }) {
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
            <h1 className="font-semibold text-2xl text-primary">Inspections</h1>
            <p className="text-muted-foreground">
              Record and manage inspection results with photo evidence
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Inspection
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This feature is under development. You'll be able to record inspection results here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Features will include:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Photo capture with timestamps and geo-tags</li>
            <li>Notes and observations</li>
            <li>Compliance status indicators</li>
            <li>PDF report generation</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

