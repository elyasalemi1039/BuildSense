import Link from "next/link";

import { ArrowLeft, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ZoneLookupPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${params.projectId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
        </Link>
        <div>
          <h1 className="font-semibold text-2xl text-primary">Zone Lookup</h1>
          <p className="text-muted-foreground">
            Climate zone, wind region, and bushfire-prone area information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This feature is under development. You'll be able to view detailed zone information here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Features will include:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Interactive map showing project location</li>
            <li>Climate zone details and requirements</li>
            <li>Wind region classification</li>
            <li>Bushfire attack level (BAL) information</li>
            <li>State and local council variations</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

