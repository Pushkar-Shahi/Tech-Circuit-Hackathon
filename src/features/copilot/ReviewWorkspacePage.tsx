import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Eye,
  FileCheck2,
  FileDiff,
  FileText,
  Flame,
  HelpCircle,
  History,
  Image as ImageIcon,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import {
  useAcceptRewrite,
  useCampaign,
  useCampaignDiff,
  useCampaignRevisions,
  useRequestOverride,
  useScanCampaign,
  useTransitionCampaign,
} from "@/api/queries";
import type { AuditFinding } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUiStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ReviewWorkspacePage() {
  const { campaignId = "CAMP-DEMO-01" } = useParams();
  const role = useUiStore((s) => s.role);

  const { data: campaign, isLoading } = useCampaign(campaignId);
  const { data: revisions } = useCampaignRevisions(campaignId);
  const { data: diffData } = useCampaignDiff(campaignId);

  const scanMutation = useScanCampaign();
  const acceptRewriteMutation = useAcceptRewrite();
  const overrideMutation = useRequestOverride();
  const transitionMutation = useTransitionCampaign();

  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRewriteMode, setSelectedRewriteMode] = useState<Record<string, "strict_compliance" | "concise" | "conversational">>({});

  // Modals
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState("");
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [diffModalOpen, setDiffModalOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [sourcePreviewModal, setSourcePreviewModal] = useState<AuditFinding | null>(null);

  const latestRevision = campaign?.latestRevision;
  const currentText = latestRevision?.contentText ?? "";
  const readinessScore = latestRevision?.brandReadinessScore ?? 100.0;
  const findings = campaign?.findings ?? [];

  const filteredFindings = useMemo(() => {
    if (selectedCategory === "all") return findings;
    return findings.filter((f) => f.category === selectedCategory);
  }, [findings, selectedCategory]);

  const selectedFinding = useMemo(() => {
    if (!selectedFindingId) return findings[0] ?? null;
    return findings.find((f) => f.id === selectedFindingId) ?? findings[0] ?? null;
  }, [findings, selectedFindingId]);

  // Handle Accepting Rewrite
  const handleAccept = (finding: AuditFinding) => {
    const mode = selectedRewriteMode[finding.id] ?? "strict_compliance";
    acceptRewriteMutation.mutate(
      {
        campaignId,
        findingId: finding.id,
        rewriteMode: mode,
      },
      {
        onSuccess: () => {
          toast.success("Suggestion accepted", { description: "Content updated and new revision recorded." });
        },
      }
    );
  };

  // Handle Submitting Override
  const handleSubmitOverride = () => {
    if (!selectedFinding) return;
    if (overrideJustification.trim().length < 10) {
      toast.error("Please provide a detailed justification (min 10 characters)");
      return;
    }
    overrideMutation.mutate(
      {
        campaignId,
        findingId: selectedFinding.id,
        justification: overrideJustification,
      },
      {
        onSuccess: () => {
          toast.success("Override request submitted", {
            description: "Routed to Marketing Manager for review.",
          });
          setOverrideModalOpen(false);
          setOverrideJustification("");
        },
      }
    );
  };

  // Render Highlighted Content
  const renderHighlightedDocument = () => {
    if (!currentText) return <p className="text-muted-foreground italic">No draft content available.</p>;

    // Find all findings with valid text offsets
    const activeHighlights: Array<{
      finding: AuditFinding;
      start: number;
      end: number;
      category: string;
      severity: string;
    }> = [];

    findings.forEach((f) => {
      if (f.status === "accepted") return;
      if (f.textOffset && typeof f.textOffset.start === "number" && typeof f.textOffset.end === "number") {
        activeHighlights.push({
          finding: f,
          start: f.textOffset.start,
          end: f.textOffset.end,
          category: f.category,
          severity: f.severity,
        });
      } else if (f.affectedText && currentText.includes(f.affectedText)) {
        const start = currentText.indexOf(f.affectedText);
        activeHighlights.push({
          finding: f,
          start,
          end: start + f.affectedText.length,
          category: f.category,
          severity: f.severity,
        });
      }
    });

    // Sort by start index
    activeHighlights.sort((a, b) => a.start - b.start);

    // Build segments
    const segments: React.ReactNode[] = [];
    let lastIdx = 0;

    activeHighlights.forEach((hl, i) => {
      // Overlap guard
      if (hl.start < lastIdx) return;

      // Plain text before highlight
      if (hl.start > lastIdx) {
        segments.push(<span key={`plain-${i}`}>{currentText.slice(lastIdx, hl.start)}</span>);
      }

      const isSelected = selectedFindingId === hl.finding.id;

      // Category highlight style:
      // Red for critical factual/legal, Amber for tone, Purple for visual
      let highlightClass = "";
      if (hl.category === "factual" || hl.category === "legal") {
        highlightClass = isSelected
          ? "bg-rose-500/30 border-b-2 border-rose-500 text-rose-300 font-semibold shadow-sm"
          : "bg-rose-500/15 border-b-2 border-rose-500 text-rose-200 hover:bg-rose-500/25";
      } else if (hl.category === "tone") {
        highlightClass = isSelected
          ? "bg-amber-500/30 border-b-2 border-amber-500 text-amber-300 font-semibold shadow-sm"
          : "bg-amber-500/15 border-b-2 border-amber-500 text-amber-200 hover:bg-amber-500/25";
      } else {
        highlightClass = isSelected
          ? "bg-purple-500/30 border-b-2 border-purple-500 text-purple-300 font-semibold shadow-sm"
          : "bg-purple-500/15 border-b-2 border-purple-500 text-purple-200 hover:bg-purple-500/25";
      }

      segments.push(
        <mark
          key={`mark-${hl.finding.id}-${i}`}
          onClick={() => setSelectedFindingId(hl.finding.id)}
          className={cn(
            "rounded px-1 py-0.5 transition-all cursor-pointer inline-block",
            highlightClass
          )}
          title={`Click to view ${hl.category} finding: ${hl.finding.explanation}`}
        >
          {currentText.slice(hl.start, hl.end)}
        </mark>
      );

      lastIdx = hl.end;
    });

    if (lastIdx < currentText.length) {
      segments.push(<span key="tail">{currentText.slice(lastIdx)}</span>);
    }

    return segments;
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-sys" />
      </div>
    );
  }

  const scoreBadgeColor =
    readinessScore >= 90
      ? "text-emerald-500 border-emerald-500/40 bg-emerald-500/10"
      : readinessScore >= 75
      ? "text-amber-500 border-amber-500/40 bg-amber-500/10"
      : "text-rose-500 border-rose-500/40 bg-rose-500/10";

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-background">
      {/* Top Copilot Action Strip */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-surface px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link to="/campaigns" className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-foreground md:text-base">
                {campaign?.name}
              </h1>
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {campaign?.channel.replace("_", " ")}
              </span>
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-sys">
                Rev v{latestRevision?.revisionNumber ?? 1}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Version History Button */}
          <Button variant="outline" size="sm" onClick={() => setHistoryDrawerOpen(true)}>
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Version History</span>
          </Button>

          {/* Diff View Button */}
          <Button variant="outline" size="sm" onClick={() => setDiffModalOpen(true)}>
            <FileDiff className="h-4 w-4" />
            <span className="hidden sm:inline">Compare Diff</span>
          </Button>

          {/* Rescan Button */}
          <Button
            variant="outline"
            size="sm"
            disabled={scanMutation.isPending}
            onClick={() => {
              scanMutation.mutate(campaignId, {
                onSuccess: (res) => toast.success("Audit Rescan Complete", { description: `Readiness score: ${res.brandReadinessScore}/100` }),
              });
            }}
          >
            <RefreshCw className={cn("h-4 w-4", scanMutation.isPending && "animate-spin")} />
            <span>Rescan</span>
          </Button>

          {/* Submit / Approve Button */}
          {latestRevision?.fastTrackEligible ? (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
              onClick={() => {
                transitionMutation.mutate({
                  campaignId,
                  targetStatus: "approved",
                  reason: "Fast-track automated approval (Score >= 95 and zero critical issues)",
                });
                toast.success("Fast-Track Approved!", { description: "Campaign meets all verified brand requirements." });
              }}
            >
              <Sparkles className="h-4 w-4" />
              Fast-Track Approve
            </Button>
          ) : campaign?.status === "pending_manager" ? (
            role === "manager" || role === "owner" ? (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => {
                  transitionMutation.mutate({ campaignId, targetStatus: "approved" });
                  toast.success("Campaign Approved for Publication");
                }}
              >
                <Check className="h-4 w-4" />
                Approve Campaign
              </Button>
            ) : (
              <span className="text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-md px-2.5 py-1">
                Pending Manager Review
              </span>
            )
          ) : (
            <Button
              size="sm"
              onClick={() => {
                transitionMutation.mutate({
                  campaignId,
                  targetStatus: "pending_manager",
                  reason: "Submitted by creator for manager approval",
                });
                toast.success("Submitted for Manager Review");
              }}
            >
              <Send className="h-4 w-4" />
              Submit for Approval
            </Button>
          )}
        </div>
      </div>

      {/* Main Review Workspace: Left Canvas, Right Copilot Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Document Canvas & Visual Preview */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Fast-Track or Alert Banner */}
          {latestRevision?.fastTrackEligible ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-sm text-emerald-300">
                    Fast-Track Approval Qualified (Score {readinessScore}/100)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Zero critical violations and zero legal blockers detected. This draft qualifies for instant sign-off.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            findings.length > 0 && (
              <div className="rounded-xl border border-border bg-surface-2/60 p-3 text-xs text-muted-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-sys" />
                  <span>
                    Click any highlighted term to view exact citations, rule explanations, and 3-mode rewrites.
                  </span>
                </div>
                <div className="flex items-center gap-3 text-2xs">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Factual/Legal
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Tone
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-purple-500" /> Visual
                  </span>
                </div>
              </div>
            )
          )}

          {/* Interactive Document Editor / Highlight Area */}
          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b px-6 py-3 bg-surface-2/40">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4 text-sys" />
                <span>Campaign Draft Body</span>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {currentText.split(/\s+/).filter(Boolean).length} words
              </div>
            </div>
            <div className="p-6 md:p-8 text-base md:text-lg leading-relaxed font-sans select-text">
              {renderHighlightedDocument()}
            </div>
          </div>

          {/* Creative Asset Canvas (Visual Inspection) */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ImageIcon className="h-4 w-4 text-ai" />
                <span>Creative Image Assets & Visual Inspector</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Multimodal Computer Vision Active
              </span>
            </div>

            {/* Visual Canvas Demo Container */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface-2 p-6">
              <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-dashed border-border/80 bg-background/60 p-6 shadow-inner text-center">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded bg-[#0A192F] border border-border flex items-center justify-center text-[10px] text-white font-bold">
                      AC
                    </div>
                    <span className="text-xs font-bold text-foreground">Acme Cloud</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">
                    Display Banner 1200x628
                  </span>
                </div>

                <div className="py-6 space-y-2">
                  <h3 className="text-lg font-extrabold tracking-tight text-foreground">
                    Accelerate Sovereign Cloud Deployments
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Dedicated high-performance clusters with verified 99.99% SLA uptime.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <span className="rounded-md bg-[#00D2DF] px-3 py-1.5 text-xs font-bold text-black shadow">
                    Get Started Free
                  </span>
                </div>

                {/* Simulated Visual Bounding Box Violation for Unapproved Color */}
                <div className="mt-4 rounded border border-rose-500/50 bg-rose-500/10 p-2 text-left text-2xs text-rose-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Visual Flag: Unapproved dominant colorway (#FF5722) detected in alternate banner version.</span>
                  </div>
                  <span className="font-mono text-[10px]">Delta-E: 34.2</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Explainable AI Copilot Panel */}
        <div className="w-[380px] shrink-0 border-l bg-surface flex flex-col overflow-hidden md:w-[420px]">
          {/* Copilot Header & Readiness Gauge */}
          <div className="border-b p-4 space-y-3 bg-surface-2/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-ai" />
                <span className="text-sm font-bold">Explainable AI Copilot</span>
              </div>
              <span className={cn("num rounded-full border px-2 py-0.5 text-xs font-extrabold", scoreBadgeColor)}>
                {readinessScore}/100 Readiness
              </span>
            </div>

            {/* Category Filter Tabs */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
              <TabsList className="grid grid-cols-4 h-8 bg-surface-2">
                <TabsTrigger value="all" className="text-2xs font-semibold">
                  All ({findings.length})
                </TabsTrigger>
                <TabsTrigger value="factual" className="text-2xs font-semibold">
                  Fact ({findings.filter((f) => f.category === "factual").length})
                </TabsTrigger>
                <TabsTrigger value="tone" className="text-2xs font-semibold">
                  Tone ({findings.filter((f) => f.category === "tone").length})
                </TabsTrigger>
                <TabsTrigger value="legal" className="text-2xs font-semibold">
                  Legal ({findings.filter((f) => f.category === "legal").length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Findings List / Active Inspection */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredFindings.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center p-6 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <h3 className="text-sm font-semibold">Zero Violations in this Category</h3>
                <p className="text-xs text-muted-foreground">All content satisfies brand governance rules.</p>
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const isSelected = selectedFinding?.id === finding.id;
                const isResolved = finding.status === "accepted";
                const isOverridden = finding.status === "overridden";

                return (
                  <div
                    key={finding.id}
                    onClick={() => setSelectedFindingId(finding.id)}
                    className={cn(
                      "rounded-xl border p-4 transition-all cursor-pointer space-y-3",
                      isSelected
                        ? "border-sys bg-surface-2/80 shadow-md ring-1 ring-sys/30"
                        : "border-border bg-surface hover:border-muted-foreground/30",
                      isResolved && "opacity-60 bg-emerald-500/5 border-emerald-500/30"
                    )}
                  >
                    {/* Finding Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            finding.severity === "critical"
                              ? "bg-rose-500/20 text-rose-400"
                              : finding.severity === "high"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-purple-500/20 text-purple-400"
                          )}
                        >
                          {finding.severity}
                        </span>
                        <span className="text-xs font-mono font-semibold text-muted-foreground">
                          {finding.ruleId ?? "RULE-BRAND"}
                        </span>
                      </div>

                      {isResolved ? (
                        <span className="flex items-center gap-1 text-2xs font-bold text-emerald-400">
                          <Check className="h-3 w-3" /> Accepted
                        </span>
                      ) : isOverridden ? (
                        <span className="flex items-center gap-1 text-2xs font-bold text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> Overridden
                        </span>
                      ) : null}
                    </div>

                    {/* Affected text & Explanation */}
                    <div className="space-y-1">
                      {finding.affectedText && (
                        <div className="font-semibold text-xs text-foreground line-through decoration-rose-500">
                          "{finding.affectedText}"
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground leading-normal">
                        {finding.explanation}
                      </p>
                    </div>

                    {/* Source Citation & Preview Link */}
                    <div className="flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-1.5 text-2xs text-muted-foreground">
                      <span className="truncate">
                        📖 {finding.sourceCitation.documentTitle ?? "Brand Guidelines"} · p.{finding.sourceCitation.page ?? 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSourcePreviewModal(finding);
                        }}
                        className="text-sys hover:underline font-semibold flex items-center gap-0.5 ml-2 shrink-0"
                      >
                        Preview <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    {/* 3-Mode Contextual Rewrite Options */}
                    {!isResolved && !isOverridden && (
                      <div className="space-y-2 pt-1 border-t border-border/60">
                        <div className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                          <span>Contextual Rewrites:</span>
                          <span className="text-2xs text-ai font-normal flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5" /> Explainable AI
                          </span>
                        </div>

                        {/* Rewrite Selector Tabs */}
                        <div className="grid grid-cols-3 gap-1 rounded-lg bg-background p-1 text-center">
                          {(["strict_compliance", "concise", "conversational"] as const).map((mode) => {
                            const activeMode = selectedRewriteMode[finding.id] ?? "strict_compliance";
                            return (
                              <button
                                key={mode}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRewriteMode((prev) => ({ ...prev, [finding.id]: mode }));
                                }}
                                className={cn(
                                  "rounded py-1 text-[10px] font-semibold capitalize transition-all",
                                  activeMode === mode
                                    ? "bg-sys text-black shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {mode.replace("_", " ")}
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected Rewrite Preview */}
                        <div className="rounded-lg border border-sys/30 bg-sys/5 p-2.5 text-xs text-foreground font-medium">
                          {(() => {
                            const mode = selectedRewriteMode[finding.id] ?? "strict_compliance";
                            const res = finding.suggestedResolutions;
                            if (mode === "strict_compliance") return res.strictCompliance || res.concise;
                            if (mode === "concise") return res.concise || res.strictCompliance;
                            return res.conversational || res.strictCompliance;
                          })()}
                        </div>

                        {/* Actions: Accept Rewrite & Request Override */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 text-xs h-8 bg-sys text-black hover:bg-sys/90 font-semibold"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccept(finding);
                            }}
                          >
                            <Check className="h-3.5 w-3.5" />
                            Accept Rewrite
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-8 text-amber-500 border-amber-500/40 hover:bg-amber-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFindingId(finding.id);
                              setOverrideModalOpen(true);
                            }}
                          >
                            Request Override
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* OVERRIDE REQUEST MODAL */}
      <Dialog open={overrideModalOpen} onOpenChange={setOverrideModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Request Manager Override
            </DialogTitle>
            <DialogDescription>
              Submit an official justification for violating brand guideline{" "}
              <span className="font-mono font-semibold text-foreground">{selectedFinding?.ruleId}</span>.
              This will route the draft to Marketing Managers and Specialist Reviewers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Violation Context</label>
              <div className="rounded-md bg-surface-2 p-2.5 text-xs text-muted-foreground">
                {selectedFinding?.explanation}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Mandatory Justification *</label>
              <textarea
                rows={4}
                value={overrideJustification}
                onChange={(e) => setOverrideJustification(e.target.value)}
                placeholder="Explain why this exception is necessary (e.g. mobile character limit, partner co-branding contract, special executive clearance)..."
                className="w-full rounded-md border bg-background p-2.5 text-xs focus:ring-1 focus:ring-sys"
              />
            </div>

            <label className="flex items-start gap-2 cursor-pointer text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={riskAcknowledged}
                onChange={(e) => setRiskAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-border text-sys focus:ring-sys"
              />
              <span>
                I acknowledge the brand drift risk and confirm this request is necessary for business execution.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOverrideModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!riskAcknowledged || overrideJustification.trim().length < 10 || overrideMutation.isPending}
              onClick={handleSubmitOverride}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              Submit for Manager Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIFF COMPARISON MODAL */}
      <Dialog open={diffModalOpen} onOpenChange={setDiffModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDiff className="h-5 w-5 text-sys" />
              Original vs Revised Diff Comparison
            </DialogTitle>
            <DialogDescription>
              Inspecting changes between Revision v{diffData?.revA ?? 1} and v{diffData?.revB ?? 2}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="rounded-xl border bg-surface-2 p-4 text-sm leading-relaxed">
              {diffData?.wordDiff?.map((chunk, i) => {
                if (chunk.type === "delete") {
                  return (
                    <span key={i} className="bg-rose-500/25 text-rose-300 line-through px-1 rounded mx-0.5">
                      {chunk.text}
                    </span>
                  );
                }
                if (chunk.type === "insert") {
                  return (
                    <span key={i} className="bg-emerald-500/25 text-emerald-300 font-semibold px-1 rounded mx-0.5">
                      {chunk.text}
                    </span>
                  );
                }
                return <span key={i}>{chunk.text} </span>;
              })}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setDiffModalOpen(false)}>Close Diff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SOURCE DOCUMENT PREVIEW MODAL */}
      <Dialog open={Boolean(sourcePreviewModal)} onOpenChange={() => setSourcePreviewModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-sys" />
              Source Guideline Reference
            </DialogTitle>
            <DialogDescription>
              {sourcePreviewModal?.sourceCitation.documentTitle ?? "Brand Document"} · Page{" "}
              {sourcePreviewModal?.sourceCitation.page ?? 1}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-surface-2 p-3 text-xs space-y-2">
              <div className="font-semibold text-foreground">Section: {sourcePreviewModal?.sourceCitation.section}</div>
              <div className="text-muted-foreground border-l-2 border-sys pl-2.5 italic">
                "{sourcePreviewModal?.evidence}"
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Zero hallucination guarantee: This verified citation is extracted directly from your uploaded brand knowledge base.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setSourcePreviewModal(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
