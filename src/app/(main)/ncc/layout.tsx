import type { ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/auth/admin";

export default async function NCCLayout({ children }: { children: ReactNode }) {
  const userIsAdmin = await isAdmin();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <Link href="/ncc" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">NCC Search</h1>
              <p className="text-xs text-slate-400">National Construction Code</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {userIsAdmin && (
              <Link href="/admin/ncc">
                <Button variant="outline" size="sm" className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white">
                  <Shield className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
            <Link href="/logout">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Sign Out
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container px-4 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}

