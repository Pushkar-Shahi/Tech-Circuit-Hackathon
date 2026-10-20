/** Wire types for VeriBrand AI frontend. */

export type Role = "owner" | "admin" | "manager" | "creator" | "specialist";

export interface ToneRubric {
  formality: number;
  confidence: number;
  technicality: number;
  empathy: number;
  brandVoice: string;
  prohibitedTones: string[];
}

export interface BrandIdentity {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  fontFamily: string;
  logoUrl?: string;
}

export interface Brand {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string;
  toneRubric: ToneRubric;
  identity: BrandIdentity;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeDocument {
  id: string;
  brandId: string;
  title: string;
  documentType: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: string;
  extractedMetadata: {
    pageCount?: number;
    extractedColors?: string[];
    extractedFonts?: string[];
    rowCount?: number;
  };
  createdAt: string;
}

export interface FactItem {
  id: string;
  brandId: string;
  documentId?: string;
  category: "pricing" | "product_name" | "statistic" | "legal_disclaimer" | "prohibited_term" | "deprecated_term";
  canonicalValue: string;
  aliasesOrDeprecated: string[];
  severityIfViolated: "critical" | "high" | "medium" | "low";
  sourceCitation: {
    documentTitle?: string;
    page?: number;
    section?: string;
  };
  status: "active" | "deprecated" | "prohibited";
  createdAt: string;
}

export interface VisualAsset {
  id: string;
  brandId: string;
  documentId?: string;
  assetType: "color" | "font" | "logo" | "dimension";
  name: string;
  specs: {
    hex?: string;
    role?: string;
    max_delta_e?: number;
    family?: string;
    allowed_weights?: number[];
    min_safe_zone_pct?: number;
    min_width_px?: number;
    allowed_aspect_ratio?: number;
  };
  status: string;
  createdAt: string;
}

export interface BrandRule {
  id: string;
  brandId: string;
  name: string;
  description: string;
  pillar: "fact" | "tone" | "visual" | "legal";
  severity: "critical" | "high" | "medium" | "low";
  sourceDocumentId?: string;
  sourcePage?: number;
  sourceSection?: string;
  status: "active" | "draft" | "deprecated";
  version: number;
  conflictStatus: {
    hasConflict: boolean;
    type?: string;
    details?: string;
    conflictingRuleId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RewriteOptions {
  strictCompliance?: string;
  concise?: string;
  conversational?: string;
}

export interface AuditFinding {
  id: string;
  campaignId: string;
  revisionId: string;
  ruleId?: string;
  category: "factual" | "tone" | "visual" | "legal";
  severity: "critical" | "high" | "medium" | "low";
  affectedText?: string | null;
  textOffset?: { start: number; end: number } | null;
  visualLocation?: { page: number; bbox: [number, number, number, number] } | null;
  evidence: string;
  sourceCitation: {
    documentTitle?: string;
    page?: number;
    section?: string;
  };
  explanation: string;
  suggestedResolutions: RewriteOptions;
  certainty: number;
  uncertaintyFlag: boolean;
  status: "open" | "accepted" | "rejected" | "overridden";
  createdAt: string;
  updatedAt: string;
}

export interface ScoreBreakdown {
  factualDeductions: number;
  visualDeductions: number;
  toneDeductions: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  penaltyDetails?: Array<{
    ruleId?: string;
    category: string;
    severity: string;
    penaltyPoints: number;
  }>;
}

export interface CampaignRevision {
  id: string;
  campaignId: string;
  revisionNumber: number;
  contentText: string;
  assetUrls: string[];
  brandReadinessScore: number;
  scoreBreakdown: ScoreBreakdown;
  fastTrackEligible: boolean;
  createdBy: string;
  createdAt: string;
  changeSummary: string;
}

export interface Campaign {
  id: string;
  orgId: string;
  brandId: string;
  name: string;
  channel: string;
  department: string;
  region: string;
  agency: string;
  targetAudience: string;
  status: "draft" | "scanning" | "needs_revision" | "pending_manager" | "pending_specialist" | "approved" | "published";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  latestRevision?: CampaignRevision;
  findings: AuditFinding[];
}

export interface FindingOverride {
  id: string;
  findingId: string;
  campaignId: string;
  campaignName?: string;
  ruleId?: string;
  requestedBy: string;
  justification: string;
  status: "pending" | "approved" | "rejected";
  decidedBy?: string | null;
  decisionNote?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  findingSnippet?: string;
  findingExplanation?: string;
  findingCategory?: string;
}

export interface GovernanceComment {
  id: string;
  campaignId: string;
  findingId?: string | null;
  author: string;
  body: string;
  mentions: string[];
  createdAt: string;
}

export interface GovernanceAuditEntry {
  seq: number;
  id: string;
  ts: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeState?: unknown;
  afterState?: unknown;
  prevHash: string;
  hash: string;
}

export interface FrictionRecommendation {
  ruleId: string;
  ruleName: string;
  pillar: string;
  overrideCount: number;
  totalViolations: number;
  overrideRate: number;
  recommendation: string;
  sampleJustifications: string[];
}

export interface GovernanceAnalytics {
  overallReadinessScore: number;
  totalCampaigns: number;
  approvedCount: number;
  pendingCount: number;
  criticalViolationsCount: number;
  complianceTrends: Array<{
    date: string;
    readinessScore: number;
    campaignsScanned: number;
    criticalIssues: number;
  }>;
  driftHeatmap: Array<{
    channel: string;
    factual?: number;
    tone?: number;
    visual?: number;
    legal?: number;
  }>;
  breakdownByChannel: Record<string, number>;
  breakdownByDepartment: Record<string, number>;
  ruleFrictionReports: FrictionRecommendation[];
}

export interface ReviewQueueResponse {
  pendingCampaigns: Array<{
    id: string;
    name: string;
    channel: string;
    department: string;
    status: string;
    createdBy: string;
    updatedAt: string;
    readinessScore: number;
    fastTrackEligible: boolean;
  }>;
  pendingOverrides: FindingOverride[];
  queueCount: number;
}

export interface ApiErrorBody {
  detail?: string;
  error?: string;
  message?: string;
}

// Backward compatibility for legacy types
export * from "./types.legacy";

