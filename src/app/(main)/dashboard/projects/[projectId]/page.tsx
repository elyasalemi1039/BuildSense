import Link from "next/link";

import { ArrowLeft, Building2, CheckSquare, ClipboardCheck, FileText, Map, MapPin, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Mock data - will come from Supabase later
const projectData = {
  id: "proj_001",
  name: "Residential Development - Parramatta",
  address: "45 George St, Parramatta NSW 2150",
  buildingClass: "Class 1a",
  stage: "Framing",
  climateZone: "Zone 5",
  windRegion: "B2",
  bushfireProne: false,
  state: "NSW",
};

const features = [
  {
    title: "Checklists",
    description: "View and manage compliance checklists",
    icon: CheckSquare,
    href: `/projects/${projectData.id}/checklist`,
    count: 3,
  },
  {
    title: "Inspections",
    description: "Record inspection results with photos",
    icon: ClipboardCheck,
    href: `/projects/${projectData.id}/inspections`,
    count: 8,
  },
  {
    title: "NCC Search",
    description: "Search relevant NCC clauses",
    icon: FileText,
    href: `/projects/${projectData.id}/ncc-search`,
    count: null,
  },
  {
    title: "Zone Info",
    description: "Climate, wind, and bushfire details",
    icon: Map,
    href: `/projects/${projectData.id}/zone-lookup`,
    count: null,
  },
  {
    title: "AI Copilot",
    description: "Ask compliance questions",
    icon: Sparkles,
    href: `/projects/${projectData.id}/ai-copilot`,
    count: null,
  },
];

export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-2xl text-primary">{projectData.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{projectData.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-muted-foreground text-sm">Building Class</p>
              <p className="font-medium">{projectData.buildingClass}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Current Stage</p>
              <p className="font-medium">{projectData.stage}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Climate Zone</p>
              <p className="font-medium">{projectData.climateZone}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Wind Region</p>
              <p className="font-medium">{projectData.windRegion}</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">State</p>
              <p className="font-medium">{projectData.state}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Bushfire Prone Area</p>
              <p className="font-medium">{projectData.bushfireProne ? "Yes" : "No"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div>
        <h2 className="mb-4 font-semibold text-lg">Compliance Tools</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.href}>
              <Card className="hover:border-primary hover:shadow-lg cursor-pointer transition-all">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    {feature.count !== null && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary text-xs">
                        {feature.count}
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-4 text-base">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

