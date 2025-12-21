import { Building2, CheckSquare, ClipboardCheck, FileText, Map, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Projects",
    description: "Manage your building projects with automatic compliance tracking",
    icon: Building2,
    status: "Coming Soon",
  },
  {
    title: "NCC Search",
    description: "Search through National Construction Code requirements",
    icon: FileText,
    status: "Coming Soon",
  },
  {
    title: "Checklists",
    description: "Stage-specific compliance checklists linked to NCC clauses",
    icon: CheckSquare,
    status: "Coming Soon",
  },
  {
    title: "Inspections",
    description: "Document inspections with photo evidence and timestamps",
    icon: ClipboardCheck,
    status: "Coming Soon",
  },
  {
    title: "Zone Lookup",
    description: "Find climate zones, wind regions, and bushfire-prone areas",
    icon: Map,
    status: "Coming Soon",
  },
  {
    title: "AI Copilot",
    description: "Ask compliance questions with NCC-backed answers",
    icon: Sparkles,
    status: "Coming Soon",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl text-primary">Welcome to BuildSense</h1>
        <p className="text-muted-foreground">
          Your digital building compliance assistant for Australian construction.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <span className="text-xs text-muted-foreground">{feature.status}</span>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{feature.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
