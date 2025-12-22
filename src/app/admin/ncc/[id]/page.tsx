"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { 
  ArrowLeft, 
  Upload, 
  Play, 
  Search, 
  Globe, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Loader2,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getEdition, getJobs, deleteEdition, publishEdition } from "@/lib/actions/ncc";
import type { NCCEdition, NCCIngestionJob } from "@/types/ncc.types";

const statusColors: Record<string, string> = {
  draft: "bg-yellow-500/10 text-yellow-500",
  parsed: "bg-blue-500/10 text-blue-500",
  indexed: "bg-purple-500/10 text-purple-500",
  published: "bg-green-500/10 text-green-500",
  archived: "bg-gray-500/10 text-gray-500",
};

const jobStatusIcons: Record<string, React.ReactNode> = {
  queued: <Clock className="h-4 w-4 text-yellow-500" />,
  running: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  partial: <RefreshCw className="h-4 w-4 text-orange-500" />,
};

export default function EditionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const editionId = params.id as string;

  const [edition, setEdition] = useState<NCCEdition | null>(null);
  const [jobs, setJobs] = useState<NCCIngestionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [editionResult, jobsResult] = await Promise.all([
      getEdition(editionId),
      getJobs(editionId),
    ]);

    if (editionResult.edition) {
      setEdition(editionResult.edition);
    }
    if (jobsResult.jobs) {
      setJobs(jobsResult.jobs);
    }
    setLoading(false);
  }, [editionId]);

  useEffect(() => {
    loadData();
    // Poll for updates when there's an active job
    const interval = setInterval(() => {
      if (jobs.some((j) => j.status === "running" || j.status === "partial")) {
        loadData();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loadData, jobs]);

  const handleParse = async () => {
    setActionLoading("parse");
    try {
      const response = await fetch(`/api/admin/ncc/${editionId}/parse`, {
        method: "POST",
      });
      const result = await response.json();

      if (result.error) {
        toast.error("Parse failed", { description: result.error });
      } else if (result.status === "partial") {
        toast.info("Parsing in progress...", { 
          description: `Processed ${result.filesProcessed}/${result.filesTotal} files. Click Parse again to continue.` 
        });
      } else {
        toast.success("Parse complete!", {
          description: `Processed ${result.filesProcessed} files`,
        });
      }
      loadData();
    } catch (error) {
      toast.error("Parse failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleIndex = async () => {
    setActionLoading("index");
    try {
      const response = await fetch(`/api/admin/ncc/${editionId}/index`, {
        method: "POST",
      });
      const result = await response.json();

      if (result.error) {
        toast.error("Index failed", { description: result.error });
      } else {
        toast.success("Index complete!", {
          description: `Indexed ${result.nodesIndexed} nodes`,
        });
      }
      loadData();
    } catch (error) {
      toast.error("Index failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async () => {
    setActionLoading("publish");
    try {
      const result = await publishEdition(editionId);

      if (result.error) {
        toast.error("Publish failed", { description: result.error });
      } else {
        toast.success("Edition published!", {
          description: "This edition is now active for new projects",
        });
      }
      loadData();
    } catch (error) {
      toast.error("Publish failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    setActionLoading("delete");
    try {
      const result = await deleteEdition(editionId);

      if (result.error) {
        toast.error("Delete failed", { description: result.error });
      } else {
        toast.success("Edition deleted");
        router.push("/admin/ncc");
      }
    } catch (error) {
      toast.error("Delete failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="space-y-6">
        <Link href="/admin/ncc">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editions
          </Button>
        </Link>
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-500">Edition not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestParseJob = jobs.find((j) => j.job_type === "PARSE");
  const canParse = edition.status === "draft" || latestParseJob?.status === "partial";
  const canIndex = edition.status === "parsed";
  const canPublish = edition.status === "indexed" || edition.status === "parsed";
  const canDelete = edition.status !== "published";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/ncc">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Editions
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-2xl">{edition.name}</h1>
              <Badge variant="outline">{edition.kind}</Badge>
              <Badge className={statusColors[edition.status]}>
                {edition.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Effective: {new Date(edition.effective_date).toLocaleDateString()}
              {edition.jurisdiction && ` • ${edition.jurisdiction}`}
            </p>
          </div>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={actionLoading === "delete"}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Edition?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this edition and all its parsed content.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{edition.node_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Edges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{edition.edge_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{edition.term_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{jobs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ingestion Pipeline</CardTitle>
          <CardDescription>
            Upload NCC XML files, parse, index, and publish
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Upload - Disabled for now, using sample data */}
            <Button variant="outline" disabled>
              <Upload className="mr-2 h-4 w-4" />
              Upload ZIP
              <span className="ml-2 text-xs">(Coming soon)</span>
            </Button>

            {/* Parse */}
            <Button 
              onClick={handleParse} 
              disabled={!canParse || actionLoading === "parse"}
              variant={latestParseJob?.status === "partial" ? "default" : "outline"}
            >
              {actionLoading === "parse" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {latestParseJob?.status === "partial" ? "Continue Parse" : "Parse XML"}
            </Button>

            {/* Index */}
            <Button 
              onClick={handleIndex} 
              disabled={!canIndex || actionLoading === "index"}
              variant="outline"
            >
              {actionLoading === "index" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Build Index
            </Button>

            {/* Publish */}
            <Button 
              onClick={handlePublish} 
              disabled={!canPublish || actionLoading === "publish"}
            >
              {actionLoading === "publish" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              Publish
            </Button>
          </div>

          {/* Progress for partial parse */}
          {latestParseJob?.status === "partial" && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Parse Progress</span>
                <span>{latestParseJob.files_processed}/{latestParseJob.files_total} files</span>
              </div>
              <Progress value={latestParseJob.progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Job History</CardTitle>
          <CardDescription>Recent ingestion jobs for this edition</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No jobs yet</p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="mt-0.5">
                      {jobStatusIcons[job.status]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{job.job_type}</span>
                        <Badge variant="outline" className="text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Started: {job.started_at ? new Date(job.started_at).toLocaleString() : "N/A"}
                        {job.finished_at && (
                          <> • Finished: {new Date(job.finished_at).toLocaleString()}</>
                        )}
                      </div>
                      {job.logs && (
                        <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {job.logs.slice(-500)}
                        </pre>
                      )}
                      {job.error && (
                        <pre className="mt-2 text-xs bg-red-500/10 text-red-500 p-2 rounded overflow-x-auto">
                          {JSON.stringify(job.error, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


