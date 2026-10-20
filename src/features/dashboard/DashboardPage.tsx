import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Flame,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useCampaigns, useGovernanceAnalytics, useReviewQueue } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUiStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: analytics, isLoading: analyticsLoading } = useGovernanceAnalytics();
  const { data: campaigns, isLoading: campaignsLoading } = useCampaigns();
  const { data: queueData } = useReviewQueue();
  const role = useUiStore((s) => s.role);

  const readinessScore = analytics?.overallReadinessScore ?? 88.5;
  const scoreColor =
    readinessScore >= 90
      ? "text-emerald-500 stroke-emerald-500"
      : readinessScore >= 75
      ? "text-amber-500 stroke-amber-500"
      : "text-rose-500 stroke-rose-500";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Top Banner / Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Brand Governance Center</h1>
            <span className="flex items-center gap-1 rounded-full border border-sys/30 bg-sys/10 px-2.5 py-0.5 text-xs font-semibold text-sys">
              <span className="h-1.5 w-1.5 rounded-full bg-sys animate-pulse" />
              Continuous Auditing Active
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Acme Cloud Enterprise · Real-time brand voice, factual accuracy, and visual compliance.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => navigate("/brain")}>
            <Brain className="h-4 w-4 text-ai" />
            Brand Brain
          </Button>
          <Button size="sm" onClick={() => navigate("/campaigns/new")}>
            <Plus className="h-4 w-4" />
            New Campaign Audit
          </Button>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand Readiness Gauge Card */}
        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-surface to-surface-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Brand Readiness Index
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between pt-0">
            <div>
              <div className="text-3xl font-extrabold tracking-tight">
                {readinessScore}
                <span className="text-sm font-normal text-muted-foreground">/100</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-500 font-medium">
                <TrendingUp className="h-3 w-3" />
                +4.2% past 30 days
              </p>
            </div>
            {/* Circular Gauge */}
            <div className="relative flex h-16 w-16 items-center justify-center">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="stroke-muted-foreground/20"
                  strokeWidth="3.2"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={scoreColor}
                  strokeDasharray={`${readinessScore}, 100`}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <ShieldCheck className={cn("absolute h-6 w-6", scoreColor)} />
            </div>
          </CardContent>
        </Card>

        {/* Audited Assets Card */}
        <Card className="border-border/60 bg-surface">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Audited Assets
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-extrabold tracking-tight">
              {analytics?.totalCampaigns ?? campaigns?.length ?? 18}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Across Social, Ads, Email, and Landing Pages
            </p>
          </CardContent>
        </Card>

        {/* Review Queue Card */}
        <Card className="border-border/60 bg-surface">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Manager Review Queue
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold tracking-tight">
                {queueData?.queueCount ?? 2}
              </span>
              {(queueData?.queueCount ?? 0) > 0 && (
                <span className="rounded-full bg-attn/15 px-2 py-0.5 text-xs font-semibold text-attn">
                  Action Required
                </span>
              )}
            </div>
            <Link to="/queue" className="mt-1 flex items-center gap-1 text-xs text-sys hover:underline">
              View pending queue <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Rule Friction Card */}
        <Card className="border-border/60 bg-surface">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Rule Friction Detector
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-attn">
                {analytics?.ruleFrictionReports?.length ?? 1}
              </span>
              <span className="rounded-full bg-attn/15 px-2 py-0.5 text-xs font-semibold text-attn">
                Friction Flagged
              </span>
            </div>
            <Link to="/analytics" className="mt-1 flex items-center gap-1 text-xs text-attn hover:underline">
              Inspect recommendation <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Rule Friction Alert Banner (Pillar E Feature) */}
      {analytics?.ruleFrictionReports && analytics.ruleFrictionReports.length > 0 && (
        <div className="rounded-xl border border-attn/30 bg-attn/10 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-attn/20 p-2 text-attn">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Rule Friction Alert: {analytics.ruleFrictionReports[0].ruleName}
                  </h3>
                  <span className="rounded bg-attn/20 px-2 py-0.2 text-[11px] font-bold text-attn">
                    {Math.round(analytics.ruleFrictionReports[0].overrideRate * 100)}% Overrides
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {analytics.ruleFrictionReports[0].recommendation}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-attn/40 text-attn hover:bg-attn/10 shrink-0"
              onClick={() => navigate("/brain")}
            >
              Review Rule in Brain
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Grid: Recent Campaigns & Five Pillars Guide */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Campaigns List (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Active Campaigns & Audits</h2>
            <Link to="/campaigns" className="text-xs font-medium text-sys hover:underline">
              View all campaigns →
            </Link>
          </div>

          <div className="space-y-2.5">
            {campaignsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-surface-2 skeleton" />
                ))}
              </div>
            ) : campaigns && campaigns.length > 0 ? (
              campaigns.slice(0, 4).map((c) => {
                const score = c.latestRevision?.brandReadinessScore ?? 100.0;
                const statusBadge =
                  c.status === "approved"
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : c.status === "needs_revision"
                    ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                    : c.status === "pending_manager"
                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                    : "bg-surface-2 text-muted-foreground border-border";

                return (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    className="group flex cursor-pointer items-center justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:border-sys/50 hover:shadow-md"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate group-hover:text-sys">
                          {c.name}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            statusBadge
                          )}
                        >
                          {c.status.replace("_", " ")}
                        </span>
                        {c.latestRevision?.fastTrackEligible && (
                          <span className="rounded-full bg-ai/20 px-1.5 py-0.5 text-[9px] font-bold text-ai flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> Fast-Track
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="capitalize">{c.channel.replace("_", " ")}</span>
                        <span>•</span>
                        <span>{c.department}</span>
                        <span>•</span>
                        <span>By {c.createdBy}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 pl-4 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold font-mono">
                          {score}
                          <span className="text-2xs font-normal text-muted-foreground">/100</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">Readiness</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <FileCheck2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <h3 className="mt-2 text-sm font-semibold">No campaigns yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">Create your first campaign to run an audit.</p>
                <Button size="sm" className="mt-4" onClick={() => navigate("/campaigns/new")}>
                  Create Campaign
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Five Pillars Quick Architecture & Shortcuts (1 Column) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold tracking-tight">Governance Pillars</h2>
          <div className="space-y-2.5">
            <div
              onClick={() => navigate("/brain")}
              className="cursor-pointer rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-sys/50"
            >
              <div className="flex items-center gap-2.5 font-semibold text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai/15 text-ai text-xs font-bold">
                  A
                </span>
                <span>INGEST · Brand Brain</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground pl-9">
                Vector store, fact registry, and versioned rules with cross-document conflict detection.
              </p>
            </div>

            <div
              onClick={() => navigate("/campaigns")}
              className="cursor-pointer rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-sys/50"
            >
              <div className="flex items-center gap-2.5 font-semibold text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sys/15 text-sys text-xs font-bold">
                  B
                </span>
                <span>ANALYZE · Multimodal Auditing</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground pl-9">
                Parallel Fact Checker, Tone Analyzer, and Visual Computer Vision Inspector.
              </p>
            </div>

            <div
              onClick={() => navigate("/campaigns/CAMP-DEMO-01")}
              className="cursor-pointer rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-sys/50"
            >
              <div className="flex items-center gap-2.5 font-semibold text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-400 text-xs font-bold">
                  C
                </span>
                <span>SUGGEST · Explainable Copilot</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground pl-9">
                Inline red/amber/purple highlights, 3-mode rewrites, diff views, and override requests.
              </p>
            </div>

            <div
              onClick={() => navigate("/queue")}
              className="cursor-pointer rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-sys/50"
            >
              <div className="flex items-center gap-2.5 font-semibold text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500 text-xs font-bold">
                  D
                </span>
                <span>MANAGE · Approval Workflow</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground pl-9">
                5-tier RBAC state machine, manager review queue, and Brand Readiness Score formula.
              </p>
            </div>

            <div
              onClick={() => navigate("/analytics")}
              className="cursor-pointer rounded-xl border border-border bg-surface p-3.5 transition-all hover:border-sys/50"
            >
              <div className="flex items-center gap-2.5 font-semibold text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-attn/15 text-attn text-xs font-bold">
                  E
                </span>
                <span>TRACK · Governance Analytics</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground pl-9">
                7/30/90d compliance trends, drift heatmaps, and Rule Friction Detector.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
