import { describe, it, expect } from "vitest";
import { PERMISSIONS, ROLES, roleCan, type Permission, type Role } from "@/lib/permissions";

const ALL = Object.keys(PERMISSIONS) as Permission[];

describe("VeriBrand permission matrix", () => {
  it("defines exactly the five enterprise roles", () => {
    expect(ROLES.map((r) => r.id).sort()).toEqual(["admin", "creator", "manager", "owner", "specialist"]);
  });

  it("covers all 16 governance permissions", () => {
    expect(ALL).toHaveLength(16);
  });

  it("owner has full permissions across all 16 capabilities", () => {
    for (const perm of ALL) {
      expect(roleCan("owner", perm)).toBe(true);
    }
  });

  it("creator can create campaigns, scan, and request overrides, but cannot approve", () => {
    expect(roleCan("creator", "campaign.create")).toBe(true);
    expect(roleCan("creator", "campaign.scan")).toBe(true);
    expect(roleCan("creator", "override.request")).toBe(true);
    expect(roleCan("creator", "campaign.approve")).toBe(false);
    expect(roleCan("creator", "rules.manage")).toBe(false);
  });

  it("manager can decide overrides and approve campaigns", () => {
    expect(roleCan("manager", "override.decide")).toBe(true);
    expect(roleCan("manager", "campaign.approve")).toBe(true);
    expect(roleCan("manager", "campaign.publish")).toBe(true);
    expect(roleCan("manager", "rules.manage")).toBe(false);
  });

  it("admin can manage brand identities and ingest brain guidelines", () => {
    expect(roleCan("admin", "brand.manage")).toBe(true);
    expect(roleCan("admin", "brain.ingest")).toBe(true);
    expect(roleCan("admin", "rules.manage")).toBe(true);
    expect(roleCan("admin", "rules.approve")).toBe(true);
  });

  it("specialist has audit viewing and override decision rights", () => {
    expect(roleCan("specialist", "audit.view")).toBe(true);
    expect(roleCan("specialist", "override.decide")).toBe(true);
    expect(roleCan("specialist", "brand.manage")).toBe(false);
  });
});
