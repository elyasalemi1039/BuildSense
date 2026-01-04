"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call the signout API
        await fetch("/api/auth/signout");
        // Redirect to home
        router.push("/");
      } catch (error) {
        console.error("Logout error:", error);
        // Still redirect even on error
        router.push("/");
      }
    };

    performLogout();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  );
}

