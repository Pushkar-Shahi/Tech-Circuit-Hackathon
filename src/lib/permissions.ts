import { useUiStore } from "@/lib/store";
import type { Role } from "@/api/types";

export type { Role };

export const ROLES: { id: Role; label: string; description: string; user: string }[] = [
  { id: "owner", label: "Organization Owner", description: "Full enterprise governance, all permissions, team settings", user: "Elena Vance" },
  { id: "admin", label: "Brand Admin", description: "Manages guidelines, brand brain, rules, conflict resolution", user: "Marcus Sterling" },
  { id: "manager", label: "Marketing Manager", description: "Reviews queue, decides overrides, approves campaigns to publish", user: "Sarah Jenkins" },
  { id: "creator", label: "Creator / Designer", description: "Creates campaigns, reviews copilot suggestions, requests overrides", user: "Liam Chen" },
  { id: "specialist", label: "Specialist Reviewer", description: "Legal and compliance escalation sign-off", user: "Rachel Adams" },
];

export const PERMISSIONS = {
  "brand.manage": "Manage brand identities and rubrics",
  "brain.ingest": "Upload and ingest brand guidelines",
  "rules.manage": "Create, edit, and toggle brand rules",
  "rules.approve": "Approve versioned rules",
  "campaign.create": "Create campaigns and upload creative drafts",
  "campaign.scan": "Run multimodal audits",
  "campaign.edit": "Edit campaign content and assets",
  "rewrite.accept": "Accept AI copilot rewrites",
  "override.request": "Submit override requests with justification",
  "override.decide": "Approve or reject creator override requests",
  "campaign.approve": "Approve campaign drafts for distribution",
  "campaign.publish": "Publish approved campaigns",
  "campaign.escalate": "Escalate campaigns to legal specialists",
  "analytics.view": "View governance analytics and friction reports",
  "audit.view": "View append-only cryptographic audit logs",
  "settings.manage": "Configure scoring weights and system settings",
} as const;

export type Permission = keyof typeof PERMISSIONS;

const MATRIX: Record<Role, Permission[]> = {
  owner: Object.keys(PERMISSIONS) as Permission[],
  admin: [
    "brand.manage",
    "brain.ingest",
    "rules.manage",
    "rules.approve",
    "campaign.create",
    "campaign.scan",
    "campaign.edit",
    "rewrite.accept",
    "override.decide",
    "campaign.approve",
    "analytics.view",
    "audit.view",
  ],
  manager: [
    "campaign.create",
    "campaign.scan",
    "campaign.edit",
    "rewrite.accept",
    "override.decide",
    "campaign.approve",
    "campaign.publish",
    "campaign.escalate",
    "analytics.view",
  ],
  creator: [
    "campaign.create",
    "campaign.scan",
    "campaign.edit",
    "rewrite.accept",
    "override.request",
  ],
  specialist: [
    "campaign.scan",
    "rewrite.accept",
    "override.decide",
    "campaign.approve",
    "audit.view",
    "analytics.view",
  ],
};

export function roleCan(role: Role, perm: Permission): boolean {
  return MATRIX[role]?.includes(perm) ?? false;
}

export function useCan(perm: Permission): boolean {
  const role = useUiStore((s) => s.role);
  return roleCan(role, perm);
}

export function useRoleLabel(): string {
  const role = useUiStore((s) => s.role);
  return ROLES.find((r) => r.id === role)?.label ?? role;
}
