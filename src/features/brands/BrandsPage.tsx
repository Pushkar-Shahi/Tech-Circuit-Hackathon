import { useState } from "react";
import {
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Palette,
  Plus,
  Sliders,
  Sparkles,
  Type,
} from "lucide-react";
import { useBrands } from "@/api/queries";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BrandsPage() {
  const { data: brands, isLoading, refetch } = useBrands();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [formality, setFormality] = useState(85);
  const [confidence, setConfidence] = useState(90);
  const [submitting, setSubmitting] = useState(false);

  const handleCreateBrand = async () => {
    if (!name || !slug) {
      toast.error("Please provide both brand name and slug");
      return;
    }
    setSubmitting(true);
    try {
      await api.brands.create({
        name,
        slug,
        description,
        toneRubric: {
          formality,
          confidence,
          technicality: 70,
          empathy: 75,
          brandVoice: "Authoritative, modern, enterprise-grade",
          prohibitedTones: ["slang", "hyperbolic", "condescending"],
        },
        identity: {
          primaryColor: "#0A192F",
          secondaryColor: "#00D2DF",
          fontFamily: "Inter",
        },
      });
      toast.success("Brand Created Successfully");
      setCreateModalOpen(false);
      setName("");
      setSlug("");
      setDescription("");
      refetch();
    } catch {
      toast.error("Failed to create brand");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Brand Directory & Identities</h1>
          <p className="text-sm text-muted-foreground">
            Manage multi-brand corporate profiles, tone rubrics, and visual design tokens.
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Brand
        </Button>
      </div>

      {/* Brands Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {brands?.map((brand) => (
          <Card key={brand.id} className="border bg-surface shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-surface-2/40 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sys/10 border border-sys/30 flex items-center justify-center font-bold text-sys">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold">{brand.name}</CardTitle>
                    <CardDescription className="text-xs font-mono">{brand.slug}</CardDescription>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-2xs font-semibold">
                  Active
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {brand.description || "Enterprise cloud infrastructure, sovereign AI workloads, and mission-critical reliability."}
              </p>

              {/* Tone Rubric Preview */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-ai" />
                  <span>Configured Tone Rubric:</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-surface-2 p-2.5 space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Formality Target</span>
                      <span className="font-mono font-bold text-foreground">{brand.toneRubric?.formality ?? 85}/100</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-background overflow-hidden">
                      <div className="h-full bg-sys rounded-full" style={{ width: `${brand.toneRubric?.formality ?? 85}%` }} />
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface-2 p-2.5 space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Confidence Target</span>
                      <span className="font-mono font-bold text-foreground">{brand.toneRubric?.confidence ?? 90}/100</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-background overflow-hidden">
                      <div className="h-full bg-ai rounded-full" style={{ width: `${brand.toneRubric?.confidence ?? 90}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Visual Swatches */}
              <div className="space-y-2 pt-2 border-t">
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-sys" />
                  <span>Color & Typography Tokens:</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md border shadow-sm" style={{ backgroundColor: brand.identity?.primaryColor ?? "#0A192F" }} />
                    <span className="font-mono text-2xs text-muted-foreground">{brand.identity?.primaryColor ?? "#0A192F"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md border shadow-sm" style={{ backgroundColor: brand.identity?.secondaryColor ?? "#00D2DF" }} />
                    <span className="font-mono text-2xs text-muted-foreground">{brand.identity?.secondaryColor ?? "#00D2DF"}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium pl-2">
                    <Type className="h-3 w-3" />
                    <span>{brand.identity?.fontFamily ?? "Inter"} Display</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CREATE BRAND MODAL */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Brand Identity</DialogTitle>
            <DialogDescription>
              Configure brand identity parameters and target tone rubrics.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Brand Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                }}
                placeholder="e.g. Acme Health Systems"
                className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-sys"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. acme-health"
                className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-sys"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Brand Mission / Positioning</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief positioning statement..."
                className="w-full rounded-md border bg-background p-2 text-xs focus:ring-1 focus:ring-sys"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-2xs text-muted-foreground font-semibold">Target Formality ({formality})</label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={formality}
                  onChange={(e) => setFormality(Number(e.target.value))}
                  className="w-full accent-sys"
                />
              </div>
              <div className="space-y-1">
                <label className="text-2xs text-muted-foreground font-semibold">Target Confidence ({confidence})</label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-full accent-ai"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting || !name || !slug} onClick={handleCreateBrand}>
              Save Brand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
