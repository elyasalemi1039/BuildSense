"use client";

import { useRouter } from "next/navigation";

import { Building2, Check, ChevronsUpDown, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

interface Project {
  id: string;
  name: string;
  address?: string | null;
  status?: string;
}

interface ProjectHeaderProps {
  project: Project;
  allProjects: { id: string; name: string }[];
}

export function ProjectHeader({ project, allProjects }: ProjectHeaderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-semibold text-2xl text-primary">{project.name}</h1>
        {project.address && (
          <p className="text-muted-foreground">{project.address}</p>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[250px] justify-between">
            <span className="truncate">{project.name}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
          <Command>
            <CommandInput placeholder="Search projects..." />
            <CommandList>
              <CommandEmpty>No projects found.</CommandEmpty>
              <CommandGroup heading="Navigation">
                <CommandItem
                  onSelect={() => {
                    router.push("/dashboard");
                    setOpen(false);
                  }}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Main Dashboard
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Your Projects">
                {allProjects.map((p) => (
                  <CommandItem
                    key={p.id}
                    onSelect={() => {
                      router.push(`/dashboard/projects/${p.id}`);
                      setOpen(false);
                    }}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    <span className="truncate">{p.name}</span>
                    {p.id === project.id && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}




