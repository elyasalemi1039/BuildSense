import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { isAdmin } from "@/lib/auth/admin";
import { Shield, Home, FileText, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isUserAdmin = await isAdmin();

  if (!isUserAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-2 font-semibold text-primary">
              <Shield className="h-5 w-5" />
              Admin Panel
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/admin/ncc">
                <Button variant="ghost" size="sm">
                  <FileText className="mr-2 h-4 w-4" />
                  NCC Editions
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Exit Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}


