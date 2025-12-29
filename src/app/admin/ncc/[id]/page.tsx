"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Trash2,
  FileArchive,
  X,
  Plus
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  uploaded: "bg-blue-500/10 text-blue-500",
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

const NCC_VOLUMES = [
  { value: "volume_one", label: "Volume One", description: "Class 2-9 buildings" },
  { value: "volume_two", label: "Volume Two", description: "Class 1 and 10 buildings" },
  { value: "volume_three", label: "Volume Three", description: "Plumbing and Drainage" },
  { value: "housing_provisions", label: "Housing Provisions", description: "Combined Class 1 and 10" },
];

interface FileWithVolume {
  id: string;
  file: File;
  volume: string;
  status: "pending" | "uploading" | "uploaded" | "error";
  progress: number;
  objectKey?: string;
}

export default function EditionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const editionId = params.id as string;

  const [edition, setEdition] = useState<NCCEdition | null>(null);
  const [jobs, setJobs] = useState<NCCIngestionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<FileWithVolume[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: FileWithVolume[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.name.endsWith(".zip")) {
        toast.error(`Invalid file: ${file.name}`, { description: "Only ZIP files are allowed" });
        continue;
      }

      // Validate file size (max 500MB per file)
      if (file.size > 500 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}`, { description: "Maximum 500MB per file" });
        continue;
      }

      // Try to detect volume from filename
      let detectedVolume = "";
      const lowerName = file.name.toLowerCase();
      if (lowerName.includes("volume-one") || lowerName.includes("volume_one") || lowerName.includes("vol1") || lowerName.includes("volume1")) {
        detectedVolume = "volume_one";
      } else if (lowerName.includes("volume-two") || lowerName.includes("volume_two") || lowerName.includes("vol2") || lowerName.includes("volume2")) {
        detectedVolume = "volume_two";
      } else if (lowerName.includes("volume-three") || lowerName.includes("volume_three") || lowerName.includes("vol3") || lowerName.includes("volume3")) {
        detectedVolume = "volume_three";
      } else if (lowerName.includes("housing")) {
        detectedVolume = "housing_provisions";
      }

      newFiles.push({
        id: crypto.randomUUID(),
        file,
        volume: detectedVolume,
        status: "pending",
        progress: 0,
      });
    }

    setFilesToUpload(prev => [...prev, ...newFiles]);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const updateFileVolume = (fileId: string, volume: string) => {
    setFilesToUpload(prev => 
      prev.map(f => f.id === fileId ? { ...f, volume } : f)
    );
  };

  const removeFile = (fileId: string) => {
    setFilesToUpload(prev => prev.filter(f => f.id !== fileId));
  };

  const uploadAllFiles = async () => {
    // Validate all files have volumes assigned
    const unassigned = filesToUpload.filter(f => !f.volume);
    if (unassigned.length > 0) {
      toast.error("Please assign volumes to all files", {
        description: `${unassigned.length} file(s) don't have a volume selected`,
      });
      return;
    }

    setIsUploading(true);

    for (const fileItem of filesToUpload) {
      if (fileItem.status === "uploaded") continue;

      try {
        // Update status to uploading
        setFilesToUpload(prev => 
          prev.map(f => f.id === fileItem.id ? { ...f, status: "uploading", progress: 10 } : f)
        );

        // Step 1: Get presigned URL
        const urlResponse = await fetch(`/api/admin/ncc/${editionId}/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            fileName: fileItem.file.name,
            contentType: "application/zip",
            fileSize: fileItem.file.size,
            volume: fileItem.volume,
          }),
        });
        
        const urlResult = await urlResponse.json();
        if (urlResult.error) {
          throw new Error(urlResult.error);
        }

        // Check if R2 is configured (dev mode)
        if (urlResult.devMode || !urlResult.uploadUrl) {
          setFilesToUpload(prev => 
            prev.map(f => f.id === fileItem.id ? { 
              ...f, 
              status: "uploaded", 
              progress: 100,
              objectKey: urlResult.objectKey 
            } : f)
          );
          continue;
        }

        // Step 2: Upload to R2
        setFilesToUpload(prev => 
          prev.map(f => f.id === fileItem.id ? { ...f, progress: 30 } : f)
        );

        const uploadResponse = await fetch(urlResult.uploadUrl, {
          method: "PUT",
          body: fileItem.file,
          headers: {
            "Content-Type": "application/zip",
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status}`);
        }

        // Step 3: Confirm upload
        setFilesToUpload(prev => 
          prev.map(f => f.id === fileItem.id ? { ...f, progress: 80 } : f)
        );

        await fetch(`/api/admin/ncc/${editionId}/upload-confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            objectKey: urlResult.objectKey,
            fileSize: fileItem.file.size,
            volume: fileItem.volume,
          }),
        });

        // Mark as uploaded
        setFilesToUpload(prev => 
          prev.map(f => f.id === fileItem.id ? { 
            ...f, 
            status: "uploaded", 
            progress: 100,
            objectKey: urlResult.objectKey 
          } : f)
        );

      } catch (error) {
        console.error("Upload error:", error);
        setFilesToUpload(prev => 
          prev.map(f => f.id === fileItem.id ? { ...f, status: "error", progress: 0 } : f)
        );
        toast.error(`Failed to upload ${fileItem.file.name}`, {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    setIsUploading(false);
    loadData();
    
    const successCount = filesToUpload.filter(f => f.status === "uploaded").length;
    if (successCount > 0) {
      toast.success(`${successCount} file(s) uploaded successfully`, {
        description: "You can now parse the XML files",
      });
    }
  };

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
  const canUpload = edition.status === "draft" || edition.status === "uploaded";
  const canParse = edition.status === "uploaded" || edition.status === "draft" || latestParseJob?.status === "partial";
  const canIndex = edition.status === "parsed";
  const canPublish = edition.status === "indexed" || edition.status === "parsed";
  const canDelete = edition.status !== "published";
  const hasUploadedFile = !!edition.source_r2_key;
  const pendingFiles = filesToUpload.filter(f => f.status === "pending");
  const allFilesUploaded = filesToUpload.length > 0 && filesToUpload.every(f => f.status === "uploaded");

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

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload NCC Files</CardTitle>
          <CardDescription>
            Upload ZIP files containing XML data for each NCC volume. Select the volume for each file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hidden file input for multi-select */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".zip"
            multiple
            className="hidden"
          />

          {/* Add Files Button */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={!canUpload || isUploading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add ZIP Files
            </Button>
            
            {filesToUpload.length > 0 && (
              <Button
                onClick={uploadAllFiles}
                disabled={isUploading || pendingFiles.length === 0 || pendingFiles.some(f => !f.volume)}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploading ? "Uploading..." : `Upload ${pendingFiles.length} File(s)`}
              </Button>
            )}
          </div>

          {/* Files List */}
          {filesToUpload.length > 0 && (
            <div className="space-y-3 mt-4">
              {filesToUpload.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    fileItem.status === "uploaded" 
                      ? "bg-green-500/5 border-green-500/20" 
                      : fileItem.status === "error"
                      ? "bg-red-500/5 border-red-500/20"
                      : "bg-muted/30"
                  }`}
                >
                  <FileArchive className={`h-8 w-8 flex-shrink-0 ${
                    fileItem.status === "uploaded" ? "text-green-500" : 
                    fileItem.status === "error" ? "text-red-500" : "text-muted-foreground"
                  }`} />
                  
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{fileItem.file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(fileItem.file.size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                      {fileItem.status === "uploaded" && (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Uploaded
                        </Badge>
                      )}
                      {fileItem.status === "error" && (
                        <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
                          <XCircle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      )}
                    </div>
                    
                    {fileItem.status === "uploading" && (
                      <Progress value={fileItem.progress} className="h-1" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={fileItem.volume || ""}
                      onValueChange={(value) => updateFileVolume(fileItem.id, value)}
                      disabled={fileItem.status !== "pending"}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select volume..." />
                      </SelectTrigger>
                      <SelectContent>
                        {NCC_VOLUMES.map((vol) => (
                          <SelectItem key={vol.value} value={vol.value}>
                            {vol.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {fileItem.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(fileItem.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Previously uploaded file */}
          {hasUploadedFile && filesToUpload.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <FileArchive className="h-4 w-4" />
              <span>Previously uploaded: {edition.source_r2_key?.split("/").pop()}</span>
              <Badge variant="outline" className="text-xs">Ready to parse</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ingestion Pipeline</CardTitle>
          <CardDescription>
            Parse uploaded XML files, build search index, and publish
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
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
