import Link from "next/link";

import { FileText, Database, Users, Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const adminModules = [
  {
    title: "NCC Editions",
    description: "Manage NCC editions, parse XML files, and publish rulesets",
    href: "/admin/ncc",
    icon: FileText,
    color: "text-blue-500",
  },
  {
    title: "Database",
    description: "View database stats and manage data",
    href: "/admin/database",
    icon: Database,
    color: "text-green-500",
    disabled: true,
  },
  {
    title: "Users",
    description: "Manage user accounts and permissions",
    href: "/admin/users",
    icon: Users,
    color: "text-purple-500",
    disabled: true,
  },
  {
    title: "Settings",
    description: "Configure system settings",
    href: "/admin/settings",
    icon: Settings,
    color: "text-orange-500",
    disabled: true,
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage BuildSense system configuration</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {adminModules.map((module) => (
          <Link 
            key={module.title} 
            href={module.disabled ? "#" : module.href}
            className={module.disabled ? "pointer-events-none opacity-50" : ""}
          >
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-primary/10 ${module.color}`}>
                    <module.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{module.description}</CardDescription>
                {module.disabled && (
                  <span className="text-xs text-muted-foreground mt-2 block">Coming soon</span>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}


