import { Camera, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EvidencePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-xl">Evidence & Photos</h2>
          <p className="text-muted-foreground">Upload and manage inspection photos and documents</p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Camera className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4">No evidence uploaded</CardTitle>
          <CardDescription>Upload photos and documents to document compliance</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Upload Evidence
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


