import { get, post, put } from "./client";
import type {
  Brand,
  BrandRule,
  Campaign,
  CampaignRevision,
  FactItem,
  FindingOverride,
  GovernanceAnalytics,
  GovernanceAuditEntry,
  GovernanceComment,
  KnowledgeDocument,
  ReviewQueueResponse,
  VisualAsset,
} from "./types";

export const api = {
  // Brands
  brands: {
    list: () => get<Brand[]>("/brands"),
    get: (id: string) => get<Brand>(`/brands/${id}`),
    create: (data: Partial<Brand>) => post<Brand>("/brands", data),
    update: (id: string, data: Partial<Brand>) => put<Brand>(`/brands/${id}`, data),
  },

  // Brand Brain
  brain: {
    listDocuments: (brandId: string) => get<KnowledgeDocument[]>(`/brain/documents?brand_id=${brandId}`),
    upload: (formData: FormData) => post<{ documentId: string; status: string }>("/brain/upload", formData),
    listFacts: (brandId: string) => get<FactItem[]>(`/brain/facts?brand_id=${brandId}`),
    createFact: (brandId: string, data: Partial<FactItem>) => post<FactItem>(`/brain/facts?brand_id=${brandId}`, data),
    listVisuals: (brandId: string) => get<VisualAsset[]>(`/brain/visuals?brand_id=${brandId}`),
    listRules: (brandId: string) => get<BrandRule[]>(`/brain/rules?brand_id=${brandId}`),
    updateRule: (ruleId: string, data: Partial<BrandRule>) => put<BrandRule>(`/brain/rules/${ruleId}`, data),
    search: (brandId: string, q: string) => get<unknown[]>(`/brain/search?brand_id=${brandId}&q=${encodeURIComponent(q)}`),
  },

  // Campaigns & Audits
  campaigns: {
    list: (params?: { brandId?: string; status?: string; channel?: string }) => {
      const sp = new URLSearchParams();
      if (params?.brandId) sp.set("brand_id", params.brandId);
      if (params?.status) sp.set("status", params.status);
      if (params?.channel) sp.set("channel", params.channel);
      const qs = sp.toString();
      return get<Campaign[]>(`/campaigns${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => get<Campaign>(`/campaigns/${id}`),
    create: (data: {
      brand_id: string;
      name: string;
      channel: string;
      department: string;
      region: string;
      agency: string;
      target_audience: string;
      content_text: string;
      asset_urls?: string[];
    }) => post<Campaign>("/campaigns", data),
    revisions: (id: string) => get<CampaignRevision[]>(`/campaigns/${id}/revisions`),
    scan: (id: string) => post<{ brandReadinessScore: number; fastTrackEligible: boolean; findingsCount: number }>(`/campaigns/${id}/scan`),
    acceptRewrite: (
      id: string,
      data: { finding_id: string; rewrite_mode: string; custom_text?: string },
    ) => post<Campaign>(`/campaigns/${id}/rewrites/accept`, data),
    requestOverride: (
      id: string,
      data: { finding_id: string; justification: string; risk_acknowledged?: boolean },
    ) => post<{ status: string; overrideId: string }>(`/campaigns/${id}/override`, data),
    transition: (id: string, data: { target_status: string; reason?: string }) =>
      post<Campaign>(`/campaigns/${id}/transition`, data),
    diff: (id: string, revA?: number, revB?: number) =>
      get<{ revA: number; revB: number; wordDiff: Array<{ type: string; text: string }>; unifiedDiff: string[] }>(
        `/campaigns/${id}/diff?rev_a=${revA ?? 1}${revB ? `&rev_b=${revB}` : ""}`,
      ),
    comments: (id: string) => get<GovernanceComment[]>(`/campaigns/${id}/comments`),
    addComment: (id: string, data: { body: string; finding_id?: string }) =>
      post<GovernanceComment>(`/campaigns/${id}/comments`, data),
  },

  // Review Queue
  queue: {
    get: () => get<ReviewQueueResponse>("/queue"),
    decideOverride: (overrideId: string, data: { approve: boolean; decision_note?: string }) =>
      post<FindingOverride>(`/queue/overrides/${overrideId}/decide`, data),
    escalate: (campaignId: string) => post<{ status: string }>(`/queue/campaigns/${campaignId}/escalate`),
  },

  // Governance Analytics & Friction Detector
  analytics: {
    get: (brandId?: string) => get<GovernanceAnalytics>(`/analytics?brand_id=${brandId || "BRAND-ACME-01"}`),
    friction: (brandId?: string) => get<unknown[]>(`/analytics/friction?brand_id=${brandId || "BRAND-ACME-01"}`),
  },

  // Governance Audit Log
  audit: {
    list: (params?: { actor?: string; action?: string; limit?: number }) => {
      const sp = new URLSearchParams();
      if (params?.actor) sp.set("actor", params.actor);
      if (params?.action) sp.set("action", params.action);
      if (params?.limit) sp.set("limit", String(params.limit));
      const qs = sp.toString();
      return get<GovernanceAuditEntry[]>(`/audit${qs ? `?${qs}` : ""}`);
    },
    verify: () => get<{ valid: boolean; count: number; message: string; brokenAtSeq?: number }>("/audit/verify"),
  },

  // Admin & System
  admin: {
    resetDemo: () => post<{ status: string; message: string }>("/admin/reset-demo"),
  },
  system: {
    health: () => get<{ status: string; service: string; version: string; aiConfigured: boolean }>("/health"),
  },
};
