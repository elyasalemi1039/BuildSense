import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BookOpen, Search, Shield, LogOut, User, Settings } from "lucide-react";

import { getCurrentUser } from "@/lib/actions/auth";
import { isAdmin } from "@/lib/auth/admin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/login");
  }

  const userIsAdmin = await isAdmin();
  const initials = user.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-white">BuildSense</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg bg-amber-500/10 px-3 py-2.5 text-amber-400 transition-colors"
          >
            <Search className="h-5 w-5" />
            <span className="font-medium">NCC Search</span>
          </Link>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-3 space-y-2">
          {userIsAdmin && (
            <Link href="/admin/ncc">
              <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800">
                <Shield className="mr-3 h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800">
                <Avatar className="h-6 w-6 mr-3">
                  <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800">
              <DropdownMenuItem className="text-slate-400 focus:text-white focus:bg-slate-800">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-slate-400 focus:text-white focus:bg-slate-800">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <Link href="/logout">
                <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-slate-800">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pl-64">
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          {children}
        </div>
      </main>
    </div>
  );
}
