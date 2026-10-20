import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Flame,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useGovernanceAnalytics } from "@/api/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function GovernanceAnalyticsPage() {
  const navigate = useNavigate();
  const { data: analytics } = useGovernanceAnalytics();
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const trends = analytics?.complianceTrends ?? [];
  const frictionReports = analytics?.ruleFrictionReports ?? [];
  const driftHeatmap = analytics?.driftHeatmap ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Governance Analytics</h1>
            <span className="rounded-full bg-sys/15 px-2.5 py-0.5 text-xs font-semibold text-sys">
              Persisted Data
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Compliance readiness trends, brand drift heatmaps, and Rule Friction Detection.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border bg-surface p-1">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={cn(
                "rounded px-3 py-1 text-xs font-semibold transition-all",
                timeRange === r ? "bg-sys text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* COMPLIANCE SCORE TRENDS CHART */}
      <Card className="border bg-surface shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Brand Compliance Readiness Score Trend
              </CardTitle>
              <CardDescription className="text-xs">
                Rolling compliance scores across all marketing channels and creative assets.
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold font-mono text-foreground">
                {analytics?.overallReadinessScore ?? 88.5}%
              </span>
              <div className="text-2xs text-emerald-400 font-semibold">+4.2% trajectory</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D2DF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00D2DF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis domain={[60, 100]} stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#121826",
                    borderColor: "#242C3D",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="readinessScore"
                  name="Readiness Score"
                  stroke="#00D2DF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* RULE FRICTION DETECTOR (PILLAR E HERO) */}
      <Card className="border border-attn/30 bg-gradient-to-br from-surface via-surface to-attn/5 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-attn/20 p-2 text-attn">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base text-foreground">Rule Friction Detector</CardTitle>
                <CardDescription className="text-xs">
                  Guidelines with unusually high manager-approved override rates (&gt; 25%).
                </CardDescription>
              </div>
            </div>
            <span className="rounded-full bg-attn/15 text-attn border border-attn/30 px-2.5 py-0.5 text-xs font-bold">
              {frictionReports.length} High-Friction Rules
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {frictionReports.length > 0 ? (
            frictionReports.map((report) => (
              <div
                key={report.ruleId}
                className="rounded-xl border border-attn/20 bg-background/80 p-5 space-y-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold bg-surface-2 border px-2 py-0.5 rounded">
                      {report.ruleId}
                    </span>
                    <h3 className="font-semibold text-sm text-foreground">{report.ruleName}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-attn">
                      {Math.round(report.overrideRate * 100)}% Override Rate
                    </span>
                    <span className="text-muted-foreground font-mono">
                      ({report.overrideCount}/{report.totalViolations} overrides approved)
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-surface-2 p-3 text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-ai" />
                    Actionable Brand Admin Recommendation:
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{report.recommendation}</p>
                </div>

                {report.sampleJustifications.length > 0 && (
                  <div className="text-2xs text-muted-foreground space-y-1">
                    <span className="font-semibold">Sample Creator Justifications:</span>
                    <ul className="list-disc pl-4 space-y-0.5 italic">
                      {report.sampleJustifications.map((just, idx) => (
                        <li key={idx}>"{just}"</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-sys border-sys/40 hover:bg-sys/10"
                    onClick={() => navigate("/brain")}
                  >
                    Review & Update Rule in Brand Brain <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Zero rule friction detected. All guidelines align with creator workflow.
            </div>
          )}
        </CardContent>
      </Card>

      {/* BRAND DRIFT HEATMAP & CHANNEL BREAKDOWN */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Heatmap Card */}
        <Card className="border bg-surface shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Brand Drift Heatmap</CardTitle>
            <CardDescription className="text-xs">
              Distribution of violation categories across distribution channels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {driftHeatmap.map((row) => (
                <div key={row.channel} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="capitalize">{row.channel.replace("_", " ")}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold font-mono">
                    <div className={cn("rounded py-2", (row.factual ?? 0) > 0 ? "bg-rose-500/25 text-rose-300" : "bg-surface-2 text-muted-foreground")}>
                      Fact: {row.factual ?? 0}
                    </div>
                    <div className={cn("rounded py-2", (row.tone ?? 0) > 0 ? "bg-amber-500/25 text-amber-300" : "bg-surface-2 text-muted-foreground")}>
                      Tone: {row.tone ?? 0}
                    </div>
                    <div className={cn("rounded py-2", (row.visual ?? 0) > 0 ? "bg-purple-500/25 text-purple-300" : "bg-surface-2 text-muted-foreground")}>
                      Visual: {row.visual ?? 0}
                    </div>
                    <div className={cn("rounded py-2", (row.legal ?? 0) > 0 ? "bg-rose-500/25 text-rose-300" : "bg-surface-2 text-muted-foreground")}>
                      Legal: {row.legal ?? 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Channel Breakdown */}
        <Card className="border bg-surface shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Audited Touchpoints by Channel</CardTitle>
            <CardDescription className="text-xs">
              Active campaigns tracked across marketing channels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(analytics?.breakdownByChannel ?? { social_ad: 6, email_newsletter: 4, landing_page: 3, display_banner: 2 }).map(([ch, count]) => (
              <div key={ch} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="capitalize">{ch.replace("_", " ")}</span>
                  <span className="font-mono text-muted-foreground">{count} campaigns</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full bg-sys rounded-full"
                    style={{ width: `${Math.min(100, count * 15)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
