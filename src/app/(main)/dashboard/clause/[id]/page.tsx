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
  Code
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

interface ContentBlock {
  type: string;
  text?: string;
  html?: string;
  level?: number;
  items?: string[];
  rows?: string[][];
  ref?: string;
}

interface DocumentImage {
  id: string;
  filename: string;
  url: string;
  caption?: string;
  width?: number;
  height?: number;
}

interface RelatedDocument {
  id: string;
  sptc: string | null;
  title: string | null;
  doc_type: string;
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
    raw_xml: string | null;
  };
  edition: {
    id: string;
    name: string;
    volume: string;
  };
  content: ContentBlock[];
  images: {
    direct: DocumentImage[];
    related: DocumentImage[];
  };
  relatedDocuments: RelatedDocument[];
}

export default function ClauseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<DocumentImage | null>(null);
  const [activeTab, setActiveTab] = useState("content");

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
      } catch (e) {
        setError(e instanceof Error ? e.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchDocument();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading document...</p>
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

  const { document: doc, edition, content, images, relatedDocuments } = data;
  const allImages = [...images.direct, ...images.related.filter(
    ri => !images.direct.some(di => di.id === ri.id)
  )];

  return (
    <div className="container mx-auto max-w-5xl px-6 py-8">
      {/* Back Button */}
      <Link href="/dashboard">
        <Button variant="ghost" className="text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-amber-500" />
          {doc.sptc && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-mono text-lg px-3 py-1">
              {doc.sptc}
            </Badge>
          )}
          <Badge variant="secondary" className="bg-slate-800 text-slate-400 capitalize">
            {doc.doc_type}
          </Badge>
          {doc.jurisdiction && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {doc.jurisdiction}
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {doc.title || "Untitled Document"}
        </h1>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>{edition.name}</span>
          {edition.volume && (
            <>
              <span>•</span>
              <span>{edition.volume}</span>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="content" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <BookOpen className="mr-2 h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="images" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <ImageIcon className="mr-2 h-4 w-4" />
            Images ({allImages.length})
          </TabsTrigger>
          <TabsTrigger value="xml" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400">
            <Code className="mr-2 h-4 w-4" />
            Raw XML
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          {content.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No parsed content available</p>
                <p className="text-sm text-slate-500 mt-2">Check the Raw XML tab for the full document</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="py-6 space-y-4">
                {content.map((block, index) => (
                  <ContentBlockRenderer key={index} block={block} />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Related Documents */}
          {relatedDocuments.length > 0 && (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-500" />
                  Related Clauses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {relatedDocuments.slice(0, 6).map((related) => (
                    <Link
                      key={related.id}
                      href={`/dashboard/clause/${related.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {related.sptc && (
                          <Badge variant="outline" className="bg-slate-700/50 text-slate-300 border-slate-600 font-mono shrink-0">
                            {related.sptc}
                          </Badge>
                        )}
                        <span className="text-sm text-slate-400 truncate">
                          {related.title || related.doc_type}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-amber-500 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Images Tab */}
        <TabsContent value="images">
          {allImages.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="py-12 text-center">
                <ImageIcon className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No images found for this document</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  className="group relative aspect-square rounded-xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{image.filename}</p>
                    {image.caption && (
                      <p className="text-xs text-slate-400 truncate">{image.caption}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Raw XML Tab */}
        <TabsContent value="xml">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="border-b border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-400 font-mono">
                  {doc.xml_basename}
                </CardTitle>
                <Badge variant="outline" className="text-slate-500 border-slate-700">
                  {doc.root_tag}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <pre className="p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">
                  {doc.raw_xml || "No raw XML available"}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-5xl bg-slate-900 border-slate-700 p-0">
          <DialogTitle className="sr-only">
            {selectedImage?.filename || "Image"}
          </DialogTitle>
          {selectedImage && (
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

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="text-2xl font-bold text-white border-b border-slate-700 pb-2">
          {block.text}
        </h2>
      );

    case "summary":
      return (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-200">{block.text}</p>
        </div>
      );

    case "paragraph":
      return (
        <p className="text-slate-300 leading-relaxed">{block.text}</p>
      );

    case "list":
      return (
        <div className="flex gap-3">
          <List className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <ul className="list-disc list-inside space-y-1">
            {block.items?.map((item, i) => (
              <li key={i} className="text-slate-300">{item}</li>
            ))}
          </ul>
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto">
          <div className="flex items-center gap-2 mb-2">
            <Table className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-slate-500">Table</span>
          </div>
          <table className="w-full border-collapse">
            <tbody>
              {block.rows?.map((row, ri) => (
                <tr key={ri} className={ri === 0 ? "bg-slate-800" : "border-t border-slate-700"}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`p-2 text-sm ${ri === 0 ? "font-medium text-white" : "text-slate-300"}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "note":
      return (
        <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <StickyNote className="h-5 w-5 text-blue-400 shrink-0" />
          <p className="text-blue-200 text-sm">{block.text}</p>
        </div>
      );

    case "image_reference":
      return (
        <div className="flex items-center gap-2 p-2 rounded bg-slate-800/50 text-sm">
          <ImageIcon className="h-4 w-4 text-slate-500" />
          <span className="text-slate-400 font-mono">{block.ref}</span>
        </div>
      );

    default:
      return null;
  }
}

