import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  FileCheck2,
  Flame,
  Lock,
  Palette,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-20 pb-28 md:px-12 lg:px-24 border-b border-border/60 bg-gradient-to-b from-surface to-background">
        <div className="mx-auto max-w-5xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sys/40 bg-sys/10 px-4 py-1.5 text-xs font-semibold text-sys shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Next-Gen Multimodal Brand Governance Platform
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            Protect your brand equity with{" "}
            <span className="bg-gradient-to-r from-sys via-ai to-purple-400 bg-clip-text text-transparent">
              deterministic AI auditing.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed">
            Eliminate outdated prices, prohibited claims, off-brand tone, and visual violations.
            VeriBrand AI audits marketing copy and creative assets in parallel with zero-hallucination citations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button size="lg" className="w-full sm:w-auto font-bold bg-sys text-black hover:bg-sys/90 shadow-lg shadow-sys/20" onClick={() => navigate("/")}>
              Launch Governance Center <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={() => navigate("/campaigns/CAMP-DEMO-01")}>
              Try Interactive Review Workspace
            </Button>
          </div>
        </div>
      </section>

      {/* The Five Pillars Showcase */}
      <section className="py-20 px-6 md:px-12 lg:px-24 mx-auto max-w-7xl space-y-12">
        <div className="text-center space-y-2 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">Built on Five Foundational Pillars</h2>
          <p className="text-sm text-muted-foreground">
            A complete full-stack enterprise governance architecture—from document ingestion to immutable audit trails.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Pillar A */}
          <Card className="border bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-ai/15 text-ai flex items-center justify-center font-bold text-sm mb-2">
                A
              </div>
              <CardTitle className="text-base">INGEST · Brand Brain</CardTitle>
              <CardDescription className="text-xs">
                Vector Store for brand voice, Fact Registry for verified pricing & disclaimers, and Visual Asset Registry with automated cross-document conflict detection.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Pillar B */}
          <Card className="border bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-sys/15 text-sys flex items-center justify-center font-bold text-sm mb-2">
                B
              </div>
              <CardTitle className="text-base">ANALYZE · Multimodal Auditing</CardTitle>
              <CardDescription className="text-xs">
                Three parallel analyzers: Fact Checker (pricing, banned terms), Tone Analyzer (configurable LLM rubric), and Visual Inspector (computer vision colors, contrast, logo safe zones).
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Pillar C */}
          <Card className="border bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-sm mb-2">
                C
              </div>
              <CardTitle className="text-base">SUGGEST · Explainable Copilot</CardTitle>
              <CardDescription className="text-xs">
                PR & Grammarly style workspace with color-coded highlights (Red/Amber/Purple), exact rule citations, 3 rewrite styles (Strict, Concise, Conversational), diffs, and overrides.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Pillar D */}
          <Card className="border bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-sm mb-2">
                D
              </div>
              <CardTitle className="text-base">MANAGE · Approval Workflow</CardTitle>
              <CardDescription className="text-xs">
                5-tier RBAC state machine, manager review queue, Brand Readiness Score (0–100), and Fast-Track approvals that strictly protect legal constraints.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Pillar E */}
          <Card className="border bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-attn/15 text-attn flex items-center justify-center font-bold text-sm mb-2">
                E
              </div>
              <CardTitle className="text-base">TRACK · Governance Analytics</CardTitle>
              <CardDescription className="text-xs">
                7/30/90-day compliance trends, brand drift heatmaps, and a proactive Rule Friction Detector that flags guidelines with high override rates.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Security & Cryptography */}
          <Card className="border bg-surface shadow-sm">
            <CardHeader className="pb-3">
              <div className="h-10 w-10 rounded-xl bg-sys/15 text-sys flex items-center justify-center font-bold text-sm mb-2">
                <Lock className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">IMMUTABLE · Cryptographic Audit</CardTitle>
              <CardDescription className="text-xs">
                Tamper-evident SHA-256 hash chaining where every governance decision is cryptographically bound to previous actions and DB-trigger protected.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
