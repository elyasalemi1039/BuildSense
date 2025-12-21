import Link from "next/link";

import { ArrowLeft, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function AICopilotPage({ params }: { params: { projectId: string } }) {
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
          <h1 className="font-semibold text-2xl text-primary">AI Copilot</h1>
          <p className="text-muted-foreground">
            Ask compliance questions and get NCC-backed answers
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This feature is under development. You'll be able to ask AI compliance questions here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Features will include:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Natural language questions about NCC compliance</li>
            <li>Every answer backed by specific NCC clauses</li>
            <li>Context-aware based on your project details</li>
            <li>Citation links to full requirements</li>
          </ul>
        </CardContent>
      </Card>

      {/* Preview UI */}
      <div className="space-y-4 rounded-lg border border-muted bg-muted/20 p-4 opacity-50">
        <div className="space-y-2">
          <div className="text-muted-foreground text-sm">Preview (not functional yet)</div>
          <Textarea
            placeholder="Ask a question... e.g., 'What waterproofing requirements apply to this bathroom?'"
            rows={3}
            disabled
          />
          <Button disabled className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Ask Question
          </Button>
        </div>
      </div>
    </div>
  );
}

