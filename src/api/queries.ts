import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./endpoints";

export const keys = {
  brands: ["brands"] as const,
  brand: (id: string) => ["brand", id] as const,
  brainDocs: (brandId: string) => ["brain", "docs", brandId] as const,
  brainFacts: (brandId: string) => ["brain", "facts", brandId] as const,
  brainVisuals: (brandId: string) => ["brain", "visuals", brandId] as const,
  brainRules: (brandId: string) => ["brain", "rules", brandId] as const,
  campaigns: (filters?: Record<string, string | undefined>) => ["campaigns", filters] as const,
  campaign: (id: string) => ["campaign", id] as const,
  campaignRevisions: (id: string) => ["campaign", id, "revisions"] as const,
  campaignDiff: (id: string, revA?: number, revB?: number) => ["campaign", id, "diff", revA, revB] as const,
  queue: ["queue"] as const,
  analytics: (brandId: string) => ["analytics", brandId] as const,
  audit: (params?: Record<string, string | number | undefined>) => ["audit", params] as const,
  auditVerify: ["audit", "verify"] as const,
};

// Brands
export const useBrands = () =>
  useQuery({ queryKey: keys.brands, queryFn: api.brands.list, staleTime: 30_000 });

export const useBrand = (id: string) =>
  useQuery({ queryKey: keys.brand(id), queryFn: () => api.brands.get(id), enabled: Boolean(id) });

// Brand Brain
export const useBrainDocuments = (brandId: string) =>
  useQuery({
    queryKey: keys.brainDocs(brandId),
    queryFn: () => api.brain.listDocuments(brandId),
    enabled: Boolean(brandId),
  });

export const useBrainFacts = (brandId: string) =>
  useQuery({
    queryKey: keys.brainFacts(brandId),
    queryFn: () => api.brain.listFacts(brandId),
    enabled: Boolean(brandId),
  });

export const useBrainVisuals = (brandId: string) =>
  useQuery({
    queryKey: keys.brainVisuals(brandId),
    queryFn: () => api.brain.listVisuals(brandId),
    enabled: Boolean(brandId),
  });

export const useBrainRules = (brandId: string) =>
  useQuery({
    queryKey: keys.brainRules(brandId),
    queryFn: () => api.brain.listRules(brandId),
    enabled: Boolean(brandId),
  });

// Campaigns
export const useCampaigns = (params?: { brandId?: string; status?: string; channel?: string }) =>
  useQuery({
    queryKey: keys.campaigns(params),
    queryFn: () => api.campaigns.list(params),
    staleTime: 10_000,
  });

export const useCampaign = (id: string) =>
  useQuery({
    queryKey: keys.campaign(id),
    queryFn: () => api.campaigns.get(id),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === "scanning" ? 1500 : false),
  });

export const useCampaignRevisions = (id: string) =>
  useQuery({
    queryKey: keys.campaignRevisions(id),
    queryFn: () => api.campaigns.revisions(id),
    enabled: Boolean(id),
  });

export const useCampaignDiff = (id: string, revA?: number, revB?: number) =>
  useQuery({
    queryKey: keys.campaignDiff(id, revA, revB),
    queryFn: () => api.campaigns.diff(id, revA, revB),
    enabled: Boolean(id),
  });

// Review Queue
export const useReviewQueue = () =>
  useQuery({ queryKey: keys.queue, queryFn: api.queue.get, refetchInterval: 10_000 });

// Analytics
export const useGovernanceAnalytics = (brandId?: string) =>
  useQuery({
    queryKey: keys.analytics(brandId || "BRAND-ACME-01"),
    queryFn: () => api.analytics.get(brandId),
    staleTime: 15_000,
  });

// Audit
export const useGovernanceAudit = (params?: { actor?: string; action?: string; limit?: number }) =>
  useQuery({ queryKey: keys.audit(params), queryFn: () => api.audit.list(params) });

export const useAuditVerify = () =>
  useQuery({ queryKey: keys.auditVerify, queryFn: api.audit.verify, enabled: false });

// Mutations
export const useScanCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => api.campaigns.scan(campaignId),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: keys.campaign(id) });
      qc.invalidateQueries({ queryKey: keys.campaigns() });
      qc.invalidateQueries({ queryKey: keys.queue });
    },
  });
};

export const useAcceptRewrite = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      findingId,
      rewriteMode,
      customText,
    }: {
      campaignId: string;
      findingId: string;
      rewriteMode: string;
      customText?: string;
    }) =>
      api.campaigns.acceptRewrite(campaignId, {
        finding_id: findingId,
        rewrite_mode: rewriteMode,
        custom_text: customText,
      }),
    onSuccess: (_, { campaignId }) => {
      qc.invalidateQueries({ queryKey: keys.campaign(campaignId) });
      qc.invalidateQueries({ queryKey: keys.campaignRevisions(campaignId) });
    },
  });
};

export const useRequestOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      findingId,
      justification,
    }: {
      campaignId: string;
      findingId: string;
      justification: string;
    }) =>
      api.campaigns.requestOverride(campaignId, {
        finding_id: findingId,
        justification,
        risk_acknowledged: true,
      }),
    onSuccess: (_, { campaignId }) => {
      qc.invalidateQueries({ queryKey: keys.campaign(campaignId) });
      qc.invalidateQueries({ queryKey: keys.queue });
    },
  });
};

export const useDecideOverride = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      overrideId,
      approve,
      decisionNote,
    }: {
      overrideId: string;
      approve: boolean;
      decisionNote?: string;
    }) => api.queue.decideOverride(overrideId, { approve, decision_note: decisionNote }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.queue });
      qc.invalidateQueries({ queryKey: keys.campaigns() });
    },
  });
};

export const useTransitionCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      targetStatus,
      reason,
    }: {
      campaignId: string;
      targetStatus: string;
      reason?: string;
    }) => api.campaigns.transition(campaignId, { target_status: targetStatus, reason }),
    onSuccess: (_, { campaignId }) => {
      qc.invalidateQueries({ queryKey: keys.campaign(campaignId) });
      qc.invalidateQueries({ queryKey: keys.campaigns() });
      qc.invalidateQueries({ queryKey: keys.queue });
    },
  });
};
