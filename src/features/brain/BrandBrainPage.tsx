import { useState } from "react";
import {
  AlertTriangle,
  Brain,
  Database,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  FileUp,
  Image as ImageIcon,
  Palette,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Type,
  UploadCloud,
} from "lucide-react";
import {
  useBrainDocuments,
  useBrainFacts,
  useBrainRules,
  useBrainVisuals,
} from "@/api/queries";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BrandBrainPage() {
  const brandId = "BRAND-ACME-01";
  const { data: docs, isLoading: docsLoading, refetch: refetchDocs } = useBrainDocuments(brandId);
  const { data: facts, isLoading: factsLoading, refetch: refetchFacts } = useBrainFacts(brandId);
  const { data: visuals, isLoading: visualsLoading } = useBrainVisuals(brandId);
  const { data: rules, isLoading: rulesLoading, refetch: refetchRules } = useBrainRules(brandId);

  const [activeTab, setActiveTab] = useState("rules");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState("brand_guidelines_pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Vector Search Tester State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Handle Document Upload
  const handleUpload = async () => {
    if (!selectedFile || !uploadTitle) {
      toast.error("Please provide a title and select a file.");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("brand_id", brandId);
    formData.append("title", uploadTitle);
    formData.append("document_type", uploadType);
    formData.append("file", selectedFile);

    try {
      await api.brain.upload(formData);
      toast.success("Document Ingested Successfully", {
        description: "Vector embeddings, facts, and rules compiled.",
      });
      setUploadModalOpen(false);
      setUploadTitle("");
      setSelectedFile(null);
      refetchDocs();
      refetchFacts();
      refetchRules();
    } catch (e: any) {
      toast.error("Upload failed: " + (e.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  // Handle Vector Search Test
  const handleSearch = async () => {
    if (!searchQuery) return;
    setSearching(true);
    try {
      const res = await api.brain.search(brandId, searchQuery);
      setSearchResults(res as any[]);
    } catch {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  };

  // Find any cross-document conflicts
  const conflicts = rules?.filter((r) => r.conflictStatus?.hasConflict) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Brand Brain & Knowledge Ingestion</h1>
            <span className="rounded-full bg-ai/15 px-2.5 py-0.5 text-xs font-semibold text-ai">
              Three Knowledge Stores Active
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Centralized repository for Vector Store (RAG), Fact Registry, Visual Asset Registry, and Versioned Rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setUploadModalOpen(true)}>
            <UploadCloud className="h-4 w-4" />
            Ingest Guidelines
          </Button>
        </div>
      </div>

      {/* Cross-Document Conflict Alert Banner */}
      {conflicts.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-rose-300">
                Cross-Document Rule Conflicts Detected ({conflicts.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                The conflict engine detected contradictory guidelines across your uploaded documents:
              </p>
              <ul className="list-disc pl-5 text-xs text-rose-200/90 space-y-0.5">
                {conflicts.map((c) => (
                  <li key={c.id}>
                    <span className="font-semibold">{c.name}:</span> {c.conflictStatus.details}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Knowledge Stores Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-surface border grid grid-cols-4 max-w-xl">
          <TabsTrigger value="rules" className="text-xs font-semibold">
            Rules Registry ({rules?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="facts" className="text-xs font-semibold">
            Fact Registry ({facts?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="visuals" className="text-xs font-semibold">
            Visual Assets ({visuals?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="vector" className="text-xs font-semibold">
            Vector Store (RAG)
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: RULES REGISTRY */}
        <TabsContent value="rules" className="space-y-4">
          <div className="rounded-xl border bg-surface overflow-hidden shadow-sm">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Compiled Governance Rules</h3>
                <p className="text-xs text-muted-foreground">
                  Versioned policies with strict source document citations.
                </p>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {rules?.length ?? 0} active rules
              </span>
            </div>

            <div className="divide-y divide-border">
              {rulesLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading rules...</div>
              ) : rules && rules.length > 0 ? (
                rules.map((rule) => {
                  const sevColor =
                    rule.severity === "critical"
                      ? "bg-rose-500/20 text-rose-400"
                      : rule.severity === "high"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-purple-500/20 text-purple-400";

                  return (
                    <div key={rule.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-2/40 transition-colors">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground bg-surface-2 border px-2 py-0.5 rounded">
                            {rule.id}
                          </span>
                          <span className={cn("rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", sevColor)}>
                            {rule.severity}
                          </span>
                          <span className="text-2xs text-muted-foreground font-medium uppercase border rounded px-1.5 py-0.2">
                            {rule.pillar}
                          </span>
                          <span className="text-2xs text-sys font-mono">v{rule.version}</span>
                        </div>
                        <h4 className="font-semibold text-sm text-foreground">{rule.name}</h4>
                        <p className="text-xs text-muted-foreground leading-normal">{rule.description}</p>
                        <div className="text-2xs text-muted-foreground flex items-center gap-2 pt-1">
                          <span>Source: {rule.sourceSection ?? "Guidelines"}</span>
                          <span>•</span>
                          <span>Page {rule.sourcePage ?? 1}</span>
                          {rule.conflictStatus?.hasConflict && (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Conflict Detected
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold">
                          Active
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-muted-foreground">No rules found.</div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: FACT REGISTRY */}
        <TabsContent value="facts" className="space-y-4">
          <div className="rounded-xl border bg-surface overflow-hidden shadow-sm">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Verified Product & Legal Fact Registry</h3>
                <p className="text-xs text-muted-foreground">
                  The ground truth database for pricing, legal disclaimers, deprecated terms, and claims.
                </p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {facts?.map((fact) => (
                <div key={fact.id} className="p-4 md:p-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface-2 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {fact.category.replace("_", " ")}
                      </span>
                      <span className="font-semibold text-sm text-foreground">
                        {fact.canonicalValue}
                      </span>
                    </div>
                    {fact.aliasesOrDeprecated.length > 0 && (
                      <div className="text-xs text-rose-400/90 font-mono">
                        Deprecated: {fact.aliasesOrDeprecated.join(", ")}
                      </div>
                    )}
                    <div className="text-2xs text-muted-foreground">
                      Source: {fact.sourceCitation.documentTitle ?? "Document"} · {fact.sourceCitation.section}
                    </div>
                  </div>
                  <span className="rounded bg-sys/10 text-sys text-xs px-2 py-0.5 font-semibold shrink-0">
                    Verified Truth
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: VISUAL ASSET REGISTRY */}
        <TabsContent value="visuals" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visuals?.map((vis) => (
              <Card key={vis.id} className="border bg-surface">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-surface-2 border px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      {vis.assetType}
                    </span>
                    <span className="text-2xs text-emerald-400 font-semibold">Approved</span>
                  </div>
                  <CardTitle className="text-base mt-1">{vis.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {vis.assetType === "color" && vis.specs.hex && (
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-lg border shadow-sm"
                        style={{ backgroundColor: vis.specs.hex }}
                      />
                      <div>
                        <div className="font-mono text-xs font-bold">{vis.specs.hex}</div>
                        <div className="text-2xs text-muted-foreground">Role: {vis.specs.role}</div>
                      </div>
                    </div>
                  )}

                  {vis.assetType === "font" && vis.specs.family && (
                    <div className="space-y-1">
                      <div className="text-xl font-bold" style={{ fontFamily: vis.specs.family }}>
                        {vis.specs.family} Display
                      </div>
                      <div className="text-2xs text-muted-foreground">
                        Allowed weights: {vis.specs.allowed_weights?.join(", ")}
                      </div>
                    </div>
                  )}

                  {vis.assetType === "logo" && (
                    <div className="rounded-lg border border-dashed p-4 text-center bg-surface-2/50">
                      <div className="h-8 w-24 mx-auto rounded bg-[#0A192F] border flex items-center justify-center text-xs font-bold text-white">
                        Acme Cloud
                      </div>
                      <div className="mt-2 text-2xs text-muted-foreground">
                        Safe Zone: {Math.round((vis.specs.min_safe_zone_pct ?? 0.2) * 100)}% margin clearance
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: VECTOR STORE (RAG) */}
        <TabsContent value="vector" className="space-y-4">
          <Card className="border bg-surface">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-ai" />
                Vector Knowledge Store & RAG Retrieval Tester
              </CardTitle>
              <CardDescription>
                Query the vector embeddings directly to preview semantic brand voice and persona context retrieved for audits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 'How should we describe enterprise cloud security?'"
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-sys"
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Semantic Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Top Retrieved Chunks (Cosine Similarity Ranked)
                  </div>
                  {searchResults.map((chunk, i) => (
                    <div key={i} className="rounded-xl border bg-surface-2/50 p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ai">{chunk.category} · {chunk.sectionTitle}</span>
                        <span className="font-mono text-2xs text-sys font-bold">Similarity: {chunk.similarity}</span>
                      </div>
                      <p className="text-xs text-foreground leading-relaxed">"{chunk.content}"</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DOCUMENT INGESTION MODAL */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-sys" />
              Ingest Brand Guidelines & Data
            </DialogTitle>
            <DialogDescription>
              Upload PDF guidelines, CSV fact sheets, or visual logos to expand the Brand Brain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Document Title *</label>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Q4 Global Brand Guidelines 2026"
                className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-sys"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Document Type</label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-sys"
              >
                <option value="brand_guidelines_pdf">Brand Guidelines (PDF)</option>
                <option value="product_fact_sheet_csv">Product Fact Sheet & Pricing (CSV)</option>
                <option value="logo_asset">Brand Logo Asset (PNG/SVG)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">File Upload *</label>
              <input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-surface-2 file:text-foreground hover:file:bg-surface-2/80 cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={uploading || !selectedFile || !uploadTitle} onClick={handleUpload}>
              {uploading ? "Ingesting & Compiling..." : "Ingest & Compile Rules"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
