import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileCheck2,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useCampaigns } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function CampaignsListPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: campaigns, isLoading } = useCampaigns();

  const filteredCampaigns = (campaigns ?? []).filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (channelFilter !== "all" && c.channel !== channelFilter) return false;
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Campaigns & Audited Assets</h1>
          <p className="text-sm text-muted-foreground">
            Continuous multimodal compliance tracking across all marketing initiatives.
          </p>
        </div>
        <Button onClick={() => navigate("/campaigns/new")}>
          <Plus className="h-4 w-4" />
          New Campaign Audit
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns by name..."
            className="w-full rounded-md border bg-background pl-9 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-sys"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-sys"
          >
            <option value="all">All Statuses</option>
            <option value="needs_revision">Needs Revision</option>
            <option value="pending_manager">Pending Manager</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-sys"
          >
            <option value="all">All Channels</option>
            <option value="social_ad">Social Ad</option>
            <option value="email_newsletter">Email Newsletter</option>
            <option value="landing_page">Landing Page</option>
            <option value="display_banner">Display Banner</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table / Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-surface-2 skeleton" />
            ))}
          </div>
        ) : filteredCampaigns.length > 0 ? (
          filteredCampaigns.map((c) => {
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
                className="group flex cursor-pointer flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-surface p-5 transition-all hover:border-sys/50 hover:shadow-md"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-foreground group-hover:text-sys transition-colors">
                      {c.name}
                    </span>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider", statusBadge)}>
                      {c.status.replace("_", " ")}
                    </span>
                    {c.latestRevision?.fastTrackEligible && (
                      <span className="rounded-full bg-ai/20 px-2 py-0.5 text-[10px] font-bold text-ai flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Fast-Track Qualified
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="capitalize font-medium text-foreground/80">{c.channel.replace("_", " ")}</span>
                    <span>•</span>
                    <span>{c.department}</span>
                    <span>•</span>
                    <span>Target: {c.targetAudience}</span>
                    <span>•</span>
                    <span>Created by {c.createdBy}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="text-right">
                    <div className="text-xl font-extrabold font-mono">
                      {score}
                      <span className="text-2xs font-normal text-muted-foreground">/100</span>
                    </div>
                    <div className="text-2xs text-muted-foreground">Readiness Score</div>
                  </div>

                  <Button size="sm" variant="outline" className="group-hover:bg-sys group-hover:text-black font-semibold">
                    Open Review Workspace <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed p-12 text-center bg-surface">
            <FileCheck2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-2 text-sm font-semibold">No campaigns match filters</h3>
            <p className="mt-1 text-xs text-muted-foreground">Try clearing filters or create a new campaign.</p>
          </div>
        )}
      </div>
    </div>
  );
}
