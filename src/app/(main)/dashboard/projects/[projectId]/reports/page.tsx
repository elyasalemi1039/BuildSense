import { FileText, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-xl">Reports</h2>
          <p className="text-muted-foreground">Generate and download compliance reports</p>
        </div>
        <Button disabled>
          <Download className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4">No reports generated</CardTitle>
          <CardDescription>Complete checklists to generate compliance reports</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            Reports will be available once you have completed checklist items
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


