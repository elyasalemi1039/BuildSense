import { CheckSquare, ClipboardCheck, FileText, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Checklist Items", value: "0", icon: CheckSquare, color: "text-blue-500" },
  { label: "Completed", value: "0", icon: ClipboardCheck, color: "text-green-500" },
  { label: "Issues Found", value: "0", icon: AlertTriangle, color: "text-red-500" },
  { label: "Documents", value: "0", icon: FileText, color: "text-purple-500" },
];

export default function ProjectOverviewPage() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="font-bold text-2xl">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates on this project</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compliance Summary</CardTitle>
            <CardDescription>Overall compliance status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Start a checklist to see compliance status</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
