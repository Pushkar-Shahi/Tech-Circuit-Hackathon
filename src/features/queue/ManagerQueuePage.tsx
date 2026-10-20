import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Inbox,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { useDecideOverride, useReviewQueue, useTransitionCampaign } from "@/api/queries";
import type { FindingOverride } from "@/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUiStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ManagerQueuePage() {
  const navigate = useNavigate();
  const _role = useUiStore((s) => s.role);
  const { data: queue } = useReviewQueue();
  const decideOverrideMutation = useDecideOverride();
  const _transitionMutation = useTransitionCampaign();

  const [selectedOverride, setSelectedOverride] = useState<FindingOverride | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [acting, setActing] = useState(false);

  const pendingCampaigns = queue?.pendingCampaigns ?? [];
  const pendingOverrides = queue?.pendingOverrides ?? [];

  const handleDecision = (approve: boolean) => {
    if (!selectedOverride) return;
    setActing(true);
    decideOverrideMutation.mutate(
      {
        overrideId: selectedOverride.id,
        approve,
        decisionNote,
      },
      {
        onSuccess: () => {
          toast.success(approve ? "Override Approved" : "Override Rejected", {
            description: `Decision logged in immutable audit chain.`,
          });
          setSelectedOverride(null);
          setDecisionNote("");
          setActing(false);
        },
        onError: () => setActing(false),
      }
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manager Approval Queue</h1>
            <span className="rounded-full bg-attn/15 px-2.5 py-0.5 text-xs font-semibold text-attn">
              {queue?.queueCount ?? 0} Pending Items
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Role-enforced sign-off for creator override requests, high-risk findings, and specialist escalations.
          </p>
        </div>
      </div>

      {/* OVERRIDE REQUESTS SECTION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-attn" />
              Creator Override Requests ({pendingOverrides.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              Overrides require manager review of creator justifications before publishing.
            </p>
          </div>
        </div>

        {pendingOverrides.length === 0 ? (
          <Card className="border bg-surface p-6 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/60" />
            <h3 className="mt-2 text-sm font-semibold">Zero Pending Overrides</h3>
            <p className="mt-1 text-xs text-muted-foreground">No creator exceptions currently awaiting review.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingOverrides.map((ovr) => (
              <Card key={ovr.id} className="border-border/80 bg-surface shadow-sm space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="font-mono text-2xs font-bold text-foreground bg-surface-2 border px-2 py-0.5 rounded">
                      {ovr.ruleId ?? "RULE-DISCLAIMER"}
                    </span>
                    <h3 className="font-semibold text-sm text-foreground pt-1">{ovr.campaignName}</h3>
                  </div>
                  <span className="rounded-full bg-attn/15 text-attn border border-attn/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                    Pending Review
                  </span>
                </div>

                <div className="rounded-lg bg-surface-2 p-3 text-xs space-y-1.5">
                  <div className="font-semibold text-foreground flex items-center justify-between">
                    <span>Creator Justification ({ovr.requestedBy}):</span>
                  </div>
                  <p className="text-muted-foreground italic leading-relaxed">
                    "{ovr.justification}"
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-sys hover:underline"
                    onClick={() => navigate(`/campaigns/${ovr.campaignId}`)}
                  >
                    Inspect Full Draft <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 text-rose-400 border-rose-400/40 hover:bg-rose-500/10"
                      onClick={() => {
                        setSelectedOverride(ovr);
                        handleDecision(false);
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      onClick={() => setSelectedOverride(ovr)}
                    >
                      <Check className="h-3.5 w-3.5" /> Review & Approve
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* PENDING CAMPAIGNS SIGN-OFF SECTION */}
      <div className="space-y-3 pt-4 border-t">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center gap-2">
            <Clock className="h-4 w-4 text-sys" />
            Campaigns Awaiting Publication Approval ({pendingCampaigns.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Campaigns submitted for final marketing manager and specialist sign-off.
          </p>
        </div>

        {pendingCampaigns.length === 0 ? (
          <Card className="border bg-surface p-6 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/60" />
            <h3 className="mt-2 text-sm font-semibold">Queue Clear</h3>
            <p className="mt-1 text-xs text-muted-foreground">All campaigns have been processed.</p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {pendingCampaigns.map((camp) => (
              <div
                key={camp.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition-all hover:border-sys/50 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{camp.name}</span>
                    <span className="rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {camp.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Channel: {camp.channel.replace("_", " ")} · {camp.department} · Created by {camp.createdBy}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-base font-bold font-mono text-foreground">
                      {camp.readinessScore}/100
                    </div>
                    <div className="text-[10px] text-muted-foreground">Readiness</div>
                  </div>

                  <Button
                    size="sm"
                    className="font-semibold text-xs"
                    onClick={() => navigate(`/campaigns/${camp.id}`)}
                  >
                    Open Review Workspace <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OVERRIDE DECISION MODAL */}
      <Dialog open={Boolean(selectedOverride)} onOpenChange={() => setSelectedOverride(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <UserCheck className="h-5 w-5" />
              Approve Override Request
            </DialogTitle>
            <DialogDescription>
              Grant governance exception for{" "}
              <span className="font-mono font-semibold text-foreground">{selectedOverride?.ruleId}</span>.
              This approval will be recorded in the append-only cryptographic audit chain.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-surface-2 p-3 text-xs space-y-1">
              <div className="font-semibold text-foreground">Creator Justification:</div>
              <p className="text-muted-foreground italic">"{selectedOverride?.justification}"</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Manager Decision Note (Optional)</label>
              <textarea
                rows={3}
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="e.g. Approved due to mobile screen constraints. Short-form disclaimer accepted."
                className="w-full rounded-md border bg-background p-2.5 text-xs focus:ring-1 focus:ring-sys"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setSelectedOverride(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={acting}
              onClick={() => handleDecision(true)}
            >
              Confirm Override Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
