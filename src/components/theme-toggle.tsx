"use client";

import { Moon, Sun } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { PREFERENCE_PERSISTENCE } from "@/lib/preferences/preferences-config";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

function persistValue(key: string, value: string) {
  const mode = PREFERENCE_PERSISTENCE[key as keyof typeof PREFERENCE_PERSISTENCE];
  
  if (mode === "localStorage") {
    localStorage.setItem(key, value);
  }
  
  if (mode === "client-cookie" || mode === "server-cookie") {
    document.cookie = `${key}=${value}; path=/; max-age=${60 * 60 * 24 * 365}`;
  }
}

export function ThemeToggle() {
  const { themeMode, setThemeMode } = usePreferencesStore(
    useShallow((s) => ({
      themeMode: s.themeMode,
      setThemeMode: s.setThemeMode,
    }))
  );

  const toggleTheme = () => {
    const newMode = themeMode === "dark" ? "light" : "dark";
    
    // Update store
    setThemeMode(newMode);
    
    // Update DOM
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(newMode);
    root.style.colorScheme = newMode;
    
    // Persist the change
    persistValue("theme_mode", newMode);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
