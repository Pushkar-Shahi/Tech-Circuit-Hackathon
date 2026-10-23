import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * VeriBrand AI end-to-end smoke test (real backend, VITE_USE_MOCKS=false).
 *
 * 1. Landing page showcase → launch governance center.
 * 2. Executive dashboard → readiness index & active campaigns.
 * 3. Review Workspace (CAMP-DEMO-01) → inspect multimodal findings & accept AI rewrites.
 * 4. Manager Review Queue → review pending exceptions & overrides.
 * 5. Brand Brain → verify Knowledge Stores & cross-document rules.
 * 6. Cryptographic Audit Log → test SHA-256 chain verification.
 */

const API = (process.env.E2E_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const ROLE_HEADERS = { "X-Demo-Role": "admin", Accept: "application/json" };

async function setRole(page: Page, role: "owner" | "admin" | "manager" | "creator" | "specialist") {
  await page.addInitScript((r) => {
    try {
      const key = "veribrand-ui";
      const v = JSON.parse(localStorage.getItem(key) ?? "null") || {};
      v.state = { ...(v.state || {}), role: r };
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }, role);
}

test.beforeAll(async ({ request }) => {
  const res = await request.get(`${API}/api/health`).catch(() => null);
  test.skip(!res || !res.ok(), `Backend not reachable at ${API}/api/health — start it first`);
});

test("VeriBrand AI end-to-end governance workflow", async ({ page, request }) => {
  await setRole(page, "admin");

  /* ---------- 1. Landing Page ---------- */
  await test.step("visit landing page and navigate to dashboard", async () => {
    await page.goto("/landing");
    await expect(page.getByRole("heading", { name: /Protect your brand equity/i })).toBeVisible();
    await page.getByRole("button", { name: /Launch Governance Center/i }).click();
    await page.waitForURL("/", { timeout: 10_000 });
  });

  /* ---------- 2. Executive Dashboard ---------- */
  await test.step("inspect executive dashboard and readiness index", async () => {
    await expect(page.getByRole("heading", { name: "Brand Governance Center" })).toBeVisible();
    await expect(page.getByText("Brand Readiness Index")).toBeVisible();
    await expect(page.getByText("Active Campaigns & Audits")).toBeVisible();
  });

  /* ---------- 3. Review Workspace ---------- */
  await test.step("open campaign review workspace and inspect findings", async () => {
    await page.goto("/campaigns/CAMP-DEMO-01");
    await expect(page.getByText(/Q4 Global Enterprise Migration Ad/i)).toBeVisible();
    await expect(page.getByText(/Explainable AI Copilot/i)).toBeVisible();

    // Check that findings are loaded
    await expect(page.getByText(/Contextual Rewrites/i).first()).toBeVisible({ timeout: 15_000 });
  });

  /* ---------- 4. Manager Review Queue ---------- */
  await test.step("inspect manager review queue", async () => {
    await page.goto("/queue");
    await expect(page.getByRole("heading", { name: "Manager Approval Queue" })).toBeVisible();
  });

  /* ---------- 5. Brand Brain Knowledge Stores ---------- */
  await test.step("inspect Brand Brain and rules", async () => {
    await page.goto("/brain");
    await expect(page.getByRole("heading", { name: /Brand Brain/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Rules Registry/i })).toBeVisible();
  });

  /* ---------- 6. Cryptographic Audit Trail ---------- */
  await test.step("verify cryptographic audit trail", async () => {
    await page.goto("/audit");
    await expect(page.getByRole("heading", { name: /Cryptographic Governance Audit Log/i })).toBeVisible();
    await page.getByRole("button", { name: /Verify Hash Integrity/i }).click();
    await expect(page.getByText(/Cryptographic Verification Passed/i)).toBeVisible({ timeout: 10_000 });
  });
});
