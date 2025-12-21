"use client";

import { useState } from "react";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  MAIN_CONSTRUCTION_SCOPES,
  ADVANCED_CONSTRUCTION_SCOPES,
} from "@/lib/constants/project-options";

interface ConstructionScopeSelectorProps {
  selected: string[];
  onChange: (scopes: string[]) => void;
}

export function ConstructionScopeSelector({ selected, onChange }: ConstructionScopeSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleScope = (scope: string) => {
    if (selected.includes(scope)) {
      onChange(selected.filter((s) => s !== scope));
    } else {
      onChange([...selected, scope]);
    }
  };

  const ScopeToggle = ({ scope }: { scope: { value: string; label: string; description: string } }) => {
    const isSelected = selected.includes(scope.value);

    return (
      <button
        type="button"
        onClick={() => toggleScope(scope.value)}
        className={cn(
          "flex flex-col items-start rounded-lg border-2 p-4 text-left transition-all",
          isSelected
            ? "border-primary bg-primary/5"
            : "border-muted hover:border-muted-foreground/30"
        )}
      >
        <div className="flex w-full items-center justify-between">
          <span className="font-medium">{scope.label}</span>
          <div
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30"
            )}
          >
            {isSelected && (
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
        <span className="mt-1 text-xs text-muted-foreground">{scope.description}</span>
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base">Select Construction Scope Areas</Label>
        <p className="text-sm text-muted-foreground">
          Choose the areas of construction that apply to this project
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {MAIN_CONSTRUCTION_SCOPES.map((scope) => (
          <ScopeToggle key={scope.value} scope={scope} />
        ))}
      </div>

      <div>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-center"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? "Hide" : "Show"} Advanced Scopes
          <ChevronDown
            className={cn(
              "ml-2 h-4 w-4 transition-transform",
              showAdvanced && "rotate-180"
            )}
          />
        </Button>
      </div>

      {showAdvanced && (
        <div className="grid gap-3 md:grid-cols-2">
          {ADVANCED_CONSTRUCTION_SCOPES.map((scope) => (
            <ScopeToggle key={scope.value} scope={scope} />
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {selected.length} scope{selected.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}

