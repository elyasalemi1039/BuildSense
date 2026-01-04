"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Search, Filter, BookOpen, FileText, Loader2, Sparkles, ChevronDown, ImageIcon, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface Edition {
  id: string;
  name: string;
  effective_date: string;
  jurisdiction: string | null;
}

interface SearchResult {
  id: string;
  doc_type: string;
  sptc: string | null;
  title: string | null;
  jurisdiction: string | null;
  edition_name: string;
  edition_id: string;
  relevance_score?: number;
}

interface AIInsight {
  summary: string;
  key_points: string[];
  related_clauses: string[];
}

interface NCCImage {
  id: string;
  filename: string;
  url: string;
}

export default function NCCSearchPage() {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [images, setImages] = useState<NCCImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<NCCImage | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);

  // Load editions on mount
  useEffect(() => {
    async function loadEditions() {
      try {
        const res = await fetch("/api/ncc/editions");
        const data = await res.json();
        if (data.editions) {
          setEditions(data.editions);
        }
      } catch (e) {
        console.error("Failed to load editions:", e);
      }
    }
    loadEditions();
  }, []);

  const loadImages = useCallback(async (editionId: string) => {
    if (!editionId || editionId === "all") {
      setImages([]);
      return;
    }
    
    setImagesLoading(true);
    try {
      const res = await fetch(`/api/ncc/images?edition=${editionId}&limit=12`);
      const data = await res.json();
      if (data.images) {
        setImages(data.images);
      }
    } catch (e) {
      console.error("Failed to load images:", e);
    } finally {
      setImagesLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() && selectedEdition === "all" && docTypeFilter === "all") {
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setAiInsight(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (selectedEdition !== "all") params.set("edition", selectedEdition);
      if (docTypeFilter !== "all") params.set("doc_type", docTypeFilter);

      const res = await fetch(`/api/ncc/search?${params.toString()}`);
      const data = await res.json();
      
      if (data.results) {
        setResults(data.results);
        
        // Get AI insight if we have a search query and results
        if (searchQuery.trim() && data.results.length > 0) {
          getAIInsight(searchQuery, data.results.slice(0, 5));
        }
        
        // Load images for the first result's edition, or selected edition
        const targetEdition = selectedEdition !== "all" ? selectedEdition : data.results[0]?.edition_id;
        if (targetEdition) {
          loadImages(targetEdition);
        }
      }
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedEdition, docTypeFilter, loadImages]);

  const getAIInsight = async (query: string, topResults: SearchResult[]) => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ncc/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, results: topResults }),
      });
      const data = await res.json();
      if (data.insight) {
        setAiInsight(data.insight);
      }
    } catch (e) {
      console.error("AI insight failed:", e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          Search the{" "}
          <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            National Construction Code
          </span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Find clauses, specifications, and requirements across all NCC editions. 
          Powered by AI for intelligent search results.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <Input
              type="text"
              placeholder="Search clauses, specifications, fire safety, waterproofing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-14 pl-12 pr-4 text-lg bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="h-14 px-8 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/20"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Search
              </>
            )}
          </Button>
        </div>

        {/* Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <Filter className="mr-2 h-4 w-4" />
              Filters
              <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <div className="space-y-2">
                <label className="text-sm text-slate-400">Edition</label>
                <Select value={selectedEdition} onValueChange={setSelectedEdition}>
                  <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="All editions" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">All editions</SelectItem>
                    {editions.map((edition) => (
                      <SelectItem key={edition.id} value={edition.id} className="text-white">
                        {edition.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-slate-400">Document Type</label>
                <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                  <SelectTrigger className="w-[200px] bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all" className="text-white">All types</SelectItem>
                    <SelectItem value="clause" className="text-white">Clauses</SelectItem>
                    <SelectItem value="specification" className="text-white">Specifications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* AI Insight Card */}
      {(aiLoading || aiInsight) && (
        <Card className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-purple-500/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              <span className="font-semibold text-purple-300">AI Insight</span>
              {aiLoading && <Loader2 className="h-4 w-4 animate-spin text-purple-400" />}
            </div>
          </CardHeader>
          {aiInsight && (
            <CardContent className="space-y-4">
              <p className="text-slate-300">{aiInsight.summary}</p>
              {aiInsight.key_points.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-purple-300 mb-2">Key Points</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                    {aiInsight.key_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiInsight.related_clauses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {aiInsight.related_clauses.map((clause, i) => (
                    <Badge key={i} variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      {clause}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              {loading ? "Searching..." : `${results.length} result${results.length !== 1 ? "s" : ""} found`}
            </h2>
          </div>

          {results.length === 0 && !loading ? (
            <Card className="bg-slate-900/50 border-slate-800">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-400 mb-2">No results found</h3>
                <p className="text-sm text-slate-500">
                  Try adjusting your search terms or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map((result) => (
                <Card 
                  key={result.id} 
                  className="bg-slate-900/50 border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-amber-500" />
                          {result.sptc && (
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-mono">
                              {result.sptc}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="bg-slate-800 text-slate-400 capitalize">
                            {result.doc_type}
                          </Badge>
                          {result.jurisdiction && (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                              {result.jurisdiction}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium text-white group-hover:text-amber-400 transition-colors line-clamp-2">
                          {result.title || "Untitled"}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {result.edition_name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Images Gallery */}
      {hasSearched && images.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-amber-500" />
              <span className="font-semibold text-white">Related Images</span>
              {imagesLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              <Badge variant="secondary" className="bg-slate-800 text-slate-400 ml-auto">
                {images.length} images
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {images.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(image)}
                  className="aspect-square rounded-lg overflow-hidden bg-slate-800 border border-slate-700 hover:border-amber-500/50 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 p-0">
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
                className="w-full h-auto max-h-[80vh] object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm font-mono">{selectedImage.filename}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty State - Before Search */}
      {!hasSearched && (
        <div className="text-center py-16">
          <div className="flex justify-center gap-4 mb-8">
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800">
              <BookOpen className="h-8 w-8 text-amber-500" />
            </div>
          </div>
          <h3 className="text-xl font-medium text-slate-400 mb-4">
            Start searching to explore the NCC
          </h3>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            {["Fire safety", "Waterproofing", "Structural", "Energy efficiency", "Accessibility"].map((term) => (
              <Button
                key={term}
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery(term);
                  setTimeout(handleSearch, 100);
                }}
                className="border-slate-700 text-slate-400 hover:text-white hover:border-amber-500"
              >
                {term}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

