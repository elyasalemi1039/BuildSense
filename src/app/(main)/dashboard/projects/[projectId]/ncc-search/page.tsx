import Link from "next/link";

import { ArrowLeft, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function NCCSearchPage({ params }: { params: { projectId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${params.projectId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Project
          </Button>
        </Link>
        <div>
          <h1 className="font-semibold text-2xl text-primary">NCC Search</h1>
          <p className="text-muted-foreground">
            Search National Construction Code requirements relevant to this project
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search NCC clauses..." className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This feature is under development. You'll be able to search filtered NCC requirements here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Features will include:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Filtered NCC clauses based on building class and location</li>
            <li>State-specific variations automatically applied</li>
            <li>Quick reference to Australian Standards</li>
            <li>Bookmarks and favorites</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

