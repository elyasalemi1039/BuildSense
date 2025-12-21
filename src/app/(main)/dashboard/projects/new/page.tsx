"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/lib/actions/projects";

const FormSchema = z.object({
  name: z.string().min(3, { message: "Project name must be at least 3 characters." }),
  address: z.string().optional(),
  building_class: z.string().optional(),
  building_type: z.string().optional(),
  description: z.string().optional(),
});

const buildingClasses = [
  { value: "class_1a", label: "Class 1a - Single dwelling" },
  { value: "class_1b", label: "Class 1b - Boarding house, guest house" },
  { value: "class_2", label: "Class 2 - Apartment building" },
  { value: "class_3", label: "Class 3 - Residential building (hotel, motel)" },
  { value: "class_4", label: "Class 4 - Dwelling in another class" },
  { value: "class_5", label: "Class 5 - Office building" },
  { value: "class_6", label: "Class 6 - Shop or retail" },
  { value: "class_7", label: "Class 7 - Warehouse or storage" },
  { value: "class_8", label: "Class 8 - Laboratory or factory" },
  { value: "class_9a", label: "Class 9a - Health care" },
  { value: "class_9b", label: "Class 9b - Assembly building" },
  { value: "class_9c", label: "Class 9c - Aged care" },
  { value: "class_10a", label: "Class 10a - Garage, carport, shed" },
  { value: "class_10b", label: "Class 10b - Pool, fence, retaining wall" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      address: "",
      building_class: "",
      building_type: "",
      description: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    setIsLoading(true);

    try {
      const result = await createProject(values);

      if (result?.error) {
        toast.error("Failed to create project", {
          description: result.error,
        });
        setIsLoading(false);
      } else {
        toast.success("Project created!", {
          description: "Your project has been created successfully.",
        });
        router.push("/dashboard/projects");
      }
    } catch (error) {
      console.error("Create project error:", error);
      toast.error("Something went wrong", {
        description: "Please try again later.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </Link>
        <div>
          <h1 className="font-semibold text-2xl text-primary">Create New Project</h1>
          <p className="text-muted-foreground">Add a new building project to track compliance</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Enter the basic information about your building project</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Residential Development - Parramatta" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription>A descriptive name for your project</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="45 George St, Parramatta NSW 2150" disabled={isLoading} {...field} />
                    </FormControl>
                    <FormDescription>The site address of the project</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="building_class"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Building Class</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select building class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {buildingClasses.map((cls) => (
                          <SelectItem key={cls.value} value={cls.value}>
                            {cls.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>NCC building classification</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details about the project..."
                        className="min-h-[100px]"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Project"}
                </Button>
                <Link href="/dashboard/projects">
                  <Button type="button" variant="outline" disabled={isLoading}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

