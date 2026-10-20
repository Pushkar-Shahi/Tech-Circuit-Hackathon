import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Plus,
  RefreshCw,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function NewCampaignWizard() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("Q4 Enterprise Cloud Migration Promotion");
  const [channel, setChannel] = useState("social_ad");
  const [department, setDepartment] = useState("Growth Marketing");
  const [region, setRegion] = useState("North America");
  const [targetAudience, setTargetAudience] = useState("Enterprise CIOs & Technical Decision Makers");
  const [contentText, setContentText] = useState(
    "Accelerate your migration with Acme Cloud Enterprise. Dedicated sovereign clusters with audited SOC 2 Type II compliance and verified 99.99% SLA uptime. Starting at $149/seat/month billed annually. *Subject to annual billing commitment."
  );

  // Injects sample with intentional violations for testing the explainable copilot
  const handleInsertViolationsSample = () => {
    setName("Q4 Urgent Enterprise Promo (Testing Violations)");
    setContentText(
      "Yo check this out! Acme Cloud Legacy is now just $39/seat/mo. It is 100% unhackable and delivers crazy fast speeds!!"
    );
    toast.info("Sample Violations Injected", {
      description: "Includes outdated pricing ($39), banned claim ('100% unhackable'), deprecated name ('Legacy'), and slang ('Yo').",
    });
  };

  const handleCreateAndAudit = async () => {
    if (!name.trim() || !contentText.trim()) {
      toast.error("Please provide both campaign name and copy.");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Create campaign
      const camp = await api.campaigns.create({
        brand_id: "BRAND-ACME-01",
        name,
        channel,
        department,
        region,
        agency: "Internal Team",
        target_audience: targetAudience,
        content_text: contentText,
        asset_urls: ["/sample_creative_orange.png"],
      });

      toast.success("Campaign created", { description: "Running multimodal audit..." });

      // 2. Run multimodal scan
      await api.campaigns.scan(camp.id);

      // 3. Open review workspace
      navigate(`/campaigns/${camp.id}`);
    } catch (e: any) {
      toast.error("Failed to create campaign: " + (e.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/campaigns" className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create & Audit Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Author copy and upload assets for instant multimodal brand governance inspection.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Form Details (2 Cols) */}
        <div className="md:col-span-2 space-y-4">
          <Card className="border bg-surface">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Campaign Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q4 Global Enterprise Migration Ad"
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-sys"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Distribution Channel</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-sys"
                  >
                    <option value="social_ad">Social Ad (LinkedIn / X)</option>
                    <option value="email_newsletter">Email Newsletter</option>
                    <option value="landing_page">Landing Page</option>
                    <option value="display_banner">Display Banner</option>
                    <option value="print_brochure">Print Brochure</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-sys"
                  >
                    <option value="Growth Marketing">Growth Marketing</option>
                    <option value="Product Marketing">Product Marketing</option>
                    <option value="Regional Sales">Regional Sales</option>
                    <option value="Corporate Communications">Corporate Comms</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Target Audience</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Enterprise CIOs and Technical Decision Makers"
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:ring-1 focus:ring-sys"
                />
              </div>
            </CardContent>
          </Card>

          {/* Copy Editor */}
          <Card className="border bg-surface">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Campaign Draft Copy</CardTitle>
                <CardDescription className="text-xs">
                  Copy will be audited by the Fact Checker, Tone Analyzer, and Visual Inspector in parallel.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleInsertViolationsSample}
                className="text-xs text-ai border-ai/40 hover:bg-ai/10 shrink-0"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Inject Violations Demo
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <textarea
                rows={6}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Enter campaign headline, body copy, and call-to-action..."
                className="w-full rounded-lg border bg-background p-3 text-sm leading-relaxed font-sans focus:ring-1 focus:ring-sys"
              />
              <div className="flex items-center justify-between text-2xs text-muted-foreground">
                <span>{contentText.split(/\s+/).filter(Boolean).length} words · {contentText.length} characters</span>
                <span>Active Brand: Acme Cloud Enterprise</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Creative Assets & Launch (1 Col) */}
        <div className="space-y-4">
          <Card className="border bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-ai" />
                Creative Asset
              </CardTitle>
              <CardDescription className="text-xs">
                Upload image or banner for color palette, contrast, and logo safe-zone auditing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-dashed p-6 text-center bg-surface-2/40">
                <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <div className="mt-2 text-xs font-semibold">Drop creative banner here</div>
                <div className="text-2xs text-muted-foreground">PNG, JPEG, or SVG up to 10MB</div>
                <div className="mt-3 inline-block rounded bg-sys/10 px-2.5 py-1 text-2xs font-mono text-sys">
                  sample_banner_1200x628.png
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-gradient-to-br from-surface to-surface-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-sys" />
                Continuous Auditing Active
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Upon launch, three analyzers run in parallel:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                <li><strong className="text-foreground">Fact Checker:</strong> Audits prices, names, and claims.</li>
                <li><strong className="text-foreground">Tone Analyzer:</strong> Evaluates brand voice and confidence.</li>
                <li><strong className="text-foreground">Visual Inspector:</strong> Checks contrast and color palettes.</li>
              </ul>

              <Button
                size="lg"
                className="w-full mt-4 font-bold bg-sys text-black hover:bg-sys/90 shadow-md"
                disabled={submitting}
                onClick={handleCreateAndAudit}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running Multimodal Audit...
                  </>
                ) : (
                  <>
                    <FileCheck2 className="h-4 w-4" />
                    Run Multimodal Audit
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
