"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  FileText, 
  Loader2, 
  BookOpen, 
  ImageIcon, 
  X, 
  ChevronRight,
  AlertCircle,
  List,
  Table,
  StickyNote,
  Code,
  Sparkles,
  CheckCircle2,
  Target,
  Users,
  Lightbulb,
  AlertTriangle,
  Info,
  Calendar,
  MapPin,
  Hash,
  Layers,
  ExternalLink,
  ZoomIn
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface ParsedBlock {
  type: string;
  text?: string;
  html?: string;
  level?: number;
  items?: ParsedBlock[];
  rows?: string[][];
  headers?: string[];
  noteType?: string;
}

interface ParsedSection {
  id: string;
  title: string;
  level: number;
  content: ParsedBlock[];
}

interface DocumentImage {
  ref?: string;
  filename: string;
  url?: string | null;
  caption?: string;
  id?: string;
  width?: number;
  height?: number;
}

interface RelatedDocument {
  id: string;
  sptc: string | null;
  title: string | null;
  doc_type: string;
  jurisdiction: string | null;
}

interface ParsedData {
  title: string;
  shortDescription: string;
  objectives: string[];
  functionalStatements: string[];
  performanceRequirements: string[];
  sections: ParsedSection[];
  images: DocumentImage[];
  notes: ParsedBlock[];
  tables: ParsedBlock[];
  references: string[];
  metadata: Record<string, string>;
}

interface DocumentData {
  document: {
    id: string;
    doc_type: string;
    sptc: string | null;
    title: string | null;
    archive_num: string | null;
    jurisdiction: string | null;
    xml_basename: string;
    root_tag: string;
    outputclass: string | null;
  };
  edition: {
    id: string;
    name: string;
    effective_date: string;
    jurisdiction: string | null;
    volume: string;
  } | null;
  parsed: ParsedData;
  raw_xml: string;
  relatedDocuments: RelatedDocument[];
}

interface AISummary {
  summary: string;
  key_requirements: string[];
  applies_to: string[];
  related_topics: string[];
  compliance_notes: string[];
  importance: "critical" | "high" | "medium" | "low";
}

