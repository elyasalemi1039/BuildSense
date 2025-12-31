import type { ReactNode } from "react";

import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { ProjectHeader } from "./_components/project-header";
import { ProjectNav } from "./_components/project-nav";

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    notFound();
  }

  // Fetch all user's projects for the switcher
  const { data: allProjects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-4">
      <ProjectHeader project={project} allProjects={allProjects || []} />
      <ProjectNav projectId={projectId} />
      <div className="mt-4">{children}</div>
    </div>
  );
}








