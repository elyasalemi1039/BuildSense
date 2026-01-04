import Link from "next/link";

import { Plus, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEditions } from "@/lib/actions/ncc";

const statusColors: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-500",
  parsed: "bg-blue-500/10 text-blue-500",
  indexed: "bg-purple-500/10 text-purple-500",
  published: "bg-green-500/10 text-green-500",
  archived: "bg-gray-500/10 text-gray-500",
};

export default async function NCCEditionsPage() {
  const { editions, error } = await getEditions();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">NCC Editions</h1>
          <p className="text-muted-foreground">
            Manage National Construction Code editions and overlays
          </p>
        </div>
        <Link href="/admin/ncc/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Edition
          </Button>
        </Link>
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {editions.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="mt-4">No editions yet</CardTitle>
            <CardDescription>Create your first NCC edition to get started</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Link href="/admin/ncc/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Edition
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {editions.map((edition) => (
            <Link key={edition.id} href={`/admin/ncc/${edition.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{edition.kind}</Badge>
                      <CardTitle className="text-lg">{edition.name}</CardTitle>
                    </div>
                    <Badge className={statusColors[edition.status] || ""}>
                      {edition.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>Effective: {new Date(edition.effective_date).toLocaleDateString()}</span>
                    {edition.jurisdiction && <span>Jurisdiction: {edition.jurisdiction}</span>}
                    <span>Nodes: {edition.node_count}</span>
                    <span>Created: {new Date(edition.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}