export default function ClauseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<DocumentImage | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    async function fetchDocument() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/ncc/document/${id}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch document");
        }
        const json = await res.json();
        setData(json);
        
        // Fetch AI summary
        fetchAISummary();
      } catch (e) {
        setError(e instanceof Error ? e.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    
    async function fetchAISummary() {
      setAiLoading(true);
      try {
        const res = await fetch(`/api/ncc/document/${id}/summary`);
        const json = await res.json();
        if (json.summary) {
          setAiSummary(json.summary);
        }
      } catch (e) {
        console.error("Failed to fetch AI summary:", e);
      } finally {
        setAiLoading(false);
      }
    }
    
    fetchDocument();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl px-6 py-8">
        <Skeleton className="h-8 w-32 mb-6 bg-slate-800" />
        <Skeleton className="h-12 w-3/4 mb-4 bg-slate-800" />
        <Skeleton className="h-6 w-1/2 mb-8 bg-slate-800" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 bg-slate-800" />
            <Skeleton className="h-32 bg-slate-800" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto max-w-4xl px-6 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" className="text-slate-400 hover:text-white mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Search
          </Button>
        </Link>
        <Card className="bg-red-900/20 border-red-500/30">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Document Not Found</h2>
            <p className="text-slate-400">{error || "The document you're looking for doesn't exist."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { document: doc, edition, parsed, raw_xml, relatedDocuments } = data;
  const validImages = parsed.images.filter(img => img.url);

  const importanceBadge = {
    critical: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Critical" },
    high: { color: "bg-orange-500/20 text-orange-400 border-orange-500/30", label: "High Priority" },
    medium: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "Medium Priority" },
    low: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Standard" },
  };

  return (
    <div className="container mx-auto max-w-6xl px-6 py-8">
      {/* Back Button */}
      <Link href="/dashboard">
        <Button variant="ghost" className="text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {doc.sptc && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-mono text-xl px-4 py-1.5">
              {doc.sptc}
            </Badge>
          )}
          <Badge variant="secondary" className="bg-slate-800 text-slate-400 capitalize">
            {doc.doc_type}
          </Badge>
          {doc.jurisdiction && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              <MapPin className="mr-1 h-3 w-3" />
              {doc.jurisdiction}
            </Badge>
          )}
          {aiSummary && (
            <Badge className={importanceBadge[aiSummary.importance].color}>
              {importanceBadge[aiSummary.importance].label}
            </Badge>
          )}
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
          {doc.title || parsed.title || "Untitled Document"}
        </h1>
        
        {parsed.shortDescription && (
          <p className="text-lg text-slate-400 mb-4 max-w-3xl">
            {parsed.shortDescription}
          </p>
        )}
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          {edition && (
            <>
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {edition.name}
              </span>
              {edition.volume && (
                <span className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  {edition.volume}
                </span>
              )}
              {edition.effective_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(edition.effective_date).toLocaleDateString()}
                </span>
              )}
            </>
          )}
          {doc.archive_num && (
            <span className="flex items-center gap-1">
              <Hash className="h-4 w-4" />
              {doc.archive_num}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Summary Card */}
          <Card className="bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-slate-900/50 border-purple-500/30 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-purple-300">
                <Sparkles className="h-5 w-5" />
                AI Analysis
                {aiLoading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 bg-purple-900/30" />
                  <Skeleton className="h-24 bg-purple-900/30" />
                </div>
              ) : aiSummary ? (
                <>
                  <p className="text-slate-300 leading-relaxed">
                    {aiSummary.summary}
                  </p>
                  
                  {aiSummary.key_requirements.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-purple-300 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Key Requirements
                      </h4>
                      <ul className="space-y-1.5">
                        {aiSummary.key_requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                            <span className="text-purple-400 mt-1">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {aiSummary.applies_to.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-purple-300 mb-2 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          Applies To
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {aiSummary.applies_to.map((item, i) => (
                            <Badge key={i} variant="secondary" className="bg-purple-500/10 text-purple-300 border-purple-500/20 text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {aiSummary.related_topics.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-purple-300 mb-2 flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Related Topics
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {aiSummary.related_topics.map((topic, i) => (
                            <Badge key={i} variant="secondary" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {aiSummary.compliance_notes.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-3">
                      <h4 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Compliance Tips
                      </h4>
                      <ul className="space-y-1">
                        {aiSummary.compliance_notes.map((note, i) => (
                          <li key={i} className="text-sm text-amber-200/80 flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">→</span>
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-500 text-sm">AI analysis unavailable</p>
              )}
            </CardContent>
          </Card>

          {/* Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-slate-900 border border-slate-800 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                Overview
              </TabsTrigger>
              <TabsTrigger value="content" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                Full Content
              </TabsTrigger>
              <TabsTrigger value="xml" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
                <Code className="mr-1 h-3 w-3" />
                XML
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              {/* Objectives */}
              {parsed.objectives.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Target className="h-5 w-5 text-green-500" />
                      Objectives
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {parsed.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Functional Statements */}
              {parsed.functionalStatements.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      Functional Statements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {parsed.functionalStatements.map((fs, i) => (
                        <li key={i} className="text-slate-300 pl-4 border-l-2 border-blue-500/30">
                          {fs}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Performance Requirements */}
              {parsed.performanceRequirements.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Performance Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {parsed.performanceRequirements.map((pr, i) => (
                        <li key={i} className="text-slate-300 pl-4 border-l-2 border-orange-500/30">
                          {pr}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {parsed.notes.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Info className="h-5 w-5 text-cyan-500" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {parsed.notes.map((note, i) => (
                      <div key={i} className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <p className="text-cyan-200 text-sm">{note.text}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Tables */}
              {parsed.tables.length > 0 && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Table className="h-5 w-5 text-purple-500" />
                      Tables
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {parsed.tables.map((table, i) => (
                      <div key={i} className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          {table.headers && table.headers.length > 0 && (
                            <thead>
                              <tr className="bg-slate-800">
                                {table.headers.map((h, hi) => (
                                  <th key={hi} className="p-2 text-left font-medium text-white border border-slate-700">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {table.rows?.map((row, ri) => (
                              <tr key={ri} className="border-b border-slate-800">
                                {row.map((cell, ci) => (
                                  <td key={ci} className="p-2 text-slate-300 border border-slate-700">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              {Object.keys(parsed.metadata).length > 0 && (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <Hash className="h-5 w-5 text-slate-500" />
                      Metadata
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(parsed.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between p-2 rounded bg-slate-800/50">
                          <span className="text-slate-500">{key}:</span>
                          <span className="text-slate-300 font-mono">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Full Content Tab */}
            <TabsContent value="content" className="space-y-4">
              {parsed.sections.length === 0 ? (
                <Card className="bg-slate-900/50 border-slate-800">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No structured content available</p>
                    <p className="text-sm text-slate-500 mt-2">Check the XML tab for raw content</p>
                  </CardContent>
                </Card>
              ) : (
                parsed.sections.map((section, si) => (
                  <Card key={si} className="bg-slate-900/50 border-slate-800">
                    {section.title && (
                      <CardHeader className="pb-2 border-b border-slate-800">
                        <CardTitle className="text-lg text-white">
                          {section.title}
                        </CardTitle>
                      </CardHeader>
                    )}
                    <CardContent className="py-4 space-y-3">
                      {section.content.map((block, bi) => (
                        <ContentBlockRenderer key={bi} block={block} />
                      ))}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* XML Tab */}
            <TabsContent value="xml">
              <Card className="bg-slate-900/50 border-slate-800">
                <CardHeader className="border-b border-slate-800 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400 font-mono">
                      {doc.xml_basename}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-slate-500 border-slate-700">
                        {doc.root_tag}
                      </Badge>
                      {doc.outputclass && (
                        <Badge variant="outline" className="text-slate-500 border-slate-700">
                          {doc.outputclass}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[500px]">
                    <pre className="p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
                      {raw_xml || "No raw XML available"}
                    </pre>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Images */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-amber-500" />
                  Images
                </span>
                <Badge variant="secondary" className="bg-slate-800 text-slate-400">
                  {validImages.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {validImages.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-8 w-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No images found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {validImages.map((image, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(image)}
                      className="group relative aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 hover:border-amber-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    >
                      <img
                        src={image.url!}
                        alt={image.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white" />
                      </div>
                      {image.caption && (
                        <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-[10px] text-white truncate">{image.caption}</p>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Clauses */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-500" />
                Related Clauses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {relatedDocuments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No related clauses</p>
              ) : (
                <div className="space-y-2">
                  {relatedDocuments.map((related) => (
                    <Link
                      key={related.id}
                      href={`/dashboard/clause/${related.id}`}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          {related.sptc && (
                            <Badge variant="outline" className="bg-slate-700/50 text-amber-400 border-slate-600 font-mono text-xs shrink-0">
                              {related.sptc}
                            </Badge>
                          )}
                          {related.jurisdiction && (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">
                              {related.jurisdiction}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {related.title || related.doc_type}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-amber-500 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* References */}
          {parsed.references.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-amber-500" />
                  References
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {parsed.references.slice(0, 10).map((ref, i) => (
                    <div key={i} className="text-xs text-slate-500 font-mono p-1.5 rounded bg-slate-800/50 truncate">
                      {ref.split("/").pop()}
                    </div>
                  ))}
                  {parsed.references.length > 10 && (
                    <p className="text-xs text-slate-600 text-center pt-1">
                      +{parsed.references.length - 10} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl bg-slate-900 border-slate-700 p-0">
          <DialogTitle className="sr-only">
            {selectedImage?.filename || "Image"}
          </DialogTitle>
          {selectedImage && selectedImage.url && (
            <div className="relative">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={selectedImage.url}
                alt={selectedImage.filename}
                className="w-full h-auto max-h-[85vh] object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm font-mono">{selectedImage.filename}</p>
                {selectedImage.caption && (
                  <p className="text-slate-400 text-sm mt-1">{selectedImage.caption}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ContentBlockRenderer({ block }: { block: ParsedBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-slate-300 leading-relaxed">{block.text}</p>
      );

    case "ordered-list":
    case "unordered-list":
      const ListTag = block.type === "ordered-list" ? "ol" : "ul";
      return (
        <ListTag className={`space-y-1 ${block.type === "ordered-list" ? "list-decimal" : "list-disc"} list-inside`}>
          {block.items?.map((item, i) => (
            <li key={i} className="text-slate-300">{item.text}</li>
          ))}
        </ListTag>
      );

    case "definition-list":
      return (
        <dl className="space-y-2">
          {block.items?.map((item, i) => (
            <div key={i} className="border-l-2 border-amber-500/30 pl-3">
              <dt className="font-medium text-white">{item.text}</dt>
              <dd className="text-slate-400 text-sm">{item.html}</dd>
            </div>
          ))}
        </dl>
      );

    default:
      return null;
  }
}
