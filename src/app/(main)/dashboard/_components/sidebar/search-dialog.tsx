"use client";
import * as React from "react";

import { Building2, ClipboardCheck, FileText, LayoutDashboard, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const searchItems = [
  { group: "Navigation", icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { group: "Navigation", icon: Building2, label: "Projects", href: "/dashboard/projects" },
  { group: "Actions", icon: ClipboardCheck, label: "New Project", href: "/dashboard/projects/new" },
  { group: "Actions", icon: FileText, label: "NCC Search", href: "#" },
];

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="link"
        className="!px-0 font-normal text-muted-foreground hover:no-underline"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Search
        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-medium text-[10px]">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects, pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {[...new Set(searchItems.map((item) => item.group))].map((group) => (
            <CommandGroup heading={group} key={group}>
              {searchItems
                .filter((item) => item.group === group)
                .map((item) => (
                  <CommandItem
                    className="!py-1.5"
                    key={item.label}
                    onSelect={() => {
                      setOpen(false);
                      if (item.href !== "#") {
                        window.location.href = item.href;
                      }
                    }}
                  >
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
