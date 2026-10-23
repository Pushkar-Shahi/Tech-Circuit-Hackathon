import { useState } from "react";
import {
  Brain,
  Check,
  CheckCircle2,
  Eye,
  Lock,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
  Sun,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUiStore } from "@/lib/store";
import { ROLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface GovernanceConfig {
  penaltyFactual: number;
  penaltyVisual: number;
  penaltyTone: number;
  fastTrackMinScore: number;
  fastTrackStrictBlockers: boolean;
  frictionThresholdPct: number;
  minAuditsForFriction: number;
  aiProvider: "gemini" | "mock";
  geminiModel: string;
  visionDeltaETolerance: number;
  minContrastRatio: number;
  logoSafeZonePaddingPct: number;
}

const DEFAULT_CONFIG: GovernanceConfig = {
  penaltyFactual: 25,
  penaltyVisual: 12,
  penaltyTone: 5,
  fastTrackMinScore: 95,
  fastTrackStrictBlockers: true,
  frictionThresholdPct: 25,
  minAuditsForFriction: 5,
  aiProvider: "gemini",
  geminiModel: "gemini-2.5-flash",
  visionDeltaETolerance: 15,
  minContrastRatio: 4.5,
  logoSafeZonePaddingPct: 10,
};

const SECTIONS = [
  { id: "scoring", label: "Scoring & Fast-Track", icon: Scale },
  { id: "friction", label: "Friction Detection", icon: ShieldAlert },
  { id: "ai", label: "AI & Vision Engines", icon: Brain },
  { id: "roles", label: "RBAC & Permissions", icon: Users },
  { id: "appearance", label: "Preferences", icon: Settings },
  { id: "developer", label: "Developer Mode", icon: Zap },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("scoring");
  const [config, setConfig] = useState<GovernanceConfig>(() => {
    const saved = localStorage.getItem("veribrand_governance_config");
    return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
  });
  const [geminiApiKey, setGeminiApiKey] = useState("AIzaSy••••••••••••••••••••••••••••••");
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const currentRole = useUiStore((s) => s.role);
  const setRole = useUiStore((s) => s.set);
  const theme = useUiStore((s) => s.theme);

  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: () => api.admin.resetDemo(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      toast.success("Demo State Reset", {
        description: data.message || "Acme Cloud Enterprise dataset repopulated to clean initial state.",
      });
    },
    onError: (err: any) => {
      toast.error("Failed to reset demo: " + (err.message || "Unknown error"));
    },
  });

  const handleSave = () => {
    localStorage.setItem("veribrand_governance_config", JSON.stringify(config));
    setIsSaved(true);
    toast.success("Governance configuration saved successfully", {
      description: "Policy weights, thresholds, and AI parameters have been updated.",
    });
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.removeItem("veribrand_governance_config");
    toast.info("Restored default enterprise governance settings");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Platform Settings & Governance</h1>
            <span className="rounded-full bg-sys/10 px-2.5 py-0.5 text-xs font-semibold text-sys">
              Enterprise v2.4
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure Brand Readiness scoring formulas, fast-track gating, friction detection, and multimodal AI providers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset Defaults
          </Button>
          <Button size="sm" onClick={handleSave} className="bg-sys hover:bg-sys/90 text-white">
            {isSaved ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
            {isSaved ? "Saved" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Main Grid: Navigation tabs + Content */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-start">
        {/* Navigation Sidebar */}
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left whitespace-nowrap",
                  isActive
                    ? "bg-surface-2 text-foreground font-semibold shadow-sm border"
                    : "text-muted-foreground hover:bg-surface-2/60 hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-sys" : "text-muted-foreground")} />
                {sec.label}
              </button>
            );
          })}
        </nav>

        {/* Section Contents */}
        <div className="space-y-6">
          {/* 1. SCORING & FAST-TRACK */}
          {activeSection === "scoring" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="h-4 w-4 text-sys" />
                    Brand Readiness Scoring Formula
                  </CardTitle>
                  <CardDescription>
                    Base score starts at 100. Deductions are subtracted per violation based on severity category.
                    Formula: <code className="bg-surface-2 px-1 py-0.5 rounded text-xs font-mono">max(0, 100 - (Factual × {config.penaltyFactual}) - (Visual × {config.penaltyVisual}) - (Tone × {config.penaltyTone}))</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-lg border p-4 bg-surface-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-bad uppercase tracking-wider">Factual / Legal</span>
                        <span className="text-xs font-bold font-mono text-bad">-{config.penaltyFactual} pts</span>
                      </div>
                      <p className="mt-1 text-2xs text-muted-foreground">
                        Outdated pricing, banned terms, unsupported claims, missing disclaimers.
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="range"
                          min="10"
                          max="50"
                          step="5"
                          value={config.penaltyFactual}
                          onChange={(e) => setConfig({ ...config, penaltyFactual: Number(e.target.value) })}
                          className="w-full accent-red-500"
                        />
                        <span className="w-8 text-right font-mono text-xs">{config.penaltyFactual}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 bg-surface-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-500 uppercase tracking-wider">Visual Assets</span>
                        <span className="text-xs font-bold font-mono text-purple-500">-{config.penaltyVisual} pts</span>
                      </div>
                      <p className="mt-1 text-2xs text-muted-foreground">
                        Palette mismatch, unapproved fonts, WCAG contrast failure, safe-zone breaches.
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="range"
                          min="5"
                          max="30"
                          step="1"
                          value={config.penaltyVisual}
                          onChange={(e) => setConfig({ ...config, penaltyVisual: Number(e.target.value) })}
                          className="w-full accent-purple-500"
                        />
                        <span className="w-8 text-right font-mono text-xs">{config.penaltyVisual}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4 bg-surface-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Tone & Voice</span>
                        <span className="text-xs font-bold font-mono text-amber-500">-{config.penaltyTone} pts</span>
                      </div>
                      <p className="mt-1 text-2xs text-muted-foreground">
                        Formality drift, technical jargon, aggressive language, empathy gaps.
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <input
                          type="range"
                          min="2"
                          max="15"
                          step="1"
                          value={config.penaltyTone}
                          onChange={(e) => setConfig({ ...config, penaltyTone: Number(e.target.value) })}
                          className="w-full accent-amber-500"
                        />
                        <span className="w-8 text-right font-mono text-xs">{config.penaltyTone}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fast-Track Auto Approval */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-500" />
                    Fast-Track Governance Policy
                  </CardTitle>
                  <CardDescription>
                    High-scoring campaigns can bypass manual manager review and transition straight to Approved.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <div className="text-sm font-semibold">Minimum Score Threshold</div>
                      <p className="text-xs text-muted-foreground">
                        Drafts achieving this readiness score or higher are eligible for instant approval.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="80"
                        max="100"
                        value={config.fastTrackMinScore}
                        onChange={(e) => setConfig({ ...config, fastTrackMinScore: Number(e.target.value) })}
                        className="w-16 rounded border bg-background px-2 py-1 text-center font-mono text-sm"
                      />
                      <span className="text-xs text-muted-foreground">/ 100</span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Lock className="h-3.5 w-3.5 text-bad" />
                        Strict Legal & Factual Blocker Rule
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <strong>Mandatory Safety Guarantee:</strong> Never allow fast-track approval if even a single
                        critical factual or legal violation exists, regardless of overall numerical score.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.fastTrackStrictBlockers}
                      onChange={(e) => setConfig({ ...config, fastTrackStrictBlockers: e.target.checked })}
                      className="h-4 w-4 rounded border-muted accent-sys cursor-pointer mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 2. FRICTION DETECTION */}
          {activeSection === "friction" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  Rule Friction Detector Policy
                </CardTitle>
                <CardDescription>
                  Automatically flag brand guidelines with unusually high manager-approved override rates.
                  These rules may be outdated, overly restrictive, or poorly communicated to creators.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <div className="text-sm font-semibold">Override Rate Friction Threshold</div>
                      <p className="text-xs text-muted-foreground">
                        If manager-approved overrides exceed this percentage of total violations for a rule, trigger a
                        governance friction alert.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="10"
                        max="50"
                        step="5"
                        value={config.frictionThresholdPct}
                        onChange={(e) => setConfig({ ...config, frictionThresholdPct: Number(e.target.value) })}
                        className="w-16 rounded border bg-background px-2 py-1 text-center font-mono text-sm"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <div className="text-sm font-semibold">Minimum Evidence Sample Size</div>
                      <p className="text-xs text-muted-foreground">
                        Requires at least this many audit evaluations before flagging a guideline, preventing false
                        alarms on small sample sizes.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="3"
                        max="20"
                        value={config.minAuditsForFriction}
                        onChange={(e) => setConfig({ ...config, minAuditsForFriction: Number(e.target.value) })}
                        className="w-16 rounded border bg-background px-2 py-1 text-center font-mono text-sm"
                      />
                      <span className="text-xs text-muted-foreground">evals</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    Actionable Brand Admin Recommendations
                  </div>
                  <p className="mt-1">
                    When friction is detected, the engine formulates contextual recommendations (e.g. &ldquo;Consider
                    updating RULE-FACT-02 to exempt customer case studies&rdquo; or &ldquo;Relax contrast minimums on
                    secondary CTA pills&rdquo;) directly in the Governance Analytics tab.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. AI & VISION ENGINES */}
          {activeSection === "ai" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-sys" />
                    AI Provider & LLM Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure Gemini LLM connectivity for deep semantic tone audits, contextual rewrites, and RAG vector searches.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, aiProvider: "gemini" })}
                      className={cn(
                        "rounded-lg border p-4 text-left transition-all",
                        config.aiProvider === "gemini"
                          ? "border-sys bg-sys/5 ring-1 ring-sys"
                          : "hover:bg-surface-2"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Google Gemini (Active)</span>
                        {config.aiProvider === "gemini" && <CheckCircle2 className="h-4 w-4 text-sys" />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Production multi-turn structured reasoning with Gemini 2.5 Flash / Pro.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, aiProvider: "mock" })}
                      className={cn(
                        "rounded-lg border p-4 text-left transition-all",
                        config.aiProvider === "mock"
                          ? "border-sys bg-sys/5 ring-1 ring-sys"
                          : "hover:bg-surface-2"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Offline Fallback Engine</span>
                        {config.aiProvider === "mock" && <CheckCircle2 className="h-4 w-4 text-sys" />}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Deterministic rubric analyzer for isolated or zero-network local development.
                      </p>
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Gemini API Key
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKey ? "text" : "password"}
                          value={geminiApiKey}
                          onChange={(e) => setGeminiApiKey(e.target.value)}
                          className="w-full rounded-md border bg-background px-3 py-1.5 font-mono text-xs"
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)}>
                        {showKey ? "Hide" : "Reveal"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Multimodal Computer Vision Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4 text-purple-500" />
                    Computer Vision & Document Processing
                  </CardTitle>
                  <CardDescription>
                    Pillow & OpenCV thresholds for dominant color clustering, Delta-E palette distance, and WCAG contrast.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-lg border p-3 bg-surface-1">
                      <div className="text-xs font-semibold">Delta-E Distance Limit</div>
                      <p className="text-2xs text-muted-foreground mt-0.5">Maximum color variance from brand palette</p>
                      <div className="mt-3 flex items-center justify-between">
                        <input
                          type="range"
                          min="5"
                          max="30"
                          value={config.visionDeltaETolerance}
                          onChange={(e) => setConfig({ ...config, visionDeltaETolerance: Number(e.target.value) })}
                          className="w-24 accent-purple-500"
                        />
                        <span className="font-mono text-xs">{config.visionDeltaETolerance} ΔE</span>
                      </div>
                    </div>

                    <div className="rounded-lg border p-3 bg-surface-1">
                      <div className="text-xs font-semibold">Min Contrast Ratio (WCAG)</div>
                      <p className="text-2xs text-muted-foreground mt-0.5">WCAG 2.1 AA text standard</p>
                      <div className="mt-3 flex items-center justify-between">
                        <input
                          type="range"
                          min="3.0"
                          max="7.0"
                          step="0.5"
                          value={config.minContrastRatio}
                          onChange={(e) => setConfig({ ...config, minContrastRatio: Number(e.target.value) })}
                          className="w-24 accent-purple-500"
                        />
                        <span className="font-mono text-xs">{config.minContrastRatio}:1</span>
                      </div>
                    </div>

                    <div className="rounded-lg border p-3 bg-surface-1">
                      <div className="text-xs font-semibold">Logo Safe Zone Padding</div>
                      <p className="text-2xs text-muted-foreground mt-0.5">Clear space buffer around brand mark</p>
                      <div className="mt-3 flex items-center justify-between">
                        <input
                          type="range"
                          min="5"
                          max="25"
                          value={config.logoSafeZonePaddingPct}
                          onChange={(e) => setConfig({ ...config, logoSafeZonePaddingPct: Number(e.target.value) })}
                          className="w-24 accent-purple-500"
                        />
                        <span className="font-mono text-xs">{config.logoSafeZonePaddingPct}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 4. RBAC & PERMISSIONS */}
          {activeSection === "roles" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-sys" />
                  Role-Based Access Control (5 Roles)
                </CardTitle>
                <CardDescription>
                  Enterprise role hierarchy enforcing backend permissions on scans, overrides, and approvals.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Active Role Switcher */}
                <div className="rounded-lg border border-sys/30 bg-sys/5 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-sys">
                    Active Demo Role Switcher
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Select a role to test permission boundaries in real time across the application:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setRole({ role: r.id });
                          toast.info(`Switched active role to: ${r.label}`);
                        }}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors border",
                          currentRole === r.id
                            ? "bg-sys text-white border-sys shadow-sm"
                            : "bg-surface-1 text-muted-foreground hover:bg-surface-2"
                        )}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RBAC Matrix Table */}
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-surface-2/60 text-left text-2xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 font-semibold">Capability</th>
                        <th className="px-3 py-2 font-semibold text-center">Owner</th>
                        <th className="px-3 py-2 font-semibold text-center">Brand Admin</th>
                        <th className="px-3 py-2 font-semibold text-center">Marketing Mgr</th>
                        <th className="px-3 py-2 font-semibold text-center">Creator</th>
                        <th className="px-3 py-2 font-semibold text-center">Specialist</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="px-3 py-2.5 font-medium">Create Campaigns & Run Audits</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-muted-foreground">-</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-medium">Request Violation Overrides</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-muted-foreground">-</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-medium">Approve Overrides & Campaigns</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-muted-foreground">-</td>
                        <td className="text-center text-muted-foreground">-</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-medium">Ingest Guidelines & Publish Rules</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-muted-foreground">-</td>
                        <td className="text-center text-muted-foreground">-</td>
                        <td className="text-center text-muted-foreground">-</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2.5 font-medium">Legal / Regulatory Specialist Escalation</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                        <td className="text-center text-muted-foreground">-</td>
                        <td className="text-center text-muted-foreground">-</td>
                        <td className="text-center text-emerald-500 font-bold">✓</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. PREFERENCES */}
          {activeSection === "appearance" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4 text-sys" />
                  Interface Preferences
                </CardTitle>
                <CardDescription>Personalize your workspace theme and UI density.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <div className="text-sm font-semibold">Theme Mode</div>
                    <p className="text-xs text-muted-foreground">Toggle dark or light theme</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-md border p-1 bg-surface-2">
                    <button
                      type="button"
                      onClick={() => setRole({ theme: "light" })}
                      className={cn(
                        "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                        theme === "light" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      <Sun className="h-3.5 w-3.5" /> Light
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole({ theme: "dark" })}
                      className={cn(
                        "flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors",
                        theme === "dark" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                      )}
                    >
                      <Moon className="h-3.5 w-3.5" /> Dark
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 6. DEVELOPER MODE */}
          {activeSection === "developer" && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <RotateCcw className="h-4 w-4" />
                  Hackathon Demo State Management
                </CardTitle>
                <CardDescription>
                  Instantly restore clean demo state without restarting containers. Useful during live judging rounds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-surface p-4 text-sm space-y-2">
                  <p className="font-semibold text-foreground">
                    Reset actions performed:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                    <li>Clears mutated campaigns, accepted rewrites, and reviewer decisions.</li>
                    <li>Re-seeds <code>CAMP-DEMO-01</code> to its unreviewed initial state with active violations.</li>
                    <li>Restores Brand Brain fact registries, approved visual tokens, and vector chunks.</li>
                    <li>Re-seeds clean manager review queues and SHA-256 audit log chains.</li>
                    <li>Invalidates TanStack query cache across campaigns, brands, analytics, and queues.</li>
                  </ul>
                </div>

                <Button
                  variant="destructive"
                  size="lg"
                  disabled={resetMutation.isPending}
                  onClick={() => resetMutation.mutate()}
                  className="font-bold shadow-md"
                >
                  <RotateCcw className={cn("mr-2 h-4 w-4", resetMutation.isPending && "animate-spin")} />
                  {resetMutation.isPending ? "Resetting Demo State..." : "Reset Demo Data to Initial State"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
