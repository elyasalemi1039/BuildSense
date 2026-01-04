import { BookOpen, Search } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-xl">Rules & Clauses</h2>
        <p className="text-muted-foreground">Search and reference NCC clauses relevant to this project</p>
      </div>

      <div className="relative">
        <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search NCC clauses (e.g., H2D2, fire safety, waterproofing)..." className="pl-9" />
      </div>

      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="mt-4">Search NCC Clauses</CardTitle>
          <CardDescription>
            Find relevant building code requirements for your project's classification and construction type
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <p className="text-sm text-muted-foreground">
            Start typing to search the National Construction Code
          </p>
        </CardContent>
      </Card>
    </div>
  );
}









